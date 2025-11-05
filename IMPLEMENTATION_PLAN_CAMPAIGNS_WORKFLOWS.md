# 🚀 Implementation Plan - Campaigns & Workflows System

## Overview
This document outlines the step-by-step implementation plan for building the intelligent Campaigns and Workflows system, including timelines, priorities, and technical requirements.

---

## 📊 PHASE BREAKDOWN

### **PHASE 1: Enhanced Campaigns** (5-7 days)
Focus: Improve existing campaign system with smart features

### **PHASE 2: Automation Rules** (3-5 days)
Focus: Simple if/then rules to connect the system

### **PHASE 3: Workflows Foundation** (7-10 days)
Focus: Build core workflow engine and basic templates

### **PHASE 4: Advanced Workflows** (5-7 days)
Focus: Visual builder, conditional logic, complex sequences

### **PHASE 5: System Integration** (3-5 days)
Focus: Connect all pieces, testing, optimization

**Total Estimated Time: 23-34 days**

---

## 🎯 PHASE 1: ENHANCED CAMPAIGNS (Priority: HIGH)

### Goal
Make campaigns smarter with recurring schedules, better audience filtering, and dynamic audience recalculation.

### Features to Build

#### 1.1 Recurring Campaign Scheduling ⭐⭐⭐⭐⭐
**Estimated Time: 2 days**

**Backend Changes:**
- [ ] Update Campaign schema in Prisma:
  ```prisma
  model Campaign {
    // ... existing fields
    
    // Recurring schedule fields
    isRecurring      Boolean   @default(false)
    frequency        String?   // 'daily', 'weekly', 'monthly', 'custom'
    recurringPattern Json?     // { daysOfWeek: [1,2,3,4,5], time: '09:00' }
    endDate          DateTime? // When to stop recurring
    maxOccurrences   Int?      // Stop after X sends
    occurrenceCount  Int       @default(0) // How many times sent
    
    lastSentAt       DateTime? // Track last execution
    nextSendAt       DateTime? // When next send is scheduled
  }
  ```

- [ ] Create migration for new fields
- [ ] Update campaign-scheduler.service.ts:
  - Check both one-time (startDate) and recurring (nextSendAt) campaigns
  - After sending recurring campaign, calculate nextSendAt based on frequency
  - Increment occurrenceCount
  - Check if should stop (maxOccurrences or endDate reached)
  
- [ ] Update campaign.controller.ts:
  - Modify createCampaign to accept recurring parameters
  - Add calculateNextSendDate() helper function
  - Validate recurring pattern

**Frontend Changes:**
- [ ] Update CampaignCreate.tsx:
  - Add "Recurring" section in Schedule & Budget card
  - Radio buttons: One-time vs. Recurring
  - If Recurring selected, show:
    - Frequency dropdown (Daily, Weekly, Monthly)
    - Days of week checkboxes (if Weekly)
    - Day of month selector (if Monthly)
    - End condition: Never / End Date / After X times
  
- [ ] Update campaign types in src/types/index.ts
- [ ] Update campaignsApi.createCampaign() to include new fields

**Testing:**
- [ ] Create daily recurring campaign (7 AM every day)
- [ ] Create weekly campaign (Monday + Wednesday 10 AM)
- [ ] Create monthly campaign (1st of month)
- [ ] Verify nextSendAt updates after each send
- [ ] Verify campaigns stop at endDate or maxOccurrences

---

#### 1.2 Days of Week Selection ⭐⭐⭐⭐⭐
**Estimated Time: 1 day**

**Backend Changes:**
- [ ] Already handled in recurringPattern JSON above
- [ ] In scheduler, check if current day matches daysOfWeek array
- [ ] Skip send if not a selected day, recalculate nextSendAt

**Frontend Changes:**
- [ ] Create DaysOfWeekPicker component:
  ```tsx
  <div className="flex gap-2">
    <Checkbox label="Mon" value={1} />
    <Checkbox label="Tue" value={2} />
    <Checkbox label="Wed" value={3} />
    <Checkbox label="Thu" value={4} />
    <Checkbox label="Fri" value={5} />
    <Checkbox label="Sat" value={6} />
    <Checkbox label="Sun" value={0} />
  </div>
  ```
- [ ] Add to CampaignCreate.tsx for weekly campaigns
- [ ] Show selected days in campaign list view

**Testing:**
- [ ] Create campaign for Mon/Wed/Fri only
- [ ] Verify it doesn't send on Tue/Thu
- [ ] Verify nextSendAt skips non-selected days

---

#### 1.3 Dynamic Audience Filtering ⭐⭐⭐⭐⭐
**Estimated Time: 2 days**

**Backend Changes:**
- [ ] Update Campaign schema:
  ```prisma
  model Campaign {
    // ... existing fields
    
    audienceType     String    @default('static') // 'static' or 'dynamic'
    audienceFilter   Json?     // Dynamic filter rules
    // audienceFilter example:
    // {
    //   status: ['HOT', 'QUALIFIED'],
    //   tags: ['buyer'],
    //   excludeWorkflows: true,
    //   excludeRecentContact: 7, // days
    //   engagementMin: 30 // opened in last 30 days
    // }
  }
  ```

- [ ] Create campaign-audience.service.ts:
  ```typescript
  export class CampaignAudienceService {
    async getAudienceLeads(campaign: Campaign): Promise<Lead[]> {
      // If static, return fixed audience
      // If dynamic, query leads matching filters
      
      const query = {
        where: {
          // Apply status filter
          // Apply tags filter
          // Apply date filters
          // Exclude leads in active workflows
          // Exclude unsubscribed
        }
      }
      
      return prisma.lead.findMany(query)
    }
    
    async getAudienceCount(filter: Json): Promise<number> {
      // Return estimated count for preview
    }
  }
  ```

- [ ] Update campaign-executor.service.ts:
  - Use CampaignAudienceService to get recipients at send time
  - Log: "Audience recalculated: X leads"

- [ ] Add GET /api/campaigns/preview-audience endpoint:
  - Accept filter JSON
  - Return count and sample leads (first 10)

**Frontend Changes:**
- [ ] Update CampaignCreate.tsx audience section:
  - Radio: Static (fixed) vs. Dynamic (recalculated)
  - If Static: Show count at creation time
  - If Dynamic: Show filter builder UI
  
- [ ] Create AudienceFilterBuilder component:
  ```tsx
  <div className="space-y-4">
    <div>
      <label>Lead Status</label>
      <MultiSelect options={['NEW', 'HOT', 'QUALIFIED', 'CONTACTED']} />
    </div>
    
    <div>
      <label>Tags</label>
      <TagSelector />
    </div>
    
    <div>
      <Checkbox label="Exclude leads in active workflows" />
      <Checkbox label="Only engaged (opened email in last 30 days)" />
      <Checkbox label="Exclude recently contacted (within 7 days)" />
    </div>
    
    <div className="border-t pt-4">
      <p>Estimated Audience: <strong>~{count} leads</strong></p>
      <Button variant="outline" onClick={previewAudience}>
        Preview Recipients
      </Button>
    </div>
  </div>
  ```

