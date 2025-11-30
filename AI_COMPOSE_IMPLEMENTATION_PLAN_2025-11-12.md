# 🎯 AI Compose Implementation Plan
**Date:** November 12, 2025  
**Vision:** Transform Communication Hub with inline AI message composer  
**Timeline:** 4 Weeks (MVP in 1 week)  
**Status:** 📋 Planning Phase

---

## 🎬 Executive Summary

Transform the Communication Hub's basic "AI Compose" button into a **powerful inline AI composer** that generates personalized, context-aware messages in real-time. This feature will save agents 5-10 minutes per message while improving response rates by 15%+.

**Key Innovation:** AI acts as a communication coach, not just a text generator.

---

## 📐 System Architecture

### Current State (✅ Already Built)
- ✅ OpenAI GPT-4 integration in backend
- ✅ AI Assistant with function calling
- ✅ Message composition functions (`compose_email`, `compose_sms`, `compose_script`)
- ✅ Intelligence service (predictions, recommendations)
- ✅ Communication Hub with thread view
- ✅ Basic "AI Compose" button (currently opens modal)

### Target State (🎯 To Build)
- 🎯 Inline AI Composer in message reply area
- 🎯 Real-time generation with streaming
- 🎯 Smart context banner with lead insights
- 🎯 3 variations with predictive scoring
- 🎯 Progressive disclosure (quick vs advanced settings)
- 🎯 Template integration (save & load)
- 🎯 Performance analytics & tracking

---

## 🏗️ Implementation Phases

---

## **PHASE 1: MVP - Core Inline Composer** ⏱️ Week 1

### **Goal:** Replace modal with inline composer that generates messages in reply area

### Backend Tasks

#### 1.1 Create AI Compose API Endpoint
**File:** `backend/src/controllers/ai.controller.ts`

```typescript
/**
 * POST /api/ai/compose
 * Generate message with full context and settings
 */
export const composeMessage = async (req: Request, res: Response) => {
  try {
    const { 
      leadId, 
      conversationId, 
      messageType, // 'email' | 'sms' | 'call'
      settings 
    } = req.body
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId

    // Gather context
    const context = await gatherMessageContext(
      leadId, 
      conversationId, 
      organizationId
    )

    // Generate message
    const result = await generateContextualMessage(
      context,
      messageType,
      settings,
      userId,
      organizationId
    )

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to compose message' 
    })
  }
}
```

#### 1.2 Context Gathering Service
**File:** `backend/src/services/message-context.service.ts` **(NEW)**

```typescript
export interface MessageContext {
  lead: {
    id: string
    name: string
    email: string
    phone: string
    score: number
    status: string
    interests: string[]
    budget?: number
    location?: string
  }
  engagement: {
    lastContact: Date | null
    totalMessages: number
    openRate: number
    responseRate: number
    avgResponseTime: number
  }
  conversation: {
    id: string
    messageCount: number
    recentMessages: Array<{
      role: 'user' | 'assistant'
      content: string
      timestamp: Date
    }>
  }
  properties: Array<{
    id: string
    address: string
    price: number
    type: string
    viewed: boolean
  }>
}

export async function gatherMessageContext(
  leadId: string,
  conversationId: string,
  organizationId: string
): Promise<MessageContext> {
  // Gather lead data
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: {
      tags: true,
      activities: { 
        orderBy: { createdAt: 'desc' }, 
        take: 10 
      },
      notes: { 
        orderBy: { createdAt: 'desc' }, 
        take: 5 
      }
    }
  })

  // Calculate engagement metrics
  const messages = await prisma.message.findMany({
    where: { conversationId, organizationId },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  // Calculate open/response rates
  const emailMetrics = calculateEmailMetrics(messages)
  
  // Get property interactions
  const properties = await getLeadPropertyInteractions(leadId)

  return {
    lead: formatLeadData(lead),
    engagement: emailMetrics,
    conversation: formatConversation(messages),
    properties
  }
}
```

#### 1.3 Enhanced Message Generation
**File:** `backend/src/services/ai-compose.service.ts` **(NEW)**

```typescript
export interface ComposeSettings {
  tone: 'professional' | 'friendly' | 'direct' | 'coaching' | 'casual'
  length: 'brief' | 'standard' | 'detailed'
  includeCTA: boolean
  personalization: 'basic' | 'standard' | 'deep'
  templateBase?: string
  includeProperties?: string[]
  addUrgency?: boolean
}

export async function generateContextualMessage(
  context: MessageContext,
  messageType: 'email' | 'sms' | 'call',
  settings: ComposeSettings,
  userId: string,
  organizationId: string
) {
  const openAI = getOpenAIService()
  
  // Build enhanced prompt
  const prompt = buildComposePrompt(context, messageType, settings)
  
  // Generate with GPT-4
  const response = await openAI.chat(
    [{ role: 'user', content: prompt }],
    userId,
    organizationId
  )

  // Parse and structure response
  return {
    message: parseMessageResponse(response.response, messageType),
    context: buildContextSummary(context),
    suggestions: generateSmartSuggestions(context, settings),
    tokens: response.tokens,
    cost: response.cost
  }
}

function buildComposePrompt(
  context: MessageContext,
  messageType: string,
  settings: ComposeSettings
): string {
  const { lead, engagement, conversation } = context
  
  return `Generate a ${settings.tone} ${messageType} for a real estate lead.

