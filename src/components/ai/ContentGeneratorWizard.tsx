import { logger } from '@/lib/logger'
import React, { useState } from 'react';
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import {
  Wand2,
  Mail,
  MessageSquare,
  Home,
  Share2,
  FileText,
  Loader2,
  Check,
  Copy,
} from 'lucide-react';

type ContentType = 'email-sequence' | 'sms' | 'property-description' | 'social-posts' | 'listing-presentation';

interface ContentGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (content: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const contentTypes = [
  { value: 'email-sequence', label: 'Email Sequence', icon: Mail, description: '3-5 nurture emails' },
  { value: 'sms', label: 'SMS Message', icon: MessageSquare, description: 'Short text message' },
  { value: 'property-description', label: 'Property Description', icon: Home, description: 'Listing copy' },
  { value: 'social-posts', label: 'Social Media Posts', icon: Share2, description: 'Multi-platform posts' },
  { value: 'listing-presentation', label: 'Listing Presentation', icon: FileText, description: 'Seller pitch deck' },
];

const toneOptions = ['professional', 'friendly', 'urgent', 'casual', 'persuasive', 'formal'];

const platformOptions = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
];

export const ContentGeneratorWizard: React.FC<ContentGeneratorProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'type' | 'details' | 'result'>('type');
  const [contentType, setContentType] = useState<ContentType>('email-sequence');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [copied, setCopied] = useState(false);

  // Form fields
  const [leadName, setLeadName] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [goal, setGoal] = useState('');
  const [tone, setTone] = useState('professional');
  const [sequenceLength, setSequenceLength] = useState(5);

  // Property fields
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [squareFeet, setSquareFeet] = useState('');
  const [price, setPrice] = useState('');
  const [features, setFeatures] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  // Social media fields
  const [topic, setTopic] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['facebook', 'instagram']);

  // Listing presentation fields
  const [estimatedValue, setEstimatedValue] = useState('');
  const [marketTrends, setMarketTrends] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    // Validate required fields based on content type
    if ((contentType === 'email-sequence' || contentType === 'sms') && !goal.trim()) {
      toast.error('Please enter a campaign/message goal before generating');
      return;
    }
    if (contentType === 'property-description' && !address.trim()) {
      toast.error('Please enter a property address before generating');
      return;
    }
    if (contentType === 'social-posts' && !topic.trim()) {
      toast.error('Please enter a topic before generating');
      return;
    }
    if (contentType === 'listing-presentation' && !address.trim()) {
      toast.error('Please enter a property address before generating');
      return;
    }
    setIsGenerating(true);
    try {
      let endpoint = '';
      let body: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

      switch (contentType) {
        case 'email-sequence':
          endpoint = '/api/ai/generate/email-sequence';
          body = { leadName, propertyType, goal, tone, sequenceLength };
          break;
        case 'sms':
          endpoint = '/api/ai/generate/sms';
          body = { leadName, propertyType, goal, tone };
          break;
        case 'property-description':
          endpoint = '/api/ai/generate/property-description';
          body = {
            address,
            propertyType,
            bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
            bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
            squareFeet: squareFeet ? parseInt(squareFeet) : undefined,
            price: price ? parseFloat(price) : undefined,
            features: features ? features.split(',').map(f => f.trim()) : [],
            neighborhood,
          };
          break;
        case 'social-posts':
          endpoint = '/api/ai/generate/social-posts';
          body = { topic, propertyAddress: address, platforms, tone };
          break;
        case 'listing-presentation':
          endpoint = '/api/ai/generate/listing-presentation';
          body = {
            address,
            propertyType,
            estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
            marketTrends,
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      
      if (result.success) {
        setGeneratedContent(result.data);
        setStep('result');
      } else {
        toast.error(result.message || 'Generation failed');
      }
    } catch (error) {
      logger.error('Content generation error:', error);
      const aiMsg = getAIUnavailableMessage(error);
      toast.error(aiMsg || 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyContent = () => {
    onApply(generatedContent);
    onClose();
  };

  const renderStepContent = () => {
    if (step === 'type') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Choose Content Type</h3>
          <div className="grid grid-cols-2 gap-3">
            {contentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => {
                    setContentType(type.value as ContentType);
                    setStep('details');
                  }}
                  className="p-4 border-2 border-border/60 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left group hover:shadow-md hover:shadow-primary/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 group-hover:from-purple-500/20 group-hover:to-indigo-500/20 transition-colors mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="font-medium text-foreground">{type.label}</div>
                  <div className="text-sm text-muted-foreground">{type.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 'details') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Content Details</h3>
            <button
              onClick={() => setStep('type')}
              className="text-sm text-primary hover:text-primary/80 dark:hover:text-primary/80 font-medium"
            >
              Change Type
            </button>
          </div>

          {contentType === 'email-sequence' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Lead Name (Optional)
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Property Type (Optional)
                </label>
                <input
                  type="text"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  placeholder="Single Family Home"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Campaign Goal *
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., nurture new leads, re-engage cold leads"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  {toneOptions.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Number of Emails
                </label>
                <input
                  type="number"
                  value={sequenceLength}
                  onChange={(e) => setSequenceLength(parseInt(e.target.value))}
                  min="3"
                  max="7"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>
            </>
          )}

          {contentType === 'sms' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Lead Name (Optional)
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Message Goal *
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., schedule showing, confirm appointment"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  {toneOptions.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {contentType === 'property-description' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Address *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, City, State"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Property Type *
                </label>
                <input
                  type="text"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  placeholder="Single Family Home"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    placeholder="3"
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    placeholder="2"
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Square Feet
                  </label>
                  <input
                    type="number"
                    value={squareFeet}
                    onChange={(e) => setSquareFeet(e.target.value)}
                    placeholder="2000"
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Key Features (comma-separated)
                </label>
                <input
                  type="text"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Pool, Updated Kitchen, Hardwood Floors"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Neighborhood
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Downtown, near schools and parks"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>
            </>
          )}

          {contentType === 'social-posts' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Topic *</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., new listing, open house, market update"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Property Address (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Platforms *
                </label>
                <div className="space-y-2">
                  {platformOptions.map((platform) => (
                    <label key={platform.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={platforms.includes(platform.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPlatforms([...platforms, platform.value]);
                          } else {
                            setPlatforms(platforms.filter((p) => p !== platform.value));
                          }
                        }}
                        className="h-4 w-4 text-primary focus-visible:ring-ring border-border rounded"
                      />
                      <span className="ml-2 text-sm text-foreground">{platform.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  {toneOptions.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {contentType === 'listing-presentation' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Address *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, City, State"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Property Type *
                </label>
                <input
                  type="text"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  placeholder="Single Family Home"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Estimated Value
                </label>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="500000"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Market Trends (Optional)
                </label>
                <textarea
                  value={marketTrends}
                  onChange={(e) => setMarketTrends(e.target.value)}
                  placeholder="e.g., Sellers market, low inventory, prices up 5%"
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !goal && (contentType === 'email-sequence' || contentType === 'sms')}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/30"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  <span>Generate with AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    if (step === 'result' && generatedContent) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Generated Content</h3>
            <button
              onClick={() => setStep('details')}
              className="text-sm text-primary hover:text-primary/80 dark:hover:text-primary/80 font-medium"
            >
              Generate Again
            </button>
          </div>

          <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 max-h-96 overflow-y-auto">
            {contentType === 'email-sequence' && generatedContent.emails && (
              <div className="space-y-4">
                {generatedContent.emails.map((email: any, index: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <div key={email.subject || `email-${index}`} className="bg-background rounded-xl p-4 border border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Email {index + 1} • Day {email.dayOffset || index * 3}
                      </span>
                      <button
                        onClick={() => handleCopy(`Subject: ${email.subject}\n\n${email.body}`)}
                        className="text-primary hover:text-primary/80"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="font-semibold text-foreground mb-2">
                      Subject: {email.subject}
                    </div>
                    <div className="text-foreground/80 whitespace-pre-wrap">{email.body}</div>
                  </div>
                ))}
              </div>
            )}

            {contentType === 'sms' && generatedContent.message && (
              <div className="bg-background rounded-xl p-4 border border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    SMS ({generatedContent.length} characters)
                  </span>
                  <button
                    onClick={() => handleCopy(generatedContent.message)}
                    className="text-primary hover:text-primary/80"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-foreground">{generatedContent.message}</div>
              </div>
            )}

            {contentType === 'property-description' && generatedContent.description && (
              <div className="bg-background rounded-xl p-4 border border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Property Description ({generatedContent.wordCount} words)
                  </span>
                  <button
                    onClick={() => handleCopy(generatedContent.description)}
                    className="text-primary hover:text-primary/80"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-foreground whitespace-pre-wrap">
                  {generatedContent.description}
                </div>
              </div>
            )}

            {contentType === 'social-posts' && generatedContent.posts && (
              <div className="space-y-4">
                {Object.entries(generatedContent.posts).map(([platform, post]: [string, any]) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <div key={platform} className="bg-background rounded-xl p-4 border border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground capitalize">
                        {platform}
                      </span>
                      <button
                        onClick={() => handleCopy(post)}
                        className="text-primary hover:text-primary/80"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-foreground whitespace-pre-wrap">{post}</div>
                  </div>
                ))}
              </div>
            )}

            {contentType === 'listing-presentation' && (
              <div className="space-y-4">
                {[
                  { key: 'introduction', label: 'Introduction' },
                  { key: 'marketAnalysis', label: 'Market Analysis' },
                  { key: 'pricingStrategy', label: 'Pricing Strategy' },
                  { key: 'marketingPlan', label: 'Marketing Plan' },
                  { key: 'nextSteps', label: 'Next Steps' },
                ].map(({ key, label }) => (
                  <div key={key} className="bg-background rounded-xl p-4 border border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                      <button
                        onClick={() => handleCopy(generatedContent[key])}
                        className="text-primary hover:text-primary/80"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-foreground whitespace-pre-wrap">
                      {generatedContent[key]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleApplyContent}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center space-x-2 shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/30"
            >
              <Check className="h-4 w-4" />
              <span>Use This Content</span>
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border/40">
        <div className="relative text-white p-6 flex items-center justify-between overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
          <div className="relative flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Content Generator</h2>
              <p className="text-sm text-white/60">Create professional content with AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative text-white hover:bg-white/15 rounded-xl p-2 transition-colors"
            aria-label="Close content generator"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">{renderStepContent()}</div>
      </div>
    </div>
  );
};