- [ ] Add real-time audience count preview (debounced API call)

**Testing:**
- [ ] Create campaign with dynamic audience (HOT + QUALIFIED leads)
- [ ] Add new HOT lead to system
- [ ] Verify campaign includes new lead at next send
- [ ] Remove lead from filter criteria
- [ ] Verify lead excluded from next send

---

#### 1.4 Campaign Templates ⭐⭐⭐⭐
**Estimated Time: 1.5 days**

**Backend Changes:**
- [ ] Create campaign-templates.ts (can be JSON file or database):
  ```typescript
  export const CAMPAIGN_TEMPLATES = [
    {
      id: 'weekly-market-report',
      name: 'Weekly Market Report',
      description: 'Send market updates every Monday morning',
      type: 'EMAIL',
      isRecurring: true,
      frequency: 'weekly',
      recurringPattern: { daysOfWeek: [1], time: '07:00' },
      subject: 'This Week\'s Market Update - {date}',
      body: '<h1>Market Report for {city}</h1>...',
      audienceType: 'dynamic',
      audienceFilter: { status: ['NEW', 'CONTACTED', 'QUALIFIED', 'HOT'] }
    },
    // ... more templates
  ]
  ```

- [ ] Add GET /api/campaigns/templates endpoint
- [ ] Add POST /api/campaigns/from-template/:templateId endpoint

**Frontend Changes:**
- [ ] Add "Templates" tab to /campaigns page
- [ ] Create CampaignTemplates.tsx component:
  - Grid view of template cards
  - Shows: Name, description, icon, frequency
  - "Use Template" button
  
- [ ] When user clicks "Use Template":
  - Navigate to /campaigns/create
  - Pre-fill form with template data
  - User can customize before creating

**Testing:**
- [ ] Load all templates
- [ ] Use "Weekly Market Report" template
- [ ] Customize subject line
- [ ] Create campaign from template
- [ ] Verify it works as recurring campaign

---

#### 1.5 Quiet Hours & Business Days ⭐⭐⭐⭐
**Estimated Time: 1 day**

**Backend Changes:**
- [ ] Update Campaign schema:
  ```prisma
  model Campaign {
    // ... existing fields
    
    respectQuietHours  Boolean @default(true)
    quietHoursStart    String? @default('20:00')
    quietHoursEnd      String? @default('08:00')
    businessDaysOnly   Boolean @default(false)
    skipHolidays       Boolean @default(false)
  }
  ```

- [ ] Update campaign-scheduler.service.ts:
  ```typescript
  function shouldSendNow(campaign: Campaign): boolean {
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay() // 0 = Sunday
    
    // Check quiet hours
    if (campaign.respectQuietHours) {
      const startHour = parseInt(campaign.quietHoursStart)
      const endHour = parseInt(campaign.quietHoursEnd)
      
      if (currentHour >= startHour || currentHour < endHour) {
        console.log('⏰ Skipping send - quiet hours')
        return false
      }
    }
    
    // Check business days
    if (campaign.businessDaysOnly && (currentDay === 0 || currentDay === 6)) {
      console.log('⏰ Skipping send - weekend')
      return false
    }
    
    // Check holidays (if enabled)
    if (campaign.skipHolidays && isHoliday(now)) {
      console.log('⏰ Skipping send - holiday')
      return false
    }
    
    return true
  }
  ```

- [ ] If shouldSendNow returns false, recalculate nextSendAt to next valid time

**Frontend Changes:**
- [ ] Add to CampaignCreate.tsx Delivery Settings:
  ```tsx
  <div className="space-y-4">
    <div>
      <Checkbox 
        label="Respect quiet hours" 
        checked={respectQuietHours}
      />
      {respectQuietHours && (
        <div className="ml-6 grid grid-cols-2 gap-4">
          <div>
            <label>Don't send before</label>
            <Input type="time" value={quietHoursEnd} />
          </div>
          <div>
            <label>Don't send after</label>
            <Input type="time" value={quietHoursStart} />
          </div>
        </div>
      )}
    </div>
    
    <Checkbox 
      label="Business days only (skip weekends)" 
      checked={businessDaysOnly}
    />
    
    <Checkbox 
      label="Skip major holidays" 
      checked={skipHolidays}
    />
  </div>
  ```

**Testing:**
- [ ] Create campaign scheduled for 9 PM with quiet hours enabled
- [ ] Verify it delays until next morning (8 AM)
- [ ] Create campaign for Saturday with business days only
- [ ] Verify it delays until Monday

---

#### 1.6 Send Rate Throttling ⭐⭐⭐
**Estimated Time: 1 day**

**Backend Changes:**
- [ ] Update Campaign schema:
  ```prisma
  model Campaign {
    // ... existing fields
    
    throttleEnabled   Boolean @default(false)
    throttleRate      Int?    // emails per hour
    throttleDuration  Int?    // spread over X hours
  }
  ```

- [ ] Update campaign-executor.service.ts:
  ```typescript
  async executeCampaign(campaign: Campaign): Promise<ExecutionResult> {
    const leads = await this.audienceService.getAudienceLeads(campaign)
    
    if (campaign.throttleEnabled) {
      // Don't send all at once
      // Calculate batch size: throttleRate per hour
      const batchSize = campaign.throttleRate || 100
      
      // Send first batch now
      const firstBatch = leads.slice(0, batchSize)
      await this.sendBatch(firstBatch, campaign)
      
      // Schedule remaining batches
      const remaining = leads.slice(batchSize)
      for (let i = 0; i < remaining.length; i += batchSize) {
        const batch = remaining.slice(i, i + batchSize)
        const delayMinutes = ((i / batchSize) + 1) * 60 // 1 hour per batch
        
        await this.scheduleBatch(batch, campaign, delayMinutes)
      }
    } else {
      // Send all at once
      await this.sendToAll(leads, campaign)
    }
  }
  
  async scheduleBatch(leads: Lead[], campaign: Campaign, delayMinutes: number) {
    // Create queued sends in database
    await prisma.queuedSend.createMany({
      data: leads.map(lead => ({
        campaignId: campaign.id,
        leadId: lead.id,
        scheduledFor: new Date(Date.now() + delayMinutes * 60 * 1000)
      }))
    })
  }
  ```

- [ ] Create QueuedSend model:
  ```prisma
  model QueuedSend {
    id           String   @id @default(cuid())
    campaignId   String
    leadId       String
    scheduledFor DateTime
    sentAt       DateTime?
    status       String   @default('PENDING') // PENDING, SENT, FAILED
    
    campaign     Campaign @relation(fields: [campaignId], references: [id])
    lead         Lead     @relation(fields: [leadId], references: [id])
  }
  ```

- [ ] Add cron job to process queued sends (every 5 minutes)

