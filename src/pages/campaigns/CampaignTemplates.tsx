import { logger } from '@/lib/logger'
import { FileText, RefreshCw, Mail, MessageSquare, Phone, Eye, Plus, Type, X, Zap, CheckCircle2, ChevronLeft, ChevronRight, Settings, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { campaignsApi } from '@/lib/api';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmailBlockEditor } from '@/components/email/EmailBlockEditor';

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'EMAIL' | 'SMS' | 'PHONE';
  subject?: string;
  body: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  isRecurring: boolean;
  recurringPattern?: {
    daysOfWeek?: number[];
    time?: string;
    dayOfMonth?: number;
  };
  tags: string[];
  icon: string;
}

const CampaignTemplates = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CampaignTemplate | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Create template modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'EMAIL' | 'SMS' | 'PHONE'>('EMAIL');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formCategory, setFormCategory] = useState('Newsletter');
  const [activeStep, setActiveStep] = useState<'details' | 'body'>('details');
  const [initialFormState, setInitialFormState] = useState({ name: '', type: 'EMAIL', subject: '', body: '', category: 'Newsletter' });
  const [showSettings, setShowSettings] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const CAMPAIGN_CATEGORIES = ['Newsletter', 'Alert', 'Event', 'Follow-up'];
  const CAMPAIGN_CATEGORY_ICONS: Record<string, string> = { Newsletter: '📰', Alert: '🔔', Event: '📅', 'Follow-up': '🔄' };
  const CAMPAIGN_TYPE_ICONS: Record<string, { icon: typeof Mail, color: string }> = {
    EMAIL: { icon: Mail, color: 'text-blue-500' },
    SMS: { icon: MessageSquare, color: 'text-green-500' },
    PHONE: { icon: Phone, color: 'text-orange-500' },
  };

  const resetForm = () => {
    setFormName('');
    setFormType('EMAIL');
    setFormSubject('');
    setFormBody('');
    setFormCategory('Newsletter');
    setActiveStep('details');
    setInitialFormState({ name: '', type: 'EMAIL', subject: '', body: '', category: 'Newsletter' });
  };

  const hasUnsavedChanges = () => {
    return formName !== initialFormState.name ||
      formType !== initialFormState.type ||
      formSubject !== initialFormState.subject ||
      formBody !== initialFormState.body ||
      formCategory !== initialFormState.category;
  };

  const handleCloseCreateModal = () => {
    if (hasUnsavedChanges()) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    setShowCreateModal(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setActiveStep('details');
    setShowCreateModal(true);
    setInitialFormState({ name: '', type: 'EMAIL', subject: '', body: '', category: 'Newsletter' });
  };

  const canProceedToBody = formName.trim().length > 0 && (formType !== 'EMAIL' || formSubject.trim().length > 0);

  const handleCreateTemplate = async () => {
    if (!formName.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (formType === 'EMAIL' && !formSubject.trim()) {
      toast.error('Subject line is required for email campaigns');
      return;
    }
    if (!formBody.trim()) {
      toast.error('Campaign body is required');
      return;
    }

    setSavingTemplate(true);
    try {
      const response = await campaignsApi.createCampaign({
        name: formName.trim(),
        type: formType,
        subject: formType === 'EMAIL' ? formSubject.trim() : undefined,
        body: formBody.trim(),
        status: 'DRAFT',
      });

      const campaignId = response.data?.campaign?.id || response.campaign?.id;
      toast.success('Campaign template created successfully');
      setShowCreateModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] });

      if (campaignId) {
        navigate(`/campaigns/${campaignId}/edit`);
      }
    } catch (error: unknown) {
      logger.error('Failed to create campaign template:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError?.response?.data?.message || 'Failed to create campaign template');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Escape key handler — use ref to avoid stale closures
  const handleCloseRef = useRef(handleCloseCreateModal);
  handleCloseRef.current = handleCloseCreateModal;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showCreateModal) {
      handleCloseRef.current();
    }
  }, [showCreateModal]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (showCreateModal) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showCreateModal]);

  // Focus trap for create modal
  useEffect(() => {
    if (!showCreateModal || !modalRef.current) return;
    const modal = modalRef.current;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleTab);
    const firstFocusable = modal.querySelector<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
    return () => document.removeEventListener('keydown', handleTab);
  }, [showCreateModal, activeStep]);

  // Template settings state
  interface TemplateSettings {
    defaultFont: string;
    primaryColor: string;
    logoUrl: string;
    includeUnsubscribe: boolean;
    enableOpenTracking: boolean;
    enableClickTracking: boolean;
    includeSocialSharing: boolean;
  }
  const SETTINGS_DEFAULTS: TemplateSettings = {
    defaultFont: 'Arial',
    primaryColor: '#0066cc',
    logoUrl: '',
    includeUnsubscribe: true,
    enableOpenTracking: true,
    enableClickTracking: true,
    includeSocialSharing: false
  }
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(SETTINGS_DEFAULTS)

  // Load template settings from backend
  const { data: savedSettings } = useQuery({
    queryKey: ['campaign-template-settings'],
    queryFn: async () => {
      const res = await api.get('/api/settings/email-template-defaults')
      return res.data?.data || null
    },
  })

  useEffect(() => {
    if (savedSettings) {
      setTemplateSettings(s => ({ ...s, ...savedSettings }))
    }
  }, [savedSettings])

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: TemplateSettings) => {
      await api.put('/api/settings/email-template-defaults', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-template-settings'] })
      toast.success('Campaign template settings saved')
    },
    onError: () => {
      toast.error('Failed to save template settings')
    },
  })

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['campaign-templates'],
    queryFn: async () => {
      const response = await campaignsApi.getTemplates();
      return (response.data?.templates || []) as CampaignTemplate[];
    },
  });

  const stats = useMemo(() => {
    const emailCount = templates.filter((t) => t.type === 'EMAIL').length;
    const smsCount = templates.filter((t) => t.type === 'SMS').length;
    const phoneCount = templates.filter((t) => t.type === 'PHONE').length;
    const recurringCount = templates.filter((t) => t.isRecurring).length;
    return {
      total: templates.length,
      email: emailCount,
      sms: smsCount,
      phone: phoneCount,
      recurring: recurringCount,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];
    
    // Filter by category
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Recurring') {
        filtered = filtered.filter(t => t.isRecurring);
      } else {
        filtered = filtered.filter(t => 
          t.category.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  const handleUseTemplate = async (templateId: string) => {
    if (creatingTemplateId) return; // Prevent double-click
    try {
      setCreatingTemplateId(templateId);
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      // Create campaign from template
      const response = await campaignsApi.createFromTemplate(templateId, {
        name: template.name
      });

      const campaignId = response.data?.campaign?.id;
      if (!campaignId) {
        toast.error('Campaign created but ID not returned');
        return;
      }
      toast.success(`Campaign created from template: ${template.name}`);
      
      // Navigate to edit the new campaign
      navigate(`/campaigns/${campaignId}/edit`);
    } catch (error) {
      logger.error('Error creating campaign from template:', error);
      toast.error('Failed to create campaign from template');
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const categories = ['All', 'Newsletter', 'Alert', 'Event', 'Follow-up', 'Recurring'];

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Templates</h1>
          <p className="text-muted-foreground mt-2">
            Pre-built real estate campaign templates to speed up your marketing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.email}</div>
            <p className="text-xs text-muted-foreground">Email campaigns</p>
          </CardContent>
        </Card>
        {stats.sms > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sms}</div>
            <p className="text-xs text-muted-foreground">Text messages</p>
          </CardContent>
        </Card>
        )}
        {stats.phone > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone</CardTitle>
            <Phone className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.phone}</div>
            <p className="text-xs text-muted-foreground">Call scripts</p>
          </CardContent>
        </Card>
        )}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring</CardTitle>
            <RefreshCw className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recurring}</div>
            <p className="text-xs text-muted-foreground">Automated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {categories.map((category) => (
                <Button 
                  key={category} 
                  variant={selectedCategory === category ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
            <Input 
              placeholder="Search templates..." 
              className="w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search' : 'Select a different category'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-all hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{template.icon}</div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline">{template.type}</Badge>
                    {template.isRecurring && (
                      <Badge variant="secondary" className="text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {template.frequency}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {template.subject && (
                  <div className="text-xs text-muted-foreground mb-4 p-2 bg-muted rounded">
                    <span className="font-medium">Subject:</span> {template.subject.length > 50 ? `${template.subject.substring(0, 50)}…` : template.subject}
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => handleUseTemplate(template.id)}
                    disabled={creatingTemplateId === template.id}
                  >
                    {creatingTemplateId === template.id ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    {creatingTemplateId === template.id ? 'Creating...' : 'Use Template'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}



      {/* Recently Used */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Used</CardTitle>
          <CardDescription>Campaign templates you've used recently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {templates
              .slice(0, 5)
              .map((template) => (
                <div key={template.id} className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.type} • {template.category}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(template)}>
                    <Eye className="h-3 w-3 mr-1" /> Preview
                  </Button>
                </div>
              ))}
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">No campaign templates yet. Templates will appear here after you create them.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Custom Campaign Template Modal — Full-screen two-step layout */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch justify-center" onClick={handleCloseCreateModal}>
          <div ref={modalRef} className="bg-background w-full max-w-6xl my-4 mx-4 rounded-xl shadow-2xl flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label="Create Custom Campaign Template" onClick={(e) => e.stopPropagation()}>
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Create Custom Campaign Template</h2>
                  <p className="text-xs text-muted-foreground">
                    Design a new campaign template for your marketing automation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Step indicator */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-full px-1 py-1">
                  <button
                    type="button"
                    onClick={() => setActiveStep('details')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeStep === 'details'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Details</span>
                    {formName.trim() && (formType !== 'EMAIL' || formSubject.trim()) && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => canProceedToBody && setActiveStep('body')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeStep === 'body'
                        ? 'bg-background text-foreground shadow-sm'
                        : canProceedToBody ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/40 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Content</span>
                    {formBody.trim() && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    )}
                  </button>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCloseCreateModal} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {activeStep === 'details' ? (
                /* ── Step 1: Details ────────────────────────── */
                <div className="max-w-2xl mx-auto p-8 space-y-6">
                  {/* Campaign Name */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="campaign-name" className="text-sm font-medium">Campaign Name <span className="text-red-500">*</span></label>
                      <span className={`text-xs ${formName.length > 80 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {formName.length}/100
                      </span>
                    </div>
                    <Input
                      id="campaign-name"
                      placeholder="e.g., Monthly Newsletter, Open House Blast"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value.slice(0, 100))}
                      className="h-11"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">Choose a descriptive name to identify this campaign template.</p>
                  </div>

                  {/* Type Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Campaign Type <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['EMAIL', 'SMS', 'PHONE'] as const).map(type => {
                        const TypeIcon = CAMPAIGN_TYPE_ICONS[type].icon;
                        const typeLabels: Record<string, string> = { EMAIL: 'Email', SMS: 'SMS', PHONE: 'Phone Script' };
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormType(type)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-all ${
                              formType === type
                                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/30 hover:bg-accent text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <TypeIcon className={`h-6 w-6 ${CAMPAIGN_TYPE_ICONS[type].color}`} />
                            {typeLabels[type]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Campaign category">
                      {CAMPAIGN_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          role="radio"
                          aria-checked={formCategory === cat}
                          onClick={() => setFormCategory(cat)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                            formCategory === cat
                              ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                              : 'border-border hover:border-primary/30 hover:bg-accent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span>{CAMPAIGN_CATEGORY_ICONS[cat] || '📁'}</span>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject Line — only for EMAIL */}
                  {formType === 'EMAIL' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="campaign-subject" className="text-sm font-medium">Subject Line <span className="text-red-500">*</span></label>
                        <span className={`text-xs ${formSubject.length > 120 ? 'text-red-500' : formSubject.length > 60 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {formSubject.length}/150 {formSubject.length > 60 && formSubject.length <= 120 ? '— may be truncated on mobile' : ''}
                        </span>
                      </div>
                      <Input
                        id="campaign-subject"
                        placeholder="e.g., Your monthly update from {{company}}"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value.slice(0, 150))}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">Write a compelling subject line for your email campaign.</p>
                    </div>
                  )}
                  {/* Template Settings (collapsible) */}
                  <div className="border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowSettings(!showSettings)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        Template Settings
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                    </button>
                    {showSettings && (
                      <div className="px-4 pb-4 space-y-4 border-t">
                        <div className="grid gap-4 md:grid-cols-2 pt-3">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Default Font</label>
                            <select className="w-full px-3 py-2 border rounded-lg bg-background" value={templateSettings.defaultFont} onChange={(e) => setTemplateSettings(s => ({ ...s, defaultFont: e.target.value }))}>
                              <option>Arial</option>
                              <option>Helvetica</option>
                              <option>Georgia</option>
                              <option>Times New Roman</option>
                              <option>Verdana</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Primary Color</label>
                            <input type="color" value={templateSettings.primaryColor} onChange={(e) => setTemplateSettings(s => ({ ...s, primaryColor: e.target.value }))} className="w-full h-10 border rounded-lg" />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Company Logo URL</label>
                          <input
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={templateSettings.logoUrl}
                            onChange={(e) => setTemplateSettings(s => ({ ...s, logoUrl: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.includeUnsubscribe} onChange={(e) => setTemplateSettings(s => ({ ...s, includeUnsubscribe: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Include unsubscribe link</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.enableOpenTracking} onChange={(e) => setTemplateSettings(s => ({ ...s, enableOpenTracking: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Enable open tracking</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.enableClickTracking} onChange={(e) => setTemplateSettings(s => ({ ...s, enableClickTracking: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Enable click tracking</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.includeSocialSharing} onChange={(e) => setTemplateSettings(s => ({ ...s, includeSocialSharing: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Include social sharing</span>
                          </label>
                        </div>
                        <Button onClick={() => saveSettingsMutation.mutate(templateSettings)} disabled={saveSettingsMutation.isPending} size="sm">
                          {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                        </Button>
                      </div>
                    )}
                  </div>                </div>
              ) : (
                /* ── Step 2: Body / Content ────────────────── */
                <div className="h-full p-4">
                  {formType === 'EMAIL' ? (
                    <EmailBlockEditor
                      value={formBody}
                      onChange={setFormBody}
                      minHeight="calc(100vh - 240px)"
                      showTemplates={true}
                    />
                  ) : (
                    <div className="max-w-2xl mx-auto p-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="campaign-body" className="text-sm font-medium">
                            {formType === 'SMS' ? 'SMS Message' : 'Phone Script'} <span className="text-red-500">*</span>
                          </label>
                          {formType === 'SMS' && (
                            <span className={`text-xs ${formBody.length > 480 ? 'text-red-500' : formBody.length > 320 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                              {formBody.length} chars &bull; {Math.max(1, Math.ceil(formBody.length / 160))} segment{Math.max(1, Math.ceil(formBody.length / 160)) !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <textarea
                          id="campaign-body"
                          className="w-full px-3 py-3 border rounded-lg min-h-[300px] resize-y text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background"
                          placeholder={formType === 'SMS' ? 'Type your SMS message...' : 'Type your phone script...'}
                          value={formBody}
                          onChange={(e) => setFormBody(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formType === 'SMS' ? 'Write your SMS. Each segment is 160 characters.' : 'Write the script agents will follow during calls.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-background/95 backdrop-blur-sm shrink-0">
              <div className="text-xs text-muted-foreground">
                {activeStep === 'details' && (
                  <span>Fill in campaign details, then proceed to design the content.</span>
                )}
                {activeStep === 'body' && (
                  <span>
                    {formType === 'EMAIL'
                      ? 'Use the block editor to build your email. Add headings, text, images, buttons, and more.'
                      : formType === 'SMS'
                      ? 'Write your SMS message. Use variables for personalization.'
                      : 'Write the phone script for your agents.'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeStep === 'body' && (
                  <Button variant="outline" onClick={() => setActiveStep('details')}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Details
                  </Button>
                )}
                <Button variant="outline" onClick={handleCloseCreateModal}>
                  Cancel
                </Button>
                {activeStep === 'details' ? (
                  <Button onClick={() => {
                    if (!formName.trim()) { toast.error('Campaign name is required'); return; }
                    if (formType === 'EMAIL' && !formSubject.trim()) { toast.error('Subject line is required for email campaigns'); return; }
                    setActiveStep('body');
                  }}
                  disabled={!canProceedToBody}
                  >
                    Next: Design Content
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleCreateTemplate} disabled={savingTemplate || !formBody.trim()}>
                    {savingTemplate ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" />Create Template</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{previewTemplate?.icon}</span>
              <div>
                <DialogTitle>{previewTemplate?.name}</DialogTitle>
                <DialogDescription>{previewTemplate?.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{previewTemplate.type}</Badge>
                <Badge variant="secondary">{previewTemplate.category}</Badge>
                {previewTemplate.isRecurring && (
                  <Badge variant="secondary">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {previewTemplate.frequency}
                  </Badge>
                )}
              </div>
              {previewTemplate.subject && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Subject</p>
                  <div className="p-3 bg-muted rounded-md text-sm">{previewTemplate.subject}</div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Body</p>
                <pre className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap font-sans leading-relaxed max-h-[40vh] overflow-y-auto">
                  {previewTemplate.body}
                </pre>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {previewTemplate.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewTemplate) {
                  handleUseTemplate(previewTemplate.id);
                  setPreviewTemplate(null);
                }
              }}
              disabled={!!creatingTemplateId}
            >
              <FileText className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default CampaignTemplates;