LEAD CONTEXT:
- Name: ${lead.name}
- Score: ${lead.score}/100 (${getScoreLabel(lead.score)})
- Status: ${lead.status}
- Interests: ${lead.interests.join(', ')}
- Budget: ${lead.budget ? formatCurrency(lead.budget) : 'Not specified'}
- Location: ${lead.location || 'Not specified'}

ENGAGEMENT DATA:
- Last Contact: ${engagement.lastContact ? formatDate(engagement.lastContact) : 'Never contacted'}
- Total Messages: ${engagement.totalMessages}
- Open Rate: ${engagement.openRate}%
- Response Rate: ${engagement.responseRate}%
- Avg Response Time: ${engagement.avgResponseTime} hours

CONVERSATION HISTORY (Last 3 messages):
${formatConversationHistory(conversation)}

PROPERTIES VIEWED:
${context.properties.length > 0 
  ? context.properties.map(p => `- ${p.address} ($${p.price})`).join('\n')
  : 'None yet'}

REQUIREMENTS:
- Tone: ${settings.tone}
- Length: ${settings.length} (${getLengthGuide(settings.length)})
- CTA: ${settings.includeCTA ? 'Include clear call-to-action' : 'No hard CTA'}
- Personalization: ${settings.personalization}
- ${messageType === 'email' ? 'Include subject line (start with "Subject:")' : ''}
- ${messageType === 'sms' ? 'Max 160 characters' : ''}
- Sound natural and authentic, not robotic
- Reference specific context when relevant
- ${settings.addUrgency ? 'Add gentle urgency (limited time, high interest)' : ''}

Generate the message:`
}
```

### Frontend Tasks

#### 1.4 AI Composer Component
**File:** `src/components/ai/AIComposer.tsx` **(NEW)**

```typescript
import React, { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Copy, Send, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/hooks/useToast'

interface AIComposerProps {
  leadId: string
  conversationId: string
  messageType: 'email' | 'sms' | 'call'
  onMessageGenerated: (message: string, subject?: string) => void
  onClose: () => void
}

export const AIComposer: React.FC<AIComposerProps> = ({
  leadId,
  conversationId,
  messageType,
  onMessageGenerated,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { toast } = useToast()
  
  // Settings state
  const [tone, setTone] = useState<string>('professional')
  const [length, setLength] = useState<string>('standard')
  const [includeCTA, setIncludeCTA] = useState(true)
  const [personalization, setPersonalization] = useState<string>('standard')
  
  // Context state
  const [context, setContext] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  
  const generateMessage = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage(data.data.message.body)
        if (data.data.message.subject) {
          setSubject(data.data.message.subject)
        }
        setContext(data.data.context)
        setSuggestions(data.data.suggestions)
      } else {
        toast.error('Failed to generate message')
      }
    } catch (error) {
      toast.error('Error generating message')
    } finally {
      setGenerating(false)
    }
  }
  
  const handleUseMessage = () => {
    onMessageGenerated(message, subject)
    onClose()
  }
  
  if (!isOpen) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setIsOpen(true)
          generateMessage()
        }}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        AI Compose
      </Button>
    )
  }
  
  return (
    <Card className="border-2 border-blue-500 shadow-lg">
      <CardContent className="p-4 space-y-4">
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
          >
            ×
          </Button>
        </div>
        
        {/* Context Banner */}
        {context && (
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              💡 <strong>{context.leadName}</strong> • 
              {context.lastContact ? ` Last contact ${context.daysSinceContact} days ago` : ' Never contacted'} • 
              Opens {context.openRate}% of emails
            </p>
          </div>
        )}
        
        {/* Quick Settings */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex-1 min-w-[120px]">
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="coaching">Coaching</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[120px]">
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger>
                <SelectValue placeholder="Length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={includeCTA}
              onCheckedChange={setIncludeCTA}
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
              <Select value={personalization} onValueChange={setPersonalization}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="deep">Deep</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        {/* Generated Message */}
        {generating ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-muted-foreground">Generating...</span>
          </div>
        ) : message ? (
          <div className="space-y-3">
            {subject && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <p className="text-sm font-medium">{subject}</p>
              </div>
            )}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
          </div>
        ) : null}
        
        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3">
            <p className="text-sm">
              💡 <strong>AI Suggests:</strong> {suggestions[0].text}
            </p>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={generateMessage}
            disabled={generating}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(message)
              toast.success('Copied to clipboard')
            }}
            disabled={!message}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
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
        
        {/* Token Info */}
        {context && (
          <p className="text-xs text-muted-foreground text-center">
            ~{context.tokens} tokens • ${context.cost?.toFixed(4)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

#### 1.5 Integrate into CommunicationInbox
**File:** `src/pages/communication/CommunicationInbox.tsx`

**Changes needed:**
1. Import AIComposer component
2. Replace `handleAICompose()` function to toggle inline composer
3. Pass generated message to reply text area
4. Add state management for composer

```typescript
// Add state
const [showAIComposer, setShowAIComposer] = useState(false)