**Frontend Changes:**
- [ ] Add to CampaignCreate.tsx Delivery Settings:
  ```tsx
  <div>
    <Checkbox 
      label="Throttle sending (spread over time)" 
      checked={throttleEnabled}
    />
    
    {throttleEnabled && (
      <div className="ml-6 space-y-2">
        <div>
          <label>Send rate</label>
          <Input 
            type="number" 
            value={throttleRate} 
            suffix="emails per hour"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {audience} leads will be sent over {Math.ceil(audience / throttleRate)} hours
        </p>
      </div>
    )}
  </div>
  ```

**Testing:**
- [ ] Create campaign to 500 leads with throttle (100/hour)
- [ ] Verify first 100 send immediately
- [ ] Verify remaining 400 queued in database
- [ ] Wait 1 hour, verify next 100 sent
- [ ] Check logs for batch processing

---

### Phase 1 Summary
**Total Time: 5-7 days**
**Deliverables:**
- ✅ Recurring campaigns (daily, weekly, monthly)
- ✅ Days of week selection
- ✅ Dynamic audience recalculation
- ✅ 7 pre-made campaign templates
- ✅ Quiet hours & business days only
- ✅ Send rate throttling

---

## ⚙️ PHASE 2: AUTOMATION RULES (Priority: MEDIUM)

### Goal
Create simple if/then rules that connect campaigns, leads, and workflows intelligently.

### Features to Build

#### 2.1 Automation Rules Foundation ⭐⭐⭐⭐
**Estimated Time: 2 days**

**Backend Changes:**
- [ ] Create AutomationRule model:
  ```prisma
  model AutomationRule {
    id          String   @id @default(cuid())
    name        String
    description String?
    status      String   @default('ACTIVE') // ACTIVE, PAUSED
    priority    Int      @default(0)
    
    // Trigger definition
    triggerType String   // 'lead_status_change', 'lead_created', 'email_opened', etc.
    triggerData Json     // { fromStatus: 'HOT', toStatus: 'COLD' }
    
    // Action definition
    actionType  String   // 'exclude_from_campaigns', 'notify_agent', 'update_status', etc.
    actionData  Json     // { campaignTypes: ['SMS'], reason: 'Lead is cold' }
    
    createdById String
    createdBy   User     @relation(fields: [createdById], references: [id])
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }
  ```

- [ ] Create migration

- [ ] Create automation-rule.service.ts:
  ```typescript
  export class AutomationRuleService {
    async executeRules(triggerType: string, triggerData: any) {
      const rules = await prisma.automationRule.findMany({
        where: { 
          status: 'ACTIVE',
          triggerType 
        },
        orderBy: { priority: 'desc' }
      })
      
      for (const rule of rules) {
        if (this.matchesTrigger(rule, triggerData)) {
          await this.executeAction(rule, triggerData)
        }
      }
    }
    
    private matchesTrigger(rule: AutomationRule, data: any): boolean {
      // Check if trigger conditions match
      // Example: If rule says "status changes to COLD", check if data.newStatus === 'COLD'
    }
    
    private async executeAction(rule: AutomationRule, data: any) {
      switch (rule.actionType) {
        case 'exclude_from_campaigns':
          await this.excludeFromCampaigns(rule, data)
          break
        case 'notify_agent':
          await this.notifyAgent(rule, data)
          break
        case 'update_lead_status':
          await this.updateLeadStatus(rule, data)
          break
        // ... more actions
      }
    }
  }
  ```

- [ ] Hook rules into lead.controller.ts:
  ```typescript
  async updateLeadStatus(leadId: string, newStatus: string) {
    const oldStatus = lead.status
    
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: newStatus }
    })
    
    // Trigger automation rules
    await automationRuleService.executeRules('lead_status_change', {
      leadId,
      oldStatus,
      newStatus
    })
  }
  ```

**Frontend Changes:**
- [ ] Create /settings/automation route
- [ ] Create AutomationRules.tsx page:
  - List view of all rules
  - Toggle to activate/pause rules
  - "Add Rule" button

- [ ] Create AutomationRuleForm component:
  ```tsx
  <div className="space-y-6">
    <div>
      <label>Rule Name</label>
      <Input placeholder="e.g., Stop SMS to Cold Leads" />
    </div>
    
    <div>
      <label>When this happens...</label>
      <Select>
        <option value="lead_status_change">Lead status changes</option>
        <option value="lead_created">Lead is created</option>
        <option value="email_opened">Email is opened</option>
        <option value="appointment_booked">Appointment is booked</option>
      </Select>
      
      {/* Conditional fields based on trigger type */}
      {triggerType === 'lead_status_change' && (
        <div className="ml-4">
          <label>To status</label>
          <Select>
            <option value="COLD">COLD</option>
            <option value="HOT">HOT</option>
            {/* ... */}
          </Select>
        </div>
      )}
    </div>
    
    <div>
      <label>Do this...</label>
      <Select>
        <option value="exclude_from_campaigns">Exclude from campaigns</option>
        <option value="notify_agent">Notify agent</option>
        <option value="update_lead_status">Update lead status</option>
        <option value="add_tag">Add tag to lead</option>
      </Select>
      
      {/* Conditional fields based on action type */}
      {actionType === 'exclude_from_campaigns' && (
        <div className="ml-4">
          <label>Campaign types to exclude</label>
          <MultiSelect options={['EMAIL', 'SMS', 'PHONE', 'SOCIAL']} />
        </div>
      )}
    </div>
  </div>
  ```

**Testing:**
- [ ] Create rule: "When lead → COLD, exclude from SMS campaigns"
- [ ] Change lead status to COLD
- [ ] Verify lead excluded from SMS campaign audience
- [ ] Change lead back to HOT
- [ ] Verify lead included again

---

#### 2.2 Pre-Made Rule Templates ⭐⭐⭐
**Estimated Time: 1 day**

**Backend Changes:**
- [ ] Create automation-rule-templates.ts:
  ```typescript
  export const RULE_TEMPLATES = [
    {
      id: 'stop-sms-cold-leads',
      name: 'Stop SMS to Cold Leads',
      description: 'Prevent wasting money on unengaged leads',
      triggerType: 'lead_status_change',
      triggerData: { toStatus: 'COLD' },
      actionType: 'exclude_from_campaigns',
      actionData: { campaignTypes: ['SMS'] }
    },
    {
      id: 'notify-hot-lead',
      name: 'Notify Agent of Hot Leads',
      description: 'Get alerted when lead becomes hot',
      triggerType: 'lead_status_change',
      triggerData: { toStatus: 'HOT' },
      actionType: 'notify_agent',
      actionData: { notificationType: 'push', priority: 'high' }
    },
    // ... more templates
  ]
  ```

- [ ] Add GET /api/automation-rules/templates endpoint
- [ ] Add POST /api/automation-rules/from-template/:templateId

**Frontend Changes:**
- [ ] Add "Templates" section to AutomationRules page
- [ ] Show template cards with:
  - Name, description
  - "Enable This Rule" button
  - Pre-configured, user just activates

