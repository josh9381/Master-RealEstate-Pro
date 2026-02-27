import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, User, MessageSquare, Key, ToggleLeft, Save, RotateCcw, RefreshCw,
  Brain, Sparkles, FileText, Wand2, Target, ArrowLeft, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

// Types matching the backend FullAIPreferences structure
interface ComposerPreferences {
  defaultTone: string;
  defaultLength: string;
  defaultCTA: boolean;
  defaultPersonalization: string;
  autoGenerate: boolean;
  showAdvanced: boolean;
}

interface AIProfilePreferences {
  brandGuidelines: string | null;
  businessContext: string | null;
  defaultEmailStructure: string;
  propertyDescStyle: string;
  socialMediaPrefs: Record<string, unknown> | null;
  enhancementLevel: string;
}

interface FeatureToggles {
  enableLeadScoring: boolean;
  enableCompose: boolean;
  enableContentGen: boolean;
  enableMessageEnhancer: boolean;
  enableTemplateAI: boolean;
  enableInsights: boolean;
}

interface ChatbotPreferences {
  tone: string;
  autoSuggestActions: boolean;
  enableProactive: boolean;
  preferredContactTime: string | null;
  aiInsightsFrequency: string;
  customInstructions: string | null;
}

interface FullPreferences {
  chatbot: ChatbotPreferences;
  composer: ComposerPreferences;
  profile: AIProfilePreferences;
  featureToggles: FeatureToggles;
}

type SettingsTab = 'profile' | 'compose' | 'usage' | 'toggles';

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'direct', label: 'Direct' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'warm', label: 'Warm' },
];

const lengthOptions = [
  { value: 'concise', label: 'Concise' },
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
];

const personalizationOptions = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'standard', label: 'Standard' },
  { value: 'deep', label: 'Deep' },
];

const emailStructureOptions = [
  { value: 'professional', label: 'Formal Greeting' },
  { value: 'casual', label: 'Casual' },
  { value: 'direct', label: 'Direct' },
];

const propertyDescOptions = [
  { value: 'luxury', label: 'Luxury Verbose' },
  { value: 'balanced', label: 'Clean Balanced' },
  { value: 'minimal', label: 'Clean Minimal' },
  { value: 'feature-focused', label: 'Feature-Focused' },
];

const enhancementOptions = [
  { value: 'light', label: 'Light Touch' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'full', label: 'Full Rewrite' },
];

