# 🚀 GPT Enhancement Implementation Plan
**Making Your AI Assistant 10x Smarter**

**Start Date:** November 12, 2025  
**Estimated Completion:** 2-3 days (12-15 hours total)  
**Status:** Ready to Begin

---

## 📊 **Overview**

Transform the AI chatbot from a basic Q&A tool into a powerful real estate assistant that:
- ✅ Acts like a senior real estate professional
- ✅ Writes personalized messages (emails, SMS, scripts)
- ✅ Provides smart, proactive advice
- ✅ Offers multiple tone options
- ✅ Integrates with Intelligence Hub predictions
- ✅ Gives actionable recommendations

---

## 🎯 **3-Phase Implementation Plan**

### **Phase 1: Smart Prompt & Tone System (3 hours)**
*Make GPT act smarter with better instructions and personality*

### **Phase 2: Message Composition (6-8 hours)**
*Let GPT write emails, SMS, and scripts with tone options*

### **Phase 3: Intelligence Integration (3-4 hours)**
*Connect GPT to your Intelligence Hub for predictions*

**Total Time:** 12-15 hours

---

## 📅 **PHASE 1: ENHANCED SYSTEM PROMPT & TONE (Day 1 - 3 hours)**

### **Goal:** Make GPT respond like a senior real estate assistant

---

### **Task 1.1: Create Enhanced System Prompt (45 min)**

**File:** `backend/src/controllers/ai.controller.ts`

**Current Prompt (Lines 405-412):**
```typescript
content: `You are an AI assistant for a real estate CRM platform. Help users manage leads, 
analyze properties, and optimize their real estate business. You have access to functions that can:
- Get lead counts and search for leads
- Create tasks and update lead statuses
- View recent activities and lead details
Be professional, helpful, and concise. When users ask about their data, use the available functions.`
```

**New Enhanced Prompt:**
```typescript
content: `You are a highly experienced real estate AI assistant with 20+ years of industry expertise. 
You're integrated into a professional CRM and act as the user's virtual chief of staff and strategist.

YOUR ROLE:
- Senior real estate advisor and business partner
- Proactive problem identifier and opportunity spotter
- Expert in lead management, conversion optimization, and market strategy
- Supportive coach who celebrates wins and guides through challenges

YOUR EXPERTISE:
- Lead qualification and scoring patterns
- Optimal follow-up timing and cadence
- Market trends and property valuation
- Negotiation strategies and objection handling
- Sales psychology and buyer behavior
- Campaign optimization and A/B testing
- Real estate best practices and compliance