**Testing:**
- [ ] Load all rule templates
- [ ] Enable "Stop SMS to Cold Leads" template
- [ ] Verify rule created and active
- [ ] Test rule execution

---

#### 2.3 Campaign Exclusions System ⭐⭐⭐⭐
**Estimated Time: 2 days**

**Backend Changes:**
- [ ] Create CampaignExclusion model:
  ```prisma
  model CampaignExclusion {
    id         String    @id @default(cuid())
    campaignId String?   // Specific campaign, or null for all
    leadId     String
    reason     String    // 'IN_WORKFLOW', 'UNSUBSCRIBED', 'COLD_LEAD', etc.
    expiresAt  DateTime? // When to remove exclusion
    
    campaign   Campaign? @relation(fields: [campaignId], references: [id])
    lead       Lead      @relation(fields: [leadId], references: [id])
    createdAt  DateTime  @default(now())
  }
  ```

- [ ] Update campaign-audience.service.ts:
  ```typescript
  async getAudienceLeads(campaign: Campaign): Promise<Lead[]> {
    // Get base audience from filters
    let leads = await this.getFilteredLeads(campaign)
    
    // Exclude leads with active exclusions
    const exclusions = await prisma.campaignExclusion.findMany({
      where: {
        OR: [
          { campaignId: campaign.id },
          { campaignId: null } // Global exclusions
        ],
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })
    
    const excludedLeadIds = new Set(exclusions.map(e => e.leadId))
    
    return leads.filter(lead => !excludedLeadIds.has(lead.id))
  }
  ```

- [ ] Update automation-rule.service.ts excludeFromCampaigns():
  ```typescript
  async excludeFromCampaigns(rule: AutomationRule, data: any) {
    const { leadId } = data
    const { campaignTypes } = rule.actionData
    
    // Create exclusions for each campaign type
    for (const type of campaignTypes) {
      await prisma.campaignExclusion.create({
        data: {
          leadId,
          reason: 'AUTOMATION_RULE',
          // campaignId: null means all campaigns of this type
        }
      })
    }
    
    console.log(`🚫 Excluded lead ${leadId} from ${campaignTypes.join(', ')} campaigns`)
  }
  ```

**Frontend Changes:**
- [ ] Show exclusion reason in lead detail view
- [ ] Allow manual exclusion from campaigns
- [ ] Show "X leads excluded by rules" in campaign preview

**Testing:**
- [ ] Create automation rule to exclude COLD leads from SMS
- [ ] Change lead to COLD
- [ ] Create SMS campaign with dynamic audience
- [ ] Verify COLD lead not in audience count
- [ ] Verify exclusion shows in lead's profile

---

### Phase 2 Summary
**Total Time: 3-5 days**
**Deliverables:**
- ✅ Automation rules foundation (trigger → action)
- ✅ 5 pre-made rule templates
- ✅ Campaign exclusion system
- ✅ Rules UI in settings

---

## ⚡ PHASE 3: WORKFLOWS FOUNDATION (Priority: HIGH)

### Goal
Build core workflow engine with basic triggers, actions, and templates.

### Features to Build

#### 3.1 Workflow Data Models ⭐⭐⭐⭐⭐
**Estimated Time: 1 day**

**Backend Changes:**
- [ ] Create Workflow, WorkflowStep, WorkflowExecution models:
  ```prisma
  model Workflow {
    id               String   @id @default(cuid())
    name             String
    description      String?
    status           String   @default('ACTIVE') // ACTIVE, PAUSED
    
    // Trigger
    triggerType      String   // 'lead_created', 'status_change', 'tag_added', etc.
    triggerConditions Json    // Additional conditions
    
    // Entry conditions
    entryConditions  Json?    // Who can enter
    maxEntriesPerDay Int?     // Rate limiting
    
    // Exit rules
    exitRules        Json     // When to stop workflow
    allowReentry     Boolean  @default(false)
    reentryWaitDays  Int?
    maxDuration      Int?     // Max days in workflow
    
    // Settings
    pauseOnManualContact Boolean @default(false)
    pauseOnOtherWorkflow Boolean @default(false)
    
    steps            WorkflowStep[]
    executions       WorkflowExecution[]
    
    createdById      String
    createdBy        User     @relation(fields: [createdById], references: [id])
    createdAt        DateTime @default(now())
    updatedAt        DateTime @updatedAt
  }
  
  model WorkflowStep {
    id           String   @id @default(cuid())
    workflowId   String
    workflow     Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
    
    stepNumber   Int      // Order in sequence
    name         String
    type         String   // 'email', 'sms', 'wait', 'condition', 'task', 'update_status', etc.
    
    // Step configuration
    config       Json     // Type-specific config (email content, wait duration, etc.)
    
    // Conditional branching
    nextStepId   String?  // If linear
    conditions   Json?    // If branching: [{ condition, nextStepId }]
    
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
  }
  
  model WorkflowExecution {
    id           String    @id @default(cuid())
    workflowId   String
    workflow     Workflow  @relation(fields: [workflowId], references: [id])
    leadId       String
    lead         Lead      @relation(fields: [leadId], references: [id])
    
    status       String    @default('IN_PROGRESS') // IN_PROGRESS, COMPLETED, EXITED, PAUSED
    currentStep  Int       @default(0)
    nextActionAt DateTime?
    
    // History
    history      Json      @default("[]") // Array of { step, action, timestamp, result }
    
    startedAt    DateTime  @default(now())
    completedAt  DateTime?
    exitReason   String?
    
    @@unique([workflowId, leadId]) // Lead can only be in workflow once
  }
  ```

- [ ] Run migration

---

#### 3.2 Workflow Execution Engine ⭐⭐⭐⭐⭐
**Estimated Time: 3 days**