// Update handleAICompose
const handleAICompose = () => {
  setShowAIComposer(!showAIComposer)
}

// Handle generated message
const handleMessageGenerated = (message: string, subject?: string) => {
  setReplyText(message)
  if (subject) {
    setEmailSubject(subject)
  }
  setShowAIComposer(false)
}

// In render, replace AI Compose button section:
{showAIComposer ? (
  <AIComposer
    leadId={selectedThread.lead?.id || ''}
    conversationId={selectedThread.id.toString()}
    messageType={selectedChannel === 'sms' ? 'sms' : 'email'}
    onMessageGenerated={handleMessageGenerated}
    onClose={() => setShowAIComposer(false)}
  />
) : (
  <Button
    size="sm"
    variant="outline"
    onClick={handleAICompose}
  >
    <Sparkles className="mr-2 h-4 w-4" />
    AI Compose
  </Button>
)}
```

### Testing Phase 1
- [ ] AI Compose opens inline in reply area
- [ ] Message generates with lead context
- [ ] Tone/length settings work
- [ ] CTA toggle works
- [ ] Generated message populates reply box
- [ ] Subject line populates (for email)
- [ ] Token count displayed
- [ ] Copy button works
- [ ] Regenerate works

---

## **PHASE 2: Smart Features** ⏱️ Week 2

### **Goal:** Add variations, predictive analytics, and AI suggestions

### Backend Tasks

#### 2.1 Variations Generator
**File:** `backend/src/services/ai-compose.service.ts`

```typescript
export async function generateVariations(
  context: MessageContext,
  messageType: string,
  baseSettings: ComposeSettings,
  userId: string,
  organizationId: string
) {
  const openAI = getOpenAIService()
  
  // Generate 3 variations with different tones
  const variations = await Promise.all([
    generateWithTone('professional', context, messageType, baseSettings, openAI, userId, organizationId),
    generateWithTone('friendly', context, messageType, baseSettings, openAI, userId, organizationId),
    generateWithTone('direct', context, messageType, baseSettings, openAI, userId, organizationId)
  ])
  
  // Score each variation
  const scoredVariations = await Promise.all(
    variations.map(async (v, i) => ({
      id: i,
      tone: ['professional', 'friendly', 'direct'][i],
      message: v,
      predictedResponseRate: await predictResponseRate(v, context),
      reasoning: generateReasoning(v, context)
    }))
  )
  
  return scoredVariations.sort((a, b) => b.predictedResponseRate - a.predictedResponseRate)
}
```

#### 2.2 Response Rate Predictor
**File:** `backend/src/services/prediction.service.ts` **(NEW)**

```typescript
export async function predictResponseRate(
  message: string,
  context: MessageContext
): Promise<number> {
  // Factors that influence response rate
  const factors = {
    // Message factors
    length: message.length,
    hasQuestion: /\?/g.test(message),
    hasCTA: /call|schedule|book|meet|visit/i.test(message),
    personalizedTerms: countPersonalizedTerms(message, context),
    
    // Lead factors
    engagementHistory: context.engagement.responseRate,
    leadScore: context.lead.score,
    daysSinceContact: getDaysSinceContact(context),
    
    // Time factors
    timeOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay()
  }
  
  // Weighted scoring algorithm
  let score = 50 // Base score
  
  // Length scoring (sweet spot: 50-150 words)
  const wordCount = message.split(' ').length
  if (wordCount >= 50 && wordCount <= 150) score += 10
  else if (wordCount < 30 || wordCount > 200) score -= 10
  
  // Question bonus
  if (factors.hasQuestion) score += 8
  
  // CTA bonus
  if (factors.hasCTA) score += 5
  
  // Personalization bonus (up to 15 points)
  score += Math.min(factors.personalizedTerms * 3, 15)
  
  // Historical engagement (30% weight)
  score += (factors.engagementHistory - 50) * 0.3
  
  // Lead score influence (20% weight)
  score += (factors.leadScore - 50) * 0.2
  
  // Recency penalty
  if (factors.daysSinceContact > 7) score -= 5
  if (factors.daysSinceContact > 14) score -= 10
  
  // Time optimization
  if (factors.timeOfDay >= 9 && factors.timeOfDay <= 11) score += 5 // Morning sweet spot
  if (factors.dayOfWeek === 0 || factors.dayOfWeek === 6) score -= 8 // Weekend penalty
  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, Math.round(score)))
}
```

#### 2.3 Smart Suggestions Engine
**File:** `backend/src/services/suggestions.service.ts` **(NEW)**

```typescript
export function generateSmartSuggestions(
  context: MessageContext,
  currentSettings: ComposeSettings
): Array<{
  type: 'tone' | 'length' | 'timing' | 'content'
  text: string
  action?: any
}> {
  const suggestions = []
  
  // Engagement-based suggestions
  if (context.engagement.openRate < 30) {
    suggestions.push({
      type: 'content',
      text: 'Low open rate detected. Try a more compelling subject line.'
    })
  }
  
  if (context.engagement.responseRate > 70) {
    suggestions.push({
      type: 'tone',
      text: `This lead responds well to your messages. Current tone is working!`
    })
  }
  
  // Lead score suggestions
  if (context.lead.score > 80 && currentSettings.tone !== 'direct') {
    suggestions.push({
      type: 'tone',
      text: 'Hot lead (80+ score) - Try "Direct" tone for faster response',
      action: { recommendedTone: 'direct' }
    })
  }
  
  // Timing suggestions
  const daysSince = getDaysSinceContact(context)
  if (daysSince > 7) {
    suggestions.push({
      type: 'timing',
      text: `⚠️ No contact for ${daysSince} days - Use friendly, re-engagement approach`
    })
  }
  
  // Length suggestions based on history
  if (context.conversation.messageCount > 10 && currentSettings.length === 'detailed') {
    suggestions.push({
      type: 'length',
      text: 'Long conversation history - Shorter messages may work better'
    })
  }
  
  return suggestions
}
```

### Frontend Tasks

#### 2.4 Variations Panel Component
**File:** `src/components/ai/VariationsPanel.tsx` **(NEW)**

```typescript
import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TrendingUp, Star } from 'lucide-react'

