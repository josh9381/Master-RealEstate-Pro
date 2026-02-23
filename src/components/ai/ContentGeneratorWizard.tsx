import React, { useState } from 'react';
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability';
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
  onApply: (content: any) => void;
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
  const [step, setStep] = useState<'type' | 'details' | 'result'>('type');
  const [contentType, setContentType] = useState<ContentType>('email-sequence');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
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
    setIsGenerating(true);
    try {
      let endpoint = '';
      let body: any = {};

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
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      
      if (result.success) {
        setGeneratedContent(result.data);
        setStep('result');
      } else {
        alert(result.message || 'Generation failed');
      }
    } catch (error) {
      console.error('Content generation error:', error);
      const aiMsg = getAIUnavailableMessage(error);
      alert(aiMsg || 'Failed to generate content. Please try again.');
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
          <h3 className="text-lg font-semibold text-gray-900">Choose Content Type</h3>
          <div className="grid grid-cols-2 gap-4">
            {contentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => {
                    setContentType(type.value as ContentType);
                    setStep('details');
                  }}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <Icon className="h-6 w-6 text-purple-600 mb-2" />
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-500">{type.description}</div>
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
            <h3 className="text-lg font-semibold text-gray-900">Content Details</h3>
            <button
              onClick={() => setStep('type')}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              Change Type
            </button>
          </div>

          {contentType === 'email-sequence' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Name (Optional)
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type (Optional)
                </label>
                <input
                  type="text"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  placeholder="Single Family Home"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Goal *
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., nurture new leads, re-engage cold leads"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {toneOptions.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Emails
                </label>
                <input
                  type="number"
                  value={sequenceLength}
                  onChange={(e) => setSequenceLength(parseInt(e.target.value))}
                  min="3"
                  max="7"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {contentType === 'sms' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Name (Optional)
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Goal *
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., schedule showing, confirm appointment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, City, State"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type *
                </label>
                <input
                  type="text"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  placeholder="Single Family Home"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    placeholder="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    placeholder="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Square Feet
                  </label>
                  <input
                    type="number"
                    value={squareFeet}
                    onChange={(e) => setSquareFeet(e.target.value)}
                    placeholder="2000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Features (comma-separated)
                </label>
                <input
                  type="text"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Pool, Updated Kitchen, Hardwood Floors"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Neighborhood
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Downtown, near schools and parks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {contentType === 'social-posts' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic *</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., new listing, open house, market update"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Address (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{platform.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, City, State"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type *
                </label>
                <input
                  type="text"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  placeholder="Single Family Home"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Value
                </label>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="500000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Market Trends (Optional)
                </label>
                <textarea
                  value={marketTrends}
                  onChange={(e) => setMarketTrends(e.target.value)}
                  placeholder="e.g., Sellers market, low inventory, prices up 5%"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !goal && (contentType === 'email-sequence' || contentType === 'sms')}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <h3 className="text-lg font-semibold text-gray-900">Generated Content</h3>
            <button
              onClick={() => setStep('details')}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              Generate Again
            </button>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            {contentType === 'email-sequence' && generatedContent.emails && (
              <div className="space-y-4">
                {generatedContent.emails.map((email: any, index: number) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        Email {index + 1} • Day {email.dayOffset || index * 3}
                      </span>
                      <button
                        onClick={() => handleCopy(`Subject: ${email.subject}\n\n${email.body}`)}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="font-semibold text-gray-900 mb-2">
                      Subject: {email.subject}
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">{email.body}</div>
                  </div>
                ))}
              </div>
            )}

            {contentType === 'sms' && generatedContent.message && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    SMS ({generatedContent.length} characters)
                  </span>
                  <button
                    onClick={() => handleCopy(generatedContent.message)}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-gray-900">{generatedContent.message}</div>
              </div>
            )}

            {contentType === 'property-description' && generatedContent.description && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    Property Description ({generatedContent.wordCount} words)
                  </span>
                  <button
                    onClick={() => handleCopy(generatedContent.description)}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-gray-900 whitespace-pre-wrap">
                  {generatedContent.description}
                </div>
              </div>
            )}

            {contentType === 'social-posts' && generatedContent.posts && (
              <div className="space-y-4">
                {Object.entries(generatedContent.posts).map(([platform, post]: [string, any]) => (
                  <div key={platform} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500 capitalize">
                        {platform}
                      </span>
                      <button
                        onClick={() => handleCopy(post)}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-gray-900 whitespace-pre-wrap">{post}</div>
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
                  <div key={key} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">{label}</span>
                      <button
                        onClick={() => handleCopy(generatedContent[key])}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-gray-900 whitespace-pre-wrap">
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
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleApplyContent}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center space-x-2"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wand2 className="h-6 w-6" />
            <h2 className="text-2xl font-bold">AI Content Generator</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">{renderStepContent()}</div>
      </div>
    </div>
  );
};