**Backend Changes:**
- [ ] Create workflow-executor.service.ts:
  ```typescript
  export class WorkflowExecutorService {
    // Start workflow for a lead
    async enrollLead(workflowId: string, leadId: string): Promise<WorkflowExecution> {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { steps: { orderBy: { stepNumber: 'asc' } } }
      })
      
      // Check entry conditions
      if (!await this.canEnter(workflow, leadId)) {
        throw new Error('Lead does not meet entry conditions')
      }
      
      // Create execution record
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId,
          leadId,
          status: 'IN_PROGRESS',
          currentStep: 0,
          nextActionAt: new Date() // Execute first step immediately
        }
      })
      
      console.log(`⚡ Lead ${leadId} enrolled in workflow "${workflow.name}"`)
      
      return execution
    }
    
    // Execute next step for a workflow execution
    async executeNextStep(execution: WorkflowExecution) {
      const workflow = await prisma.workflow.findUnique({
        where: { id: execution.workflowId },
        include: { steps: { orderBy: { stepNumber: 'asc' } } }
      })
      
      const currentStep = workflow.steps[execution.currentStep]
      
      if (!currentStep) {
        // No more steps, complete workflow
        await this.completeWorkflow(execution.id)
        return
      }
      
      console.log(`⚡ Executing step ${currentStep.stepNumber}: ${currentStep.name}`)
      
      // Execute step based on type
      let result
      switch (currentStep.type) {
        case 'email':
          result = await this.executeEmailStep(currentStep, execution)
          break
        case 'sms':
          result = await this.executeSmsStep(currentStep, execution)
          break
        case 'wait':
          result = await this.executeWaitStep(currentStep, execution)
          break
        case 'update_status':
          result = await this.executeUpdateStatusStep(currentStep, execution)
          break
        case 'create_task':
          result = await this.executeCreateTaskStep(currentStep, execution)
          break
        case 'condition':
          result = await this.executeConditionStep(currentStep, execution)
          break
        default:
          throw new Error(`Unknown step type: ${currentStep.type}`)
      }
      
      // Add to history
      await this.addToHistory(execution.id, {
        step: currentStep.stepNumber,
        action: currentStep.type,
        timestamp: new Date(),
        result
      })
      
      // Determine next step
      const nextStepNumber = result.nextStep || execution.currentStep + 1
      const nextActionAt = result.delay ? new Date(Date.now() + result.delay) : new Date()
      
      // Update execution
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          currentStep: nextStepNumber,
          nextActionAt
        }
      })
    }
    
    private async executeEmailStep(step: WorkflowStep, execution: WorkflowExecution) {
      const lead = await prisma.lead.findUnique({ where: { id: execution.leadId } })
      const { subject, body } = step.config
      
      // Use existing email service
      await emailService.sendEmail({
        to: lead.email,
        subject: this.personalize(subject, lead),
        body: this.personalize(body, lead)
      })
      
      return { success: true }
    }
    
    private async executeWaitStep(step: WorkflowStep, execution: WorkflowExecution) {
      const { duration, unit } = step.config // { duration: 2, unit: 'days' }
      
      let delayMs = 0
      switch (unit) {
        case 'minutes': delayMs = duration * 60 * 1000; break
        case 'hours': delayMs = duration * 60 * 60 * 1000; break
        case 'days': delayMs = duration * 24 * 60 * 60 * 1000; break
      }
      
      return { success: true, delay: delayMs }
    }
    
    private async completeWorkflow(executionId: string) {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      })
      
      console.log(`✅ Workflow execution ${executionId} completed`)
    }
  }
  ```

- [ ] Add cron job to process workflow executions (every minute):
  ```typescript
  // In server.ts
  cron.schedule('* * * * *', async () => {
    const pending = await prisma.workflowExecution.findMany({
      where: {
        status: 'IN_PROGRESS',
        nextActionAt: { lte: new Date() }
      }
    })
    
    for (const execution of pending) {
      await workflowExecutor.executeNextStep(execution)
    }
  })
  ```

**Testing:**
- [ ] Create simple 2-step workflow (email → wait 2 min → email)
- [ ] Enroll test lead
- [ ] Verify first email sends immediately
- [ ] Wait 2 minutes
- [ ] Verify second email sends
- [ ] Verify execution marked COMPLETED

---

#### 3.3 Workflow Triggers ⭐⭐⭐⭐
**Estimated Time: 2 days**

**Backend Changes:**
- [ ] Hook workflows into trigger points:
  
  **In lead.controller.ts (lead created):**
  ```typescript
  async createLead(data: CreateLeadData) {
    const lead = await prisma.lead.create({ data })
    
    // Trigger workflows
    await workflowTriggerService.trigger('lead_created', { leadId: lead.id })
    
    return lead
  }
  ```
  
  **In lead.controller.ts (status changed):**
  ```typescript
  async updateLeadStatus(leadId: string, newStatus: string) {
    const oldStatus = lead.status
    
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: newStatus }
    })
    
    // Trigger workflows
    await workflowTriggerService.trigger('lead_status_change', {
      leadId,
      oldStatus,
      newStatus
    })
  }
  ```

- [ ] Create workflow-trigger.service.ts:
  ```typescript
  export class WorkflowTriggerService {
    async trigger(triggerType: string, data: any) {
      const workflows = await prisma.workflow.findMany({
        where: {
          status: 'ACTIVE',
          triggerType
        }
      })
      
      for (const workflow of workflows) {
        if (await this.matchesTrigger(workflow, data)) {
          await workflowExecutor.enrollLead(workflow.id, data.leadId)
        }
      }
    }
    
    private async matchesTrigger(workflow: Workflow, data: any): boolean {
      // Check if trigger conditions match
      // Example: If workflow says "status changes to HOT", check if data.newStatus === 'HOT'
      const conditions = workflow.triggerConditions
      
      if (workflow.triggerType === 'lead_status_change') {
        return data.newStatus === conditions.toStatus
      }
      
      // ... more trigger types
      
      return true
    }
  }
  ```

**Testing:**
- [ ] Create workflow triggered by "lead becomes HOT"
- [ ] Change test lead status to HOT
- [ ] Verify workflow starts for that lead
- [ ] Verify other leads not affected

---

#### 3.4 Basic Workflow Templates ⭐⭐⭐⭐
**Estimated Time: 1 day**

**Backend Changes:**
- [ ] Create workflow-templates.ts:
  ```typescript
  export const WORKFLOW_TEMPLATES = [
    {
      id: 'new-lead-welcome',
      name: 'New Lead Welcome Series',
      description: 'Welcome new leads with 4-email sequence',
      triggerType: 'lead_created',
      triggerConditions: {},
      steps: [
        {
          stepNumber: 0,
          name: 'Welcome Email',
          type: 'email',
          config: {
            subject: 'Welcome to {agentName} Real Estate!',
            body: '<h1>Hi {firstName}!</h1><p>Thank you for your interest...</p>'
          }
        },
        {
          stepNumber: 1,
          name: 'Wait 2 Days',
          type: 'wait',
          config: { duration: 2, unit: 'days' }
        },
        {
          stepNumber: 2,
          name: 'Educational Email',
          type: 'email',
          config: {
            subject: 'The Home Buying Process Explained',
            body: '<h1>Let me walk you through...</h1>'
          }
        },
        // ... more steps
      ]
    },
    // ... more templates
  ]
  ```

- [ ] Add POST /api/workflows/from-template/:templateId

**Frontend Changes:**
- [ ] Create /workflows route and page
- [ ] Show workflow templates in grid
- [ ] "Activate Template" button creates workflow from template

**Testing:**
- [ ] Load workflow templates
- [ ] Activate "New Lead Welcome" template
- [ ] Create new lead
- [ ] Verify welcome workflow starts
- [ ] Verify all steps execute with correct delays

---

### Phase 3 Summary
**Total Time: 7-10 days**
**Deliverables:**
- ✅ Workflow data models (Workflow, WorkflowStep, WorkflowExecution)
- ✅ Workflow execution engine
- ✅ Trigger system (lead created, status change)
- ✅ Email, SMS, wait, update status steps
- ✅ 3 basic workflow templates
- ✅ Workflows UI (list, activate templates)

---

## 🎨 PHASE 4: ADVANCED WORKFLOWS (Priority: MEDIUM)

