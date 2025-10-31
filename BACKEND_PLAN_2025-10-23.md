# 🏗️ **COMPLETE BACKEND ARCHITECTURE PLAN**
## **Master RealEstate Pro - Full Stack SaaS Platform**

---

## **📋 EXECUTIVE SUMMARY**

**Project:** Production-ready Real Estate CRM Backend
**Tech Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL
**Timeline:** 12 weeks (MVP in 3 weeks, Full features in 12 weeks)
**Deployment:** Railway (Backend) + Vercel (Frontend)
**Database:** PostgreSQL via Railway/Supabase

---

## **🎯 PHASE BREAKDOWN**

### **Phase 1: MVP - Core Features (Weeks 1-3)**
**Goal:** Launch with basic functionality, get first users

### **Phase 2: Essential Features (Weeks 4-6)**
**Goal:** Communication & automation basics

### **Phase 3: Advanced Features (Weeks 7-9)**
**Goal:** AI, analytics, integrations

### **Phase 4: Enterprise Features (Weeks 10-12)**
**Goal:** Multi-tenant, billing, admin tools

---

# **📦 COMPLETE DATABASE SCHEMA**

## **Phase 1 Models (MVP - Week 1-3)**

### **1. User Management**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // bcrypt hashed
  name          String
  avatar        String?
  role          Role      @default(USER)
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  
  // Settings
  timezone      String    @default("America/New_York")
  language      String    @default("en")
  
  // Security
  lastLoginAt   DateTime?
  lastLoginIp   String?
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String?
  
  // Subscription
  subscriptionTier SubscriptionTier @default(FREE)
  subscriptionId   String?
  trialEndsAt      DateTime?
  
  // Relations
  leads         Lead[]
  campaigns     Campaign[]
  activities    Activity[]
  tasks         Task[]
  notes         Note[]
  teamMembers   TeamMember[]
  notifications Notification[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  ADMIN
  MANAGER
  USER
}

enum SubscriptionTier {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}
```

### **2. Lead Management**
```prisma
model Lead {
  id          String   @id @default(cuid())
  
  // Basic Info
  name        String
  email       String   @unique
  phone       String?
  company     String?
  position    String?
  
  // Lead Details
  status      LeadStatus @default(NEW)
  score       Int       @default(0)
  source      String    // website, referral, social, etc.
  value       Float?
  stage       String?
  
  // Assignment
  assignedToId String?
  assignedTo   User?    @relation(fields: [assignedToId], references: [id])
  
  // Dates
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastContactAt DateTime?
  
  // Relations
  tags         Tag[]
  notes        Note[]
  activities   Activity[]
  customFields Json?
  
  // Indexes for performance
  @@index([status])
  @@index([assignedToId])
  @@index([source])
  @@index([createdAt])
}

enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  PROPOSAL
  NEGOTIATION
  WON
  LOST
}

model Tag {
  id        String   @id @default(cuid())
  name      String   @unique
  color     String?
  leads     Lead[]
  campaigns Campaign[]
  createdAt DateTime @default(now())
}

model Note {
  id        String   @id @default(cuid())
  content   String   @db.Text
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([leadId])
}
```

### **3. Campaign Management**
```prisma
model Campaign {
  id          String         @id @default(cuid())
  name        String
  type        CampaignType
  status      CampaignStatus @default(DRAFT)
  
  // Content
  subject     String?
  body        String?        @db.Text
  previewText String?
  
  // Scheduling
  startDate   DateTime?
  endDate     DateTime?
  
  // Budget
  budget      Float?
  spent       Float?         @default(0)
  
  // Metrics
  audience    Int?
  sent        Int            @default(0)
  delivered   Int            @default(0)
  opened      Int            @default(0)
  clicked     Int            @default(0)
  converted   Int            @default(0)
  bounced     Int            @default(0)
  unsubscribed Int           @default(0)
  
  // Revenue
  revenue     Float?         @default(0)
  roi         Float?
  
  // A/B Testing
  isABTest    Boolean        @default(false)
  abTestData  Json?
  
  // Relations
  createdById String
  createdBy   User           @relation(fields: [createdById], references: [id])
  tags        Tag[]
  activities  Activity[]
  
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  
  @@index([status])
  @@index([type])
  @@index([createdById])
}

enum CampaignType {
  EMAIL
  SMS
  PHONE
  SOCIAL
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}
```

### **4. Activity Tracking**
```prisma
model Activity {
  id          String       @id @default(cuid())
  type        ActivityType
  title       String
  description String?      @db.Text
  
  // Relations
  leadId      String?
  lead        Lead?        @relation(fields: [leadId], references: [id], onDelete: Cascade)
  campaignId  String?
  campaign    Campaign?    @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  
  // Metadata
  metadata    Json?
  
  createdAt   DateTime     @default(now())
  
  @@index([leadId])
  @@index([campaignId])
  @@index([userId])
  @@index([type])
  @@index([createdAt])
}

