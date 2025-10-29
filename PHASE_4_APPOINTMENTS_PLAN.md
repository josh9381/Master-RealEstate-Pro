# Phase 4: Appointments & Calendar System

**Date:** October 28, 2025  
**Status:** 🚧 Planning  
**Goal:** Build missing Calendar & Appointments APIs from Backend Plan Phase 2

---

## 📋 Overview

Phase 4 fills a **critical gap** in the backend by implementing the Appointments system that was planned in Phase 2 but never built. This is essential for real estate CRM where agents need to:

- Schedule property viewings
- Book consultations
- Manage follow-up calls
- Track demo appointments
- Send automated reminders

---

## 🎯 Objectives

1. ✅ Build 9 missing appointment API endpoints
2. ✅ Integrate with existing Lead system
3. ✅ Add calendar view support
4. ✅ Implement reminder notifications
5. ✅ Support multiple appointment types
6. ✅ Track appointment outcomes

**Total New Code:** ~1,200 lines (validators, controller, routes, services)

---

## 📊 Database Schema

**Already exists in `prisma/schema.prisma`:**

```prisma
model Appointment {
  id          String            @id @default(cuid())
  title       String
  description String?           @db.Text
  startTime   DateTime
  endTime     DateTime
  location    String?
  meetingUrl  String?           // For virtual meetings
  type        AppointmentType
  status      AppointmentStatus @default(SCHEDULED)
  
  // Relations
  leadId      String?
  lead        Lead?             @relation(fields: [leadId], references: [id])
  userId      String
  user        User              @relation(fields: [userId], references: [id])
  
  // Attendees (stored as JSON array)
  attendees   Json?             // [{email, name, confirmed}]
  
  // Reminders
  reminderSent Boolean          @default(false)
  
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  @@index([startTime])
  @@index([userId])
  @@index([leadId])
  @@index([status])
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

**Updates Needed:**
- ✅ Add `appointments` relation to User model
- ✅ Add `appointments` relation to Lead model (optional)

---

## 🔌 API Endpoints (9 Total)

### **1. List Appointments**
```
GET /api/appointments
```

**Query Parameters:**
- `page` (number) - Pagination
- `limit` (number) - Results per page (default: 20)
- `status` (string) - Filter by status
- `type` (string) - Filter by type
- `leadId` (string) - Filter by lead
- `startDate` (ISO) - Filter from date
- `endDate` (ISO) - Filter to date

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "appt_123",
        "title": "Property Viewing - 123 Main St",
        "type": "DEMO",
        "status": "SCHEDULED",
        "startTime": "2025-10-30T14:00:00Z",
        "endTime": "2025-10-30T15:00:00Z",
        "location": "123 Main St, Seattle, WA",
        "leadId": "lead_456",
        "lead": { "name": "John Doe", "email": "john@example.com" }
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

---

### **2. Create Appointment**
```
POST /api/appointments
```

**Request Body:**
```json
{
  "title": "Property Viewing - 123 Main St",
  "description": "Show property to interested buyer",
  "type": "DEMO",
  "startTime": "2025-10-30T14:00:00Z",
  "endTime": "2025-10-30T15:00:00Z",
  "location": "123 Main St, Seattle, WA",
  "meetingUrl": null,
  "leadId": "lead_456",
  "attendees": [
    { "email": "john@example.com", "name": "John Doe" }
  ]
}
```

**Validation Rules:**
- `title` - Required, 1-200 chars
- `type` - Required, enum (CALL/MEETING/DEMO/CONSULTATION/FOLLOW_UP)
- `startTime` - Required, ISO datetime, must be future
- `endTime` - Required, must be after startTime
- `location` OR `meetingUrl` - At least one required
- `leadId` - Optional, must exist in database
- `attendees` - Optional array of {email, name}

**Response:**
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "appointment": { /* full appointment object */ }
  }
}
```

---

### **3. Get Appointment Details**
```
GET /api/appointments/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointment": {
      "id": "appt_123",
      "title": "Property Viewing",
      "type": "DEMO",
      "status": "SCHEDULED",
      "startTime": "2025-10-30T14:00:00Z",
      "endTime": "2025-10-30T15:00:00Z",
      "location": "123 Main St",
      "leadId": "lead_456",
      "lead": {
        "id": "lead_456",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1-555-0123"
      },
      "attendees": [
        { "email": "john@example.com", "name": "John Doe", "confirmed": false }
      ],
      "reminderSent": false,
      "createdAt": "2025-10-28T20:00:00Z"
    }
  }
}
```

---

### **4. Update Appointment**
```
PUT /api/appointments/:id
```

**Request Body:** (all optional)
```json
{
  "title": "Updated Title",
  "startTime": "2025-10-30T15:00:00Z",
  "endTime": "2025-10-30T16:00:00Z",
  "location": "456 New Address",
  "status": "CONFIRMED"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment updated successfully",
  "data": {
    "appointment": { /* updated appointment */ }
  }
}
```

---