### Goal
Add visual flow builder, conditional logic, and complex multi-channel sequences.

### Features to Build

#### 4.1 Visual Workflow Builder ⭐⭐⭐⭐⭐
**Estimated Time: 4 days**

**Frontend Changes:**
- [ ] Install React Flow library: `npm install reactflow`
- [ ] Create WorkflowBuilder.tsx component
- [ ] Drag-and-drop workflow designer
- [ ] Node types: Email, SMS, Wait, Condition, Task, Status Update
- [ ] Connect nodes with arrows
- [ ] Save workflow as JSON
- [ ] Load existing workflows

**Testing:**
- [ ] Build workflow visually
- [ ] Save and reload
- [ ] Execute and verify steps match visual flow

---

#### 4.2 Conditional Branching ⭐⭐⭐⭐
**Estimated Time: 2 days**

**Backend Changes:**
- [ ] Update executeConditionStep():
  ```typescript
  private async executeConditionStep(step: WorkflowStep, execution: WorkflowExecution) {
    const lead = await prisma.lead.findUnique({ where: { id: execution.leadId } })
    const { conditions } = step.config
    
    // Evaluate conditions
    for (const condition of conditions) {
      if (await this.evaluateCondition(condition, lead, execution)) {
        return { success: true, nextStep: condition.nextStepId }
      }
    }
    
    // Default branch
    return { success: true, nextStep: step.config.defaultNextStep }
  }
  
  private async evaluateCondition(condition: any, lead: Lead, execution: WorkflowExecution) {
    switch (condition.type) {
      case 'email_opened':
        // Check if lead opened last email
        return await this.wasEmailOpened(execution, lead)
      case 'status_equals':
        return lead.status === condition.value
      // ... more condition types
    }
  }
  ```

**Testing:**
- [ ] Create workflow: Send email → Wait 3 days → If opened: Step A, If not: Step B
- [ ] Test with lead who opens email
- [ ] Verify goes to Step A
- [ ] Test with lead who doesn't open
- [ ] Verify goes to Step B

---

#### 4.3 Advanced Workflow Templates ⭐⭐⭐
**Estimated Time: 1 day**

**Backend Changes:**
- [ ] Add 5 more complex workflow templates:
  - Cold Lead Re-Engagement (with branching)
  - Hot Lead Nurture (multi-channel)
  - Post-Appointment Follow-Up (with tasks)
  - Property Viewing Follow-Up (conditional)
  - First-Time Buyer Education (5-email series)

**Testing:**
- [ ] Activate each template
- [ ] Test execution paths
- [ ] Verify branching logic

---

### Phase 4 Summary
**Total Time: 5-7 days**
**Deliverables:**
- ✅ Visual workflow builder (drag-and-drop)
- ✅ Conditional branching (if/then logic)
- ✅ 5 advanced workflow templates
- ✅ Multi-channel workflows (email + SMS + tasks)

---

## 🔗 PHASE 5: SYSTEM INTEGRATION (Priority: HIGH)

### Goal
Connect all pieces, ensure campaigns and workflows work together intelligently.

### Features to Build

#### 5.1 Cross-System Intelligence ⭐⭐⭐⭐⭐
**Estimated Time: 2 days**

**Backend Changes:**
- [ ] Update campaign-audience.service.ts:
  - Exclude leads in active workflows (if campaign has setting)
  - Check automation rules before including lead
  - Apply all smart filters
  
- [ ] Update workflow-executor.service.ts:
  - When workflow starts, optionally pause campaigns for lead
  - When workflow ends, resume campaigns
  - Check if lead should exit based on campaign engagement

- [ ] Create lead-communication-manager.service.ts:
  ```typescript
  export class LeadCommunicationManager {
    async shouldSendCampaign(campaignId: string, leadId: string): Promise<boolean> {
      // Check all rules:
      // - Is lead in active workflow? (if campaign excludes workflows)
      // - Is lead status allowed for this campaign type?
      // - Has lead been contacted recently? (frequency cap)
      // - Is it quiet hours for this lead?
      // - Any automation rules blocking this?
      
      return true // or false with reason
    }
    
    async shouldEnrollInWorkflow(workflowId: string, leadId: string): Promise<boolean> {
      // Check if lead meets entry conditions
      // Check if already in another workflow (if workflow blocks that)
      // Check rate limits
      
      return true // or false with reason
    }
  }
  ```

**Testing:**
- [ ] Lead in workflow → Verify excluded from campaigns
- [ ] Workflow ends → Verify lead gets campaigns again
- [ ] COLD lead → Verify no SMS campaigns
- [ ] HOT lead → Verify all channels active

---

#### 5.2 Analytics & Reporting ⭐⭐⭐⭐
**Estimated Time: 2 days**

**Backend Changes:**
- [ ] Add analytics endpoints:
  - GET /api/campaigns/:id/stats
  - GET /api/workflows/:id/stats
  - GET /api/analytics/overview
  
- [ ] Track metrics:
  - Campaign: sends, opens, clicks, replies, unsubscribes
  - Workflow: entries, completions, exits (by reason), conversion rate
  - System: total leads, active workflows, scheduled campaigns

**Frontend Changes:**
- [ ] Update campaign detail page with stats
- [ ] Update workflow detail page with stats
- [ ] Create analytics dashboard

**Testing:**
- [ ] Run campaign, check stats update
- [ ] Complete workflow, check stats update
- [ ] View analytics dashboard

---

#### 5.3 Testing & Bug Fixes ⭐⭐⭐⭐⭐
**Estimated Time: 1 day**

- [ ] End-to-end testing of all features
- [ ] Edge cases (lead in multiple workflows, conflicting rules)
- [ ] Performance testing (1000+ leads)
- [ ] Fix any bugs found
- [ ] Optimize slow queries

---

### Phase 5 Summary
**Total Time: 3-5 days**
**Deliverables:**
- ✅ Full system integration
- ✅ Smart communication manager
- ✅ Analytics and reporting
- ✅ Comprehensive testing
- ✅ Bug fixes and optimization

---

## 📊 IMPLEMENTATION SUMMARY

### Total Timeline: 23-34 Days

**Week 1-2: Phase 1 - Enhanced Campaigns** (5-7 days)
- Recurring schedules
- Dynamic audience
- Templates
- Throttling

**Week 2: Phase 2 - Automation Rules** (3-5 days)
- Rules engine
- Campaign exclusions
- Rule templates

**Week 3-4: Phase 3 - Workflows Foundation** (7-10 days)
- Workflow models
- Execution engine
- Triggers
- Basic templates

**Week 4-5: Phase 4 - Advanced Workflows** (5-7 days)
- Visual builder
- Conditional logic
- Advanced templates

**Week 5: Phase 5 - System Integration** (3-5 days)
- Cross-system intelligence
- Analytics
- Testing

---

## 🎯 RECOMMENDED APPROACH

### Option A: Full Feature Build
**Build everything in order (23-34 days)**
- Most complete solution
- Longest timeline
- Best user experience

