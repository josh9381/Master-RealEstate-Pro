import React, { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Copy, Send, Settings, X, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'
import api from '@/lib/api'
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'
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
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState('follow-up')
  
  // Load preferences and templates on mount
  useEffect(() => {
    const initComposer = async () => {
      await loadPreferences()
      await loadTemplates()
      // Don't auto-generate - wait for user to click Generate or type
    }
    initComposer()
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
      console.error('Load preferences error:', error)
      // Set defaults on error
      setTone('professional')
      setLength('standard')
      setIncludeCTA(true)
      setPersonalization('standard')
    } finally {
      setInitializing(false)
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
      console.error('Save preferences error:', error)
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
      console.error('Load templates error:', error)
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
    } catch (error: any) {
      console.error('Generate message error:', error)
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
    setIsStreaming(true)
    setStreamedMessage('')
    setMessage('')
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/compose/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          leadId,
          conversationId,
          messageType,
          draftMessage: draftMessage || undefined,
          settings: { tone, length, includeCTA, personalization }
        })
      })
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('No reader available')
      
      let accumulated = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
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
                setStreamedMessage(accumulated)
              } else if (data.type === 'done') {
                setMessage(accumulated)
                toast.success('Message generated!')
              } else if (data.type === 'error') {
                toast.error(data.message)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Stream error:', error)
      if (error.message?.includes('401')) {
        toast.error('Session expired. Please refresh the page.')
      } else {
        toast.error('Streaming failed, trying standard generation...')
        setUseStreaming(false)
        // Don't call generateMessage() again as it will cause infinite loop
      }
    } finally {
      setIsStreaming(false)
    }
  }
  
  // Regenerate when settings change (and save preferences)
  useEffect(() => {
    if (context) {
      generateMessage()
      savePreferences()
    }
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
      console.error('Generate from template error:', error)
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
      console.error('Save template error:', error)
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
      console.error('Generate variations error:', error)
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
    <div className="border-t bg-gradient-to-b from-blue-50 to-white p-4 rounded-lg space-y-4 shadow-inner">
      <Card className="border-2 border-blue-500 shadow-xl w-full flex flex-col">
        <CardContent className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">AI Compose</h3>
            <Badge variant="secondary" className="text-xs">
              GPT-4
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Context Banner */}
        {context && (
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              💡 <strong>{context.leadName}</strong> • 
              {context.lastContact ? ` Last contact ${context.daysSinceContact} days ago` : ' Never contacted'} • 
              Opens {context.openRate}% of emails • 
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
                className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded-full transition"
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
          <div className="flex flex-col items-center justify-center py-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-500 mb-2" />
            <span className="text-sm text-muted-foreground">Loading composer...</span>
          </div>
        )}
        
        {!initializing && (generating || isStreaming) && (
          <div className="flex flex-col items-center justify-center py-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mb-2" />
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
              <label className="text-sm font-medium text-green-600 dark:text-green-400">✨ AI Enhanced Version</label>
              <Badge variant="secondary" className="text-xs">Ready to use</Badge>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
          </div>
        )}
        
        {/* Streaming Display */}
        {isStreaming && streamedMessage && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-600 dark:text-blue-400">✨ Generating...</label>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
              <p className="text-sm whitespace-pre-wrap">{streamedMessage}</p>
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
            </div>
          </div>
        )}
        
        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3">
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
            ~{context.tokens} tokens • ${context.cost?.toFixed(4)}
          </p>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