interface Variation {
  id: number
  tone: string
  message: string
  predictedResponseRate: number
  reasoning: string
}

interface VariationsPanelProps {
  variations: Variation[]
  onSelect: (variation: Variation) => void
}

export const VariationsPanel: React.FC<VariationsPanelProps> = ({
  variations,
  onSelect
}) => {
  const best = variations[0] // Highest predicted rate
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">3 Variations</h4>
      
      {variations.map((variation) => (
        <Card 
          key={variation.id}
          className={`cursor-pointer hover:border-blue-500 transition ${
            variation.id === best.id ? 'border-blue-500 border-2' : ''
          }`}
          onClick={() => onSelect(variation)}
        >
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{variation.tone}</Badge>
                {variation.id === best.id && (
                  <Badge variant="default" className="gap-1">
                    <Star className="h-3 w-3" />
                    Best
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-semibold">{variation.predictedResponseRate}%</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {variation.message}
            </p>
            
            <p className="text-xs text-muted-foreground">
              📊 {variation.reasoning}
            </p>
            
            <Button size="sm" variant="outline" className="w-full">
              Use This
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

#### 2.5 Update AIComposer with Variations
Add variations support to AIComposer:

```typescript
// Add state
const [showVariations, setShowVariations] = useState(false)
const [variations, setVariations] = useState<any[]>([])

// Add variations button
<Button
  size="sm"
  variant="outline"
  onClick={loadVariations}
  disabled={generating}
>
  <Sparkles className="mr-2 h-4 w-4" />
  3 Variations
</Button>

// Variations modal/panel
{showVariations && (
  <VariationsPanel
    variations={variations}
    onSelect={(v) => {
      setMessage(v.message)
      setShowVariations(false)
    }}
  />
)}
```

### Testing Phase 2
- [ ] 3 variations generate successfully
- [ ] Variations have different tones
- [ ] Response rate predictions display
- [ ] Best variation highlighted
- [ ] Selecting variation updates message
- [ ] Smart suggestions appear based on context
- [ ] Suggestions are contextually relevant

---

## **PHASE 3: Polish & UX** ⏱️ Week 3

### **Goal:** Streaming responses, template integration, preferences

### Backend Tasks

#### 3.1 Streaming Support
**File:** `backend/src/controllers/ai.controller.ts`

Add streaming endpoint:
```typescript
export const composeMessageStream = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  
  // Stream GPT-4 response token by token
  const stream = await openAI.chatStream(/* params */)
  
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`)
  }
  
  res.write('data: [DONE]\n\n')
  res.end()
}
```

#### 3.2 Template Integration Service
**File:** `backend/src/services/template-ai.service.ts` **(NEW)**

```typescript
export async function generateFromTemplate(
  templateId: string,
  context: MessageContext,
  enhancements: ComposeSettings,
  userId: string,
  organizationId: string
) {
  // Load template
  const template = await prisma.messageTemplate.findFirst({
    where: { id: templateId, organizationId }
  })
  
  // AI enhances template with context
  const prompt = `Enhance this template with personalized context:

TEMPLATE:
${template.content}

LEAD CONTEXT:
${formatContext(context)}

ENHANCEMENTS:
- Tone: ${enhancements.tone}
- Add specific details about: ${context.properties.map(p => p.address).join(', ')}
- Reference: ${context.engagement.lastContact ? 'Previous conversation' : 'First contact'}

Keep the template structure but personalize with real context.`

  const enhanced = await openAI.chat([{ role: 'user', content: prompt }], userId, organizationId)
  
  return {
    originalTemplate: template.content,
    enhancedMessage: enhanced.response,
    changes: extractChanges(template.content, enhanced.response)
  }
}

export async function saveAsTemplate(
  message: string,
  name: string,
  category: string,
  organizationId: string,
  userId: string
) {
  // Strip personalization to create reusable template
  const genericVersion = await stripPersonalization(message)
  
  return prisma.messageTemplate.create({
    data: {
      name,
      category,
      content: genericVersion,
      aiGenerated: true,
      organizationId,
      createdById: userId
    }
  })
}
```

#### 3.3 User Preferences Service
**File:** `backend/src/services/user-preferences.service.ts` **(NEW)**

```typescript
export async function saveComposerPreferences(
  userId: string,
  preferences: {
    defaultTone: string
    defaultLength: string
    defaultCTA: boolean
    defaultPersonalization: string
  }
) {
  return prisma.userPreferences.upsert({
    where: { userId },
    update: { aiComposerSettings: preferences as any },
    create: { 
      userId, 
      aiComposerSettings: preferences as any 
    }
  })
}

export async function loadComposerPreferences(userId: string) {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId }
  })
  
  return prefs?.aiComposerSettings || {
    defaultTone: 'professional',
    defaultLength: 'standard',
    defaultCTA: true,
    defaultPersonalization: 'standard'
  }
}
```

### Frontend Tasks

#### 3.4 Streaming Response UI
Update AIComposer to show typing effect:

```typescript
const [streamingText, setStreamingText] = useState('')
const [isStreaming, setIsStreaming] = useState(false)