### Option B: MVP + Iterations
**Phase 1 + Phase 2 (8-12 days)**
- Get enhanced campaigns working
- Add basic automation rules
- Skip workflows for now
- Faster to market
- Add workflows later

### Option C: Templates First
**Build with templates only (15-20 days)**
- Phase 1: Campaigns with templates
- Phase 3: Workflows with pre-made templates only
- Skip visual builder (Phase 4)
- Simpler UX
- Still very powerful

---

## 🎯 RECOMMENDED QUICK WINS (Build Before Phase 1)

These features should be added FIRST - they enhance the current system immediately with minimal effort:

---

### Quick Win #1: Campaign Preview Before Send ⭐⭐⭐⭐⭐
**Priority: CRITICAL**
**Estimated Time: 1 day**
**Value: Prevents costly mistakes, industry standard feature**

#### Problem It Solves
- Users accidentally send to wrong audience (expensive with SMS)
- No visibility into who will receive message
- Cost surprises (didn't realize 500 SMS = $50)
- Typos or wrong personalization tokens discovered after sending

#### What It Does
Shows a detailed preview modal BEFORE campaign sends:
- Recipient count and breakdown by status
- Cost estimate (especially critical for SMS/calls)
- Sample of first 10 recipients
- Message preview with actual personalization
- "Are you sure?" confirmation

#### Implementation

**Backend Changes:**

**New Endpoint: GET /api/campaigns/:id/preview**
```typescript
// backend/src/controllers/campaign.controller.ts
export const getCampaignPreview = async (req: Request, res: Response) => {
  const { id } = req.params
  
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { createdBy: true }
  })
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' })
  }
  
  // Get audience leads
  const audienceService = new CampaignAudienceService()
  const leads = await audienceService.getAudienceLeads(campaign)
  
  // Calculate cost
  let unitCost = 0
  if (campaign.type === 'SMS') unitCost = 0.10
  if (campaign.type === 'PHONE') unitCost = 0.50
  if (campaign.type === 'EMAIL') unitCost = 0.01
  
  const totalCost = leads.length * unitCost
  
  // Breakdown by status
  const statusBreakdown = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Sample recipients (first 10)
  const sampleRecipients = leads.slice(0, 10).map(lead => ({
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    email: lead.email,
    phone: lead.phone,
    status: lead.status
  }))
  
  // Message preview with first lead's data
  const messagePreview = campaign.body
    ? templateService.renderTemplate(campaign.body, leads[0])
    : ''
  
  res.json({
    recipientCount: leads.length,
    cost: totalCost,
    costBreakdown: {
      unitCost,
      total: totalCost,
      type: campaign.type
    },
    statusBreakdown,
    sampleRecipients,
    messagePreview: {
      subject: campaign.subject,
      body: messagePreview
    }
  })
}
```

**Add to routes:**
```typescript
// backend/src/routes/campaign.routes.ts
router.get('/:id/preview', campaignController.getCampaignPreview)
```

**Frontend Changes:**

**New Component: CampaignPreviewModal.tsx**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, DollarSign, Users } from 'lucide-react'

interface CampaignPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  preview: {
    recipientCount: number
    cost: number
    costBreakdown: { unitCost: number; total: number; type: string }
    statusBreakdown: Record<string, number>
    sampleRecipients: Array<{
      id: string
      name: string
      email: string
      status: string
    }>
    messagePreview: {
      subject: string
      body: string
    }
  }
}

