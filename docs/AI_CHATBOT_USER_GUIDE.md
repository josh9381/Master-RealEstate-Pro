# AI Chatbot User Guide

## Overview

The AI Chatbot is your intelligent assistant for managing leads, tasks, and CRM activities using natural language. Powered by OpenAI's GPT-4, it can understand your questions and perform actions on your behalf.

---

## Features

### 🤖 Natural Language Understanding
Ask questions in plain English - the AI understands context and intent.

### 🔧 Function Calling
The chatbot can execute 6 core CRM functions automatically:

1. **Get Lead Count** - Check how many leads you have
2. **Search Leads** - Find leads by name, status, or score
3. **Create Task** - Add tasks directly from chat
4. **Update Lead Status** - Change lead status programmatically
5. **Get Recent Activities** - View latest CRM activities
6. **Get Lead Details** - Retrieve full information about a specific lead

### 💬 Conversational Memory
The chatbot remembers context within your conversation for more natural interactions.

---

## How to Use

### Opening the Chatbot

The AI assistant is available globally throughout the application. Look for the chat icon in the bottom-right corner of your screen.

### Sample Questions

#### Lead Management
```
"How many leads do I have?"
"Show me all hot leads"
"Find leads with score above 80"
"Who are my newest leads?"
```

#### Search & Filter
```
"Search for John Doe"
"Show me qualified leads"
"Find leads from California"
"Who replied to my last campaign?"
```

#### Task Creation
```
"Create a task to follow up with Sarah Johnson"
"Remind me to call Mike next Tuesday"
"Add a task to review proposal"
```

#### Status Updates
```
"Mark lead #123 as qualified"
"Change Jane's status to negotiating"
"Update lead status to won"
```

#### Activity Tracking
```
"What are my recent activities?"
"Show me today's tasks"
"What happened this week?"
```

#### Lead Details
```
"Tell me about lead #456"
"Show me details for John Smith"
"What's the info on lead XYZ?"
```

---

## Tips for Best Results

### Be Specific
❌ "Do something with leads"  
✅ "Show me leads with score above 75"

### Use Lead IDs When Possible
❌ "Update that lead we talked about"  
✅ "Update lead #123 to qualified status"

### One Action at a Time
For complex workflows, break requests into steps:
1. "Search for leads in California"
2. "Create a task to call them"
3. "Update their status to contacted"

### Check Function Results
The chatbot will confirm when actions are completed. Review the response to ensure accuracy.

---

## Function Reference

### 1. get_lead_count()
**Purpose:** Count total leads or filtered subsets  
**Example Queries:**
- "How many leads?"
- "Count of qualified leads"
- "Total lead count"

**Response:** Natural language count (e.g., "You have 47 leads total")

---

### 2. search_leads(params)
**Purpose:** Find leads by various criteria  
**Parameters:**
- `query`: Text search (name, email, phone)
- `status`: NEW, CONTACTED, QUALIFIED, NEGOTIATING, WON, LOST
- `minScore`: Minimum lead score (0-100)
- `maxScore`: Maximum lead score (0-100)

**Example Queries:**
- "Search for Sarah"
- "Show qualified leads"
- "Find leads with score 80-100"

**Response:** List of matching leads with key details

---

### 3. create_task(params)
**Purpose:** Create a new task  
**Parameters:**
- `title`: Task title (required)
- `description`: Optional details
- `dueDate`: Optional due date
- `priority`: LOW, MEDIUM, HIGH, URGENT
- `leadId`: Optional - link task to specific lead

**Example Queries:**
- "Create task: Follow up with prospects"
- "Add task to call client tomorrow"
- "Remind me to review contract"

**Response:** Confirmation with task ID

---

### 4. update_lead_status(params)
**Purpose:** Change a lead's status  
**Parameters:**
- `leadId`: Lead ID (required)
- `status`: NEW, CONTACTED, QUALIFIED, NEGOTIATING, WON, LOST (required)