const generateWithStreaming = async () => {
  setIsStreaming(true)
  setStreamingText('')
  
  const eventSource = new EventSource('/api/ai/compose/stream?...')
  
  eventSource.onmessage = (event) => {
    if (event.data === '[DONE]') {
      setIsStreaming(false)
      eventSource.close()
      return
    }
    
    const { token } = JSON.parse(event.data)
    setStreamingText(prev => prev + token)
  }
  
  eventSource.onerror = () => {
    eventSource.close()
    setIsStreaming(false)
  }
}
```

#### 3.5 Template Integration UI
Add template buttons to AIComposer:

```typescript
<div className="space-y-2">
  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
    <SelectTrigger>
      <SelectValue placeholder="Start from template" />
    </SelectTrigger>
    <SelectContent>
      {templates.map(t => (
        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  
  <Button
    size="sm"
    variant="outline"
    onClick={saveAsTemplate}
    disabled={!message}
  >
    💾 Save as Template
  </Button>
</div>
```

### Testing Phase 3
- [ ] Streaming shows typing effect
- [ ] Can cancel mid-stream
- [ ] Template dropdown loads user templates
- [ ] Template + AI enhancement works
- [ ] Save as template creates reusable version
- [ ] Preferences persist across sessions
- [ ] Settings default to user preferences

---

## **PHASE 4: Analytics & Intelligence** ⏱️ Week 4

### **Goal:** Track performance, A/B testing, learning system

### Backend Tasks

#### 4.1 Message Performance Tracking
**File:** `backend/src/services/message-analytics.service.ts` **(NEW)**

```typescript
export async function trackMessagePerformance(
  messageId: string,
  metadata: {
    aiGenerated: boolean
    tone?: string
    length?: string
    predictedResponseRate?: number
    variations?: number
  }
) {
  return prisma.messageAnalytics.create({
    data: {
      messageId,
      ...metadata,
      sentAt: new Date()
    }
  })
}

export async function updateMessageOutcome(
  messageId: string,
  outcome: {
    opened?: boolean
    openedAt?: Date
    responded?: boolean
    respondedAt?: Date
    responseTime?: number
    converted?: boolean
  }
) {
  return prisma.messageAnalytics.update({
    where: { messageId },
    data: outcome
  })
}

export async function getAIComposerStats(organizationId: string, days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  const aiMessages = await prisma.messageAnalytics.findMany({
    where: {
      organizationId,
      aiGenerated: true,
      sentAt: { gte: startDate }
    }
  })
  
  const manualMessages = await prisma.messageAnalytics.findMany({
    where: {
      organizationId,
      aiGenerated: false,
      sentAt: { gte: startDate }
    }
  })
  
  return {
    aiGenerated: {
      total: aiMessages.length,
      responseRate: calculateResponseRate(aiMessages),
      avgResponseTime: calculateAvgResponseTime(aiMessages),
      conversionRate: calculateConversionRate(aiMessages)
    },
    manual: {
      total: manualMessages.length,
      responseRate: calculateResponseRate(manualMessages),
      avgResponseTime: calculateAvgResponseTime(manualMessages),
      conversionRate: calculateConversionRate(manualMessages)
    },
    improvement: {
      responseRateDelta: calculateDelta(aiMessages, manualMessages, 'response'),
      conversionRateDelta: calculateDelta(aiMessages, manualMessages, 'conversion'),
      timeEfficiency: calculateTimeEfficiency(aiMessages.length, manualMessages.length)
    }
  }
}
```

#### 4.2 A/B Testing System
**File:** `backend/src/services/ab-testing.service.ts` **(NEW)**

```typescript
export async function createABTest(
  name: string,
  variations: Array<{
    tone: string
    message: string
  }>,
  organizationId: string
) {
  return prisma.abTest.create({
    data: {
      name,
      variations: variations as any,
      organizationId,
      status: 'ACTIVE',
      startDate: new Date()
    }
  })
}

export async function assignVariation(
  testId: string,
  leadId: string
): Promise<number> {
  // Round-robin or random assignment
  const test = await prisma.abTest.findUnique({
    where: { id: testId },
    include: { assignments: true }
  })
  
  const variationIndex = test.assignments.length % test.variations.length
  
  await prisma.testAssignment.create({
    data: {
      testId,
      leadId,
      variationIndex,
      assignedAt: new Date()
    }
  })
  
  return variationIndex
}

export async function getABTestResults(testId: string) {
  const test = await prisma.abTest.findUnique({
    where: { id: testId },
    include: {
      assignments: {
        include: {
          messageAnalytics: true
        }
      }
    }
  })
  
  // Aggregate results by variation
  const results = test.variations.map((variation, index) => {
    const assignments = test.assignments.filter(a => a.variationIndex === index)
    
    return {
      variation,
      index,
      sends: assignments.length,
      opens: assignments.filter(a => a.messageAnalytics?.opened).length,
      responses: assignments.filter(a => a.messageAnalytics?.responded).length,
      conversions: assignments.filter(a => a.messageAnalytics?.converted).length,
      avgResponseTime: calculateAvgTime(assignments)
    }
  })
  
  return {
    test,
    results,
    winner: determineWinner(results)
  }
}
```

#### 4.3 Learning System
**File:** `backend/src/services/ai-learning.service.ts` **(NEW)**

```typescript
export async function learnFromSuccess(
  messageId: string,
  organizationId: string
) {
  const analytics = await prisma.messageAnalytics.findUnique({
    where: { messageId },
    include: { message: true }
  })
  
  if (!analytics.responded || !analytics.aiGenerated) return
  
  // Extract successful patterns
  const patterns = {
    tone: analytics.tone,
    length: analytics.message.body.split(' ').length,
    hasQuestion: /\?/.test(analytics.message.body),
    hasCTA: /call|schedule|book/i.test(analytics.message.body),
    timeOfDay: analytics.sentAt.getHours(),
    dayOfWeek: analytics.sentAt.getDay(),
    responseTime: analytics.responseTime
  }
  
  // Store in learning database
  return prisma.successPattern.create({
    data: {
      organizationId,
      patterns: patterns as any,
      outcome: {
        responded: true,
        responseTime: analytics.responseTime,
        converted: analytics.converted
      } as any,
      weight: calculateWeight(analytics) // Higher for conversions
    }
  })
}

export async function getLearnedPreferences(
  organizationId: string,
  leadId: string
) {
  // Get lead's historical patterns
  const leadPatterns = await prisma.successPattern.findMany({
    where: {
      organizationId,
      // Filter by similar leads (same score range, interests, etc.)
    },
    orderBy: { weight: 'desc' },
    take: 50
  })
  
  // Aggregate patterns
  const bestTone = getMostFrequent(leadPatterns.map(p => p.patterns.tone))
  const bestLength = getAverage(leadPatterns.map(p => p.patterns.length))
  const bestTime = getMostFrequent(leadPatterns.map(p => p.patterns.timeOfDay))
  
  return {
    recommendedTone: bestTone,
    recommendedLength: bestLength > 100 ? 'detailed' : 'brief',
    recommendedSendTime: bestTime,
    confidence: calculateConfidence(leadPatterns.length),
    reasoning: generateReasoning(leadPatterns)
  }
}
```

### Frontend Tasks

#### 4.4 Analytics Dashboard Component
**File:** `src/pages/ai/AIComposerAnalytics.tsx` **(NEW)**

```typescript
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { TrendingUp, TrendingDown, Clock, MessageSquare } from 'lucide-react'

export const AIComposerAnalytics = () => {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadStats()
  }, [])
  
  const loadStats = async () => {
    const response = await fetch('/api/ai/composer/analytics')
    const data = await response.json()
    setStats(data.data)
    setLoading(false)
  }
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Composer Performance</h2>
        <p className="text-muted-foreground">Last 30 days</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {stats.aiGenerated.responseRate}%
                </p>
                <p className="text-xs text-muted-foreground">
                  AI Generated
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-500">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    +{stats.improvement.responseRateDelta}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  vs Manual
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Math.round(stats.aiGenerated.avgResponseTime)}h
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.aiGenerated.total} messages sent
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {stats.aiGenerated.conversionRate}%
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-500">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    +{stats.improvement.conversionRateDelta}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Add charts, best-performing tones, time-of-day analysis, etc. */}
    </div>
  )
}
```

#### 4.5 Add Learning Indicators to AI Composer
Show learned preferences in composer:

```typescript
const [learnedPrefs, setLearnedPrefs] = useState<any>(null)