enum ActivityType {
  EMAIL_SENT
  EMAIL_OPENED
  EMAIL_CLICKED
  SMS_SENT
  SMS_DELIVERED
  CALL_MADE
  CALL_RECEIVED
  MEETING_SCHEDULED
  MEETING_COMPLETED
  NOTE_ADDED
  STATUS_CHANGED
  STAGE_CHANGED
  LEAD_CREATED
  LEAD_ASSIGNED
  CAMPAIGN_LAUNCHED
  CAMPAIGN_COMPLETED
}
```

### **5. Tasks**
```prisma
model Task {
  id          String       @id @default(cuid())
  title       String
  description String?      @db.Text
  dueDate     DateTime
  priority    TaskPriority @default(MEDIUM)
  status      TaskStatus   @default(PENDING)
  
  // Relations
  assignedToId String
  assignedTo   User        @relation(fields: [assignedToId], references: [id])
  leadId       String?
  
  completedAt  DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  @@index([assignedToId])
  @@index([status])
  @@index([dueDate])
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

---

## **Phase 2 Models (Weeks 4-6)**

### **6. Email Templates**
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

### **7. Communication Inbox**
```prisma
model Message {
  id          String        @id @default(cuid())
  type        MessageType
  direction   MessageDirection
  
  // Content
  subject     String?
  body        String        @db.Text
  
  // Participants
  fromAddress String
  toAddress   String
  
  // Status
  status      MessageStatus @default(PENDING)
  readAt      DateTime?
  repliedAt   DateTime?
  
  // Relations
  leadId      String?
  threadId    String?       // For email threads
  parentId    String?       // For replies
  
  // Provider Info
  externalId  String?       // Twilio SID, SendGrid ID, etc.
  provider    String?       // twilio, sendgrid, etc.
  
  // Metadata
  metadata    Json?
  
  createdAt   DateTime      @default(now())
  
  @@index([leadId])
  @@index([threadId])
  @@index([status])
  @@index([type])
}

enum MessageType {
  EMAIL
  SMS
  CALL
  SOCIAL
}

enum MessageDirection {
  INBOUND
  OUTBOUND
}

enum MessageStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  BOUNCED
  OPENED
  CLICKED
}
```

### **8. Automation Workflows**
```prisma
model Workflow {
  id          String         @id @default(cuid())
  name        String
  description String?        @db.Text
  isActive    Boolean        @default(false)
  
  // Trigger
  triggerType WorkflowTrigger
  triggerData Json?
  
  // Actions
  actions     Json           // Array of action definitions
  
  // Stats
  executions  Int            @default(0)
  successRate Float?
  lastRunAt   DateTime?
  
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  
  // Relations
  executions  WorkflowExecution[]
}

enum WorkflowTrigger {
  LEAD_CREATED
  LEAD_STATUS_CHANGED
  LEAD_ASSIGNED
  CAMPAIGN_COMPLETED
  EMAIL_OPENED
  TIME_BASED
  SCORE_THRESHOLD
  TAG_ADDED
}

model WorkflowExecution {
  id          String   @id @default(cuid())
  workflowId  String
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  status      ExecutionStatus
  error       String?  @db.Text
  
  // Context
  leadId      String?
  metadata    Json?
  
  startedAt   DateTime @default(now())
  completedAt DateTime?
  
  @@index([workflowId])
  @@index([status])
}

enum ExecutionStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
}
```

### **9. Calendar & Appointments**
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
  
  // Relations
  leadId      String?
  attendees   Json?             // Array of attendee emails
  
  // Reminders
  reminderSent Boolean          @default(false)
  
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  @@index([startTime])
  @@index([leadId])
}

