# Phase 3: Settings & Configuration APIs - Implementation Plan

**Date**: October 28, 2025  
**Status**: Planning → Building  
**Goal**: Complete all missing backend endpoints for Settings, Integrations, and Teams

---

## 🎯 Overview

Build **35+ API endpoints** across 3 main categories to complete Phase 3.

### What We're Building:
1. **Settings APIs** (25 endpoints)
2. **Integrations APIs** (5 endpoints)  
3. **Teams APIs** (8 endpoints)

**Estimated Time**: 2-3 days  
**Impact**: Completes backend for all existing frontend pages

---

## 📋 Part 1: Settings APIs (Priority 1)

### 1.1 Profile Settings (4 endpoints)
```
GET    /api/settings/profile        - Get user profile
PUT    /api/settings/profile        - Update profile (name, email, timezone, language)
POST   /api/settings/avatar         - Upload avatar image
PUT    /api/settings/password       - Change password (requires old password)
```

**Database**: User model (already exists)  
**Features**: 
- Profile fields: firstName, lastName, email, avatar, timezone, language
- Password validation (old password required)
- Avatar upload to temp storage (can add S3 later)
- Email uniqueness check

---

### 1.2 Business Settings (2 endpoints)
```
GET    /api/settings/business       - Get business settings
PUT    /api/settings/business       - Update business settings
```

**Database**: New `BusinessSettings` model needed  
**Fields**:
- companyName, address, phone, website
- businessHours (JSON)
- logo
- billingEmail
- userId (owner)

---

### 1.3 Email Configuration (3 endpoints)
```
GET    /api/settings/email          - Get email provider config
PUT    /api/settings/email          - Update SendGrid credentials
POST   /api/settings/email/test     - Send test email
```

**Database**: New `EmailConfig` model  
**Fields**:
- provider (sendgrid, smtp)
- apiKey (encrypted)
- fromEmail, fromName
- isActive
- userId

**Security**: Encrypt API keys using AES-256

---

### 1.4 SMS Configuration (3 endpoints)
```
GET    /api/settings/sms            - Get Twilio config
PUT    /api/settings/sms            - Update Twilio credentials
POST   /api/settings/sms/test       - Send test SMS
```

**Database**: New `SMSConfig` model  
**Fields**:
- provider (twilio)
- accountSid, authToken (encrypted), phoneNumber
- isActive
- userId

---

### 1.5 Notification Settings (2 endpoints)
```
GET    /api/settings/notifications  - Get notification preferences
PUT    /api/settings/notifications  - Update preferences
```

**Database**: New `NotificationSettings` model  
**Fields**:
- emailNotifications (boolean)
- pushNotifications (boolean)
- smsNotifications (boolean)
- channels (JSON): { leadAssigned, campaignCompleted, taskDue, etc. }
- userId

---

### 1.6 Security Settings (5 endpoints)
```
GET    /api/settings/security       - Get security settings
POST   /api/settings/2fa/enable     - Enable 2FA (generate QR code)
POST   /api/settings/2fa/verify     - Verify 2FA code to confirm
POST   /api/settings/2fa/disable    - Disable 2FA (requires password)
GET    /api/settings/sessions       - List active sessions (optional)
```

**Database**: User model (twoFactorEnabled, twoFactorSecret fields exist)  
**Features**:
- Generate TOTP secret
- Generate QR code for authenticator apps
- Verify 6-digit codes
- Require password to disable

---

## 📋 Part 2: Integrations APIs (Priority 2)

```
GET    /api/integrations            - List all available integrations
POST   /api/integrations/:provider/connect     - Connect integration (store credentials)
POST   /api/integrations/:provider/disconnect  - Disconnect integration
GET    /api/integrations/:provider/status      - Get connection status
POST   /api/integrations/:provider/sync        - Trigger manual sync
```

**Database**: New `Integration` model  
**Fields**:
- provider (google_sheets, slack, zapier, etc.)
- isConnected
- credentials (JSON, encrypted)
- lastSyncAt
- syncStatus
- userId

**Supported Providers** (Phase 3):
- google_sheets
- slack
- zapier
- webhook

---

## 📋 Part 3: Teams APIs (Priority 3)

```
GET    /api/teams                   - List user's teams
POST   /api/teams                   - Create team
GET    /api/teams/:id               - Get team details
PUT    /api/teams/:id               - Update team
DELETE /api/teams/:id               - Delete team
GET    /api/teams/:id/members       - List team members
POST   /api/teams/:id/invite        - Invite member via email
DELETE /api/teams/:id/members/:userId - Remove member
PATCH  /api/teams/:id/members/:userId/role - Update member role
```

**Database**: Team, TeamMember models (already exist in schema)  
**Features**:
- RBAC: OWNER, ADMIN, MANAGER, MEMBER
- Email invitations (can be mock for now)
- Only owner can delete team
- Owner cannot be removed

---

## 🗂️ Files to Create

### Controllers (8 files)
1. `/backend/src/controllers/settings/profile.controller.ts`
2. `/backend/src/controllers/settings/business.controller.ts`
3. `/backend/src/controllers/settings/email.controller.ts`
4. `/backend/src/controllers/settings/sms.controller.ts`
5. `/backend/src/controllers/settings/notification.controller.ts`
6. `/backend/src/controllers/settings/security.controller.ts`
7. `/backend/src/controllers/integration.controller.ts`
8. `/backend/src/controllers/team.controller.ts`