**Example Queries:**
- "Mark lead #123 as qualified"
- "Update lead 456 to won"
- "Change John's status to negotiating"

**Response:** Confirmation with updated status

---

### 5. get_recent_activities(params)
**Purpose:** Retrieve recent CRM activities  
**Parameters:**
- `limit`: Number of activities (default: 10)
- `type`: Filter by activity type

**Example Queries:**
- "Show recent activities"
- "What happened today?"
- "Last 20 activities"

**Response:** Chronological list of activities

---

### 6. get_lead_details(params)
**Purpose:** Get full information about a lead  
**Parameters:**
- `leadId`: Lead ID (required)

**Example Queries:**
- "Details for lead #789"
- "Show me info on John Smith"
- "Tell me about lead 123"

**Response:** Complete lead profile with contact info, score, status, notes, activities

---

## Technical Details

### Response Times
- Simple queries: 2-4 seconds
- Function calls: 3-5 seconds
- Complex operations: 5-8 seconds

### Cost Tracking
Every interaction is tracked for usage monitoring:
- Input tokens (your message)
- Output tokens (AI response)
- Total cost in USD

### Model Information
- **Model:** GPT-4-turbo-preview
- **Temperature:** 0.7 (balanced creativity/accuracy)
- **Max Tokens:** 500 per response

---

## Troubleshooting

### Chatbot Not Responding
1. Check internet connection
2. Refresh the page
3. Verify backend is running (green status indicator)
4. Check browser console for errors

### Incorrect Function Execution
- Use more specific language
- Include lead IDs for updates
- Check if lead/task exists in database

### Slow Response Times
- Large database queries take longer
- OpenAI API latency may vary
- Check network speed

---

## Privacy & Security

- All conversations are encrypted in transit
- Chat history is stored securely in your database
- Only you can access your conversations
- AI has no memory between different user sessions
- Function calls respect your access permissions

---

## Limitations

### What the AI CAN Do
✅ Read and search leads  
✅ Create tasks  
✅ Update lead statuses  
✅ Retrieve activities and details  
✅ Answer questions about your CRM data  

### What the AI CANNOT Do
❌ Delete leads or data  
❌ Send emails/SMS directly  
❌ Modify user permissions  
❌ Access external systems  
❌ Make financial transactions  
❌ Export bulk data  

---

## Best Practices

### 1. Start Simple
Begin with basic questions to understand how the AI interprets your requests.

### 2. Review Before Confirming
For status updates and data changes, verify the AI understood correctly before proceeding.

### 3. Use Suggested Actions
Click the suggested question buttons for optimized queries that work well.

### 4. Provide Feedback
If the AI misunderstands, rephrase your question with more context.

### 5. Combine with Manual Work
Use the AI for quick queries and automation, but manual entry for complex data.

---

## Example Workflows

### Morning Lead Review
```
User: "How many new leads since yesterday?"
AI: "You have 5 new leads since yesterday."

User: "Show me their names"
AI: "Here are your new leads: John Doe, Sarah Smith..."

User: "Create a task to call John Doe today"
AI: "✓ Created task: 'Call John Doe' - Due today"
```

### Qualification Process
```
User: "Find leads that replied to my email campaign"
AI: "Found 12 leads with email replies..."

User: "Mark leads with score above 70 as qualified"
AI: "Updated 8 leads to QUALIFIED status"

User: "Create follow-up tasks for qualified leads"
AI: "✓ Created 8 tasks for qualified leads"
```

### End-of-Day Review
```
User: "What were my activities today?"
AI: "Today you had: 15 calls, 8 emails sent..."

User: "How many leads moved to won?"
AI: "3 leads were marked as won today"

User: "Show me tomorrow's tasks"
AI: "You have 12 tasks scheduled for tomorrow..."
```

---

## Support

For issues or questions:
- Check the documentation
- Review error messages in the chat
- Contact your system administrator
- Submit bug reports via the support portal

---

*Last Updated: 2025-11-11*  
*Version: 1.0*  
*AI Model: GPT-4-turbo-preview*
