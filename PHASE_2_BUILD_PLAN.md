# 🏗️ **PHASE 2 BUILD PLAN - Communication & Automation**
## **Master RealEstate Pro - Build Before Deploy Strategy**

---

## **📋 OVERVIEW**

**Goal:** Complete Phase 2 features (Communication & Automation) before deployment  
**Timeline:** 3-4 weeks  
**Focus:** Build locally with SQLite, test thoroughly, deploy later  
**Status:** Starting from completed Phase 1 (Auth, Leads, Campaigns, Tasks)

---

## **🎯 WEEK 4: EMAIL & SMS TEMPLATES**

### **Day 1: Email Templates Backend**

**Database Schema** (Already in schema.prisma):
```prisma
model EmailTemplate {
  id          String   @id @default(cuid())
  name        String
  subject     String
  body        String   @db.Text
  category    String?
  isActive    Boolean  @default(true)
  variables   Json?    // {name, email, company, etc.}
  usageCount  Int      @default(0)
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Files to Create:**
- [ ] `backend/src/routes/email-templates.routes.ts`
- [ ] `backend/src/controllers/email-templates.controller.ts`
- [ ] `backend/src/validators/email-templates.validator.ts`

**API Endpoints:**
```
GET    /api/email-templates          - List all templates
POST   /api/email-templates          - Create template
GET    /api/email-templates/:id      - Get single template
PUT    /api/email-templates/:id      - Update template
DELETE /api/email-templates/:id      - Delete template
POST   /api/email-templates/:id/duplicate - Duplicate template
```

**Features:**
- Variable replacement system ({{name}}, {{email}}, etc.)
- Category filtering (welcome, follow-up, promotion, etc.)
- Usage tracking (increment usageCount when used)
- Active/inactive toggle

**Testing Checklist:**
- [ ] Create template with variables
- [ ] List templates with pagination
- [ ] Update template
- [ ] Delete template
- [ ] Duplicate template
- [ ] Test variable replacement

---

### **Day 2: SMS Templates Backend**

**Database Schema** (Already in schema.prisma):
```prisma
model SMSTemplate {
  id          String   @id @default(cuid())
  name        String
  body        String   @db.Text
  category    String?
  isActive    Boolean  @default(true)
  variables   Json?
  usageCount  Int      @default(0)
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Files to Create:**
- [ ] `backend/src/routes/sms-templates.routes.ts`
- [ ] `backend/src/controllers/sms-templates.controller.ts`
- [ ] `backend/src/validators/sms-templates.validator.ts`

**API Endpoints:**
```
GET    /api/sms-templates            - List all templates
POST   /api/sms-templates            - Create template
GET    /api/sms-templates/:id        - Get single template
PUT    /api/sms-templates/:id        - Update template
DELETE /api/sms-templates/:id        - Delete template
```

**Features:**
- Character count validation (160 chars per SMS)
- Variable replacement
- Preview with sample data
- Category management

**Testing Checklist:**
- [ ] Create SMS template (validate 160 char limit)
- [ ] Test variable replacement
- [ ] List templates
- [ ] Update/delete templates
- [ ] Character counter works correctly

---

### **Day 3: Template Service & Variable Engine**

**Files to Create:**
- [ ] `backend/src/services/template.service.ts`

**Core Functions:**
```typescript
class TemplateService {
  // Replace variables in template
  renderTemplate(template: string, variables: Record<string, any>): string
  
  // Get available variables for context
  getAvailableVariables(context: 'lead' | 'campaign' | 'user'): string[]
  
  // Validate template has no missing variables
  validateTemplate(template: string, requiredVars: string[]): boolean
  
  // Increment usage count
  trackTemplateUsage(templateId: string): Promise<void>
  
  // Get template with most common variables pre-filled
  getTemplatePreview(templateId: string): Promise<string>
}
```

**Variable System:**
```typescript
// Available variables
Lead context:
  {{name}}
  {{firstName}}
  {{lastName}}
  {{email}}
  {{phone}}
  {{company}}
  {{status}}
  {{score}}
  
User context:
  {{senderName}}
  {{senderEmail}}
  {{senderPhone}}
  
System:
  {{currentDate}}
  {{currentTime}}
  {{unsubscribeLink}}
```

**Testing Checklist:**
- [ ] Replace all variables correctly
- [ ] Handle missing variables gracefully
- [ ] Test with nested objects
- [ ] Validate template before save
- [ ] Track usage correctly

---

### **Day 4: Messages & Inbox Backend**

**Database Schema** (Already in schema.prisma):
```prisma
model Message {
  id          String        @id @default(cuid())
  type        MessageType
  direction   MessageDirection
  
  subject     String?
  body        String        @db.Text
  
  fromAddress String
  toAddress   String
  
  status      MessageStatus @default(PENDING)
  readAt      DateTime?
  repliedAt   DateTime?
  
  leadId      String?
  threadId    String?
  parentId    String?
  
  externalId  String?
  provider    String?
  
  metadata    Json?
  
  createdAt   DateTime      @default(now())
}
```

**Files to Create:**
- [ ] `backend/src/routes/messages.routes.ts`
- [ ] `backend/src/controllers/messages.controller.ts`
- [ ] `backend/src/validators/messages.validator.ts`

**API Endpoints:**
```
GET    /api/messages                 - List inbox messages
GET    /api/messages/:id             - Get message details
POST   /api/messages/email           - Send email
POST   /api/messages/sms             - Send SMS
PATCH  /api/messages/:id/read        - Mark as read
DELETE /api/messages/:id             - Delete message
GET    /api/messages/threads/:threadId - Get thread messages
POST   /api/messages/:id/reply       - Reply to message
```

**Features:**
- Unified inbox (email + SMS)
- Thread grouping
- Search and filters
- Lead linking
- Mock sending for now (log to console)

**Testing Checklist:**
- [ ] List messages with pagination
- [ ] Send email (mock)
- [ ] Send SMS (mock)
- [ ] Thread grouping works
- [ ] Mark as read
- [ ] Reply to message

---

### **Day 5: Message Service & Mock Providers**

**Files to Create:**
- [ ] `backend/src/services/message.service.ts`
- [ ] `backend/src/services/providers/email-provider.mock.ts`
- [ ] `backend/src/services/providers/sms-provider.mock.ts`

**Core Functions:**
```typescript
class MessageService {
  // Send email (mock for now)
  async sendEmail(options: {
    to: string
    subject: string
    body: string
    leadId?: string
    templateId?: string
  }): Promise<Message>
  
  // Send SMS (mock for now)
  async sendSMS(options: {
    to: string
    body: string
    leadId?: string
    templateId?: string
  }): Promise<Message>
  
  // Get inbox with filters
  async getInbox(filters: {
    type?: MessageType
    status?: MessageStatus
    search?: string
    page?: number
  }): Promise<PaginatedMessages>
  
  // Thread management
  async getThread(threadId: string): Promise<Message[]>
  async createThread(messages: Message[]): Promise<string>
}
```

**Mock Provider Behavior:**
```typescript
// Mock email provider
- Log email to console with pretty formatting
- Save to database with status: DELIVERED
- Simulate 1-2 second delay
- Return mock external ID

// Mock SMS provider
- Log SMS to console
- Save to database with status: DELIVERED
- Validate phone format
- Character limit enforcement
```

**Testing Checklist:**
- [ ] Send mock email logs correctly
- [ ] Send mock SMS validates phone
- [ ] Messages saved to database
- [ ] Thread creation works
- [ ] Inbox filters work
- [ ] Search functionality

---

## **🎯 WEEK 5: WORKFLOW AUTOMATION**

### **Day 6: Workflow Schema & CRUD**

**Database Schema** (Already in schema.prisma):
```prisma
model Workflow {
  id          String         @id @default(cuid())
  name        String
  description String?        @db.Text
  isActive    Boolean        @default(false)
  
  triggerType WorkflowTrigger
  triggerData Json?
  
  actions     Json           // Array of action definitions
  
  executions  Int            @default(0)
  successRate Float?
  lastRunAt   DateTime?
  
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  
  executions  WorkflowExecution[]
}

model WorkflowExecution {
  id          String   @id @default(cuid())
  workflowId  String
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  status      ExecutionStatus
  error       String?  @db.Text
  
  leadId      String?
  metadata    Json?
  
  startedAt   DateTime @default(now())
  completedAt DateTime?
}
```

**Files to Create:**
- [ ] `backend/src/routes/workflows.routes.ts`
- [ ] `backend/src/controllers/workflows.controller.ts`
- [ ] `backend/src/validators/workflows.validator.ts`

**API Endpoints:**
```
GET    /api/workflows                - List workflows
POST   /api/workflows                - Create workflow
GET    /api/workflows/:id            - Get workflow
PUT    /api/workflows/:id            - Update workflow
DELETE /api/workflows/:id            - Delete workflow
PATCH  /api/workflows/:id/toggle     - Enable/disable
POST   /api/workflows/:id/test       - Test workflow
GET    /api/workflows/:id/executions - Execution history
POST   /api/workflows/:id/duplicate  - Duplicate workflow
```

**Workflow Structure:**
```typescript
interface Workflow {
  id: string
  name: string
  isActive: boolean
  
  trigger: {
    type: 'LEAD_CREATED' | 'LEAD_STATUS_CHANGED' | 'EMAIL_OPENED' | etc.
    conditions?: {
      field: string
      operator: 'equals' | 'contains' | 'greater_than' | etc.
      value: any
    }[]
  }
  
  actions: {
    type: 'SEND_EMAIL' | 'SEND_SMS' | 'CREATE_TASK' | 'UPDATE_STATUS' | etc.
    config: Record<string, any>
    delay?: number // seconds
  }[]
}
```

**Testing Checklist:**
- [ ] Create workflow with trigger
- [ ] Add multiple actions
- [ ] Toggle active/inactive
- [ ] List workflows
- [ ] Update workflow
- [ ] Delete workflow

---

### **Day 7: Trigger Detection System**

**Files to Create:**
- [ ] `backend/src/services/workflow-trigger.service.ts`

**Core Functions:**
```typescript
class WorkflowTriggerService {
  // Called when event happens in system
  async detectTriggers(event: {
    type: WorkflowTrigger
    data: Record<string, any>
    leadId?: string
  }): Promise<Workflow[]>
  
  // Check if workflow conditions match
  async evaluateConditions(
    workflow: Workflow,
    eventData: Record<string, any>
  ): Promise<boolean>
  
  // Queue workflow for execution
  async queueWorkflow(
    workflowId: string,
    eventData: Record<string, any>
  ): Promise<void>
}
```

**Trigger Types:**
```typescript
enum WorkflowTrigger {
  LEAD_CREATED           // When new lead added
  LEAD_STATUS_CHANGED    // When status changes
  LEAD_ASSIGNED          // When lead assigned to user
  EMAIL_OPENED           // When email opened (webhook)
  EMAIL_CLICKED          // When link clicked
  SMS_DELIVERED          // When SMS delivered
  CAMPAIGN_COMPLETED     // When campaign finishes
  SCORE_THRESHOLD        // When score reaches X
  TAG_ADDED              // When tag added to lead
  TIME_BASED             // Scheduled (daily, weekly, etc.)
}
```

**Integration Points:**
```typescript
// In lead.controller.ts - createLead()
await workflowTriggerService.detectTriggers({
  type: 'LEAD_CREATED',
  data: lead,
  leadId: lead.id
})

// In lead.controller.ts - updateLeadStatus()
await workflowTriggerService.detectTriggers({
  type: 'LEAD_STATUS_CHANGED',
  data: { oldStatus, newStatus, lead },
  leadId: lead.id
})

// In webhook handlers (later)
await workflowTriggerService.detectTriggers({
  type: 'EMAIL_OPENED',
  data: { messageId, leadId },
  leadId
})
```

**Testing Checklist:**
- [ ] Detect LEAD_CREATED trigger
- [ ] Evaluate conditions correctly
- [ ] Match workflows with correct triggers
- [ ] Queue workflows for execution
- [ ] Handle multiple matching workflows

---

### **Day 8: Action Executor Engine**

**Files to Create:**
- [ ] `backend/src/services/workflow-executor.service.ts`

**Core Functions:**
```typescript
class WorkflowExecutorService {
  // Execute entire workflow
  async executeWorkflow(
    workflowId: string,
    eventData: Record<string, any>
  ): Promise<WorkflowExecution>
  
  // Execute single action
  async executeAction(
    action: WorkflowAction,
    context: Record<string, any>
  ): Promise<void>
  
  // Handle action types
  private async sendEmailAction(config: any, context: any): Promise<void>
  private async sendSMSAction(config: any, context: any): Promise<void>
  private async createTaskAction(config: any, context: any): Promise<void>
  private async updateStatusAction(config: any, context: any): Promise<void>
  private async addTagAction(config: any, context: any): Promise<void>
  private async waitAction(config: any): Promise<void>
}
```

**Action Types:**
```typescript
// 1. SEND_EMAIL
{
  type: 'SEND_EMAIL',
  config: {
    templateId: 'template_123',
    to: '{{lead.email}}',
    variables: { ... }
  }
}

// 2. SEND_SMS
{
  type: 'SEND_SMS',
  config: {
    templateId: 'template_456',
    to: '{{lead.phone}}',
    message: 'Hello {{lead.firstName}}'
  }
}

// 3. CREATE_TASK
{
  type: 'CREATE_TASK',
  config: {
    title: 'Follow up with {{lead.name}}',
    dueDate: '+3 days',
    priority: 'HIGH'
  }
}

// 4. UPDATE_STATUS
{
  type: 'UPDATE_STATUS',
  config: {
    status: 'CONTACTED'
  }
}

// 5. ADD_TAG
{
  type: 'ADD_TAG',
  config: {
    tagName: 'Workflow: Welcome Series'
  }
}

// 6. WAIT
{
  type: 'WAIT',
  config: {
    duration: 86400 // seconds (1 day)
  }
}
```

**Execution Flow:**
```typescript
1. Create WorkflowExecution record (status: PENDING)
2. For each action in workflow.actions:
   a. Execute action
   b. Log result
   c. If action has delay, schedule next action
   d. If action fails, mark execution as FAILED
3. Update execution status to SUCCESS
4. Update workflow stats (executions count, success rate)
```

**Testing Checklist:**
- [ ] Execute workflow with single action
- [ ] Execute workflow with multiple actions
- [ ] SEND_EMAIL action works (mock)
- [ ] SEND_SMS action works (mock)
- [ ] CREATE_TASK action works
- [ ] UPDATE_STATUS action works
- [ ] ADD_TAG action works
- [ ] Error handling works
- [ ] Execution logs created

---

### **Day 9: Workflow Integration & Testing**

**Tasks:**
- [ ] Integrate workflow triggers into lead controller
- [ ] Integrate workflow triggers into campaign controller
- [ ] Add webhook endpoints for future SendGrid/Twilio integration
- [ ] Create test workflows

**Test Workflows to Create:**

**1. Welcome Series:**
```typescript
{
  name: 'New Lead Welcome',
  trigger: { type: 'LEAD_CREATED' },
  actions: [
    { type: 'SEND_EMAIL', config: { templateId: 'welcome' } },
    { type: 'WAIT', config: { duration: 259200 } }, // 3 days
    { type: 'SEND_EMAIL', config: { templateId: 'follow-up-1' } },
    { type: 'CREATE_TASK', config: { title: 'Call {{lead.name}}', dueDate: '+1 day' } }
  ]
}
```

**2. Hot Lead Alert:**
```typescript
{
  name: 'Hot Lead Notification',
  trigger: { 
    type: 'LEAD_STATUS_CHANGED',
    conditions: [{ field: 'newStatus', operator: 'equals', value: 'HOT' }]
  },
  actions: [
    { type: 'SEND_SMS', config: { to: 'SALES_MANAGER_PHONE', message: 'New hot lead: {{lead.name}}' } },
    { type: 'CREATE_TASK', config: { title: 'Contact hot lead ASAP', priority: 'URGENT' } }
  ]
}
```

**3. Re-engagement:**
```typescript
{
  name: 'Re-engage Cold Leads',
  trigger: { 
    type: 'LEAD_STATUS_CHANGED',
    conditions: [{ field: 'newStatus', operator: 'equals', value: 'COLD' }]
  },
  actions: [
    { type: 'WAIT', config: { duration: 604800 } }, // 7 days
    { type: 'SEND_EMAIL', config: { templateId: 're-engagement' } },
    { type: 'ADD_TAG', config: { tagName: 'Re-engagement Campaign' } }
  ]
}
```

**Testing Checklist:**
- [ ] Create new lead → Triggers welcome workflow
- [ ] Change lead status → Triggers status workflows
- [ ] Workflow actions execute in order
- [ ] Workflow execution logs created
- [ ] Error handling works
- [ ] Multiple workflows can trigger for same event
- [ ] Inactive workflows don't trigger

---

### **Day 10: Workflow UI Integration & Documentation**

**Frontend Files to Update:**
- [ ] Connect workflow list to real API
- [ ] Connect workflow builder to real API
- [ ] Connect workflow execution logs to real API
- [ ] Test create/update/delete workflows from UI

**Documentation to Create:**
- [ ] Workflow user guide (how to create workflows)
- [ ] Available triggers reference
- [ ] Available actions reference
- [ ] Example workflows
- [ ] Troubleshooting guide

**Testing Checklist:**
- [ ] Create workflow from UI
- [ ] Edit workflow from UI
- [ ] Toggle workflow active/inactive
- [ ] View execution history
- [ ] Test workflow with real data
- [ ] Delete workflow

---

## **🎯 WEEK 6: BACKGROUND JOBS & APPOINTMENTS**

### **Day 11: Bull Queue Setup**

**Installation:**
```bash
npm install bull @types/bull ioredis-mock
```

**Files to Create:**
- [ ] `backend/src/jobs/queue.ts` - Queue setup
- [ ] `backend/src/jobs/processors/email.processor.ts`
- [ ] `backend/src/jobs/processors/campaign.processor.ts`
- [ ] `backend/src/jobs/processors/workflow.processor.ts`

**Queue Configuration:**
```typescript
// For development - use in-memory mock
import RedisMock from 'ioredis-mock'
import Bull from 'bull'

const redis = new RedisMock()

export const emailQueue = new Bull('email', {
  createClient: () => redis
})

export const campaignQueue = new Bull('campaign', {
  createClient: () => redis
})

export const workflowQueue = new Bull('workflow', {
  createClient: () => redis
})
```

**Job Types:**
```typescript
// Email job
emailQueue.add({
  type: 'send',
  to: 'user@example.com',
  subject: 'Hello',
  body: 'Message',
  leadId: 'lead_123'
})

// Campaign job
campaignQueue.add({
  type: 'execute',
  campaignId: 'campaign_123'
})

// Workflow job
workflowQueue.add({
  type: 'execute',
  workflowId: 'workflow_123',
  eventData: { ... }
})
```

**Testing Checklist:**
- [ ] Queue initialization works
- [ ] Jobs can be added to queue
- [ ] Jobs are processed
- [ ] Failed jobs are retried
- [ ] Job logs are accessible

---

### **Day 12: Job Processors**

**Email Processor:**
```typescript
emailQueue.process(async (job) => {
  const { to, subject, body, leadId, templateId } = job.data
  
  // If templateId provided, render template
  if (templateId) {
    const template = await getTemplate(templateId)
    const lead = await getLead(leadId)
    body = renderTemplate(template.body, { lead })
  }
  
  // Send via message service (mock for now)
  await messageService.sendEmail({ to, subject, body, leadId })
  
  // Log activity
  await activityService.log({
    type: 'EMAIL_SENT',
    leadId,
    metadata: { to, subject }
  })
  
  return { success: true }
})
```

**Campaign Processor:**
```typescript
campaignQueue.process(async (job) => {
  const { campaignId } = job.data
  
  // Get campaign and target leads
  const campaign = await getCampaign(campaignId)
  const leads = await getLeadsForCampaign(campaign)
  
  // Send to each lead
  for (const lead of leads) {
    if (campaign.type === 'EMAIL') {
      await emailQueue.add({ 
        to: lead.email, 
        subject: campaign.subject,
        body: campaign.body,
        leadId: lead.id 
      })
    } else if (campaign.type === 'SMS') {
      await smsQueue.add({
        to: lead.phone,
        message: campaign.body,
        leadId: lead.id
      })
    }
  }
  
  // Update campaign stats
  await updateCampaign(campaignId, { 
    status: 'COMPLETED',
    sent: leads.length 
  })
  
  return { sent: leads.length }
})
```

**Workflow Processor:**
```typescript
workflowQueue.process(async (job) => {
  const { workflowId, eventData } = job.data
  
  // Execute workflow via workflow executor service
  const execution = await workflowExecutorService.executeWorkflow(
    workflowId,
    eventData
  )
  
  return execution
})
```

**Testing Checklist:**
- [ ] Email processor sends emails
- [ ] Campaign processor sends to multiple leads
- [ ] Workflow processor executes workflows
- [ ] Failed jobs are logged
- [ ] Retry logic works

---

### **Day 13: Appointments Backend**

**Database Schema** (Already in schema.prisma):
```prisma
model Appointment {
  id          String            @id @default(cuid())
  title       String
  description String?           @db.Text
  startTime   DateTime
  endTime     DateTime
  location    String?
  meetingUrl  String?
  type        AppointmentType
  status      AppointmentStatus @default(SCHEDULED)
  
  leadId      String?
  attendees   Json?
  
  reminderSent Boolean          @default(false)
  
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}
```

**Files to Create:**
- [ ] `backend/src/routes/appointments.routes.ts`
- [ ] `backend/src/controllers/appointments.controller.ts`
- [ ] `backend/src/validators/appointments.validator.ts`
- [ ] `backend/src/services/appointment.service.ts`

**API Endpoints:**
```
GET    /api/appointments             - List appointments
POST   /api/appointments             - Create appointment
GET    /api/appointments/:id         - Get appointment
PUT    /api/appointments/:id         - Update appointment
DELETE /api/appointments/:id         - Cancel appointment
PATCH  /api/appointments/:id/confirm - Confirm appointment
POST   /api/appointments/:id/reschedule - Reschedule
POST   /api/appointments/:id/send-reminder - Manual reminder
GET    /api/appointments/calendar    - Calendar view (by date range)
```

**Features:**
- Time slot validation (no conflicts)
- Lead linking
- Multiple attendees
- Reminder system
- Calendar export (ICS format)

**Testing Checklist:**
- [ ] Create appointment
- [ ] List appointments
- [ ] Update appointment
- [ ] Cancel appointment
- [ ] Conflict detection works
- [ ] Reminder scheduling works

---

### **Day 14: Reminder Service**

**Files to Create:**
- [ ] `backend/src/services/reminder.service.ts`
- [ ] `backend/src/jobs/processors/reminder.processor.ts`

**Core Functions:**
```typescript
class ReminderService {
  // Send reminder for specific appointment
  async sendAppointmentReminder(appointmentId: string): Promise<void> {
    const appointment = await getAppointment(appointmentId)
    const lead = appointment.leadId ? await getLead(appointment.leadId) : null
    
    // Send email reminder
    await emailQueue.add({
      to: lead?.email || appointment.attendees[0],
      subject: `Reminder: ${appointment.title}`,
      body: renderReminderEmail(appointment)
    })
    
    // Send SMS reminder if phone available
    if (lead?.phone) {
      await smsQueue.add({
        to: lead.phone,
        message: `Reminder: ${appointment.title} at ${formatTime(appointment.startTime)}`
      })
    }
    
    // Mark reminder sent
    await updateAppointment(appointmentId, { reminderSent: true })
  }
  
  // Find appointments needing reminders (24 hours before)
  async findUpcomingAppointments(): Promise<Appointment[]> {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    return await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now,
          lte: tomorrow
        },
        reminderSent: false,
        status: 'SCHEDULED'
      }
    })
  }
  
  // Cron job - run daily at 9 AM
  async sendUpcomingReminders(): Promise<void> {
    const appointments = await this.findUpcomingAppointments()
    
    for (const appointment of appointments) {
      await this.sendAppointmentReminder(appointment.id)
    }
  }
}
```

**Scheduled Job:**
```typescript
// In backend/src/jobs/scheduler.ts
import cron from 'node-cron'

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running appointment reminders...')
  await reminderService.sendUpcomingReminders()
})
```

**Testing Checklist:**
- [ ] Find upcoming appointments (next 24 hours)
- [ ] Send reminder email
- [ ] Send reminder SMS
- [ ] Mark reminder as sent
- [ ] Cron job triggers correctly
- [ ] Handle appointments without lead

---

### **Day 15: Integration Testing & Polish**

**Create Integration Tests:**
- [ ] `backend/tests/integration/workflows.test.ts`
- [ ] `backend/tests/integration/campaigns.test.ts`
- [ ] `backend/tests/integration/messages.test.ts`
- [ ] `backend/tests/integration/appointments.test.ts`

**Test Scenarios:**

**1. Full Workflow Test:**
```typescript
it('should execute complete workflow on lead creation', async () => {
  // 1. Create workflow
  const workflow = await createWorkflow({
    trigger: { type: 'LEAD_CREATED' },
    actions: [
      { type: 'SEND_EMAIL', config: { templateId: 'welcome' } },
      { type: 'CREATE_TASK', config: { title: 'Follow up' } }
    ]
  })
  
  // 2. Create lead
  const lead = await createLead({ name: 'Test', email: 'test@test.com' })
  
  // 3. Wait for workflow execution
  await delay(2000)
  
  // 4. Verify email sent
  const messages = await getMessages({ leadId: lead.id })
  expect(messages).toHaveLength(1)
  
  // 5. Verify task created
  const tasks = await getTasks({ leadId: lead.id })
  expect(tasks).toHaveLength(1)
})
```

**2. Campaign Execution Test:**
```typescript
it('should send campaign to multiple leads', async () => {
  // 1. Create leads
  const leads = await createMultipleLeads(5)
  
  // 2. Create campaign
  const campaign = await createCampaign({
    type: 'EMAIL',
    subject: 'Test',
    body: 'Hello {{name}}'
  })
  
  // 3. Execute campaign
  await executeCampaign(campaign.id)
  
  // 4. Wait for processing
  await delay(3000)
  
  // 5. Verify all emails sent
  const messages = await getMessages({ campaignId: campaign.id })
  expect(messages).toHaveLength(5)
  
  // 6. Verify campaign stats updated
  const updated = await getCampaign(campaign.id)
  expect(updated.sent).toBe(5)
})
```

**3. Appointment Reminder Test:**
```typescript
it('should send reminder for upcoming appointment', async () => {
  // 1. Create appointment tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const appointment = await createAppointment({
    title: 'Meeting',
    startTime: tomorrow,
    leadId: lead.id
  })
  
  // 2. Trigger reminder service
  await reminderService.sendUpcomingReminders()
  
  // 3. Verify reminder sent
  const messages = await getMessages({ leadId: lead.id })
  expect(messages.some(m => m.subject.includes('Reminder'))).toBe(true)
  
  // 4. Verify marked as sent
  const updated = await getAppointment(appointment.id)
  expect(updated.reminderSent).toBe(true)
})
```

**Testing Checklist:**
- [ ] All workflow tests pass
- [ ] All campaign tests pass
- [ ] All message tests pass
- [ ] All appointment tests pass
- [ ] Edge cases handled
- [ ] Error scenarios tested

---

## **🎯 WEEK 7: POLISH & DOCUMENTATION**

### **Day 16-17: Code Review & Refactoring**

**Tasks:**
- [ ] Review all new code for consistency
- [ ] Add JSDoc comments to all functions
- [ ] Optimize database queries
- [ ] Add proper error handling everywhere
- [ ] Add input validation to all endpoints
- [ ] Add rate limiting to sensitive endpoints
- [ ] Clean up console.logs
- [ ] Add proper TypeScript types

**Checklist:**
- [ ] All files have proper imports
- [ ] No unused variables
- [ ] Consistent naming conventions
- [ ] All Prisma queries optimized
- [ ] All errors properly handled
- [ ] All responses properly typed

---

### **Day 18: API Documentation**

**Tasks:**
- [ ] Install Swagger/OpenAPI
- [ ] Document all endpoints
- [ ] Add request/response examples
- [ ] Add error codes
- [ ] Create Postman collection

**Documentation to Create:**
- [ ] API reference guide
- [ ] Authentication guide
- [ ] Rate limiting policy
- [ ] Error codes reference
- [ ] Webhook documentation

---

### **Day 19: Developer Documentation**

**Create Markdown Docs:**
- [ ] `docs/WORKFLOW_SYSTEM.md` - How workflows work
- [ ] `docs/MESSAGE_SYSTEM.md` - Message architecture
- [ ] `docs/JOB_QUEUE.md` - Background job system
- [ ] `docs/TEMPLATE_VARIABLES.md` - Available variables
- [ ] `docs/TESTING.md` - How to run tests

**Update README:**
- [ ] List all new features
- [ ] Installation steps
- [ ] Environment variables
- [ ] How to run locally
- [ ] How to run tests
- [ ] Troubleshooting section

---

### **Day 20: Final Testing & Preparation**

**Create Test Data:**
- [ ] Seed 50 sample leads
- [ ] Seed 10 email templates
- [ ] Seed 5 SMS templates
- [ ] Seed 3 example workflows
- [ ] Seed 10 appointments

**Manual Testing:**
- [ ] Test complete user journey
- [ ] Test all workflows end-to-end
- [ ] Test campaign execution
- [ ] Test appointment reminders
- [ ] Test error scenarios
- [ ] Test with large datasets

**Performance Testing:**
- [ ] Test with 1000+ leads
- [ ] Test campaign to 100+ recipients
- [ ] Monitor memory usage
- [ ] Check query performance
- [ ] Profile slow endpoints

**Final Checklist:**
- [ ] All tests passing
- [ ] No console errors
- [ ] All endpoints documented
- [ ] All features work locally
- [ ] Code pushed to GitHub
- [ ] Ready for Phase 3 (AI features)

---

## **📊 SUCCESS METRICS**

At the end of Phase 2, you should have:

- ✅ **Email Templates:** Full CRUD + variable system
- ✅ **SMS Templates:** Full CRUD + character validation
- ✅ **Message Inbox:** Unified email/SMS inbox
- ✅ **Workflows:** 8+ trigger types, 6+ action types
- ✅ **Workflow Execution:** Automatic trigger detection
- ✅ **Background Jobs:** Bull queue processing
- ✅ **Appointments:** Full calendar system
- ✅ **Reminders:** Automated appointment reminders
- ✅ **Integration Tests:** 80%+ coverage
- ✅ **Documentation:** Complete API + developer docs

**Estimated LOC Added:** 8,000-10,000 lines  
**Estimated Test Coverage:** 75-80%  
**Estimated API Endpoints Added:** 40+

---

## **🚀 NEXT STEPS AFTER PHASE 2**

Once Phase 2 is complete:

1. **Short Break** - Take 2-3 days to review everything
2. **Phase 3 Planning** - Plan AI features and analytics
3. **Consider Deployment** - If you want beta testers
4. **Phase 3 Build** - AI agent, lead scoring, integrations

**You'll have a fully functional CRM** that:
- Manages leads
- Sends emails and SMS
- Automates workflows
- Schedules appointments
- Tracks all activity
- Works completely offline/locally

**All without deploying a single thing!** 🎉

---

## **💡 TIPS FOR SUCCESS**

1. **Commit frequently** - After each completed task
2. **Test as you go** - Don't wait until the end
3. **Keep notes** - Document challenges and solutions
4. **Take breaks** - Avoid burnout
5. **Ask for help** - When stuck for more than 30 minutes
6. **Stay focused** - Finish one feature before starting next
7. **Celebrate wins** - Each completed day is progress!

---

**Ready to build? Let's start with Day 1: Email Templates! 🚀**