YOUR PERSONALITY:
- Professional yet approachable and friendly
- Direct and action-oriented (no corporate fluff)
- Data-driven with strategic insights
- Proactive (suggest, don't just answer)
- Empathetic and supportive
- Results-focused

YOUR COMMUNICATION STYLE:
- Always quantify: Use numbers, percentages, timelines
- Explain the "why" behind recommendations
- Provide specific, actionable next steps
- Use emojis sparingly (🔥 hot, ⚠️ warning, ✅ complete, 📊 stats)
- End responses with suggested actions ("Want me to...?")
- Celebrate achievements ("Great job closing that deal!")

PROACTIVE BEHAVIORS:
- Warn when leads are going cold (no contact 7+ days)
- Highlight hot opportunities (multiple property views, high engagement)
- Alert to performance drops (conversion rate down, campaign underperforming)
- Suggest optimal actions based on historical patterns
- Identify revenue opportunities in pipeline
- Recommend campaign timing based on past success

AVAILABLE FUNCTIONS:
- get_lead_count: Count leads by status/score
- search_leads: Find and list leads with details
- create_task: Create follow-up tasks
- update_lead_status: Change lead status
- get_recent_activities: View activity history
- get_lead_details: Get complete lead information

RESPONSE EXAMPLES:

Good: "You have 47 leads total. 🔥 12 are HOT (80+ score) and need immediate attention. 
⚠️ 5 haven't been contacted in 7+ days (at risk of going cold). 
Want me to create follow-up tasks for those 5?"

Bad: "You have 47 leads."

Good: "I'll create a follow-up task for John Smith. By the way, John has an 85 score (hot!) 
and viewed properties twice yesterday - strong buying signal. I recommend calling him within 
24 hours for best conversion odds."

Bad: "Task created for John Smith."

Remember: You're not just a database query tool - you're their trusted advisor helping them 
succeed in real estate. Be smart, be helpful, be proactive.`
```

**Implementation Steps:**
1. [ ] Open `backend/src/controllers/ai.controller.ts`
2. [ ] Locate `chatWithAI` function (around line 380)
3. [ ] Replace system prompt content
4. [ ] Save file
5. [ ] Rebuild backend: `npm run build`

---

### **Task 1.2: Add Tone System Constants (30 min)**

**File:** `backend/src/services/openai.service.ts`

**Create Tone Definitions:**
```typescript
// Add after imports, before class definition

export const ASSISTANT_TONES = {
  PROFESSIONAL: {
    name: 'Professional',
    description: 'Formal, business-like, corporate language',
    temperature: 0.5,
    systemAddition: 'Maintain a formal, business-professional tone. Use corporate language.',
  },
  FRIENDLY: {
    name: 'Friendly',
    description: 'Warm, approachable, conversational',
    temperature: 0.7,
    systemAddition: 'Be warm and approachable. Use conversational language and show empathy.',
  },
  DIRECT: {
    name: 'Direct',
    description: 'No-nonsense, straight to the point, brief',
    temperature: 0.4,
    systemAddition: 'Be extremely concise and direct. Get straight to the point without pleasantries.',
  },
  COACHING: {
    name: 'Coaching',
    description: 'Mentor-style, educational, encouraging',
    temperature: 0.7,
    systemAddition: 'Act as a mentor and coach. Explain concepts, share best practices, and encourage growth.',
  },
  CASUAL: {
    name: 'Casual',
    description: 'Relaxed, informal, buddy-style',
    temperature: 0.8,
    systemAddition: 'Be relaxed and casual like talking to a friend. Use informal language.',
  },
};

export type AssistantTone = keyof typeof ASSISTANT_TONES;
```

**Implementation Steps:**
1. [ ] Open `backend/src/services/openai.service.ts`
2. [ ] Add tone constants after imports
3. [ ] Save file

---

### **Task 1.3: Update Chat Function to Support Tone (45 min)**

**File:** `backend/src/controllers/ai.controller.ts`

**Modify chatWithAI function:**
```typescript
export const chatWithAI = async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory, tone } = req.body  // Add 'tone' parameter
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      })
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI chatbot is not configured. Please add OPENAI_API_KEY to environment variables.'
      })
    }

    const openAI = getOpenAIService()
    const functionsService = getAIFunctionsService()

    // Get tone settings
    const selectedTone = tone || 'FRIENDLY' // Default to friendly
    const toneConfig = ASSISTANT_TONES[selectedTone as AssistantTone] || ASSISTANT_TONES.FRIENDLY

    // Prepare conversation history with tone
    const messages = [
      {
        role: 'system' as const,
        content: `${ENHANCED_SYSTEM_PROMPT}
        
TONE SETTINGS: ${toneConfig.systemAddition}`,
      },
      ...(conversationHistory || []),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    // Rest of function remains the same...
```

**Implementation Steps:**
1. [ ] Import ASSISTANT_TONES from openai.service
2. [ ] Add tone parameter to request body
3. [ ] Modify system message to include tone
4. [ ] Test with different tones

---

### **Task 1.4: Frontend Tone Selector (60 min)**

**File:** `src/components/ai/AIAssistant.tsx`

**Add Tone Selector UI:**
```typescript
// Add state for tone
const [selectedTone, setSelectedTone] = useState<string>('FRIENDLY')

// Add tone selector dropdown before chat input
<div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
  <label className="text-xs text-gray-600 mb-1 block">AI Personality:</label>
  <select
    value={selectedTone}
    onChange={(e) => setSelectedTone(e.target.value)}
    className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
  >
    <option value="PROFESSIONAL">🎯 Professional - Formal & Business-like</option>
    <option value="FRIENDLY">😊 Friendly - Warm & Conversational</option>
    <option value="DIRECT">⚡ Direct - Brief & To-the-Point</option>
    <option value="COACHING">🎓 Coaching - Educational & Mentoring</option>
    <option value="CASUAL">💬 Casual - Relaxed & Informal</option>
  </select>
</div>

// Update sendMessage function to include tone
const handleSendMessage = async () => {
  // ... existing validation code ...
  
  const response = await sendChatMessage(userMessage, messages, selectedTone)
  
  // ... rest of function ...
}
```

**File:** `src/services/aiService.ts`

**Update API call:**
```typescript
export const sendChatMessage = async (
  message: string, 
  conversationHistory: ChatMessage[] = [],
  tone: string = 'FRIENDLY'
): Promise<ChatResponse> => {
  const response = await api.post('/ai/chat', { 
    message, 
    conversationHistory,
    tone  // Add tone parameter
  })
  return response.data
}
```

**Implementation Steps:**
1. [ ] Add tone state to AIAssistant component
2. [ ] Add dropdown UI for tone selection
3. [ ] Update sendMessage to pass tone
4. [ ] Update aiService API call
5. [ ] Test tone switching

---

### **✅ Phase 1 Deliverables:**
- [x] Enhanced system prompt with real estate expertise
- [x] 5 tone options (Professional, Friendly, Direct, Coaching, Casual)
- [x] Frontend tone selector
- [x] Backend tone processing
- [x] Test responses show personality changes

---

## 📝 **PHASE 2: MESSAGE COMPOSITION (Day 2 - 6-8 hours)**

### **Goal:** Let GPT draft emails, SMS, and call scripts with personalization

---

### **Task 2.1: Create Message Composition Functions (2 hours)**

**File:** `backend/src/services/ai-functions.service.ts`

**Add New Functions to AI_FUNCTIONS Array:**
```typescript
export const AI_FUNCTIONS = [
  // ... existing functions ...
  
  {
    name: 'compose_email',
    description: 'Draft a personalized email to a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead' },
        purpose: { 
          type: 'string', 
          enum: ['follow_up', 'new_listing', 'appointment_reminder', 'check_in', 'property_update', 'thank_you'],
          description: 'Purpose of the email'
        },
        tone: { 
          type: 'string', 
          enum: ['professional', 'friendly', 'urgent', 'casual', 'persuasive', 'formal'],
          description: 'Tone of the email'
        },
        keyPoints: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Key points to include in email'
        },
        includeCTA: {
          type: 'boolean',
          description: 'Include call-to-action'
        }
      },
      required: ['leadId', 'purpose'],
    },
  },
  {
    name: 'compose_sms',
    description: 'Draft a personalized SMS message to a lead (160 chars max)',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        purpose: { 
          type: 'string', 
          enum: ['appointment_reminder', 'quick_followup', 'property_alert', 'confirmation', 'check_in']
        },
        tone: { 
          type: 'string', 
          enum: ['professional', 'friendly', 'urgent', 'casual']
        },
        maxLength: {
          type: 'number',
          enum: [80, 120, 160],
          description: 'Max message length'
        }
      },
      required: ['leadId', 'purpose'],
    },
  },
  {
    name: 'compose_script',
    description: 'Draft a personalized call script for a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        purpose: { 
          type: 'string', 
          enum: ['cold_call', 'warm_followup', 'appointment_booking', 'objection_handling', 'closing']
        },
        tone: { 
          type: 'string', 
          enum: ['professional', 'friendly', 'persuasive', 'casual']
        },
        includeObjections: {
          type: 'boolean',
          description: 'Include common objection responses'
        }
      },
      required: ['leadId', 'purpose'],
    },
  },
]
```

**Implementation Steps:**
1. [ ] Open `backend/src/services/ai-functions.service.ts`
2. [ ] Add 3 new function definitions to AI_FUNCTIONS array
3. [ ] Save file

---

### **Task 2.2: Implement Message Composition Handlers (3 hours)**

**File:** `backend/src/services/ai-functions.service.ts`

**Add Handler Methods to AIFunctionsService Class:**
```typescript
async composeEmail(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
  try {
    if (!args.leadId || !args.purpose) {
      return JSON.stringify({ error: 'leadId and purpose required' });
    }

    // Get lead details with full context
    const lead = await prisma.lead.findFirst({
      where: { id: args.leadId, organizationId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        notes: { orderBy: { createdAt: 'desc' }, take: 3 },
        tags: true,
      }
    });

    if (!lead) {
      return JSON.stringify({ error: 'Lead not found' });
    }

    // Get user/agent info for signature
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true }
    });

    // Build context for OpenAI
    const leadContext = {
      name: `${lead.firstName} ${lead.lastName}`,
      status: lead.status,
      score: lead.score,
      source: lead.source,
      interests: lead.tags.map(t => t.name).join(', '),
      recentActivity: lead.activities.length > 0 
        ? lead.activities[0].description 
        : 'No recent activity',
      notes: lead.notes.length > 0 
        ? lead.notes[0].content 
        : 'No notes available'
    };

    // Use OpenAI to generate email
    const openAI = getOpenAIService();
    const emailPrompt = `Draft a ${args.tone || 'professional'} email for a real estate lead:

Lead: ${leadContext.name} (Score: ${leadContext.score}/100, Status: ${leadContext.status})
Interests: ${leadContext.interests}
Recent Activity: ${leadContext.recentActivity}
Purpose: ${args.purpose}
Key Points: ${args.keyPoints ? args.keyPoints.join(', ') : 'Use best judgment'}

Requirements:
- Personalize based on lead's interests and activity
- Include clear subject line
- ${args.includeCTA !== false ? 'Include strong call-to-action' : 'No hard CTA needed'}
- Tone: ${args.tone || 'professional'}
- Keep it under 300 words
- Sign as: ${user?.firstName} ${user?.lastName}

Generate the email:`;

    const emailContent = await openAI.chat(
      [{ role: 'user', content: emailPrompt }],
      userId,
      organizationId
    );

    return JSON.stringify({
      success: true,
      email: {
        subject: this.extractSubjectLine(emailContent.response),
        body: this.extractEmailBody(emailContent.response),
        tone: args.tone || 'professional',
        leadName: leadContext.name,
        purpose: args.purpose,
        metadata: {
          leadScore: leadContext.score,
          leadStatus: leadContext.status,
          generatedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    return JSON.stringify({ error: 'Failed to compose email' });
  }
}

async composeSMS(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
  try {
    if (!args.leadId || !args.purpose) {
      return JSON.stringify({ error: 'leadId and purpose required' });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: args.leadId, organizationId },
      select: { firstName: true, lastName: true, score: true, status: true }
    });

    if (!lead) {
      return JSON.stringify({ error: 'Lead not found' });
    }

    const openAI = getOpenAIService();
    const maxLength = args.maxLength || 160;

    const smsPrompt = `Draft a ${args.tone || 'friendly'} SMS message for:

Lead: ${lead.firstName} ${lead.lastName}
Purpose: ${args.purpose}
Max Length: ${maxLength} characters (STRICT LIMIT)
Tone: ${args.tone || 'friendly'}

Requirements:
- Must be under ${maxLength} characters
- Include lead's first name
- Clear and direct
- Include action if needed
- No emojis unless tone is casual

Generate the SMS:`;

    const smsContent = await openAI.chat(
      [{ role: 'user', content: smsPrompt }],
      userId,
      organizationId
    );

    const message = smsContent.response.trim();
    const length = message.length;

    return JSON.stringify({
      success: true,
      sms: {
        message: length <= maxLength ? message : message.substring(0, maxLength - 3) + '...',
        length,
        maxLength,
        tone: args.tone || 'friendly',
        leadName: `${lead.firstName} ${lead.lastName}`,
        purpose: args.purpose,
        warning: length > maxLength ? 'Message was truncated to fit limit' : null
      }
    });
  } catch (error) {
    return JSON.stringify({ error: 'Failed to compose SMS' });
  }
}

async composeScript(organizationId: string, userId: string, args: FunctionArgs): Promise<string> {
  try {
    if (!args.leadId || !args.purpose) {
      return JSON.stringify({ error: 'leadId and purpose required' });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: args.leadId, organizationId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 3 },
        tags: true
      }
    });

    if (!lead) {
      return JSON.stringify({ error: 'Lead not found' });
    }

    const openAI = getOpenAIService();

    const scriptPrompt = `Create a ${args.tone || 'professional'} call script for:

Lead: ${lead.firstName} ${lead.lastName}
Score: ${lead.score}/100
Status: ${lead.status}
Interests: ${lead.tags.map(t => t.name).join(', ')}
Purpose: ${args.purpose}
Tone: ${args.tone || 'professional'}

Script Structure:
1. Opening (greeting and intro)
2. Purpose statement
3. Value proposition
4. Questions to ask
${args.includeObjections ? '5. Common objections and responses' : ''}
6. Closing and next steps

Requirements:
- Natural conversation flow
- Personalized to lead's interests
- Include specific questions
- Strong call-to-action
${args.includeObjections ? '- Include 3-5 common objections with responses' : ''}

Generate the script:`;

    const scriptContent = await openAI.chat(
      [{ role: 'user', content: scriptPrompt }],
      userId,
      organizationId
    );

    return JSON.stringify({
      success: true,
      script: {
        content: scriptContent.response,
        tone: args.tone || 'professional',
        leadName: `${lead.firstName} ${lead.lastName}`,
        purpose: args.purpose,
        includesObjections: args.includeObjections || false,
        leadScore: lead.score,
        leadStatus: lead.status
      }
    });
  } catch (error) {
    return JSON.stringify({ error: 'Failed to compose script' });
  }
}

// Helper methods
private extractSubjectLine(email: string): string {
  const subjectMatch = email.match(/Subject:?\s*(.+)/i);
  return subjectMatch ? subjectMatch[1].trim() : 'Follow Up';
}

private extractEmailBody(email: string): string {
  // Remove subject line if present
  return email.replace(/Subject:?\s*.+\n*/i, '').trim();
}

// Update executeFunction to include new handlers
async executeFunction(functionName: string, args: FunctionArgs, organizationId: string, userId: string): Promise<string> {
  switch (functionName) {
    case 'get_lead_count': return this.getLeadCount(organizationId, args);
    case 'search_leads': return this.searchLeads(organizationId, args);
    case 'create_task': return this.createTask(organizationId, userId, args);
    case 'update_lead_status': return this.updateLeadStatus(organizationId, args);
    case 'get_recent_activities': return this.getRecentActivities(organizationId, args);
    case 'get_lead_details': return this.getLeadDetails(organizationId, args);
    case 'compose_email': return this.composeEmail(organizationId, userId, args);
    case 'compose_sms': return this.composeSMS(organizationId, userId, args);
    case 'compose_script': return this.composeScript(organizationId, userId, args);
    default: return JSON.stringify({ error: `Unknown function: ${functionName}` });
  }
}
```

**Implementation Steps:**
1. [ ] Add composeEmail method
2. [ ] Add composeSMS method
3. [ ] Add composeScript method
4. [ ] Add helper methods (extractSubjectLine, extractEmailBody)
5. [ ] Update executeFunction switch statement
6. [ ] Test each composition type

---

### **Task 2.3: Frontend Message Preview Component (2 hours)**

**File:** `src/components/ai/MessagePreview.tsx` (NEW FILE)

```typescript
import React from 'react';
import { Mail, MessageSquare, Phone, Copy, Send, Edit } from 'lucide-react';

interface MessagePreviewProps {
  type: 'email' | 'sms' | 'script';
  content: {
    subject?: string;
    body?: string;
    message?: string;
    content?: string;
    tone: string;
    leadName: string;
    purpose: string;
    length?: number;
    maxLength?: number;
  };
  onApply: () => void;
  onEdit: () => void;
  onCopy: () => void;
}

export const MessagePreview: React.FC<MessagePreviewProps> = ({
  type,
  content,
  onApply,
  onEdit,
  onCopy,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'email': return <Mail className="w-5 h-5" />;
      case 'sms': return <MessageSquare className="w-5 h-5" />;
      case 'script': return <Phone className="w-5 h-5" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'email': return 'Email Draft';
      case 'sms': return 'SMS Message';
      case 'script': return 'Call Script';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h3 className="font-semibold text-gray-900">{getTitle()}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
            {content.tone}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
            {content.purpose}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 rounded p-3 mb-3">
        {type === 'email' && (
          <>
            <div className="mb-2">
              <span className="text-xs font-semibold text-gray-600">Subject:</span>
              <p className="text-sm text-gray-900 mt-1">{content.subject}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600">Body:</span>
              <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{content.body}</p>
            </div>
          </>
        )}
        {type === 'sms' && (
          <div>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{content.message}</p>
            <div className="mt-2 text-xs text-gray-500">
              {content.length}/{content.maxLength} characters
            </div>
          </div>
        )}
        {type === 'script' && (
          <div>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{content.content}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApply}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          <Send className="w-4 h-4" />
          Apply to Campaign
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onCopy}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
```

**Implementation Steps:**
1. [ ] Create MessagePreview component
2. [ ] Add to AIAssistant to display composed messages
3. [ ] Handle apply/edit/copy actions
4. [ ] Test with all message types

---

### **Task 2.4: Update AI Assistant to Handle Message Functions (1-2 hours)**

**File:** `src/components/ai/AIAssistant.tsx`

**Add Message Handling Logic:**
```typescript
// Add state for message preview
const [messagePreview, setMessagePreview] = useState<any>(null);

// Detect when GPT returns a composed message
useEffect(() => {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'assistant' && lastMessage.metadata?.functionCall) {
    const funcName = lastMessage.metadata.functionCall;
    if (['compose_email', 'compose_sms', 'compose_script'].includes(funcName)) {
      // Parse the function result to show preview
      try {
        const result = JSON.parse(lastMessage.content);
        if (result.success) {
          setMessagePreview({
            type: funcName.replace('compose_', ''),
            content: result[funcName.replace('compose_', '')]
          });
        }
      } catch (e) {
        // Not a composed message
      }
    }
  }
}, [messages]);

// Render message preview if available
{messagePreview && (
  <MessagePreview
    type={messagePreview.type}
    content={messagePreview.content}
    onApply={() => {
      // Handle applying to campaign
      toast.success('Message copied to campaign wizard!');
      setMessagePreview(null);
    }}
    onEdit={() => {
      // Allow editing
      toast.info('Edit functionality coming soon!');
    }}
    onCopy={() => {
      navigator.clipboard.writeText(
        messagePreview.type === 'email' 
          ? messagePreview.content.body 
          : messagePreview.content.message || messagePreview.content.content
      );
      toast.success('Copied to clipboard!');
    }}
  />
)}
```

**Implementation Steps:**
1. [ ] Add message preview state
2. [ ] Detect function call responses
3. [ ] Show MessagePreview component
4. [ ] Handle apply/edit/copy actions
5. [ ] Test workflow end-to-end

---

### **✅ Phase 2 Deliverables:**
- [x] compose_email function with personalization
- [x] compose_sms function with length limits
- [x] compose_script function with objection handling
- [x] MessagePreview component for all types
- [x] Copy/Apply/Edit actions
- [x] Full workflow: Ask → Generate → Preview → Apply

---

## 🧠 **PHASE 3: INTELLIGENCE HUB INTEGRATION (Day 3 - 3-4 hours)**

### **Goal:** Let GPT access predictions and recommendations from Intelligence Hub

---

### **Task 3.1: Add Intelligence Hub Functions (2 hours)**

**File:** `backend/src/services/ai-functions.service.ts`

**Add Intelligence Functions:**
```typescript
export const AI_FUNCTIONS = [
  // ... existing functions ...
  
  {
    name: 'predict_conversion',
    description: 'Get AI prediction of lead conversion probability',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Lead ID to analyze' }
      },
      required: ['leadId'],
    },
  },
  {
    name: 'get_next_action',
    description: 'Get AI recommendation for next best action with a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' }
      },
      required: ['leadId'],
    },
  },
  {
    name: 'analyze_engagement',
    description: 'Analyze lead engagement patterns and optimal contact times',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' }
      },
      required: ['leadId'],
    },
  },
  {
    name: 'identify_at_risk_leads',
    description: 'Find leads that are at risk of going cold (no recent activity)',
    parameters: {
      type: 'object',
      properties: {
        minScore: { type: 'number', description: 'Minimum score to include' },
        daysInactive: { type: 'number', description: 'Days without contact' }
      },
    },
  },
]
```

**Add Handler Methods:**
```typescript
async predictConversion(organizationId: string, args: FunctionArgs): Promise<string> {
  try {
    if (!args.leadId) {
      return JSON.stringify({ error: 'leadId required' });
    }

    // Use the Intelligence Service you already built
    const intelligenceService = getIntelligenceService();
    const prediction = await intelligenceService.predictLeadConversion(args.leadId);

    return JSON.stringify({
      success: true,
      prediction: {
        leadId: prediction.leadId,
        probability: prediction.conversionProbability,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
        factors: prediction.factors
      }
    });
  } catch (error) {
    return JSON.stringify({ error: 'Failed to predict conversion' });
  }
}

async getNextAction(organizationId: string, args: FunctionArgs): Promise<string> {
  try {
    if (!args.leadId) {
      return JSON.stringify({ error: 'leadId required' });
    }

    const intelligenceService = getIntelligenceService();
    const action = await intelligenceService.suggestNextAction(args.leadId);

    return JSON.stringify({
      success: true,
      recommendation: {
        action: action.action,
        priority: action.priority,
        reasoning: action.reasoning,
        timing: action.suggestedTiming,
        impact: action.estimatedImpact
      }
    });
  } catch (error) {
    return JSON.stringify({ error: 'Failed to get recommendation' });
  }
}

async analyzeEngagement(organizationId: string, args: FunctionArgs): Promise<string> {
  try {
    if (!args.leadId) {
      return JSON.stringify({ error: 'leadId required' });
    }

    const intelligenceService = getIntelligenceService();
    const engagement = await intelligenceService.analyzeLeadEngagement(args.leadId);

    return JSON.stringify({
      success: true,
      engagement: {
        score: engagement.engagementScore,
        trend: engagement.trend,
        optimalTimes: engagement.optimalContactTimes,
        lastEngagement: engagement.lastEngagementDate
      }
    });
  } catch (error) {
    return JSON.stringify({ error: 'Failed to analyze engagement' });
  }
}

async identifyAtRiskLeads(organizationId: string, args: FunctionArgs): Promise<string> {
  try {
    const minScore = args.minScore || 50; // Default to warm/hot leads
    const daysInactive = args.daysInactive || 7;

    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        score: { gte: minScore },
        activities: {
          none: {
            createdAt: {
              gte: new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000)
            }
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        score: true,
        status: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: 20
    });

    const atRiskLeads = leads.map(lead => ({
      id: lead.id,
      name: `${lead.firstName} ${lead.lastName}`,
      score: lead.score,
      status: lead.status,
      daysSinceContact: lead.activities[0] 
        ? Math.floor((Date.now() - lead.activities[0].createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999
    }));

    return JSON.stringify({
      success: true,
      atRiskLeads,
      count: atRiskLeads.length,
      criteria: { minScore, daysInactive }
    });
  } catch (error) {
    return JSON.stringify({ error: 'Failed to identify at-risk leads' });
  }
}

// Update executeFunction
async executeFunction(functionName: string, args: FunctionArgs, organizationId: string, userId: string): Promise<string> {
  switch (functionName) {
    // ... existing cases ...
    case 'predict_conversion': return this.predictConversion(organizationId, args);
    case 'get_next_action': return this.getNextAction(organizationId, args);
    case 'analyze_engagement': return this.analyzeEngagement(organizationId, args);
    case 'identify_at_risk_leads': return this.identifyAtRiskLeads(organizationId, args);
    default: return JSON.stringify({ error: `Unknown function: ${functionName}` });
  }
}
```

**Implementation Steps:**
1. [ ] Import IntelligenceService
2. [ ] Add 4 new intelligence functions
3. [ ] Implement handler methods
4. [ ] Update executeFunction
5. [ ] Test each function

---

### **Task 3.2: Update System Prompt with Intelligence Functions (30 min)**

**File:** `backend/src/controllers/ai.controller.ts`

**Update AVAILABLE FUNCTIONS section:**
```typescript
AVAILABLE FUNCTIONS:
Data Functions:
- get_lead_count: Count leads by status/score
- search_leads: Find and list leads with details
- create_task: Create follow-up tasks
- update_lead_status: Change lead status
- get_recent_activities: View activity history
- get_lead_details: Get complete lead information

Message Composition:
- compose_email: Draft personalized emails
- compose_sms: Draft SMS messages (160 char limit)
- compose_script: Draft call scripts with objections

Intelligence & Predictions:
- predict_conversion: Get conversion probability (0-100%)
- get_next_action: Get AI recommendation for next step
- analyze_engagement: Get engagement score and optimal contact times
- identify_at_risk_leads: Find leads going cold

Use these functions proactively to provide insights and recommendations.
```

**Implementation Steps:**
1. [ ] Update system prompt
2. [ ] Rebuild backend
3. [ ] Test GPT using new functions

---

### **Task 3.3: Test Intelligence Integration (1 hour)**

**Test Scenarios:**
```
Test 1: "What's the conversion probability for lead #123?"
Expected: GPT calls predict_conversion and explains results

Test 2: "What should I do next with Sarah Wilson?"
Expected: GPT calls get_next_action and provides recommendation

Test 3: "When's the best time to call John Smith?"
Expected: GPT calls analyze_engagement and suggests times

Test 4: "Which of my leads are at risk?"
Expected: GPT calls identify_at_risk_leads and lists them with suggestions

Test 5: "Analyze lead #456 and draft a follow-up email"
Expected: GPT chains functions - analyze, then compose_email
```

**Implementation Steps:**
1. [ ] Create test lead with activity
2. [ ] Test each scenario above
3. [ ] Verify GPT chains functions logically
4. [ ] Document any issues

---

### **✅ Phase 3 Deliverables:**
- [x] 4 intelligence functions integrated
- [x] GPT can predict conversions
- [x] GPT can recommend actions
- [x] GPT can analyze engagement
- [x] GPT can identify at-risk leads
- [x] GPT chains functions intelligently

---

## 🧪 **TESTING & VALIDATION (30 minutes)**

### **Comprehensive Test Suite:**

**Phase 1 Tests (Tone & Prompt):**
- [ ] Test all 5 tone options
- [ ] Verify GPT shows real estate expertise
- [ ] Check proactive behavior (warns, suggests)
- [ ] Confirm personality consistency

**Phase 2 Tests (Message Composition):**
- [ ] Compose email for various purposes
- [ ] Compose SMS within 160 char limit
- [ ] Compose call script with objections
- [ ] Test all tone options for messages
- [ ] Verify personalization works
- [ ] Test copy/apply functionality

**Phase 3 Tests (Intelligence):**
- [ ] Get conversion predictions
- [ ] Get action recommendations
- [ ] Analyze engagement patterns
- [ ] Identify at-risk leads
- [ ] Test function chaining
- [ ] Verify data accuracy

---

## 📋 **Final Checklist**

### **Code Changes:**
- [ ] Enhanced system prompt deployed
- [ ] 5 tone options implemented
- [ ] 3 message composition functions
- [ ] 4 intelligence functions
- [ ] MessagePreview component
- [ ] Tone selector UI
- [ ] All functions in executeFunction

### **Backend Files Modified:**
- [ ] `backend/src/controllers/ai.controller.ts`
- [ ] `backend/src/services/openai.service.ts`
- [ ] `backend/src/services/ai-functions.service.ts`

### **Frontend Files Modified:**
- [ ] `src/components/ai/AIAssistant.tsx`
- [ ] `src/services/aiService.ts`
- [ ] `src/components/ai/MessagePreview.tsx` (NEW)

### **Testing:**
- [ ] All tone options work
- [ ] All composition types work
- [ ] All intelligence functions work
- [ ] No TypeScript errors
- [ ] Backend builds successfully
- [ ] Frontend builds successfully

### **Documentation:**
- [ ] Update AI_CHATBOT_USER_GUIDE.md
- [ ] Add message composition examples
- [ ] Document tone options
- [ ] Add troubleshooting section

---

## 🎯 **Success Criteria**

**GPT is considered "enhanced" when:**

✅ **Personality:** Responds like a senior real estate assistant (not a robot)  
✅ **Proactive:** Warns about risks, suggests opportunities without being asked  
✅ **Tones:** Can switch between 5 different personalities on demand  
✅ **Composition:** Can draft emails, SMS, scripts with personalization  
✅ **Intelligence:** Uses predictions and analytics to give smart advice  
✅ **Helpful:** Provides actionable recommendations, not just data  
✅ **User-Friendly:** Easy to use, preview messages before applying  

---

## 📊 **Expected Results**

**Before Enhancement:**
- Generic responses
- Just answers questions
- No personality
- Can't write messages
- No predictions

**After Enhancement:**
- Expert real estate advice
- Proactive warnings/suggestions
- 5 personality options
- Drafts emails/SMS/scripts
- Uses Intelligence Hub
- Chains functions intelligently
- Acts like a real assistant

**User Experience Improvement:** 🚀 **10x Better**

---

## 🚀 **Getting Started**

**Day 1 - Morning (3 hours):**
```bash
# Phase 1: Enhanced Prompt & Tones
1. Open backend/src/controllers/ai.controller.ts
2. Replace system prompt (Task 1.1)
3. Add tone constants (Task 1.2)
4. Update chat function (Task 1.3)
5. Add frontend tone selector (Task 1.4)
6. npm run build (backend)
7. Test with different tones
```

**Day 2 - Full Day (6-8 hours):**
```bash
# Phase 2: Message Composition
1. Add 3 function definitions (Task 2.1)
2. Implement composition handlers (Task 2.2)
3. Create MessagePreview component (Task 2.3)
4. Update AIAssistant (Task 2.4)
5. npm run build (backend & frontend)
6. Test all message types
```

**Day 3 - Morning (3-4 hours):**
```bash
# Phase 3: Intelligence Integration
1. Add 4 intelligence functions (Task 3.1)
2. Update system prompt (Task 3.2)
3. Test intelligence features (Task 3.3)
4. npm run build
5. Final comprehensive testing
```

---

## 📞 **Need Help?**

If you get stuck:
1. Check console for errors
2. Verify OpenAI API key is set
3. Ensure Intelligence Service is imported
4. Test functions individually before chaining
5. Check that all files are saved and rebuilt

---

**Ready to start? Begin with Phase 1, Task 1.1!** 🚀

**Estimated Total Time:** 12-15 hours  
**Estimated Completion:** 2-3 days  
**Difficulty:** Intermediate  
**Impact:** 🔥🔥🔥🔥🔥 MASSIVE