export function CampaignPreviewModal({ isOpen, onClose, onConfirm, preview }: CampaignPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Campaign Before Sending</DialogTitle>
        </DialogHeader>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-4">
            <Users className="h-5 w-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{preview.recipientCount}</div>
            <div className="text-sm text-muted-foreground">Recipients</div>
          </div>
          
          <div className="border rounded-lg p-4">
            <DollarSign className="h-5 w-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">${preview.cost.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">
              Estimated Cost ({preview.costBreakdown.type})
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold">
              ${preview.costBreakdown.unitCost.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Per Message</div>
          </div>
        </div>
        
        {/* Cost Warning for SMS/Calls */}
        {preview.cost > 20 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-800">High Cost Alert</div>
                <div className="text-sm text-yellow-700">
                  This campaign will cost ${preview.cost.toFixed(2)}. Make sure your budget allows for this.
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Recipient Breakdown */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Recipients by Status</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(preview.statusBreakdown).map(([status, count]) => (
              <Badge key={status} variant="outline">
                {status}: {count}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Sample Recipients */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Sample Recipients (first 10)</h3>
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {preview.sampleRecipients.map(recipient => (
              <div key={recipient.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{recipient.name}</div>
                  <div className="text-sm text-muted-foreground">{recipient.email}</div>
                </div>
                <Badge variant="secondary">{recipient.status}</Badge>
              </div>
            ))}
          </div>
        </div>
        
        {/* Message Preview */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Message Preview</h3>
          <div className="border rounded-lg p-4 bg-muted">
            {preview.messagePreview.subject && (
              <div className="mb-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">SUBJECT:</div>
                <div className="font-medium">{preview.messagePreview.subject}</div>
              </div>
            )}
            <div className="text-xs font-medium text-muted-foreground mb-1">MESSAGE:</div>
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: preview.messagePreview.body }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Preview shows message with first recipient's data
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm & Send to {preview.recipientCount} Recipients
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Update CampaignCreate.tsx:**
```tsx
const [showPreview, setShowPreview] = useState(false)
const [previewData, setPreviewData] = useState(null)

const handleCreateCampaign = async () => {
  // Create campaign first (as DRAFT)
  const campaign = await campaignsApi.createCampaign({
    ...formData,
    status: 'DRAFT'
  })
  
  // Fetch preview
  const preview = await campaignsApi.getCampaignPreview(campaign.id)
  setPreviewData(preview)
  setShowPreview(true)
}

const handleConfirmSend = async () => {
  // Update campaign to SCHEDULED and actually send
  await campaignsApi.updateCampaign(previewData.campaignId, {
    status: formData.schedule === 'immediate' ? 'ACTIVE' : 'SCHEDULED'
  })
  
  setShowPreview(false)
  toast.success('Campaign scheduled successfully!')
  navigate('/campaigns')
}

// In render:
{showPreview && previewData && (
  <CampaignPreviewModal
    isOpen={showPreview}
    onClose={() => setShowPreview(false)}
    onConfirm={handleConfirmSend}
    preview={previewData}
  />
)}
```

**Testing:**
- [ ] Create email campaign to 100 leads, verify preview shows correct count
- [ ] Create SMS campaign to 50 leads, verify cost shows correctly ($5.00)
- [ ] Verify sample recipients shows first 10 leads
- [ ] Verify message preview shows personalized content
- [ ] Test "Cancel" button returns to edit mode
- [ ] Test "Confirm" button actually sends campaign

---

### Quick Win #2: Conflict Warnings & Schedule Calendar ⭐⭐⭐⭐
**Priority: HIGH**
**Estimated Time: 1.5 days**
**Value: Prevents email fatigue, professional communication**

#### Problem It Solves
- Users schedule multiple campaigns too close together
- Leads get overwhelmed with too many messages
- Higher unsubscribe rates from email fatigue
- No visibility into overall communication plan

#### What It Does
- Visual calendar showing all scheduled campaigns
- Warns when campaigns overlap (< 24 hours apart)
- Shows which leads will receive multiple messages
- Suggests better timing to spread out communication

#### Implementation

**Backend Changes:**

**New Endpoint: GET /api/campaigns/calendar?startDate=X&endDate=Y**
```typescript
export const getCampaignCalendar = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query
  const userId = req.user.userId
  
  const campaigns = await prisma.campaign.findMany({
    where: {
      createdById: userId,
      status: { in: ['SCHEDULED', 'ACTIVE'] },
      OR: [
        { startDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { nextSendAt: { gte: new Date(startDate), lte: new Date(endDate) } }
      ]
    },
    orderBy: { startDate: 'asc' }
  })
  
  res.json({ campaigns })
}
```

**New Endpoint: GET /api/campaigns/conflicts?date=X**
```typescript
export const checkConflicts = async (req: Request, res: Response) => {
  const { date } = req.query
  const userId = req.user.userId
  
  const targetDate = new Date(date)
  const windowStart = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000) // 24 hours before
  const windowEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // 24 hours after
  
  const nearbyyCampaigns = await prisma.campaign.findMany({
    where: {
      createdById: userId,
      status: 'SCHEDULED',
      startDate: { gte: windowStart, lte: windowEnd }
    }
  })
  
  if (nearbyCampaigns.length === 0) {
    return res.json({ conflicts: [] })
  }
  
  // Calculate overlapping leads
  const conflicts = []
  for (let i = 0; i < nearbyCampaigns.length; i++) {
    for (let j = i + 1; j < nearbyCampaigns.length; j++) {
      const campaign1 = nearbyCampaigns[i]
      const campaign2 = nearbyCampaigns[j]
      
      const audience1 = await audienceService.getAudienceLeads(campaign1)
      const audience2 = await audienceService.getAudienceLeads(campaign2)
      
      const overlapping = audience1.filter(lead1 => 
        audience2.some(lead2 => lead2.id === lead1.id)
      )
      
      if (overlapping.length > 0) {
        conflicts.push({
          campaigns: [campaign1.name, campaign2.name],
          timeDifference: Math.abs(campaign1.startDate.getTime() - campaign2.startDate.getTime()) / (1000 * 60 * 60), // hours
          overlappingLeads: overlapping.length,
          suggestion: `Consider moving one campaign by 24 hours`
        })
      }
    }
  }
  
  res.json({ conflicts })
}
```

**Frontend: Add to CampaignSchedule.tsx**
```tsx
import { Calendar } from '@/components/ui/Calendar' // Or use react-big-calendar
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { AlertTriangle } from 'lucide-react'

// Fetch calendar data
const { data: calendarData } = useQuery({
  queryKey: ['campaign-calendar', viewMonth],
  queryFn: () => campaignsApi.getCampaignCalendar(startOfMonth, endOfMonth)
})

// Check for conflicts when hovering over date
const [conflicts, setConflicts] = useState([])
const checkConflictsForDate = async (date: Date) => {
  const result = await campaignsApi.checkConflicts(date)
  setConflicts(result.conflicts)
}

// In render:
<div className="grid grid-cols-2 gap-6">
  <div>
    <h3>Campaign Calendar</h3>
    <Calendar
      events={calendarData?.campaigns.map(c => ({
        id: c.id,
        title: c.name,
        start: new Date(c.startDate),
        end: new Date(c.startDate),
        color: c.type === 'SMS' ? 'green' : c.type === 'EMAIL' ? 'blue' : 'orange'
      }))}
      onSelectDate={checkConflictsForDate}
    />
  </div>
  
  <div>
    <h3>Scheduling Conflicts</h3>
    {conflicts.length > 0 ? (
      conflicts.map((conflict, i) => (
        <Alert key={i} variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Potential Conflict</AlertTitle>
          <AlertDescription>
            "{conflict.campaigns[0]}" and "{conflict.campaigns[1]}" are scheduled {conflict.timeDifference} hours apart.
            <br />
            {conflict.overlappingLeads} leads will receive both messages.
            <br />
            <strong>{conflict.suggestion}</strong>
          </AlertDescription>
        </Alert>
      ))
    ) : (
      <p className="text-muted-foreground">No conflicts detected</p>
    )}
  </div>
</div>
```

---

### Quick Win #3: Smart Send Time Suggestions ⭐⭐⭐⭐
**Priority: MEDIUM-HIGH**
**Estimated Time: 2 days**
**Value: 20-40% increase in open rates**

#### Implementation
See detailed implementation in CAMPAIGNS_VS_WORKFLOWS_ARCHITECTURE.md

---

### Quick Win #4: Performance Optimizations ⭐⭐⭐⭐⭐
**Priority: CRITICAL**
**Estimated Time: 1 day**
**Value: Required for 1000+ leads**

#### Implementation
See detailed implementation in CAMPAIGNS_VS_WORKFLOWS_ARCHITECTURE.md

---

## 🚀 NEXT STEPS

### Recommended Build Order:

**Week 0 (Quick Wins): 5.5 days**
1. Campaign Preview Before Send (1 day)
2. Performance Optimizations (1 day)
3. Smart Send Time Suggestions (2 days)
4. Conflict Warnings & Calendar (1.5 days)

**Week 1-2: Phase 1 - Enhanced Campaigns (5-7 days)**
5. Recurring schedules
6. Dynamic audience
7. Templates

**Week 2: Phase 2 - Automation Rules (3-5 days)**
8. Rules engine
9. Campaign exclusions

**Week 3-4: Phase 3 - Workflows Foundation (7-10 days)**
10. Workflow engine
11. Triggers
12. Templates

**Optional: Phase 4 - Advanced Workflows (5-7 days)**
13. Visual builder
14. Conditional logic

**Final: Phase 5 - Integration (3-5 days)**
15. Connect all pieces
16. Analytics
17. Testing

---

## 🎯 DECISION TIME

**Choose your approach:**

### Option A: Quick Wins + MVP (2-3 weeks)
- Week 0: Quick Wins (5.5 days)
- Phase 1: Enhanced Campaigns (5-7 days)
- Phase 2: Automation Rules (3-5 days)
- **Total: 13.5-17.5 days**
- **Best for:** Fast time to market, immediate value

### Option B: Full System (4-5 weeks)
- All 5 phases
- **Total: 28.5-39.5 days**
- **Best for:** Complete solution, long-term vision

### Option C: Templates Only (3-4 weeks)
- Quick Wins + Phase 1 + Phase 3 (templates only, skip visual builder)
- **Total: 17.5-22.5 days**
- **Best for:** Balance of speed and power

---

**Ready to start building? Which approach should we take?** 🎯
