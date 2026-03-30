import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, RefreshCw, Key, Brain, Shield, AlertTriangle,
  DollarSign, Eye, EyeOff, ChevronDown, Check, Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

interface OrgSettings {
  useOwnAIKey: boolean;
  hasApiKey: boolean;
  openaiApiKeyMasked: string | null;
  openaiOrgId: string | null;
  aiSystemPrompt: string | null;
  aiDefaultTone: string;
  aiDefaultModel: string | null;
  aiMaxTokensPerRequest: number | null;
  aiMonthlyTokenBudget: number | null;
  aiIndustryContext: string | null;
  budget: {
    warning: number;
    caution: number;
    hardLimit: number;
    alertEnabled: boolean;
  };
  subscriptionTier: string;
  availableModels: Array<{
    tier: string;
    model: string;
    inputCost: string;
    outputCost: string;
  }>;
}

interface AvailableModel {
  model: string;
  tier: string;
  inputCost: string;
  outputCost: string;
  inputCostRaw: number;
  outputCostRaw: number;
}

type SettingsSection = 'model' | 'apikey' | 'personalization' | 'budget';

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'direct', label: 'Direct' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'warm', label: 'Warm' },
];

const industryOptions = [
  { value: '', label: 'General Real Estate' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'luxury', label: 'Luxury / High-End' },
  { value: 'rental', label: 'Rental / Property Management' },
  { value: 'investment', label: 'Investment Properties' },
  { value: 'new-construction', label: 'New Construction' },
  { value: 'land', label: 'Land & Development' },
];

const modelTierLabels: Record<string, string> = {
  premiumModel: 'Premium',
  deepModel: 'Advanced',
  mainModel: 'Standard',
  fastModel: 'Fast',
  nanoModel: 'Economy',
  fallbackModel: 'Fallback',
  voiceModel: 'Voice',
  other: 'Other',
};

const OrgAISettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<SettingsSection>('model');
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  // Load org settings
  const { data: settings, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ai', 'org-settings'],
    queryFn: async () => {
      const res = await aiApi.getOrgSettings();
      return res.data as OrgSettings;
    },
  });

  // Load available models
  const { data: models } = useQuery({
    queryKey: ['ai', 'available-models'],
    queryFn: async () => {
      const res = await aiApi.getAvailableModels();
      return res.data as AvailableModel[];
    },
  });

  // Form state
  const [form, setForm] = useState({
    aiDefaultModel: '',
    useOwnAIKey: false,
    openaiOrgId: '',
    aiSystemPrompt: '',
    aiDefaultTone: 'professional',
    aiMaxTokensPerRequest: 2000,
    aiIndustryContext: '',
    aiBudgetWarning: 25,
    aiBudgetCaution: 50,
    aiBudgetHardLimit: 100,
    aiBudgetAlertEnabled: true,
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        aiDefaultModel: settings.aiDefaultModel || '',
        useOwnAIKey: settings.useOwnAIKey,
        openaiOrgId: settings.openaiOrgId || '',
        aiSystemPrompt: settings.aiSystemPrompt || '',
        aiDefaultTone: settings.aiDefaultTone || 'professional',
        aiMaxTokensPerRequest: settings.aiMaxTokensPerRequest || 2000,
        aiIndustryContext: settings.aiIndustryContext || '',
        aiBudgetWarning: settings.budget.warning,
        aiBudgetCaution: settings.budget.caution,
        aiBudgetHardLimit: settings.budget.hardLimit,
        aiBudgetAlertEnabled: settings.budget.alertEnabled,
      });
      setDirty(false);
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate budget thresholds
      if (form.aiBudgetAlertEnabled) {
        if (form.aiBudgetWarning >= form.aiBudgetCaution) {
          throw new Error('Warning threshold must be less than caution threshold');
        }
        if (form.aiBudgetCaution >= form.aiBudgetHardLimit) {
          throw new Error('Caution threshold must be less than hard limit');
        }
      }
      // Validate API key format if provided (sk- prefix, minimum length)
      if (newApiKey && (!/^sk-[a-zA-Z0-9_-]{20,}$/.test(newApiKey))) {
        throw new Error('Invalid API key format. OpenAI keys start with "sk-" followed by at least 20 alphanumeric characters.');
      }
      const payload: Record<string, unknown> = { ...form };
      if (newApiKey) {
        payload.openaiApiKey = newApiKey;
      }
      return aiApi.updateOrgSettings(payload);
    },
    onSuccess: () => {
      toast.success('Organization AI settings saved');
      setDirty(false);
      setNewApiKey('');
      queryClient.invalidateQueries({ queryKey: ['ai', 'org-settings'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save settings');
    },
  });

  const updateField = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  if (isLoading) {
    return <LoadingSkeleton rows={4} />;
  }

  if (isError) {
    return <ErrorBanner message={`Failed to load organization settings: ${(error as Error)?.message || 'Unknown error'}`} retry={() => refetch()} />;
  }

  // Group models by tier for display
  const primaryModels = (models || []).filter(m =>
    ['premiumModel', 'deepModel', 'mainModel', 'fastModel', 'nanoModel', 'fallbackModel'].includes(m.tier)
  );

  const sections: { id: SettingsSection; label: string; icon: typeof Brain }[] = [
    { id: 'model', label: 'Model Selection', icon: Brain },
    { id: 'apikey', label: 'API Key', icon: Key },
    { id: 'personalization', label: 'Personalization', icon: Shield },
    { id: 'budget', label: 'Budget & Alerts', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/ai')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Organization AI Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure AI model, API keys, and personalization for your team
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{settings?.subscriptionTier} tier</Badge>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Section Nav */}
      <div className="flex border-b">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSection === s.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Model Selection */}
      {activeSection === 'model' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default AI Model</CardTitle>
              <CardDescription>
                Choose the default model for chat, compose, and content generation. Lower-tier tasks
                (scoring, enhancements) automatically use cheaper models for cost efficiency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {primaryModels.map((m) => {
                  const isSelected = form.aiDefaultModel === m.model || (!form.aiDefaultModel && m.tier === 'mainModel');
                  return (
                    <button
                      key={m.model}
                      onClick={() => updateField('aiDefaultModel', m.model)}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{m.model}</span>
                            <Badge variant={
                              m.tier === 'premiumModel' ? 'destructive' :
                              m.tier === 'deepModel' ? 'warning' :
                              m.tier === 'mainModel' ? 'default' :
                              'secondary'
                            }>
                              {modelTierLabels[m.tier] || m.tier}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Input: {m.inputCost} · Output: {m.outputCost}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium">Max Tokens Per Request</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={100}
                    max={10000}
                    value={form.aiMaxTokensPerRequest}
                    onChange={(e) => updateField('aiMaxTokensPerRequest', parseInt(e.target.value) || 2000)}
                    className="w-32 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">Limits response length per request</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Key */}
      {activeSection === 'apikey' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom OpenAI API Key</CardTitle>
              <CardDescription>
                Optionally provide your own OpenAI API key. This bypasses platform usage limits
                (you pay OpenAI directly), but rate limits still apply.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Use Own API Key</p>
                  <p className="text-xs text-muted-foreground">
                    {form.useOwnAIKey
                      ? 'Your team uses a custom OpenAI key — usage limits are unlimited'
                      : 'Using platform API key — subject to tier-based limits'}
                  </p>
                </div>
                <button
                  onClick={() => updateField('useOwnAIKey', !form.useOwnAIKey)}
                  role="switch"
                  aria-checked={form.useOwnAIKey}
                  aria-label="Use own API key"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.useOwnAIKey ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.useOwnAIKey ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {form.useOwnAIKey && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">OpenAI API Key</label>
                    {settings?.hasApiKey && (
                      <p className="text-xs text-muted-foreground">
                        Current key: {settings.openaiApiKeyMasked || '••••••••'}
                      </p>
                    )}
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        placeholder={settings?.hasApiKey ? 'Enter new key to replace' : 'sk-...'}
                        value={newApiKey}
                        onChange={(e) => { setNewApiKey(e.target.value); setDirty(true); }}
                        className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm font-mono"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">OpenAI Organization ID (optional)</label>
                    <input
                      type="text"
                      placeholder="org-..."
                      value={form.openaiOrgId}
                      onChange={(e) => updateField('openaiOrgId', e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                    />
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Your API key is encrypted at rest and never exposed. When using your own key,
                      AI message and content generation limits are unlimited — you pay OpenAI directly
                      for token usage.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Personalization */}
      {activeSection === 'personalization' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team AI Personalization</CardTitle>
              <CardDescription>
                Customize how AI generates content for your entire organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Tone</label>
                  <div className="relative">
                    <select
                      value={form.aiDefaultTone}
                      onChange={(e) => updateField('aiDefaultTone', e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {toneOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Industry Context</label>
                  <div className="relative">
                    <select
                      value={form.aiIndustryContext}
                      onChange={(e) => updateField('aiIndustryContext', e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {industryOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Custom System Prompt</label>
                <p className="text-xs text-muted-foreground">
                  Instructions prepended to every AI request. Use this to set brand voice, terminology preferences,
                  or business-specific context.
                </p>
                <textarea
                  value={form.aiSystemPrompt}
                  onChange={(e) => updateField('aiSystemPrompt', e.target.value)}
                  rows={6}
                  maxLength={5000}
                  placeholder="Example: You are an AI assistant for [Company Name], a luxury real estate firm in Miami. Always use a sophisticated, warm tone. Reference our focus on waterfront properties and international clientele..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {form.aiSystemPrompt.length}/5000
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget & Alerts */}
      {activeSection === 'budget' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Budget Alerts</CardTitle>
              <CardDescription>
                Set spending thresholds to monitor and control AI costs. These can be adjusted later
                once subscription tiers are finalized.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Enable Budget Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    {form.aiBudgetAlertEnabled
                      ? 'Budget limits are active — AI calls will be blocked when hard limit is reached'
                      : 'Budget alerts are disabled — no spending limits enforced'}
                  </p>
                </div>
                <button
                  onClick={() => updateField('aiBudgetAlertEnabled', !form.aiBudgetAlertEnabled)}
                  role="switch"
                  aria-checked={form.aiBudgetAlertEnabled}
                  aria-label="Enable budget alerts"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.aiBudgetAlertEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.aiBudgetAlertEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {form.aiBudgetAlertEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        Warning Threshold
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={form.aiBudgetWarning}
                          onChange={(e) => updateField('aiBudgetWarning', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Admin notified</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        Caution Threshold
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={form.aiBudgetCaution}
                          onChange={(e) => updateField('aiBudgetCaution', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Admin + team leads notified</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        Hard Limit
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={form.aiBudgetHardLimit}
                          onChange={(e) => updateField('aiBudgetHardLimit', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">AI calls blocked</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      When the hard limit is reached, all AI generation endpoints will return a 429 error
                      until the next billing month. An admin can increase the limit at any time to unblock.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrgAISettings;
