import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { enhanceMessage } from '@/services/aiService';
import { useToast } from '@/hooks/useToast';
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability';

interface MessageEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onApply: (enhancedText: string) => void;
}

type Tone = 'professional' | 'friendly' | 'urgent' | 'casual' | 'persuasive' | 'formal';

const TONE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Business-appropriate and polished' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'urgent', label: 'Urgent', description: 'Conveys importance and timeliness' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'persuasive', label: 'Persuasive', description: 'Compelling and convincing' },
  { value: 'formal', label: 'Formal', description: 'Polished and ceremonious' },
];

export function MessageEnhancerModal({
  isOpen,
  onClose,
  originalText,
  onApply,
}: MessageEnhancerModalProps) {
  const [selectedTone, setSelectedTone] = useState<Tone>('professional');
  const [enhancedText, setEnhancedText] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();

  const handleEnhance = async () => {
    if (!originalText.trim()) {
      toast.error('Please enter some text to enhance');
      return;
    }

    setIsEnhancing(true);
    try {
      const result = await enhanceMessage(originalText, selectedTone);
      setEnhancedText(result.data.enhanced);
      toast.success('Message enhanced successfully!');
    } catch (error) {
      console.error('Enhancement error:', error);
      const aiMsg = getAIUnavailableMessage(error);
      if (aiMsg) {
        toast.error(aiMsg);
      } else {
        toast.error('Failed to enhance message. Please try again.');
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApply = () => {
    if (enhancedText) {
      onApply(enhancedText);
      onClose();
      toast.success('Enhanced message applied!');
    }
  };

  const handleTryAnotherTone = () => {
    setEnhancedText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="message-enhancer-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" tabIndex={-1}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 id="message-enhancer-title" className="text-xl font-bold text-gray-900">AI Message Enhancer</h2>
              <p className="text-sm text-gray-600">Transform your message with AI-powered rewriting</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-white/50"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tone Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Tone
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setSelectedTone(tone.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedTone === tone.value
                      ? 'border-purple-500 bg-purple-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{tone.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{tone.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Text Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Original Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Original Message
              </label>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[200px] max-h-[300px] overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{originalText}</p>
              </div>
            </div>

            {/* Enhanced Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enhanced Message
              </label>
              <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50 min-h-[200px] max-h-[300px] overflow-y-auto">
                {isEnhancing ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
                    <p className="text-sm text-gray-600">Enhancing your message...</p>
                  </div>
                ) : enhancedText ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{enhancedText}</p>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500 text-center">
                      Click "Enhance" to see the AI-improved version
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex gap-2">
            {enhancedText && !isEnhancing && (
              <Button
                onClick={handleTryAnotherTone}
                variant="outline"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Try Another Tone
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {!enhancedText && (
              <Button
                onClick={handleEnhance}
                disabled={isEnhancing || !originalText.trim()}
                className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Enhance
                  </>
                )}
              </Button>
            )}
            {enhancedText && !isEnhancing && (
              <Button
                onClick={handleApply}
                className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Check className="h-4 w-4" />
                Apply Enhanced Message
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