enum AppointmentType {
  CALL
  MEETING
  DEMO
  CONSULTATION
  FOLLOW_UP
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

---

## **Phase 3 Models (Weeks 7-9)**

### **10. AI & Lead Scoring**
```prisma
model LeadScore {
  id              String   @id @default(cuid())
  leadId          String   @unique
  
  // Scores
  overallScore    Int      @default(0)
  engagementScore Int      @default(0)
  behaviorScore   Int      @default(0)
  profileScore    Int      @default(0)
  
  // Predictions
  conversionProbability Float?
  estimatedValue        Float?
  timeToConversion      Int?   // days
  churnRisk            Float?
  
  // Signals
  signals         Json?
  
  lastCalculatedAt DateTime @default(now())
  
  @@index([overallScore])
}

model ChatConversation {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title       String?  // Auto-generated from first message
  
  messages    ChatMessage[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId])
  @@index([createdAt])
}

model ChatMessage {
  id              String           @id @default(cuid())
  conversationId  String
  conversation    ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  role            MessageRole      // user, assistant, system, function
  content         String           @db.Text
  
  // Function calling
  functionName    String?
  functionArgs    Json?
  functionResult  Json?
  
  // Metadata
  tokens          Int?
  cost            Float?           // Track user's API usage cost
  
  createdAt       DateTime         @default(now())
  
  @@index([conversationId])
  @@index([createdAt])
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
  FUNCTION
}

model AIInsight {
  id          String   @id @default(cuid())
  leadId      String
  type        String   // recommendation, warning, prediction
  title       String
  description String   @db.Text
  confidence  Float
  actionable  Boolean  @default(true)
  dismissed   Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  
  @@index([leadId])
  @@index([dismissed])
}
```

### **11. Analytics & Reports**
```prisma
model Report {
  id          String       @id @default(cuid())
  name        String
  type        ReportType
  description String?      @db.Text
  
  // Configuration
  filters     Json?
  groupBy     Json?
  metrics     Json?
  
  // Schedule
  isScheduled Boolean      @default(false)
  schedule    String?      // cron expression
  
  // Access
  isPublic    Boolean      @default(false)
  sharedWith  Json?        // Array of user IDs
  
  lastRunAt   DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum ReportType {
  LEAD_ANALYTICS
  CAMPAIGN_PERFORMANCE
  CONVERSION_FUNNEL
  REVENUE_FORECAST
  CUSTOM
}

model AnalyticsSnapshot {
  id          String   @id @default(cuid())
  date        DateTime @db.Date
  
  // Metrics
  totalLeads      Int
  newLeads        Int
  qualifiedLeads  Int
  wonLeads        Int
  
  totalRevenue    Float
  newRevenue      Float
  
  activeCampaigns Int
  emailsSent      Int
  emailsOpened    Int
  
  conversionRate  Float
  avgLeadScore    Float
  
  // Raw data for charts
  rawData     Json
  
  createdAt   DateTime @default(now())
  
  @@unique([date])
  @@index([date])
}
```

### **12. Integrations**
```prisma
model Integration {
  id          String            @id @default(cuid())
  provider    IntegrationProvider
  name        String
  isActive    Boolean           @default(false)
  
  // Credentials (encrypted)
  credentials Json              // API keys, tokens, etc.
  
  // Configuration
  config      Json?
  
  // Sync
  lastSyncAt  DateTime?
  syncStatus  SyncStatus        @default(IDLE)
  syncError   String?           @db.Text
  
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  // Relations
  syncLogs    IntegrationSyncLog[]
}

enum IntegrationProvider {
  GOOGLE_SHEETS
  GOOGLE_CALENDAR
  GMAIL
  SALESFORCE
  HUBSPOT
  SLACK
  TWILIO
  SENDGRID
  STRIPE
  ZAPIER
  FACEBOOK
  LINKEDIN
  TWITTER
}

enum SyncStatus {
  IDLE
  SYNCING
  SUCCESS
  ERROR
}

model IntegrationSyncLog {
  id            String      @id @default(cuid())
  integrationId String
  integration   Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  
  status        SyncStatus
  recordsSynced Int         @default(0)
  error         String?     @db.Text
  
  startedAt     DateTime
  completedAt   DateTime?
  
  @@index([integrationId])
}
```

### **13. Notifications**
```prisma
model Notification {
  id        String             @id @default(cuid())
  userId    String
  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type      NotificationType
  title     String
  message   String             @db.Text
  
  // Link/Action
  actionUrl String?
  actionText String?
  
  // Status
  isRead    Boolean            @default(false)
  readAt    DateTime?
  
  // Metadata
  metadata  Json?
  
  createdAt DateTime           @default(now())
  
  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
}

enum NotificationType {
  LEAD_ASSIGNED
  LEAD_STATUS_CHANGED
  TASK_DUE
  TASK_OVERDUE
  CAMPAIGN_COMPLETED
  EMAIL_OPENED
  MEETING_REMINDER
  SYSTEM_ALERT
  TEAM_MENTION
}
```

---

## **Phase 4 Models (Weeks 10-12)**

### **14. Team & Multi-Tenant**
```prisma
model Team {
  id          String       @id @default(cuid())
  name        String
  slug        String       @unique
  
  // Settings
  settings    Json?
  
  // Subscription
  subscriptionTier SubscriptionTier @default(FREE)
  
  // Relations
  members     TeamMember[]
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model TeamMember {
  id        String       @id @default(cuid())
  teamId    String
  team      Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      TeamRole     @default(MEMBER)
  
  joinedAt  DateTime     @default(now())
  
  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
}

enum TeamRole {
  OWNER
  ADMIN
  MANAGER
  MEMBER
}
```

### **15. Subscription & Billing**
```prisma
model Subscription {
  id              String            @id @default(cuid())
  userId          String?
  teamId          String?
  
  tier            SubscriptionTier
  status          SubscriptionStatus
  
  // Stripe IDs
  stripeCustomerId      String?  @unique
  stripeSubscriptionId  String?  @unique
  stripePriceId         String?
  
  // Dates
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  trialEndsAt          DateTime?
  cancelAt             DateTime?
  canceledAt           DateTime?
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  // Relations
  invoices        Invoice[]
  usageRecords    UsageRecord[]
}

enum SubscriptionStatus {
  ACTIVE
  TRIALING
  PAST_DUE
  CANCELLED
  INCOMPLETE
}

model Invoice {
  id              String         @id @default(cuid())
  subscriptionId  String
  subscription    Subscription   @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  // Stripe
  stripeInvoiceId String?        @unique
  
  // Details
  amount          Float
  currency        String         @default("usd")
  status          InvoiceStatus
  
  // Dates
  invoiceDate     DateTime
  dueDate         DateTime
  paidAt          DateTime?
  
  // PDF
  pdfUrl          String?
  
  createdAt       DateTime       @default(now())
  
  @@index([subscriptionId])
}

enum InvoiceStatus {
  DRAFT
  OPEN
  PAID
  VOID
  UNCOLLECTIBLE
}

model PaymentMethod {
  id          String   @id @default(cuid())
  userId      String
  
  // Stripe
  stripePaymentMethodId String @unique
  
  // Card details
  type        String   // card, bank_account
  brand       String?  // visa, mastercard, etc.
  last4       String
  expMonth    Int?
  expYear     Int?
  
  isDefault   Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  
  @@index([userId])
}

model UsageRecord {
  id              String       @id @default(cuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  // Usage type
  type            UsageType
  quantity        Int
  
  // Metadata
  metadata        Json?
  
  recordedAt      DateTime     @default(now())
  
  @@index([subscriptionId])
  @@index([type])
  @@index([recordedAt])
}

enum UsageType {
  LEADS_CREATED
  EMAILS_SENT
  SMS_SENT
  CALLS_MADE
  API_REQUESTS
  STORAGE_GB
}
```

### **16. System Administration**
```prisma
model SystemSettings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  resource  String
  resourceId String?
  changes   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  description String?  @db.Text
  isEnabled   Boolean  @default(false)
  rollout     Int      @default(0) // 0-100%
  rules       Json?
  updatedAt   DateTime @updatedAt
}
```

---

# **🔌 API ENDPOINTS - COMPLETE LIST**

## **Phase 1: Core API (Weeks 1-3)**

### **Authentication**
```
POST   /api/auth/register          - Create account
POST   /api/auth/login             - Login
POST   /api/auth/logout            - Logout
POST   /api/auth/refresh           - Refresh JWT token
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password with token
POST   /api/auth/verify-email      - Verify email address
GET    /api/auth/me                - Get current user
PUT    /api/auth/me                - Update current user profile
```

### **Leads**
```
GET    /api/leads                  - List leads (pagination, filters, search)
POST   /api/leads                  - Create lead
GET    /api/leads/:id              - Get lead details
PUT    /api/leads/:id              - Update lead
DELETE /api/leads/:id              - Delete lead
PATCH  /api/leads/:id/status       - Update lead status
PATCH  /api/leads/:id/assign       - Assign lead to user
POST   /api/leads/bulk/delete      - Bulk delete
POST   /api/leads/bulk/update      - Bulk update
POST   /api/leads/bulk/assign      - Bulk assign
POST   /api/leads/import           - Import leads from CSV
GET    /api/leads/export           - Export leads to CSV
POST   /api/leads/:id/tags         - Add tags to lead
DELETE /api/leads/:id/tags/:tagId  - Remove tag from lead
```

### **Tags**
```
GET    /api/tags                   - List all tags
POST   /api/tags                   - Create tag
PUT    /api/tags/:id               - Update tag
DELETE /api/tags/:id               - Delete tag
```

### **Notes**
```
GET    /api/leads/:leadId/notes    - List notes for lead
POST   /api/leads/:leadId/notes    - Add note to lead
PUT    /api/notes/:id              - Update note
DELETE /api/notes/:id              - Delete note
```

### **Campaigns**
```
GET    /api/campaigns              - List campaigns
POST   /api/campaigns              - Create campaign
GET    /api/campaigns/:id          - Get campaign details
PUT    /api/campaigns/:id          - Update campaign
DELETE /api/campaigns/:id          - Delete campaign
POST   /api/campaigns/:id/launch   - Launch campaign
POST   /api/campaigns/:id/pause    - Pause campaign
POST   /api/campaigns/:id/duplicate - Duplicate campaign
GET    /api/campaigns/:id/stats    - Get campaign statistics
POST   /api/campaigns/:id/test     - Send test email/SMS
```

### **Activities**
```
GET    /api/activities             - List activities (filterable)
POST   /api/activities             - Log activity
GET    /api/activities/:id         - Get activity details
GET    /api/leads/:leadId/activities - Activities for specific lead
```

### **Tasks**
```
GET    /api/tasks                  - List tasks
POST   /api/tasks                  - Create task
GET    /api/tasks/:id              - Get task details
PUT    /api/tasks/:id              - Update task
DELETE /api/tasks/:id              - Delete task
PATCH  /api/tasks/:id/complete     - Mark task complete
PATCH  /api/tasks/:id/uncomplete   - Mark task incomplete
```

### **Dashboard Analytics**
```
GET    /api/analytics/overview     - Dashboard metrics
GET    /api/analytics/revenue      - Revenue over time
GET    /api/analytics/conversion   - Conversion rates
GET    /api/analytics/pipeline     - Pipeline value by stage
GET    /api/analytics/sources      - Lead sources breakdown
```

---

## **Phase 2: Communication & Automation (Weeks 4-6)**

### **Email Templates**
```
GET    /api/email-templates        - List templates
POST   /api/email-templates        - Create template
GET    /api/email-templates/:id    - Get template
PUT    /api/email-templates/:id    - Update template
DELETE /api/email-templates/:id    - Delete template
```

### **SMS Templates**
```
GET    /api/sms-templates          - List templates
POST   /api/sms-templates          - Create template
GET    /api/sms-templates/:id      - Get template
PUT    /api/sms-templates/:id      - Update template
DELETE /api/sms-templates/:id      - Delete template
```

### **Messages (Inbox)**
```
GET    /api/messages               - List messages (inbox)
GET    /api/messages/:id           - Get message details
POST   /api/messages/email         - Send email
POST   /api/messages/sms           - Send SMS
PATCH  /api/messages/:id/read      - Mark as read
DELETE /api/messages/:id           - Delete message
```

### **Workflows**
```
GET    /api/workflows              - List workflows
POST   /api/workflows              - Create workflow
GET    /api/workflows/:id          - Get workflow
PUT    /api/workflows/:id          - Update workflow
DELETE /api/workflows/:id          - Delete workflow
PATCH  /api/workflows/:id/toggle   - Enable/disable workflow
POST   /api/workflows/:id/test     - Test workflow
GET    /api/workflows/:id/executions - List executions
```

### **Calendar/Appointments**
```
GET    /api/appointments           - List appointments
POST   /api/appointments           - Create appointment
GET    /api/appointments/:id       - Get appointment
PUT    /api/appointments/:id       - Update appointment
DELETE /api/appointments/:id       - Cancel appointment
PATCH  /api/appointments/:id/confirm - Confirm appointment
```

---

## **Phase 3: Advanced Features (Weeks 7-9)**

### **AI & Lead Scoring**
```
GET    /api/ai/lead-score/:leadId  - Get lead score
POST   /api/ai/recalculate-scores  - Recalculate all scores
GET    /api/ai/insights/:leadId    - Get AI insights for lead
POST   /api/ai/insights/:id/dismiss - Dismiss insight
GET    /api/ai/predictions/:leadId - Get predictions
POST   /api/ai/enhance-message     - AI enhance email/SMS
POST   /api/ai/suggest-actions     - AI suggest next actions
```

### **AI Conversational Agent (RECOMMENDED ADDITION - Phase 3)**
```
POST   /api/ai/chat                - Send message to AI agent, execute actions
GET    /api/ai/chat/history        - Get chat conversation history
POST   /api/ai/chat/clear          - Clear conversation history
GET    /api/ai/suggestions         - Get contextual AI suggestions
POST   /api/ai/query               - Natural language query ("show leads from...")
GET    /api/ai/usage               - Track user's AI API usage costs
```

**Implementation Notes:**
- Use Vercel AI SDK + Claude 3.5 Sonnet OR OpenAI GPT-4
- AI can call functions to: create leads, send emails, launch campaigns, analyze data
- Requires user's own OpenAI/Claude API key (BYOK model)
- See separate AI Agent implementation guide for details

### **Analytics & Reports**
```
GET    /api/reports                - List reports
POST   /api/reports                - Create custom report
GET    /api/reports/:id            - Get report
PUT    /api/reports/:id            - Update report
DELETE /api/reports/:id            - Delete report
POST   /api/reports/:id/run        - Run report
POST   /api/reports/:id/schedule   - Schedule report
GET    /api/reports/:id/export     - Export report (PDF/CSV)

GET    /api/analytics/leads        - Lead analytics
GET    /api/analytics/campaigns    - Campaign analytics
GET    /api/analytics/conversion-funnel - Funnel analysis
GET    /api/analytics/revenue-forecast - Revenue predictions
GET    /api/analytics/team-performance - Team stats
```

### **Integrations**
```
GET    /api/integrations           - List available integrations
POST   /api/integrations/:provider/connect - Connect integration
POST   /api/integrations/:provider/disconnect - Disconnect
GET    /api/integrations/:provider/status - Get status
POST   /api/integrations/:provider/sync - Trigger sync
GET    /api/integrations/:provider/logs - Sync logs
PUT    /api/integrations/:provider/config - Update config
```

### **Notifications**
```
GET    /api/notifications          - List notifications
PATCH  /api/notifications/:id/read - Mark as read
POST   /api/notifications/read-all - Mark all read
DELETE /api/notifications/:id      - Delete notification
GET    /api/notifications/unread-count - Get unread count
PUT    /api/notifications/settings - Update notification preferences
```

---

## **Phase 4: Enterprise (Weeks 10-12)**

### **Team Management**
```
GET    /api/teams                  - List teams
POST   /api/teams                  - Create team
GET    /api/teams/:id              - Get team details
PUT    /api/teams/:id              - Update team
DELETE /api/teams/:id              - Delete team
GET    /api/teams/:id/members      - List team members
POST   /api/teams/:id/invite       - Invite member
DELETE /api/teams/:id/members/:userId - Remove member
PATCH  /api/teams/:id/members/:userId/role - Update member role
```

### **Subscription & Billing**
```
GET    /api/subscription           - Get current subscription
POST   /api/subscription/create    - Create subscription (via Stripe)
POST   /api/subscription/upgrade   - Upgrade plan
POST   /api/subscription/cancel    - Cancel subscription
POST   /api/subscription/resume    - Resume subscription
GET    /api/subscription/plans     - List available plans
GET    /api/subscription/usage     - Current usage stats

GET    /api/invoices               - List invoices
GET    /api/invoices/:id           - Get invoice
GET    /api/invoices/:id/download  - Download PDF

GET    /api/payment-methods        - List payment methods
POST   /api/payment-methods        - Add payment method
DELETE /api/payment-methods/:id    - Remove payment method
PATCH  /api/payment-methods/:id/default - Set as default
```

### **Admin**
```
GET    /api/admin/users            - List all users (admin only)
GET    /api/admin/users/:id        - Get user details
PATCH  /api/admin/users/:id/activate - Activate user
PATCH  /api/admin/users/:id/deactivate - Deactivate user
DELETE /api/admin/users/:id        - Delete user

GET    /api/admin/settings         - Get system settings
PUT    /api/admin/settings         - Update system settings

GET    /api/admin/feature-flags    - List feature flags
POST   /api/admin/feature-flags    - Create feature flag
PUT    /api/admin/feature-flags/:id - Update feature flag

GET    /api/admin/audit-logs       - List audit logs
GET    /api/admin/health           - System health check
POST   /api/admin/backup           - Create backup
POST   /api/admin/restore          - Restore from backup

GET    /api/admin/stats            - System statistics
```

### **Settings**
```
GET    /api/settings/profile       - Get user profile settings
PUT    /api/settings/profile       - Update profile
POST   /api/settings/avatar        - Upload avatar
PUT    /api/settings/password      - Change password
POST   /api/settings/2fa/enable    - Enable 2FA
POST   /api/settings/2fa/disable   - Disable 2FA
POST   /api/settings/2fa/verify    - Verify 2FA code

GET    /api/settings/business      - Get business settings
PUT    /api/settings/business      - Update business settings

GET    /api/settings/email         - Get email configuration
PUT    /api/settings/email         - Update email config
POST   /api/settings/email/test    - Send test email

GET    /api/settings/sms           - Get SMS configuration
PUT    /api/settings/sms           - Update SMS config (Twilio)
POST   /api/settings/sms/test      - Send test SMS

GET    /api/settings/custom-fields - Get custom field definitions
POST   /api/settings/custom-fields - Add custom field
PUT    /api/settings/custom-fields/:id - Update custom field
DELETE /api/settings/custom-fields/:id - Delete custom field
```

---

# **🏗️ BACKEND ARCHITECTURE**

## **Technology Stack**

### **Core**
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Authentication:** JWT (jsonwebtoken)

### **External Services**
- **Email:** SendGrid or Resend
- **SMS:** Twilio
- **File Storage:** AWS S3 or Cloudflare R2
- **Payment:** Stripe
- **AI:** OpenAI GPT-4
- **Analytics:** Posthog (optional)
- **Monitoring:** Sentry (optional)

### **Infrastructure**
- **Hosting:** Railway.app or Render.com
- **Database:** Railway PostgreSQL or Supabase
- **Redis:** Upstash or Railway Redis
- **CDN:** Cloudflare

---

## **Project Structure**

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # DB migrations
│   └── seed.ts                 # Seed data
│
├── src/
│   ├── config/
│   │   ├── database.ts         # Prisma client
│   │   ├── env.ts              # Environment variables
│   │   └── constants.ts        # App constants
│   │
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication
│   │   ├── validate.ts         # Request validation
│   │   ├── errorHandler.ts    # Global error handler
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   └── cors.ts             # CORS configuration
│   │
│   ├── routes/
│   │   ├── index.ts            # Route aggregator
│   │   ├── auth.routes.ts      # Auth endpoints
│   │   ├── leads.routes.ts     # Lead endpoints
│   │   ├── campaigns.routes.ts # Campaign endpoints
│   │   ├── activities.routes.ts
│   │   ├── tasks.routes.ts
│   │   ├── templates.routes.ts
│   │   ├── messages.routes.ts
│   │   ├── workflows.routes.ts
│   │   ├── appointments.routes.ts
│   │   ├── analytics.routes.ts
│   │   ├── ai.routes.ts
│   │   ├── integrations.routes.ts
│   │   ├── notifications.routes.ts
│   │   ├── teams.routes.ts
│   │   ├── billing.routes.ts
│   │   ├── admin.routes.ts
│   │   └── settings.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── leads.controller.ts
│   │   ├── campaigns.controller.ts
│   │   └── ... (one per route)
│   │
│   ├── services/
│   │   ├── email.service.ts    # Email sending
│   │   ├── sms.service.ts      # SMS sending
│   │   ├── ai.service.ts       # OpenAI integration
│   │   ├── scoring.service.ts  # Lead scoring logic
│   │   ├── analytics.service.ts # Analytics calculations
│   │   ├── stripe.service.ts   # Stripe integration
│   │   ├── storage.service.ts  # File uploads (S3)
│   │   └── workflow.service.ts # Workflow execution
│   │
│   ├── jobs/
│   │   ├── queue.ts            # Bull queue setup
│   │   ├── workers/
│   │   │   ├── email.worker.ts # Email sending jobs
│   │   │   ├── campaign.worker.ts # Campaign execution
│   │   │   ├── scoring.worker.ts  # Score recalculation
│   │   │   └── sync.worker.ts     # Integration sync
│   │   └── scheduler.ts        # Cron jobs
│   │
│   ├── utils/
│   │   ├── jwt.ts              # JWT utilities
│   │   ├── bcrypt.ts           # Password hashing
│   │   ├── validators.ts       # Custom validators
│   │   ├── errors.ts           # Custom error classes
│   │   ├── logger.ts           # Winston logger
│   │   └── helpers.ts          # General helpers
│   │
│   ├── types/
│   │   ├── express.d.ts        # Express type extensions
│   │   ├── models.ts           # Shared types
│   │   └── api.ts              # API request/response types
│   │
│   ├── websocket/
│   │   ├── server.ts           # Socket.io setup
│   │   └── handlers/
│   │       ├── notifications.ts
│   │       └── realtime.ts
│   │
│   └── server.ts               # Main entry point
│
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # End-to-end tests
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

# **🔐 SECURITY IMPLEMENTATION**

## **Authentication & Authorization**

### **JWT Strategy**
```typescript
// Token structure
{
  userId: string
  email: string
  role: 'admin' | 'manager' | 'user'
  teamId?: string
  iat: number
  exp: number
}

// Access token: 15 minutes
// Refresh token: 7 days
```

### **Password Requirements**
- Minimum 8 characters
- At least 1 uppercase, 1 lowercase, 1 number
- Bcrypt hashing with 10 rounds

### **Rate Limiting**
```typescript
// Auth endpoints: 5 requests/15 minutes
// API endpoints: 100 requests/minute per user
// Public endpoints: 20 requests/minute per IP
```

### **CORS Configuration**
```typescript
// Production
allowedOrigins: [
  'https://yourdomain.com',
  'https://app.yourdomain.com'
]

// Development
allowedOrigins: [
  'http://localhost:3000',
  'http://localhost:3001'
]
```

---

# **⚡ PERFORMANCE OPTIMIZATION**

## **Database Indexing**
```sql
-- High-priority indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to_id);
CREATE INDEX idx_leads_created ON leads(created_at);
CREATE INDEX idx_activities_lead ON activities(lead_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_campaigns_status ON campaigns(status);
```

## **Caching Strategy**
```typescript
// Redis caching
- User sessions: 7 days
- Analytics snapshots: 1 hour
- Dashboard metrics: 5 minutes
- Lead scores: 1 hour
- Public data: 24 hours
```

## **Query Optimization**
- Use Prisma's `include` sparingly
- Implement cursor-based pagination for large lists
- Use database views for complex analytics
- Batch operations where possible

---

# **📅 DEVELOPMENT TIMELINE**

## **Week 1: Setup & Auth**

### **SETUP ACCOUNTS (Do This First - 30 minutes total):**
- [ ] Create Neon account (neon.tech) - Free PostgreSQL database
- [ ] Create Railway account (railway.app) - Backend hosting
- [ ] Create Vercel account (vercel.com) - Frontend already here
- [ ] Get connection strings and save to password manager

### **BUILD (Start Here - Build First, Deploy Later):**
- [ ] Initialize project (Express + TypeScript + Prisma)
- [ ] Create project structure and files
- [ ] Set up Prisma with placeholder DATABASE_URL
- [ ] Create initial Prisma schema (User, Lead, Campaign)
- [ ] Implement JWT authentication
- [ ] Build auth endpoints (register, login, refresh)
- [ ] Set up middleware (auth, validation, error handling)
- [ ] Test locally with SQLite (switch to Neon when ready)
- [ ] Deploy to Railway (after everything works locally)

## **Week 2: Core Features**
- [ ] Leads CRUD endpoints
- [ ] Tags management
- [ ] Notes for leads
- [ ] Campaign CRUD endpoints
- [ ] Activity logging
- [ ] Tasks management
- [ ] Basic dashboard analytics

## **Week 3: Frontend Integration**
- [ ] Connect frontend to backend API
- [ ] Test all core endpoints
- [ ] Fix bugs and edge cases
- [ ] Add request validation
- [ ] Implement pagination properly
- [ ] Add filtering and sorting

## **Week 4-5: Communication**
- [ ] Email template system
- [ ] SendGrid integration
- [ ] SMS template system
- [ ] Twilio integration
- [ ] Messages inbox
- [ ] Calendar/appointments

## **Week 6: Automation**
- [ ] Workflow engine
- [ ] Workflow execution
- [ ] Background jobs (Bull + Redis)
- [ ] Scheduled campaigns
- [ ] Email drip campaigns

## **Week 7: AI & Scoring**
- [ ] OpenAI integration
- [ ] Lead scoring algorithm
- [ ] AI insights generation
- [ ] Email/SMS enhancement
- [ ] Predictive analytics
- [ ] **AI Conversational Agent (Vercel AI SDK)**
- [ ] **Chat history persistence**
- [ ] **Function calling setup (10-15 tools)**

## **Week 8-9: Analytics & Integrations**
- [ ] Advanced analytics endpoints
- [ ] Custom report builder
- [ ] Analytics snapshots (daily cron)
- [ ] Google Sheets integration
- [ ] Slack integration
- [ ] Stripe integration setup

## **Week 10: Team & Multi-Tenant**
- [ ] Team management
- [ ] Role-based access control
- [ ] Invitation system
- [ ] Team switching

## **Week 11: Billing**
- [ ] Stripe subscription flow
- [ ] Webhook handlers
- [ ] Invoice generation
- [ ] Usage tracking
- [ ] Plan limits enforcement

## **Week 12: Admin & Polish**
- [ ] Admin panel endpoints
- [ ] System settings
- [ ] Feature flags
- [ ] Audit logging
- [ ] Health monitoring
- [ ] Performance optimization
- [ ] Security audit

---

# **🚀 DEPLOYMENT PLAN**

## **Environment Setup**

### **Development**
```env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://localhost:5432/realestate_dev
JWT_SECRET=dev_secret_change_in_production
FRONTEND_URL=http://localhost:3000
```

### **Production**
```env
NODE_ENV=production
PORT=8000
DATABASE_URL=postgresql://production_db_url
JWT_SECRET=strong_random_secret_from_railway
JWT_REFRESH_SECRET=another_strong_secret
FRONTEND_URL=https://app.yourdomain.com

# SendGrid
SENDGRID_API_KEY=your_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe
STRIPE_SECRET_KEY=your_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# OpenAI
OPENAI_API_KEY=your_key

# AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BUCKET_NAME=your_bucket

# Redis
REDIS_URL=redis://redis_url
```

## **Deployment Steps**

### **Railway Deployment**
1. Connect GitHub repo to Railway
2. Add PostgreSQL service
3. Add Redis service
4. Set environment variables
5. Deploy backend
6. Run migrations: `npx prisma migrate deploy`
7. Seed database: `npx prisma db seed`

### **Database Migrations**
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply to production
npx prisma migrate deploy

# Seed data
npx prisma db seed
```

---

# **🧪 TESTING STRATEGY**

## **Test Coverage Goals**
- Unit tests: 80%+ coverage
- Integration tests: All critical paths
- E2E tests: Main user flows

## **Testing Stack**
- **Framework:** Jest
- **API Testing:** Supertest
- **E2E:** Playwright (shared with frontend)
- **Database:** Separate test database

## **Test Categories**

### **Unit Tests**
- Service functions
- Utility functions
- Validators
- Scoring algorithms

### **Integration Tests**
- API endpoints
- Database operations
- External service mocks

### **E2E Tests**
- User registration → Create lead → Launch campaign
- Import leads → Assign → Create workflow
- Subscription signup → Billing

---

# **📊 MONITORING & LOGGING**

## **Logging Strategy**
```typescript
// Winston logger with levels
- error: Critical errors
- warn: Warnings (rate limit hit, etc.)
- info: Important events (user created, campaign launched)
- debug: Development debugging
```

## **Monitoring**
- **Application:** Sentry for error tracking
- **Infrastructure:** Railway built-in metrics
- **Database:** Railway PostgreSQL metrics
- **Uptime:** UptimeRobot or Better Uptime

## **Key Metrics to Track**
- API response times
- Database query performance
- Error rates
- Active users
- API usage per user
- Queue job success rates

---

# **💰 COST ESTIMATION**

## **Initial Costs (First 6 Months)**
```
Railway (Backend + DB + Redis): $20-50/month
Vercel (Frontend): $0-20/month
SendGrid: $0-15/month (up to 15k emails)
Twilio: Pay as you go ($0.0079/SMS)
Stripe: 2.9% + $0.30 per transaction
OpenAI: Pay as you go ($0.002/1k tokens)
Domain: $12/year

Total: ~$40-100/month
```

## **Scaling Costs (100+ users)**
```
Railway: $100-200/month
SendGrid: $50/month
Twilio: Variable
CDN: $20/month
Monitoring: $29/month

Total: ~$200-300/month
```

---

# **✅ SUCCESS CRITERIA**

## **MVP Launch (Week 3)**
- [ ] 50+ users registered
- [ ] 10+ beta testers actively using
- [ ] API response time < 300ms (p95)
- [ ] Zero critical bugs
- [ ] 99%+ uptime

## **Full Launch (Week 12)**
- [ ] All core features working
- [ ] Stripe billing functional
- [ ] Mobile responsive
- [ ] Documentation complete
- [ ] 80%+ test coverage
- [ ] Sub-second API responses
- [ ] Security audit passed

---

# **🎯 PRIORITIES**

## **Must Have (Week 1-3)**
1. Authentication
2. Lead CRUD
3. Campaign CRUD
4. Basic analytics
5. Email sending

## **Should Have (Week 4-6)**
6. SMS sending
7. Workflow automation
8. Templates
9. Calendar

## **Nice to Have (Week 7-12)**
10. AI features
11. Advanced analytics
12. Integrations
13. Team management
14. Billing

---

**This is your complete backend blueprint. Start with Phase 1, launch in 3 weeks, iterate based on user feedback. Build only what you need, when you need it. 🚀**

---

# **🤖 AI AGENT RECOMMENDATION (Phase 3)**

## **Overview**

Add a **conversational AI agent** that can not only chat with users but also **execute actions** in the app (create leads, send emails, launch campaigns, analyze data, etc.).

## **Why Add This?**

- ✅ **Major differentiator** - Most CRMs only have basic chatbots
- ✅ **Minimal cost to you** - Users pay for their own API usage (BYOK model)
- ✅ **High value** - AI assistant becomes users' virtual employee
- ✅ **Quick to build** - 1-2 weeks with Vercel AI SDK
- ✅ **Replaces multiple features** - One AI interface for many actions

## **Technology Stack**

### **Recommended: Vercel AI SDK + Claude 3.5 Sonnet**

**Why this combo:**
1. Vercel AI SDK makes function calling EASY
2. Claude 3.5 is best at tool use and 50% cheaper than GPT-4
3. Fully customizable - you own the code
4. Works with user's own API keys (BYOK)

```bash
npm install ai @ai-sdk/anthropic @ai-sdk/openai zod
```

## **What The AI Agent Can Do**

Users can ask natural language questions and the AI will execute actions:

```
"Show me my top 10 leads"
→ AI calls getLeads({ limit: 10, orderBy: 'score' })

"Create a lead for John Doe, john@example.com"
→ AI calls createLead({ name: "John Doe", email: "john@example.com" })

"Send an email to all hot leads"
→ AI calls getLeads({ status: "HOT" })
→ AI calls sendEmailBulk({ leadIds: [...], template: "hot_lead" })

"Launch an email campaign to qualified leads with score > 80"
→ AI calls createCampaign({ type: "email", filters: { minScore: 80 } })

"What's my conversion rate?"
→ AI calls getAnalytics() and calculates
```

## **Implementation Plan**

### **Phase 3 - Week 7-8 (After core features working):**

1. **Database Schema** (Already added above):
   - ChatConversation model
   - ChatMessage model
   - Track conversations and function calls

2. **Define AI Tools/Functions** (10-15 core actions):
   - `getLeads()` - Fetch leads with filters
   - `createLead()` - Create new lead
   - `sendEmail()` - Send email to lead
   - `launchCampaign()` - Create and launch campaign
   - `getAnalytics()` - Fetch stats and metrics
   - `createTask()` - Create follow-up task
   - `generateEmail()` - AI write email content
   - `analyzeCampaign()` - Campaign performance insights
   - ... and more

3. **API Endpoints**:
   - `POST /api/ai/chat` - Main chat endpoint
   - `GET /api/ai/chat/history` - Load conversation
   - `POST /api/ai/chat/clear` - Clear history
   - `GET /api/ai/usage` - Track user's API costs

4. **Frontend Integration**:
   - Already have `AIAssistant.tsx` and `FloatingAIButton.tsx`
   - Just connect to real backend API instead of mock responses

5. **Security**:
   - Require confirmation for destructive actions (delete, bulk send)
   - Rate limiting per user
   - Validate user owns resources before AI accesses them
   - Encrypt API keys (AES-256-GCM)

## **Cost Model (BYOK)**

### **Users Pay:**
- OpenAI/Claude API usage: $2-50/month (based on their usage)
- Twilio/SendGrid: Based on their sending volume
- Your subscription fee: $9-79/month

### **You Pay:**
- Server costs: $30-70/month (same as before)
- Database: Included
- Development time: One-time

**Result:** 90%+ profit margins, no API costs for you!

## **User Setup Required**

Users must add their own API keys:

1. **OpenAI or Claude API key** (for AI features)
   - Setup time: 2-5 minutes
   - Cost to user: $2-50/month based on usage

2. **SendGrid** (for email sending)
   - Setup time: 3-5 minutes
   - Cost to user: $0-15/month

3. **Twilio** (for SMS/calling)
   - Setup time: 3-5 minutes
   - Cost to user: Pay per use

**Make setup easy with:**
- Step-by-step onboarding wizard
- Video tutorials
- "Click to open" links to provider sites
- Test buttons to verify setup
- Progressive setup (basic features work without keys)

## **Implementation Timeline**

```
Week 7 (AI Agent Core):
- Install Vercel AI SDK
- Define 10 core tools/functions
- Build chat endpoint with function calling
- Test AI can execute actions

Week 8 (Integration & Polish):
- Connect AIAssistant.tsx to real API
- Add chat history persistence
- Implement confirmation modals
- Add usage tracking
- Security hardening

Total: 2 weeks to add AI agent capability
```

## **Example Code Structure**

```typescript
// src/lib/ai-tools.ts
import { tool } from 'ai'
import { z } from 'zod'

export const tools = {
  getLeads: tool({
    description: 'Get leads with optional filters',
    parameters: z.object({
      status: z.string().optional(),
      minScore: z.number().optional(),
      limit: z.number().default(10),
    }),
    execute: async ({ status, minScore, limit }) => {
      const leads = await db.lead.findMany({
        where: {
          ...(status && { status }),
          ...(minScore && { score: { gte: minScore } })
        },
        take: limit,
      })
      return leads
    },
  }),
  
  createLead: tool({
    description: 'Create a new lead',
    parameters: z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
    }),
    execute: async ({ name, email, phone }) => {
      const lead = await db.lead.create({
        data: { name, email, phone }
      })
      return `Lead created with ID: ${lead.id}`
    },
  }),
  
  // ... 8-13 more tools
}
```

## **Priority Level**

**Phase 3 Feature** - Build AFTER:
- ✅ Phase 1: Core features (leads, campaigns, auth)
- ✅ Phase 2: Communication (email/SMS sending, templates)
- 🎯 **Phase 3: AI Agent** - Your competitive differentiator

Don't build this until your core CRM functionality works. But when you do build it, it becomes your **biggest selling point** and requires minimal ongoing cost.

---

**End of AI Agent Recommendation**

````