### **5. Cancel Appointment**
```
DELETE /api/appointments/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

**Behavior:** Sets status to CANCELLED, doesn't delete from database

---

### **6. Confirm Appointment**
```
PATCH /api/appointments/:id/confirm
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment confirmed",
  "data": {
    "appointment": { /* status: CONFIRMED */ }
  }
}
```

---

### **7. Calendar View**
```
GET /api/appointments/calendar
```

**Query Parameters:**
- `startDate` (ISO, required) - Start of date range
- `endDate` (ISO, required) - End of date range
- `view` (string) - "day" | "week" | "month" (default: week)

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      /* appointments within date range */
    ],
    "summary": {
      "total": 12,
      "byType": {
        "CALL": 3,
        "MEETING": 5,
        "DEMO": 4
      },
      "byStatus": {
        "SCHEDULED": 8,
        "CONFIRMED": 4
      }
    }
  }
}
```

---

### **8. Upcoming Appointments**
```
GET /api/appointments/upcoming
```

**Query Parameters:**
- `days` (number) - Look ahead days (default: 7)
- `limit` (number) - Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      /* next 7 days appointments, sorted by startTime */
    ],
    "count": 5
  }
}
```

---

### **9. Send Reminder**
```
POST /api/appointments/:id/reminder
```

**Request Body:**
```json
{
  "method": "email",  // or "sms" or "both"
  "message": "Optional custom message"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reminder sent successfully",
  "data": {
    "sent": {
      "email": true,
      "sms": false
    }
  }
}
```

---

## 📁 File Structure

```
/backend/src/
├── validators/
│   └── appointment.validator.ts         (NEW - ~200 lines)
│
├── controllers/
│   └── appointment.controller.ts        (NEW - ~600 lines)
│
├── services/
│   └── reminder.service.ts              (NEW - ~200 lines)
│
└── routes/
    └── appointment.routes.ts            (NEW - ~150 lines)
```

---

## 🛠️ Implementation Steps

### **Step 1: Update Prisma Schema** (~5 min)

Add relations to User and Lead models:

```prisma
// In User model
appointments Appointment[]

// In Lead model  
appointments Appointment[]
```

Run migration:
```bash
cd backend
npx prisma migrate dev --name add_appointment_relations
npx prisma generate
```

---

### **Step 2: Create Validators** (~30 min)

**File:** `/backend/src/validators/appointment.validator.ts`

```typescript
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['CALL', 'MEETING', 'DEMO', 'CONSULTATION', 'FOLLOW_UP']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  leadId: z.string().cuid().optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
  })).optional(),
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  { message: 'End time must be after start time' }
).refine(
  (data) => data.location || data.meetingUrl,
  { message: 'Either location or meeting URL is required' }
);

export const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
});

export const calendarQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  view: z.enum(['day', 'week', 'month']).default('week'),
});

export const reminderSchema = z.object({
  method: z.enum(['email', 'sms', 'both']).default('email'),
  message: z.string().optional(),
});
```

---

### **Step 3: Create Reminder Service** (~45 min)

**File:** `/backend/src/services/reminder.service.ts`

Handles sending email/SMS reminders for appointments.

---

### **Step 4: Create Controller** (~2 hours)

**File:** `/backend/src/controllers/appointment.controller.ts`

Implement all 9 endpoint handlers.

---

### **Step 5: Create Routes** (~30 min)

**File:** `/backend/src/routes/appointment.routes.ts`

Wire up all routes with auth + validation middleware.

---

### **Step 6: Integrate with Server** (~5 min)

Update `/backend/src/server.ts`:
```typescript
import appointmentRoutes from './routes/appointment.routes';

app.use('/api/appointments', appointmentRoutes);
```

---

### **Step 7: Test All Endpoints** (~1 hour)

Create test script to verify all 9 endpoints work.

---

## ✅ Success Criteria

- [ ] All 9 endpoints implemented and tested
- [ ] Calendar view returns correct date ranges
- [ ] Reminders send via email/SMS
- [ ] Lead association works correctly
- [ ] Validation prevents invalid appointments
- [ ] Timezone handling works properly
- [ ] Pagination works on list endpoint
- [ ] No TypeScript errors
- [ ] Server starts without errors
- [ ] Integration with frontend calendar page

---

## 🎯 User Value

**For Real Estate Agents:**
1. ✅ Schedule property viewings with clients
2. ✅ Track consultation appointments
3. ✅ Set follow-up call reminders
4. ✅ Manage demo schedules
5. ✅ See weekly calendar of appointments
6. ✅ Get automated appointment reminders
7. ✅ Link appointments to specific leads
8. ✅ Track appointment outcomes (show/no-show)

---

## 📊 Estimated Timeline

- **Step 1 (Schema):** 5 minutes
- **Step 2 (Validators):** 30 minutes
- **Step 3 (Reminder Service):** 45 minutes
- **Step 4 (Controller):** 2 hours
- **Step 5 (Routes):** 30 minutes
- **Step 6 (Integration):** 5 minutes
- **Step 7 (Testing):** 1 hour

**Total:** ~5 hours of focused work

---

## 🔄 Next Phase

After completing Phase 4, the backend will have:
- **128 existing endpoints** (Phases 1-3)
- **9 new appointment endpoints** (Phase 4)
- **Total: 137 backend endpoints**

**Then move to Phase 5:** Billing & Subscriptions (Stripe integration)

---

**Status:** Ready to implement  
**Complexity:** Medium  
**Priority:** High (fills critical gap)