const insightsFrequencyOptions = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const AISettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Load preferences
  const { data: prefsData, isLoading } = useQuery({
    queryKey: ['ai', 'preferences'],
    queryFn: async () => {
      const res = await aiApi.getPreferences();
      return res.data as FullPreferences;
    },
  });

  // Load usage data
  const { data: usageData } = useQuery({
    queryKey: ['ai', 'usage'],
    queryFn: async () => {
      const [usage, limits] = await Promise.all([
        aiApi.getUsage(),
        aiApi.getUsageLimits(),
      ]);
      return { usage: usage.data, limits: limits.data };
    },
    enabled: activeTab === 'usage',
  });

  // Form state
  const [form, setForm] = useState<FullPreferences>({
    chatbot: {
      tone: 'professional',
      autoSuggestActions: true,
      enableProactive: true,
      preferredContactTime: null,
      aiInsightsFrequency: 'daily',
      customInstructions: null,
    },
    composer: {
      defaultTone: 'professional',
      defaultLength: 'standard',
      defaultCTA: true,
      defaultPersonalization: 'standard',
      autoGenerate: true,
      showAdvanced: false,
    },
    profile: {
      brandGuidelines: null,
      businessContext: null,
      defaultEmailStructure: 'professional',
      propertyDescStyle: 'balanced',
      socialMediaPrefs: null,
      enhancementLevel: 'moderate',
    },
    featureToggles: {
      enableLeadScoring: true,
      enableCompose: true,
      enableContentGen: true,
      enableMessageEnhancer: true,
      enableTemplateAI: true,
      enableInsights: true,
    },
  });

  const [dirty, setDirty] = useState(false);

  // Initialize form when data loads
  useEffect(() => {
    if (prefsData) {
      setForm(prefsData);
      setDirty(false);
    }
  }, [prefsData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (prefs: Partial<FullPreferences>) => aiApi.savePreferences(prefs as Record<string, unknown>),
    onSuccess: () => {
      toast.success('AI preferences saved successfully');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['ai', 'preferences'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save preferences');
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: () => aiApi.resetPreferences(),
    onSuccess: (res) => {
      if (res.data) {
        setForm(res.data);
      }
      toast.success('Preferences reset to defaults');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['ai', 'preferences'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to reset preferences');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const updateForm = <K extends keyof FullPreferences>(
    section: K,
    key: string,
    value: unknown
  ) => {
    setForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setDirty(true);
  };

  if (isLoading) {
    return <LoadingSkeleton rows={4} />;
  }

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'My AI Profile', icon: User },
    { id: 'compose', label: 'Compose & Content', icon: MessageSquare },
    { id: 'usage', label: 'API & Usage', icon: Key },
    { id: 'toggles', label: 'Feature Toggles', icon: ToggleLeft },
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
            <h1 className="text-3xl font-bold">AI Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your AI profile, defaults, and feature preferences
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Defaults
          </Button>
          <Button
            onClick={handleSave}
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

      {/* Tab Navigation */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Default Tone & Communication Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Communication Defaults</CardTitle>
              <CardDescription>
                These settings affect AI-generated content across compose, content generation, and message enhancement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Tone</label>
                  <div className="relative">
                    <select
                      value={form.chatbot.tone}
                      onChange={(e) => updateForm('chatbot', 'tone', e.target.value)}
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
                  <label className="text-sm font-medium">Default Message Length</label>
                  <div className="relative">
                    <select
                      value={form.composer.defaultLength}
                      onChange={(e) => updateForm('composer', 'defaultLength', e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {lengthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Personalization Level</label>
                  <div className="relative">
                    <select
                      value={form.composer.defaultPersonalization}
                      onChange={(e) => updateForm('composer', 'defaultPersonalization', e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {personalizationOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Insights Frequency</label>
                  <div className="relative">
                    <select
                      value={form.chatbot.aiInsightsFrequency}
                      onChange={(e) => updateForm('chatbot', 'aiInsightsFrequency', e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {insightsFrequencyOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <p className="text-sm font-medium">Always Include CTA</p>
                  <p className="text-xs text-muted-foreground">Add a call-to-action in generated messages</p>
                </div>
                <button
                  onClick={() => updateForm('composer', 'defaultCTA', !form.composer.defaultCTA)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.composer.defaultCTA ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.composer.defaultCTA ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Brand & Business Context */}
          <Card>
            <CardHeader>
              <CardTitle>Brand & Business Context</CardTitle>
              <CardDescription>
                Help AI understand your brand voice and business niche for more relevant content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Brand Guidelines</label>
                <textarea
                  value={form.profile.brandGuidelines || ''}
                  onChange={(e) => updateForm('profile', 'brandGuidelines', e.target.value || null)}
                  placeholder="Describe your brand voice, key phrases, and style preferences..."
                  className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground">This guides all AI-generated content to match your brand</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Business Context</label>
                <textarea
                  value={form.profile.businessContext || ''}
                  onChange={(e) => updateForm('profile', 'businessContext', e.target.value || null)}
                  placeholder="e.g., Luxury residential real estate in Miami, specializing in waterfront properties, $500K-$5M range..."
                  className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground">Helps AI understand your market, focus area, and price range</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Custom AI Instructions</label>
                <textarea
                  value={form.chatbot.customInstructions || ''}
                  onChange={(e) => updateForm('chatbot', 'customInstructions', e.target.value || null)}
                  placeholder="Any specific instructions for the AI chatbot and content generation..."
                  className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm resize-y"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred Contact Time</label>
                <input
                  type="text"
                  value={form.chatbot.preferredContactTime || ''}
                  onChange={(e) => updateForm('chatbot', 'preferredContactTime', e.target.value || null)}
                  placeholder="e.g., 9am-5pm EST"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">Used by AI for timing suggestions on follow-ups</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'compose' && (
        <div className="space-y-6">
          {/* Email & Content Defaults */}
          <Card>
            <CardHeader>
              <CardTitle>Email & Content Defaults</CardTitle>
              <CardDescription>
                Default settings for AI Compose and Content Generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Email Structure</label>
                  <div className="relative">
                    <select
                      value={form.profile.defaultEmailStructure}
                      onChange={(e) => updateForm('profile', 'defaultEmailStructure', e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {emailStructureOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Property Description Style</label>
                  <div className="relative">
                    <select
                      value={form.profile.propertyDescStyle}
                      onChange={(e) => updateForm('profile', 'propertyDescStyle', e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {propertyDescOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Enhancement Level</label>
                  <p className="text-xs text-muted-foreground">How much the Message Enhancer rewrites your text</p>
                  <div className="relative">
                    <select
                      value={form.profile.enhancementLevel}
                      onChange={(e) => updateForm('profile', 'enhancementLevel', e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {enhancementOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Compose Tone Override</label>
                  <p className="text-xs text-muted-foreground">Default tone for the AI Composer specifically</p>
                  <div className="relative">
                    <select
                      value={form.composer.defaultTone}
                      onChange={(e) => updateForm('composer', 'defaultTone', e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {toneOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Toggle settings */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-generate on open</p>
                    <p className="text-xs text-muted-foreground">Automatically start generating when you open the composer</p>
                  </div>
                  <button
                    onClick={() => updateForm('composer', 'autoGenerate', !form.composer.autoGenerate)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.composer.autoGenerate ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.composer.autoGenerate ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Show Advanced Options</p>
                    <p className="text-xs text-muted-foreground">Show advanced settings in the composer by default</p>
                  </div>
                  <button
                    onClick={() => updateForm('composer', 'showAdvanced', !form.composer.showAdvanced)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.composer.showAdvanced ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.composer.showAdvanced ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-suggest Actions</p>
                    <p className="text-xs text-muted-foreground">AI chatbot automatically suggests follow-up actions</p>
                  </div>
                  <button
                    onClick={() => updateForm('chatbot', 'autoSuggestActions', !form.chatbot.autoSuggestActions)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.chatbot.autoSuggestActions ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.chatbot.autoSuggestActions ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Proactive Insights</p>
                    <p className="text-xs text-muted-foreground">AI proactively surfaces insights and suggestions</p>
                  </div>
                  <button
                    onClick={() => updateForm('chatbot', 'enableProactive', !form.chatbot.enableProactive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.chatbot.enableProactive ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.chatbot.enableProactive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media Preferences</CardTitle>
              <CardDescription>
                Customize how AI generates social media content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Platforms</label>
                  <div className="space-y-1.5">
                    {['Instagram', 'Facebook', 'LinkedIn', 'Twitter/X', 'TikTok'].map(platform => (
                      <label key={platform} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={((form.profile.socialMediaPrefs as Record<string, unknown>)?.platforms as string[] || []).includes(platform)}
                          onChange={(e) => {
                            const prefs = (form.profile.socialMediaPrefs || { platforms: [], hashtagStyle: 'moderate', emojiUsage: 'moderate' }) as Record<string, unknown>
                            const platforms = ((prefs.platforms as string[]) || []).slice()
                            if (e.target.checked) {
                              platforms.push(platform)
                            } else {
                              const idx = platforms.indexOf(platform)
                              if (idx >= 0) platforms.splice(idx, 1)
                            }
                            updateForm('profile', 'socialMediaPrefs', { ...prefs, platforms })
                          }}
                        />
                        {platform}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hashtag Style</label>
                  <select
                    value={((form.profile.socialMediaPrefs as Record<string, unknown>)?.hashtagStyle as string) || 'moderate'}
                    onChange={(e) => {
                      const prefs = (form.profile.socialMediaPrefs || { platforms: [], hashtagStyle: 'moderate', emojiUsage: 'moderate' }) as Record<string, unknown>
                      updateForm('profile', 'socialMediaPrefs', { ...prefs, hashtagStyle: e.target.value })
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="none">No Hashtags</option>
                    <option value="minimal">Minimal (1-3)</option>
                    <option value="moderate">Moderate (3-5)</option>
                    <option value="heavy">Heavy (5+)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emoji Usage</label>
                  <select
                    value={((form.profile.socialMediaPrefs as Record<string, unknown>)?.emojiUsage as string) || 'moderate'}
                    onChange={(e) => {
                      const prefs = (form.profile.socialMediaPrefs || { platforms: [], hashtagStyle: 'moderate', emojiUsage: 'moderate' }) as Record<string, unknown>
                      updateForm('profile', 'socialMediaPrefs', { ...prefs, emojiUsage: e.target.value })
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="none">No Emoji</option>
                    <option value="minimal">Minimal</option>
                    <option value="moderate">Moderate</option>
                    <option value="heavy">Frequent</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Current Month Usage</CardTitle>
              <CardDescription>
                AI feature usage across your account this billing period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageData ? (
                <div className="space-y-4">
                  {(() => {
                    const usage = usageData.usage || {};
                    const limits = usageData.limits || {};
                    const categories = [
                      { key: 'aiMessages', label: 'AI Messages', icon: Brain },
                      { key: 'composeUses', label: 'AI Compose', icon: MessageSquare },
                      { key: 'contentGenerations', label: 'Content Generations', icon: FileText },
                      { key: 'enhancements', label: 'Message Enhancements', icon: Wand2 },
                      { key: 'scoringRecalculations', label: 'Score Recalculations', icon: Target },
                    ];

                    return categories.map(({ key, label, icon: Icon }) => {
                      const used = (usage as Record<string, number>)[key] || 0;
                      const limit = (limits as Record<string, number>)[key] || 0;
                      const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                      const isNearLimit = pct >= 80;

                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{label}</span>
                            </div>
                            <span className={`text-sm font-medium ${isNearLimit ? 'text-red-600' : ''}`}>
                              {used.toLocaleString()} / {limit > 0 ? limit.toLocaleString() : '∞'}
                            </span>
                          </div>
                          {limit > 0 && (
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isNearLimit ? 'bg-red-500' : 'bg-primary'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading usage data...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Key Info */}
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Your AI API key and model settings are managed in Organization Settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">API Key & Model Configuration</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage your OpenAI API key, model selection, and token limits
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Go to Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'toggles' && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Toggles</CardTitle>
            <CardDescription>
              Enable or disable individual AI features across the platform. When disabled, AI buttons and components will be hidden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  key: 'enableLeadScoring' as const,
                  label: 'Lead Scoring',
                  description: 'AI-powered lead quality prediction and scoring',
                  icon: Target,
                },
                {
                  key: 'enableCompose' as const,
                  label: 'AI Compose',
                  description: 'AI-powered message composition in Communications and Campaigns',
                  icon: MessageSquare,
                },
                {
                  key: 'enableContentGen' as const,
                  label: 'Content Generation',
                  description: 'Generate email sequences, property descriptions, social posts',
                  icon: FileText,
                },
                {
                  key: 'enableMessageEnhancer' as const,
                  label: 'Message Enhancer',
                  description: 'Enhance and rewrite messages with different tones',
                  icon: Wand2,
                },
                {
                  key: 'enableTemplateAI' as const,
                  label: 'Template AI',
                  description: 'AI-powered personalization in templates',
                  icon: Sparkles,
                },
                {
                  key: 'enableInsights' as const,
                  label: 'AI Insights',
                  description: 'Automated business insights and recommendations',
                  icon: Brain,
                },
              ].map(({ key, label, description, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{label}</p>
                        <Badge variant={form.featureToggles[key] ? 'success' : 'secondary'}>
                          {form.featureToggles[key] ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateForm('featureToggles', key, !form.featureToggles[key])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.featureToggles[key] ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.featureToggles[key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dirty state indicator */}
      {dirty && (
        <div className="fixed bottom-6 right-6 bg-card border shadow-lg rounded-lg p-4 flex items-center gap-3 z-50">
          <p className="text-sm font-medium">You have unsaved changes</p>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
        </div>
      )}
    </div>
  );
};

export default AISettings;