### Validators (8 files)
1. `/backend/src/validators/settings/profile.validator.ts`
2. `/backend/src/validators/settings/business.validator.ts`
3. `/backend/src/validators/settings/email.validator.ts`
4. `/backend/src/validators/settings/sms.validator.ts`
5. `/backend/src/validators/settings/notification.validator.ts`
6. `/backend/src/validators/settings/security.validator.ts`
7. `/backend/src/validators/integration.validator.ts`
8. `/backend/src/validators/team.validator.ts`

### Routes (3 files)
1. `/backend/src/routes/settings.routes.ts` (combines all settings)
2. `/backend/src/routes/integration.routes.ts`
3. `/backend/src/routes/team.routes.ts`

### Utilities (2 files)
1. `/backend/src/utils/encryption.ts` (encrypt/decrypt API keys)
2. `/backend/src/utils/2fa.ts` (TOTP generation/verification)

### Database Migration
1. Create new migration for: BusinessSettings, EmailConfig, SMSConfig, NotificationSettings, Integration models

---

## 🔐 Security Considerations

### API Key Encryption
```typescript
// Use crypto to encrypt sensitive data
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY // 32 bytes
const algorithm = 'aes-256-gcm'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

function decrypt(text: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

### 2FA Implementation
```typescript
// Use speakeasy for TOTP
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

// Generate secret
const secret = speakeasy.generateSecret({
  name: 'RealEstate Pro',
  issuer: 'RealEstate Pro'
})

// Generate QR code
const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

// Verify token
const verified = speakeasy.totp.verify({
  secret: user.twoFactorSecret,
  encoding: 'base32',
  token: userProvidedCode
})
```

---

## 📊 Database Schema Additions

### New Models Needed

```prisma
model BusinessSettings {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  companyName    String?
  address        String?
  phone          String?
  website        String?
  logo           String?
  billingEmail   String?
  businessHours  Json?    // { monday: { open: "9:00", close: "17:00" }, ... }
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model EmailConfig {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  provider    String   @default("sendgrid") // sendgrid, smtp
  apiKey      String?  // Encrypted
  fromEmail   String?
  fromName    String?
  smtpHost    String?
  smtpPort    Int?
  smtpUser    String?
  smtpPassword String? // Encrypted
  isActive    Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SMSConfig {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  provider      String   @default("twilio")
  accountSid    String?  // Encrypted
  authToken     String?  // Encrypted
  phoneNumber   String?
  isActive      Boolean  @default(false)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model NotificationSettings {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  emailNotifications  Boolean  @default(true)
  pushNotifications   Boolean  @default(true)
  smsNotifications    Boolean  @default(false)
  
  // Channel preferences (JSON)
  channels            Json?    // { leadAssigned: true, campaignCompleted: true, ... }
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model Integration {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  provider      String   // google_sheets, slack, zapier, etc.
  isConnected   Boolean  @default(false)
  credentials   Json?    // Encrypted credentials
  config        Json?    // Provider-specific config
  
  lastSyncAt    DateTime?
  syncStatus    String?  // idle, syncing, success, error
  syncError     String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([userId, provider])
  @@index([userId])
  @@index([provider])
}
```

---

## 🚀 Implementation Order

### Day 1 (Morning): Database & Utilities
1. ✅ Create database migration for new models
2. ✅ Create encryption utility
3. ✅ Create 2FA utility
4. ✅ Apply migration

### Day 1 (Afternoon): Profile & Business Settings
5. ✅ Build profile.controller.ts
6. ✅ Build business.controller.ts
7. ✅ Build validators
8. ✅ Test profile endpoints

### Day 2 (Morning): Email & SMS Configuration
9. ✅ Build email.controller.ts (with encryption)
10. ✅ Build sms.controller.ts (with encryption)
11. ✅ Build validators
12. ✅ Test configuration endpoints

### Day 2 (Afternoon): Notifications & Security
13. ✅ Build notification.controller.ts
14. ✅ Build security.controller.ts (with 2FA)
15. ✅ Build validators
16. ✅ Test all settings endpoints

### Day 3 (Morning): Integrations & Teams
17. ✅ Build integration.controller.ts
18. ✅ Build team.controller.ts
19. ✅ Build validators
20. ✅ Create route files

### Day 3 (Afternoon): Integration & Testing
21. ✅ Mount all routes in server.ts
22. ✅ Test all endpoints with Postman/curl
23. ✅ Test with frontend
24. ✅ Document and complete

---

## ✅ Success Criteria

- [ ] All 38 endpoints implemented
- [ ] All endpoints require authentication
- [ ] API keys are encrypted in database
- [ ] 2FA works with authenticator apps
- [ ] Profile updates work
- [ ] Email/SMS configuration saves
- [ ] Team CRUD operations work
- [ ] Integration connection flow works
- [ ] No TypeScript errors
- [ ] All endpoints tested
- [ ] Frontend pages work with new APIs

---

## 📦 Dependencies to Install

```bash
npm install --save speakeasy qrcode
npm install --save-dev @types/speakeasy @types/qrcode
```

---

## 🎯 After Phase 3 Complete

You will have:
- ✅ 90 existing endpoints (Phase 1-2)
- ✅ 38 new endpoints (Phase 3)
- ✅ **128 total backend endpoints**
- ✅ Complete backend for all frontend pages
- ✅ Production-ready settings system
- ✅ Integration framework
- ✅ Team collaboration support

**Next Steps After Phase 3:**
- Week 3: Integrate real SendGrid email sending
- Week 4: Integrate real Twilio SMS sending  
- Week 5-6: Billing & Subscriptions (Stripe)
- Week 7+: Advanced features based on user feedback

---

**Status**: ✅ Plan Complete - Ready to Build!

Let's start implementation now.