useEffect(() => {
  if (leadId) {
    fetch(`/api/ai/composer/learned-preferences?leadId=${leadId}`)
      .then(r => r.json())
      .then(d => setLearnedPrefs(d.data))
  }
}, [leadId])

// In render:
{learnedPrefs && learnedPrefs.confidence > 0.7 && (
  <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
    <p className="text-sm">
      🧠 <strong>AI Learned:</strong> Similar leads respond {learnedPrefs.confidence * 100}% 
      better to <strong>{learnedPrefs.recommendedTone}</strong> tone. {learnedPrefs.reasoning}
    </p>
    <Button
      size="sm"
      variant="link"
      onClick={() => setTone(learnedPrefs.recommendedTone)}
      className="h-auto p-0 text-xs"
    >
      Apply Recommendation →
    </Button>
  </div>
)}
```

### Testing Phase 4
- [ ] Message sends tracked in analytics
- [ ] Response/open rates calculated correctly
- [ ] A/B test variations assigned properly
- [ ] Test results aggregate correctly
- [ ] Learning system captures success patterns
- [ ] Learned preferences display in composer
- [ ] Analytics dashboard shows accurate stats
- [ ] AI vs Manual comparison works

---

## 📊 Success Metrics

### Adoption Metrics
- **Target:** 80%+ of messages use AI Compose within 30 days
- **Measure:** Track AI composer opens vs manual composition

### Time Savings
- **Target:** 7 min/message → 2 min/message (5 min saved)
- **Measure:** Track time between thread open and message send

### Response Rate Improvement
- **Target:** 15% improvement vs manual messages
- **Measure:** Compare AI-generated vs manual response rates

### User Satisfaction
- **Target:** 4.5+ star rating on feature
- **Measure:** In-app survey after 10 uses

### ROI
- **Target:** AI cost ($0.01/message) < time saved ($3-5/message)
- **Measure:** Token cost vs agent hourly rate

---

## 🚀 Launch Checklist

### Pre-Launch
- [ ] All 4 phases tested thoroughly
- [ ] Documentation updated
- [ ] Training video recorded
- [ ] API rate limits configured
- [ ] Error handling verified
- [ ] Mobile responsive tested
- [ ] Accessibility audit passed

### Launch Day
- [ ] Feature flag enabled for beta users
- [ ] Monitor error logs
- [ ] Track usage metrics
- [ ] Gather user feedback
- [ ] Support team briefed

### Post-Launch (Week 1)
- [ ] Review analytics
- [ ] Collect user testimonials
- [ ] Fix critical bugs
- [ ] Optimize prompts based on usage
- [ ] Plan feature enhancements

---

## 📝 Database Schema Changes

### New Tables Needed

```prisma
model MessageAnalytics {
  id                    String   @id @default(cuid())
  messageId             String   @unique
  organizationId        String
  aiGenerated           Boolean  @default(false)
  tone                  String?
  length                String?
  predictedResponseRate Int?
  variations            Int?
  sentAt                DateTime
  opened                Boolean  @default(false)
  openedAt              DateTime?
  responded             Boolean  @default(false)
  respondedAt           DateTime?
  responseTime          Int?     // hours
  converted             Boolean  @default(false)
  
  message               Message  @relation(fields: [messageId], references: [id])
  organization          Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId, aiGenerated])
  @@index([sentAt])
}

