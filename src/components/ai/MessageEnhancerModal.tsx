import { logger } from '@/lib/logger'
import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Sparkles, Loader2, Check, X, Type, Minimize2, Undo2 } from 'lucide-react';
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
type QuickAction = 'grammar' | 'shorter' | 'longer' | 'specific';

const TONE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Business-appropriate and polished' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'urgent', label: 'Urgent', description: 'Conveys importance and timeliness' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'persuasive', label: 'Persuasive', description: 'Compelling and convincing' },
  { value: 'formal', label: 'Formal', description: 'Polished and ceremonious' },
];

const QUICK_ACTIONS: { value: QuickAction; label: string; icon: typeof Type; instruction: string }[] = [
  { value: 'grammar', label: 'Fix Grammar', icon: Type, instruction: 'Fix grammar and spelling only, keep the same tone and meaning' },
  { value: 'shorter', label: 'Make Shorter', icon: Minimize2, instruction: 'Make this significantly shorter and more concise while keeping the key message' },
  { value: 'longer', label: 'Add Detail', icon: Type, instruction: 'Expand this with more detail and context while keeping the same tone' },
  { value: 'specific', label: 'More Specific', icon: Type, instruction: 'Make this more specific with concrete details and action items' },
];

/**
 * Compute word-level diff between original and enhanced text.
 * Returns enhanced text as spans with highlight classes for changed words.
 */
function renderDiffHighlight(original: string, enhanced: string): React.ReactNode[] {
  const origWords = original.split(/(\s+)/);
  const enhWords = enhanced.split(/(\s+)/);
  const result: React.ReactNode[] = [];

  const origSet = new Set(origWords.filter(w => w.trim()));
  let i = 0;
  for (const word of enhWords) {
    if (!word.trim()) {
      result.push(word);
    } else if (origSet.has(word)) {
      result.push(word);
    } else {
      result.push(
        <mark key={i} className="bg-success/20 text-success-foreground dark:bg-success/15 rounded-sm px-0.5">
          {word}
        </mark>
      );
    }
    i++;
  }
  return result;
}

export function MessageEnhancerModal({
  isOpen,
  onClose,
  originalText,
  onApply,
}: MessageEnhancerModalProps) {
  const [selectedTone, setSelectedTone] = useState<Tone>('professional');
  const [enhancedText, setEnhancedText] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceFailed, setEnhanceFailed] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<QuickAction | null>(null);
  const [showDiff, setShowDiff] = useState(true);
  const previousEnhancedRef = useRef<string>('');
  const { toast } = useToast();

  const handleEnhance = useCallback(async (customInstruction?: string) => {
    if (!originalText.trim()) {
      toast.error('Please enter some text to enhance');
      return;
    }

    setIsEnhancing(true);
    setEnhanceFailed(false);
    if (enhancedText) {
      previousEnhancedRef.current = enhancedText;
    }
    try {
      const toneOrInstruction = customInstruction || selectedTone;
      const result = await enhanceMessage(originalText, toneOrInstruction as Parameters<typeof enhanceMessage>[1]);
      setEnhancedText(result.data.enhanced);
      toast.success('Message enhanced successfully!');
    } catch (error) {
      logger.error('Enhancement error:', error);
      setEnhanceFailed(true);
      const aiMsg = getAIUnavailableMessage(error);
      if (aiMsg) {
        toast.error(aiMsg);
      } else {
        toast.error('Failed to enhance message. Please try again.');
      }
    } finally {
      setIsEnhancing(false);
      setActiveQuickAction(null);
    }
  }, [originalText, selectedTone, enhancedText, toast]);

  const handleQuickAction = useCallback(async (action: QuickAction) => {
    setActiveQuickAction(action);
    const actionConfig = QUICK_ACTIONS.find(a => a.value === action);
    if (actionConfig) {
      await handleEnhance(actionConfig.instruction);
    }
  }, [handleEnhance]);

  const handleUndo = useCallback(() => {
    if (previousEnhancedRef.current) {
      setEnhancedText(previousEnhancedRef.current);
      previousEnhancedRef.current = '';
      toast.success('Reverted to previous version');
    }
  }, [toast]);

  const handleApply = () => {
    if (enhancedText) {
      onApply(enhancedText);
      onClose();
      toast.success('Enhanced message applied!');
    }
  };

  const handleTryAnotherTone = () => {
    previousEnhancedRef.current = enhancedText;
    setEnhancedText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="message-enhancer-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-border/40" tabIndex={-1}>
        {/* Header */}
        <div className="relative flex items-center justify-between p-5 border-b overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/30" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-sm shadow-primary/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 id="message-enhancer-title" className="text-lg font-semibold leading-tight text-foreground">AI Message Enhancer</h2>
              <p className="text-sm text-muted-foreground">Transform your message with AI-powered rewriting</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="relative hover:bg-background/50 transition-colors rounded-xl"
            aria-label="Close enhancer"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quick Actions */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Quick Actions
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.value)}
                  disabled={isEnhancing}
                  className={`gap-1.5 transition-all ${
                    activeQuickAction === action.value ? 'border-primary bg-primary/10' : ''
                  }`}
                >
                  <action.icon className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tone Selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-3">
              Or Select Tone
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setSelectedTone(tone.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedTone === tone.value
                      ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                      : 'border-border/60 hover:border-primary/40 hover:bg-muted/50 transition-colors'
                  }`}
                >
                  <div className="font-medium text-sm">{tone.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{tone.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Text Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Original Text */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Original Message
              </label>
              <div className="border border-border rounded-lg p-4 bg-muted min-h-[200px] max-h-[300px] overflow-y-auto">
                <p className="text-sm text-foreground whitespace-pre-wrap">{originalText}</p>
              </div>
            </div>

            {/* Enhanced Text with Diff Highlighting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Enhanced Message
                </label>
                {enhancedText && (
                  <button
                    onClick={() => setShowDiff(!showDiff)}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    {showDiff ? 'Hide changes' : 'Show changes'}
                  </button>
                )}
              </div>
              <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 min-h-[200px] max-h-[300px] overflow-y-auto">
                {isEnhancing ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {activeQuickAction
                        ? `Applying ${QUICK_ACTIONS.find(a => a.value === activeQuickAction)?.label?.toLowerCase()}...`
                        : 'Enhancing your message...'}
                    </p>
                  </div>
                ) : enhancedText ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {showDiff ? renderDiffHighlight(originalText, enhancedText) : enhancedText}
                  </p>
                ) : enhanceFailed ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <p className="text-sm text-destructive text-center">Enhancement failed. Please try again.</p>
                    <Button
                      onClick={() => handleEnhance()}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Loader2 className="h-4 w-4" />
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground text-center">
                      Click &quot;Enhance&quot; or a Quick Action to see the AI-improved version
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/50">
          <div className="flex gap-2">
            {enhancedText && !isEnhancing && (
              <>
                <Button
                  onClick={handleTryAnotherTone}
                  variant="outline"
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Try Another Tone
                </Button>
                {previousEnhancedRef.current && (
                  <Button
                    onClick={handleUndo}
                    variant="outline"
                    className="gap-2"
                  >
                    <Undo2 className="h-4 w-4" />
                    Undo
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {!enhancedText && (
              <Button
                onClick={() => handleEnhance()}
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
                className="gap-2 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70"
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
