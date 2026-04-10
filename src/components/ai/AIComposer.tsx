import { logger } from '@/lib/logger'
import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, RefreshCw, Copy, Send, Settings, X, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'
import api, { getApiBaseUrl } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'
import { formatCurrency, formatRate } from '@/lib/metricsCalculator'
import { VariationsPanel } from './VariationsPanel'

interface AIComposerProps {
  leadId: string
  conversationId: string
  messageType: 'email' | 'sms' | 'call'
  onMessageGenerated: (message: string, subject?: string) => void
  onClose: () => void
}

interface Variation {
  id: number
  tone: string
  message: {
    subject?: string
    body: string
  }
  predictedResponseRate: number
  reasoning: string
}

interface ComposeResponse {
  success: boolean
  data: {
    message: {
      subject?: string
      body: string
    }
    context: {
      leadName: string
      leadScore: number
      lastContact: string | null
      daysSinceContact: number
      openRate: number
      responseRate: number
      tokens: number
      cost: number
    }
    suggestions: Array<{
      type: string
      text: string
      action?: unknown
    }>
    tokens: number
    cost: number
  }
}

export const AIComposer: React.FC<AIComposerProps> = ({
  leadId,
  conversationId,
  messageType,
  onMessageGenerated,
  onClose
}) => {
  const [initializing, setInitializing] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [draftMessage, setDraftMessage] = useState('') // User's input
  const [message, setMessage] = useState('') // AI enhanced output
  const [subject, setSubject] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [topic, setTopic] = useState('') // Topic for generation
  const { toast } = useToast()
  const accessToken = useAuthStore((s) => s.accessToken)
  
  // Settings state
  const [tone, setTone] = useState<string>('professional')
  const [length, setLength] = useState<string>('standard')
  const [includeCTA, setIncludeCTA] = useState(true)
  const [personalization, setPersonalization] = useState<string>('standard')
  
  // Context state
  const [context, setContext] = useState<ComposeResponse['data']['context'] | null>(null)
  const [suggestions, setSuggestions] = useState<ComposeResponse['data']['suggestions']>([])
  
  // Variations state (Phase 2)
  const [showVariations, setShowVariations] = useState(false)
  const [variations, setVariations] = useState<Variation[]>([])
  const [loadingVariations, setLoadingVariations] = useState(false)
  const [selectedVariationId, setSelectedVariationId] = useState<number | undefined>()
  
  // Phase 3: Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedMessage, setStreamedMessage] = useState('')
  const [useStreaming, setUseStreaming] = useState(false)
  
  // Phase 3: Templates state
  const [templates, setTemplates] = useState<any[]>([]) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState('follow-up')
  const streamAbortRef = useRef<AbortController | null>(null)
  
  // Load preferences and templates on mount
  useEffect(() => {
    const initComposer = async () => {
      try {
        await loadPreferences()
        await loadTemplates()
      } catch (error) {
        logger.error('Init composer error:', error)
      } finally {
        setInitializing(false)
      }
      // Don't auto-generate - wait for user to click Generate or type
    }
    initComposer()
    return () => {
      streamAbortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Phase 3: Load user preferences
  const loadPreferences = async () => {
    try {
      const response = await api.get('/ai/preferences')
      if (response.data.success) {
        const prefs = response.data.data
        setTone(prefs.defaultTone || 'professional')
        setLength(prefs.defaultLength || 'standard')
        setIncludeCTA(prefs.defaultCTA ?? true)
        setPersonalization(prefs.defaultPersonalization || 'standard')
        setUseStreaming(prefs.autoGenerate ?? false)
      }
    } catch (error) {
      logger.error('Load preferences error:', error)
      // Set defaults on error
      setTone('professional')
      setLength('standard')
      setIncludeCTA(true)
      setPersonalization('standard')
    }
  }
  
  // Phase 3: Save preferences when settings change
  const savePreferences = async () => {
    try {
      await api.post('/ai/preferences', {
        defaultTone: tone,
        defaultLength: length,
        defaultCTA: includeCTA,
        defaultPersonalization: personalization,
        autoGenerate: useStreaming
      })
    } catch (error) {
      logger.error('Save preferences error:', error)
    }
  }
  
  // Phase 3: Load templates
  const loadTemplates = async () => {
    try {
      const response = await api.get('/ai/templates')
      if (response.data.success) {
        setTemplates(response.data.data)
      }
    } catch (error) {
      logger.error('Load templates error:', error)
    }
  }
  
  const generateMessage = async () => {
    // Phase 3: Use streaming if enabled
    if (useStreaming) {
      return generateMessageStream()
    }
    
    setGenerating(true)
    try {
      const response = await api.post<ComposeResponse>('/ai/compose', {
        leadId,
        conversationId,
        messageType,
        draftMessage: draftMessage || undefined, // Send user's draft if provided
        settings: {
          tone,
          length,
          includeCTA,
          personalization
        }
      })
      
      if (response.data.success) {
        setMessage(response.data?.data?.message?.body || '')
        if (response.data?.data?.message?.subject) {
          setSubject(response.data.data.message.subject)
        }
        setContext(response.data?.data?.context || {})
        setSuggestions(response.data?.data?.suggestions || [])
      } else {
        toast.error('Failed to generate message')
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      logger.error('Generate message error:', error)
      const aiMsg = getAIUnavailableMessage(error)
      if (aiMsg) {
        toast.error(aiMsg)
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please refresh the page.')
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.message || 'Invalid request')
      } else {
        toast.error('Error generating message. Please try again.')
      }
    } finally {
      setGenerating(false)
    }
  }
  
  // Phase 3: Stream message generation
  const generateMessageStream = async () => {
    // Cancel any in-flight stream
    streamAbortRef.current?.abort()
    const controller = new AbortController()
    streamAbortRef.current = controller
    
    setIsStreaming(true)
    setStreamedMessage('')
    setMessage('')
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/ai/compose/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          leadId,
          conversationId,
          messageType,
          draftMessage: draftMessage || undefined,
          settings: { tone, length, includeCTA, personalization }
        }),
        signal: controller.signal
      })
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('No reader available')
      
      let accumulated = ''
      let receivedChunks = 0
      
      while (true) { // eslint-disable-line no-constant-condition
        const { done, value } = await reader.read()
        if (done) {
          // Connection closed without a 'done' event — incomplete stream
          if (receivedChunks > 0 && accumulated) {
            toast.warning('Stream ended unexpectedly — partial message received. You may want to regenerate.')
            setMessage(accumulated)
          }
          break
        }
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'context') {
                setContext(prev => ({ ...prev!, ...data.data }))
              } else if (data.type === 'token') {
                accumulated += data.data
                receivedChunks++
                setStreamedMessage(accumulated)
              } else if (data.type === 'done') {
                setMessage(accumulated)
                toast.success('Message generated!')
              } else if (data.type === 'error') {
                if (receivedChunks > 0 && accumulated) {
                  // Partial content received before error — preserve it
                  setMessage(accumulated)
                  toast.warning(`Stream error after ${receivedChunks} chunks — partial message saved. ${data.message}`)
                } else {
                  toast.error(data.message)
                }
              }
            } catch (e) {
              logger.warn('Stream JSON parse error for chunk:', line.slice(6, 80))
            }
          }
        }
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      logger.error('Stream error:', error)
      if (error.name === 'AbortError') {
        // User cancelled — do nothing
      } else if (error.message?.includes('401')) {
        toast.error('Session expired. Please refresh the page.')
      } else {
        toast.error('Streaming failed. Please try again or disable streaming in settings.')
        setUseStreaming(false)
      }
    } finally {
      setIsStreaming(false)
    }
  }
  
  // Regenerate when settings change (and save preferences) — debounced
  const settingsTimerRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (context) {
      clearTimeout(settingsTimerRef.current)
      settingsTimerRef.current = setTimeout(() => {
        generateMessage()
        savePreferences()
      }, 600)
    }
    return () => clearTimeout(settingsTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, length, includeCTA, personalization])
  
  // Phase 3: Generate from template
  const generateFromTemplate = async () => {
    if (!selectedTemplate) return
    
    setGenerating(true)
    try {
      const response = await api.post('/ai/templates/generate', {
        templateId: selectedTemplate,
        leadId,
        conversationId,
        tone
      })
      
      if (response.data.success) {
        setMessage(response.data.data.message)
        if (response.data.data.subject) {
          setSubject(response.data.data.subject)
        }
        toast.success('Template applied!')
      }
    } catch (error) {
      logger.error('Generate from template error:', error)
      toast.error('Failed to apply template')
    } finally {
      setGenerating(false)
    }
  }
  
  // Phase 3: Save current message as template
  const saveAsTemplate = async () => {
    if (!message || !templateName) {
      toast.error('Message and name required')
      return
    }
    
    try {
      const response = await api.post('/ai/templates/save', {
        message: subject ? `Subject: ${subject}\n\n${message}` : message,
        name: templateName,
        category: templateCategory
      })
      
      if (response.data.success) {
        toast.success('Template saved!')
        setShowSaveTemplate(false)
        setTemplateName('')
        loadTemplates()
      }
    } catch (error) {
      logger.error('Save template error:', error)
      toast.error('Failed to save template')
    }
  }
  
  const handleUseMessage = () => {
    onMessageGenerated(message, subject)
    onClose()
  }
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message)
    toast.success('Copied to clipboard')
  }
  
  // Load 3 variations (Phase 2)
  const loadVariations = async () => {
    setLoadingVariations(true)
    try {
      const response = await api.post('/ai/compose/variations', {
        leadId,
        conversationId,
        messageType,
        settings: {
          tone,
          length,
          includeCTA,
          personalization
        }
      })
      
      if (response.data.success) {
        setVariations(response.data.data.variations)
        setShowVariations(true)
        toast.success('3 variations generated!')
      } else {
        toast.error('Failed to generate variations')
      }
    } catch (error) {
      logger.error('Generate variations error:', error)
      toast.error('Error generating variations')
    } finally {
      setLoadingVariations(false)
    }
  }
  
  // Handle variation selection
  const handleVariationSelect = (variation: Variation) => {
    setMessage(variation.message.body)
    if (variation.message.subject) {
      setSubject(variation.message.subject)
    }
    setTone(variation.tone)
    setSelectedVariationId(variation.id)
    setShowVariations(false)
    toast.success(`Applied ${variation.tone} variation`)
  }
  
  return (
    <div className="border-t bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-950/10 dark:to-transparent p-4 rounded-xl space-y-4">
      <Card className="border border-purple-200/60 dark:border-purple-800/40 shadow-lg shadow-purple-500/5 w-full flex flex-col rounded-xl">
        <CardContent className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-indigo-500/15">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold">AI Compose</h3>
            <Badge variant="secondary" className="text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-0">
              GPT-4
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Context Banner */}
        {context && (
          <div className="bg-purple-50/60 dark:bg-purple-950/20 rounded-xl p-3 border border-purple-100/60 dark:border-purple-800/30">
            <p className="text-sm text-muted-foreground">
              💡 <strong>{context.leadName}</strong> • 
              {context.lastContact ? ` Last contact ${context.daysSinceContact} days ago` : ' Never contacted'} • 
              Opens {formatRate(context.openRate)}% of emails • 
              Score: {context.leadScore}/100
            </p>
          </div>
        )}
        
        {/* Phase 3: Template Selection */}
        {templates.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Start from Template</label>
            <div className="flex gap-2">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">-- No Template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={generateFromTemplate}
                disabled={!selectedTemplate || generating}
              >
                Apply
              </Button>
            </div>
          </div>
        )}

        {/* Topic Input for Generation Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium">What should this message be about?</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Follow up on property viewing, Schedule a call, New listings"
            className="w-full"
          />
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">💡 Quick topics:</span>
            {['Follow up', 'Property viewing', 'Schedule call', 'New listings', 'Price update'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setTopic(suggestion)}
                className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded-full transition"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        
        {/* Quick Settings */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-2 mr-2">
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Stream</span>
          </div>
          
          <div className="flex-1 min-w-[120px]">
            <select 
              value={tone} 
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="direct">Direct</option>
              <option value="coaching">Coaching</option>
              <option value="casual">Casual</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[120px]">
            <select 
              value={length} 
              onChange={(e) => setLength(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="brief">Brief</option>
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeCTA}
              onChange={(e) => setIncludeCTA(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">CTA</span>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-3 p-3 bg-muted rounded-lg">
            <div>
              <label className="text-sm font-medium">Personalization</label>
              <select 
                value={personalization} 
                onChange={(e) => setPersonalization(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="deep">Deep</option>
              </select>
            </div>
          </div>
        )}
        
        {/* Draft Message Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Your Message Draft</label>
            <span className="text-xs text-muted-foreground">Type or leave empty for AI generation</span>
          </div>
          {messageType === 'email' && (
            <input
              type="text"
              placeholder="Subject line (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              disabled={initializing || generating || isStreaming}
            />
          )}
          <textarea
            placeholder="Start typing your message... AI will enhance it based on lead context and your settings. Leave empty to generate from scratch."
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
            disabled={initializing || generating || isStreaming}
          />
        </div>
        
        {/* AI Processing Status */}
        {initializing && (
          <div className="flex flex-col items-center justify-center py-4 bg-muted/50 rounded-lg">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Loading composer...</span>
          </div>
        )}
        
        {!initializing && (generating || isStreaming) && (
          <div className="flex flex-col items-center justify-center py-4 bg-primary/10 rounded-lg">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mb-2" />
            <span className="text-sm text-muted-foreground">
              {isStreaming ? '✨ Streaming enhanced message...' : '✨ Enhancing your message...'}
            </span>
            <span className="text-xs text-muted-foreground mt-1">Using GPT-4 with lead context</span>
          </div>
        )}
        
        {/* AI Enhanced Output */}
        {message && !generating && !isStreaming && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-success">✨ AI Enhanced Version</label>
              <Badge variant="secondary" className="text-xs">Ready to use</Badge>
            </div>
            <div className="bg-gradient-to-br from-success/10 to-primary/10 rounded-lg p-4 border-2 border-success/20">
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
          </div>
        )}
        
        {/* Streaming Display */}
        {isStreaming && streamedMessage && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">✨ Generating...</label>
            <div className="bg-gradient-to-br from-primary/10 to-purple-50 dark:from-primary/10 dark:to-purple-950 rounded-lg p-4 border-2 border-primary/20">
              <p className="text-sm whitespace-pre-wrap">{streamedMessage}</p>
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"></span>
            </div>
          </div>
        )}
        
        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-warning/10 rounded-lg p-3">
            <p className="text-sm">
              💡 <strong>AI Suggests:</strong> {suggestions[0].text}
            </p>
          </div>
        )}
        
        {/* Variations Panel (Phase 2) */}
        {showVariations && variations.length > 0 && (
          <div className="border-t pt-4">
            <VariationsPanel
              variations={variations}
              onSelect={handleVariationSelect}
              selectedId={selectedVariationId}
            />
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={generateMessage}
            disabled={generating || isStreaming}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {draftMessage ? 'Enhance Draft' : message ? 'Regenerate' : 'Generate'}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={loadVariations}
            disabled={generating || loadingVariations}
          >
            <Layers className="mr-2 h-4 w-4" />
            {loadingVariations ? 'Loading...' : '3 Variations'}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={!message}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSaveTemplate(true)}
            disabled={!message}
          >
            Save Template
          </Button>
          
          <Button
            size="sm"
            onClick={handleUseMessage}
            disabled={!message}
            className="ml-auto"
          >
            <Send className="mr-2 h-4 w-4" />
            Use This
          </Button>
        </div>
        
        {/* Save Template Modal */}
        {showSaveTemplate && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Save as Template</h4>
            <div>
              <label className="text-sm">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Follow-up Hot Lead"
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>
            <div>
              <label className="text-sm">Category</label>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg mt-1"
              >
                <option value="follow-up">Follow-up</option>
                <option value="introduction">Introduction</option>
                <option value="listing">Listing</option>
                <option value="nurture">Nurture</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSaveTemplate(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveAsTemplate}
                disabled={!templateName}
              >
                Save Template
              </Button>
            </div>
          </div>
        )}
        
        {/* Token Info */}
        {context && (
          <p className="text-xs text-muted-foreground text-center">
            ~{context.tokens} tokens • ${formatCurrency(context.cost || 0)}
          </p>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