model UserPreferences {
  id                   String   @id @default(cuid())
  userId               String   @unique
  aiComposerSettings   Json?    // { defaultTone, defaultLength, etc. }
  
  user                 User     @relation(fields: [userId], references: [id])
}

model SuccessPattern {
  id             String   @id @default(cuid())
  organizationId String
  patterns       Json     // { tone, length, hasQuestion, etc. }
  outcome        Json     // { responded, responseTime, converted }
  weight         Float    @default(1.0)
  createdAt      DateTime @default(now())
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId, weight])
}

model ABTest {
  id             String   @id @default(cuid())
  name           String
  variations     Json     // Array of variations
  organizationId String
  status         String   // ACTIVE, COMPLETED, PAUSED
  startDate      DateTime
  endDate        DateTime?
  
  assignments    TestAssignment[]
  organization   Organization @relation(fields: [organizationId], references: [id])
}

model TestAssignment {
  id                String   @id @default(cuid())
  testId            String
  leadId            String
  variationIndex    Int
  assignedAt        DateTime
  messageId         String?
  
  test              ABTest   @relation(fields: [testId], references: [id])
  lead              Lead     @relation(fields: [leadId], references: [id])
  messageAnalytics  MessageAnalytics? @relation(fields: [messageId], references: [messageId])
}

model MessageTemplate {
  id             String   @id @default(cuid())
  name           String
  category       String
  content        String   @db.Text
  aiGenerated    Boolean  @default(false)
  organizationId String
  createdById    String
  createdAt      DateTime @default(now())
  usageCount     Int      @default(0)
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdBy      User     @relation(fields: [createdById], references: [id])
}
```

---

## 🔧 Technical Dependencies

### NPM Packages (Already Installed)
- ✅ `openai` - GPT-4 API
- ✅ `@prisma/client` - Database
- ✅ Express.js - Backend
- ✅ React - Frontend

### New Packages Needed
```bash
# None required - using existing stack
```

### Environment Variables
```env
# Already configured
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
```

---

## 📚 Documentation Plan

### User Documentation
1. **Quick Start Guide** - "Your First AI-Composed Message"
2. **Best Practices** - "Getting the Most from AI Compose"
3. **Tone Guide** - When to use each tone
4. **Template Integration** - Combining templates + AI
5. **Analytics Interpretation** - Understanding performance metrics

### Developer Documentation
1. **API Reference** - All composer endpoints
2. **Architecture Overview** - System design
3. **Extending Composers** - Add custom settings
4. **Analytics Integration** - Track custom metrics
5. **Prompt Engineering** - Customizing AI behavior

---

## 🎓 Training Plan

### For End Users (Agents)
- **Video Tutorial (5 min):** "Compose Messages 5x Faster with AI"
- **Live Demo Session:** Show tone variations, context awareness
- **Tip Cards:** Quick wins (keyboard shortcuts, best tones by scenario)
- **Success Stories:** "How Sarah increased her response rate by 23%"

### For Admins
- **Analytics Dashboard Tour:** Understand team performance
- **A/B Testing Workshop:** Set up and interpret tests
- **Customization Guide:** Adjust prompts, add custom tones

---

## 🚧 Risk Mitigation

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OpenAI API downtime | Medium | High | Implement fallback to templates, queue messages |
| Slow generation times | Low | Medium | Add loading states, streaming, caching |
| High token costs | Low | Medium | Set daily limits, optimize prompts, cache common responses |
| Database performance | Low | Medium | Index properly, paginate analytics queries |

### User Experience Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users don't adopt feature | Low | High | Strong onboarding, show time savings metrics |
| AI generates poor messages | Medium | High | Allow editing, learn from corrections, A/B test prompts |
| Complexity overwhelms users | Low | Medium | Progressive disclosure, smart defaults |
| Over-reliance on AI | Medium | Low | Education, show when manual is better |

---

## 🎯 Future Enhancements (Post-MVP)

### Phase 5: Voice Integration
- Voice-to-text input for prompts
- Text-to-speech for message preview
- Voice cloning for personalized audio messages

### Phase 6: Multi-Language
- Detect lead language preference
- Generate in Spanish, French, etc.
- Cultural tone adjustments

### Phase 7: Image Generation
- AI-generated property flyers
- Social media post graphics
- Email signature graphics

### Phase 8: Video Scripts
- Generate video tour scripts
- Testimonial request scripts
- Social media video content

---

## 📞 Support Plan

### User Support
- **In-App Chat:** AI Compose questions
- **Help Docs:** Searchable guides
- **Video Library:** Tutorial collection
- **Office Hours:** Weekly Q&A sessions

### Technical Support
- **Error Monitoring:** Sentry integration
- **Performance Alerts:** Response time tracking
- **Usage Alerts:** Unusual token consumption
- **Health Checks:** API availability monitoring

---

## 🎉 Conclusion

This implementation plan transforms our vision into a **concrete, executable roadmap**. The 4-phase approach ensures we deliver value quickly (MVP in Week 1) while building toward the full intelligent composer experience.

**Key Success Factors:**
1. ✅ Strong foundation (existing AI infrastructure)
2. ✅ Incremental delivery (working software every week)
3. ✅ User-centric design (inline, not modal)
4. ✅ Data-driven (analytics from day 1)
5. ✅ Learning system (gets smarter over time)

**Next Steps:**
1. Review and approve this plan
2. Create Jira tickets for Phase 1
3. Set up staging environment
4. Kick off development (Week 1)

Let's make every message an agent sends feel personally crafted, data-informed, and optimized for response—without spending hours writing! 🚀

---

**Status:** ✅ Plan Complete - Ready for Implementation  
**Last Updated:** November 12, 2025  
**Plan Owner:** Development Team  
**Estimated Completion:** 4 weeks from kickoff
