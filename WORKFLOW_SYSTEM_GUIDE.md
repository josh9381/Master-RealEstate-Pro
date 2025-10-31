# Workflow Automation System - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [User Guide](#user-guide)
3. [Available Triggers](#available-triggers)
4. [Available Actions](#available-actions)
5. [Example Workflows](#example-workflows)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

---

## Overview

The Workflow Automation System enables automatic responses to events in your CRM. When a trigger condition is met (like a new lead being created), the system automatically executes a series of actions (like sending an email or creating a task).

### Key Features
- **Event-Driven**: Automatically responds to system events
- **Multi-Action**: Chain multiple actions in sequence
- **Conditional Logic**: Set conditions for when workflows should run
- **Execution History**: Track all workflow executions
- **Success Metrics**: Monitor workflow performance
- **Easy Toggle**: Enable/disable workflows without deletion

---

## User Guide

### Creating a Workflow

1. **Navigate to Workflows**
   - Go to the Workflows page in your CRM
   - Click "Create Workflow" button

2. **Basic Information**
   ```
   Name: Welcome New Leads
   Description: Send welcome email and create follow-up task
   ```

3. **Select Trigger**
   - Choose the event that starts the workflow
   - Example: "Lead Created"

4. **Add Actions**
   - Click "Add Action" to add steps
   - Configure each action with required data
   - Actions execute in order from top to bottom

5. **Activate**
   - New workflows start as inactive
   - Click "Activate" when ready to use
   - Only active workflows will execute

### Managing Workflows

#### View All Workflows
- Lists all workflows with status indicators
- Shows execution count and success rate
- Filter by active status or trigger type

#### Edit Workflow
- Click on workflow name to view details
- Click "Edit" to modify settings
- Changes take effect immediately

#### Toggle Active/Inactive
- Use the toggle switch on workflow list
- Inactive workflows won't execute
- Useful for testing or temporary disabling

#### Delete Workflow
- Can only delete inactive workflows
- Permanently removes workflow and execution history
- Cannot be undone

#### View Execution History
- See all times the workflow ran
- Check success/failure status
- Review execution details and errors

---

## Available Triggers

### LEAD_CREATED
Fires when a new lead is created in the system.

**Available Data:**
- `{{lead.id}}` - Lead ID
- `{{lead.name}}` - Lead name
- `{{lead.email}}` - Lead email
- `{{lead.phone}}` - Lead phone
- `{{lead.status}}` - Lead status
- `{{lead.source}}` - Lead source

**Example Conditions:**
```json
{
  "source": "Website"
}
```
*Only triggers for leads from website*

---

### LEAD_STATUS_CHANGED
Fires when a lead's status changes.

**Available Data:**
- All lead data (same as LEAD_CREATED)
- `{{oldStatus}}` - Previous status
- `{{newStatus}}` - New status

**Example Conditions:**
```json
{
  "newStatus": "QUALIFIED"
}
```
*Only triggers when lead becomes qualified*

---

### TASK_COMPLETED
Fires when a task is marked as completed.

**Available Data:**
- `{{task.id}}` - Task ID
- `{{task.title}}` - Task title
- `{{task.leadId}}` - Associated lead ID
- `{{lead.*}}` - Full lead data if task has lead

**Example Use Case:**
Create follow-up task when first call is completed

---

### PROPERTY_VIEWED
Fires when a lead views a property listing.

**Available Data:**
- `{{lead.*}}` - Lead information
- `{{property.id}}` - Property ID
- `{{property.address}}` - Property address
- `{{property.price}}` - Property price

**Example Use Case:**
Send property details email after viewing

---

### APPOINTMENT_SCHEDULED
Fires when an appointment is scheduled with a lead.

**Available Data:**
- `{{appointment.id}}` - Appointment ID
- `{{appointment.date}}` - Appointment date
- `{{appointment.type}}` - Appointment type
- `{{lead.*}}` - Lead information

**Example Use Case:**
Send confirmation email and SMS reminder

---

### DOCUMENT_SIGNED
Fires when a document is electronically signed.

**Available Data:**
- `{{document.id}}` - Document ID
- `{{document.type}}` - Document type
- `{{lead.*}}` - Lead information

**Example Use Case:**
Update lead status and notify team

---

## Available Actions

### 1. SEND_EMAIL

Send an automated email to the lead.

**Configuration:**
```json
{
  "to": "{{lead.email}}",
  "subject": "Welcome to Our Real Estate Services",
  "body": "Hello {{lead.name}},\n\nThank you for your interest..."
}
```

**Template Variables:**
- Use `{{lead.property}}` to insert lead data
- Examples: `{{lead.name}}`, `{{lead.email}}`
- HTML supported in body

**Best Practices:**
- Personalize with lead name
- Keep subject lines clear
- Include call-to-action
- Test email templates first

---

### 2. SEND_SMS

Send an automated SMS text message.

**Configuration:**
```json
{
  "to": "{{lead.phone}}",
  "message": "Hi {{lead.name}}, thanks for reaching out! I'll call you within 24 hours."
}
```

**Limitations:**
- 160 characters recommended
- Plain text only (no HTML)
- Requires valid phone number

**Best Practices:**
- Keep messages brief
- Include your name/company
- Provide clear next steps
- Respect SMS opt-out preferences

---

### 3. CREATE_TASK

Create a task for a team member.

**Configuration:**
```json
{
  "title": "Follow up with {{lead.name}}",
  "description": "Initial contact - call to discuss property needs",
  "dueDate": "{{3_days_from_now}}",
  "priority": "HIGH",
  "assignedTo": "{{lead.assignedAgent}}"
}
```

**Date Helpers:**
- `{{today}}` - Current date
- `{{tomorrow}}` - Next day
- `{{3_days_from_now}}` - 3 days ahead
- `{{next_monday}}` - Upcoming Monday

**Priority Levels:**
- `LOW` - Can wait
- `MEDIUM` - Normal priority
- `HIGH` - Important
- `URGENT` - Immediate attention

---

### 4. UPDATE_STATUS

Change the lead's status automatically.

**Configuration:**
```json
{
  "status": "CONTACTED"
}
```

**Valid Statuses:**
- `NEW` - Just created
- `CONTACTED` - Initial contact made
- `QUALIFIED` - Meets criteria
- `PROPOSAL` - Offer presented
- `NEGOTIATION` - Discussing terms
- `WON` - Deal closed
- `LOST` - Did not convert

**Use Cases:**
- Mark as CONTACTED after welcome email
- Move to QUALIFIED after meeting criteria
- Update to LOST if no response in 30 days

---

### 5. ADD_TAG

Add a tag to the lead for categorization.

**Configuration:**
```json
{
  "tagName": "Website Lead"
}
```

**Common Tags:**
- Source tags: "Website", "Referral", "Social Media"
- Behavior tags: "Hot Lead", "Needs Follow Up"
- Property tags: "First Time Buyer", "Investor"
- Campaign tags: "Spring Sale 2024"

**Best Practices:**
- Use consistent naming
- Keep tag lists manageable
- Create tag taxonomy
- Review and clean up regularly

---

### 6. WAIT

Pause workflow execution for a specified duration.

**Configuration:**
```json
{
  "duration": 24,
  "unit": "hours"
}
```

**Units:**
- `minutes` - For short delays
- `hours` - For same-day delays
- `days` - For multi-day delays

**Use Cases:**
- Wait 1 hour before sending follow-up email
- Wait 24 hours to create reminder task
- Wait 3 days before status change

**Important:**
- Workflows continue in background
- System must be running
- Max wait time: 30 days

---

## Example Workflows

### Example 1: Welcome Series for New Leads

**Trigger:** `LEAD_CREATED`

**Actions:**
1. **Send Welcome Email**
   ```json
   {
     "type": "SEND_EMAIL",
     "config": {
       "to": "{{lead.email}}",
       "subject": "Welcome! Let's Find Your Dream Home",
       "body": "Hi {{lead.name}},\n\nThank you for contacting us..."
     }
   }
   ```

2. **Add Tag**
   ```json
   {
     "type": "ADD_TAG",
     "config": {
       "tagName": "Welcome Email Sent"
     }
   }
   ```

3. **Create Follow-up Task**
   ```json
   {
     "type": "CREATE_TASK",
     "config": {
       "title": "Call {{lead.name}} - Initial Contact",
       "dueDate": "{{tomorrow}}",
       "priority": "HIGH"
     }
   }
   ```

4. **Update Status**
   ```json
   {
     "type": "UPDATE_STATUS",
     "config": {
       "status": "CONTACTED"
     }
   }
   ```

**Result:** New leads immediately receive a welcome email, get tagged, have a follow-up task created, and status is updated.

---

### Example 2: Hot Lead Alert

**Trigger:** `LEAD_STATUS_CHANGED`

**Conditions:**
```json
{
  "newStatus": "QUALIFIED"
}
```

**Actions:**
1. **Send SMS to Agent**
   ```json
   {
     "type": "SEND_SMS",
     "config": {
       "to": "{{agent.phone}}",
       "message": "Hot Lead Alert! {{lead.name}} is now qualified. Call ASAP!"
     }
   }
   ```

2. **Add Tag**
   ```json
   {
     "type": "ADD_TAG",
     "config": {
       "tagName": "Hot Lead"
     }
   }
   ```

3. **Create Urgent Task**
   ```json
   {
     "type": "CREATE_TASK",
     "config": {
       "title": "Contact Qualified Lead: {{lead.name}}",
       "priority": "URGENT",
       "dueDate": "{{today}}"
     }
   }
   ```

**Result:** When a lead becomes qualified, agent gets SMS alert, lead is tagged, and urgent task is created.

---

### Example 3: Follow-up Sequence

**Trigger:** `TASK_COMPLETED` (when "Initial Contact" task done)

**Actions:**
1. **Wait 24 Hours**
   ```json
   {
     "type": "WAIT",
     "config": {
       "duration": 24,
       "unit": "hours"
     }
   }
   ```

2. **Send Follow-up Email**
   ```json
   {
     "type": "SEND_EMAIL",
     "config": {
       "to": "{{lead.email}}",
       "subject": "Following Up On Your Property Search",
       "body": "Hi {{lead.name}},\n\nIt was great speaking with you yesterday..."
     }
   }
   ```

3. **Wait 3 Days**
   ```json
   {
     "type": "WAIT",
     "config": {
       "duration": 3,
       "unit": "days"
     }
   }
   ```

4. **Create Second Follow-up Task**
   ```json
   {
     "type": "CREATE_TASK",
     "config": {
       "title": "Second Follow-up with {{lead.name}}",
       "dueDate": "{{today}}",
       "priority": "MEDIUM"
     }
   }
   ```

**Result:** Automated follow-up sequence that sends email 24 hours after initial contact, then creates a task 3 days later.

---

### Example 4: Appointment Reminder

**Trigger:** `APPOINTMENT_SCHEDULED`

**Actions:**
1. **Send Confirmation Email**
   ```json
   {
     "type": "SEND_EMAIL",
     "config": {
       "to": "{{lead.email}}",
       "subject": "Appointment Confirmed - {{appointment.date}}",
       "body": "Your appointment is confirmed for {{appointment.date}}..."
     }
   }
   ```

2. **Wait Until 24 Hours Before**
   ```json
   {
     "type": "WAIT",
     "config": {
       "duration": "{{until_24h_before_appointment}}"
     }
   }
   ```

3. **Send SMS Reminder**
   ```json
   {
     "type": "SEND_SMS",
     "config": {
       "to": "{{lead.phone}}",
       "message": "Reminder: You have an appointment tomorrow at {{appointment.time}}"
     }
   }
   ```

**Result:** Confirmation sent immediately, then SMS reminder 24 hours before appointment.

---

### Example 5: Re-engagement Campaign

**Trigger:** `LEAD_STATUS_CHANGED`

**Conditions:**
```json
{
  "newStatus": "LOST",
  "reason": "No Response"
}
```

**Actions:**
1. **Wait 30 Days**
   ```json
   {
     "type": "WAIT",
     "config": {
       "duration": 30,
       "unit": "days"
     }
   }
   ```

2. **Send Re-engagement Email**
   ```json
   {
     "type": "SEND_EMAIL",
     "config": {
       "to": "{{lead.email}}",
       "subject": "Still Looking for the Perfect Property?",
       "body": "Hi {{lead.name}},\n\nWe have new listings that might interest you..."
     }
   }
   ```

3. **Update Status**
   ```json
   {
     "type": "UPDATE_STATUS",
     "config": {
       "status": "NEW"
     }
   }
   ```

4. **Add Tag**
   ```json
   {
     "type": "ADD_TAG",
     "config": {
       "tagName": "Re-engagement Campaign"
     }
   }
   ```

**Result:** Leads marked as lost get another chance 30 days later with fresh email and status reset.

---

## Troubleshooting

### Workflow Not Executing

**Problem:** Workflow created but not running when trigger occurs.

**Solutions:**
1. ✅ Check if workflow is **Active** (toggle on)
2. ✅ Verify trigger conditions are met
3. ✅ Check execution history for errors
4. ✅ Ensure lead data matches conditions
5. ✅ Test workflow with "Test Workflow" button

---

### Email Not Sending

**Problem:** Email action configured but lead not receiving emails.

**Solutions:**
1. ✅ Verify lead has valid email address
2. ✅ Check email template for syntax errors
3. ✅ Review email service configuration
4. ✅ Check spam folder
5. ✅ Look at execution logs for error details

**Common Template Errors:**
- Incorrect variable syntax: Use `{{lead.name}}` not `{lead.name}`
- Missing required fields: Check execution log
- Invalid email format: Validate email addresses

---

### SMS Not Sending

**Problem:** SMS action not delivering messages.

**Solutions:**
1. ✅ Verify lead has valid phone number
2. ✅ Check phone number format (include country code)
3. ✅ Ensure SMS service is configured
4. ✅ Review SMS character limits
5. ✅ Check for opt-out status

**Phone Format:**
- ✅ Good: +1234567890
- ❌ Bad: (123) 456-7890

---

### Tasks Not Creating

**Problem:** CREATE_TASK action not generating tasks.

**Solutions:**
1. ✅ Verify assignedTo user exists
2. ✅ Check date format in dueDate
3. ✅ Ensure priority is valid value
4. ✅ Review task description for special characters
5. ✅ Check user permissions

---

### Status Not Updating

**Problem:** UPDATE_STATUS action failing.

**Solutions:**
1. ✅ Verify status value matches enum
2. ✅ Check lead still exists
3. ✅ Ensure no other workflows conflicting
4. ✅ Review permission levels

**Valid Status Values:**
- NEW, CONTACTED, QUALIFIED, PROPOSAL
- NEGOTIATION, WON, LOST

---

### Workflow Timing Issues

**Problem:** WAIT action not working as expected.

**Solutions:**
1. ✅ Ensure backend service is running continuously
2. ✅ Check system time settings
3. ✅ Verify wait duration is within limits (max 30 days)
4. ✅ Review execution logs for wait start/end times

**Note:** Workflows with WAIT actions require the system to be running. If server restarts, pending waits may be affected.

---

### Multiple Workflows Triggering

**Problem:** Several workflows firing for same event.

**Solutions:**
1. ✅ This is expected behavior - multiple workflows can trigger
2. ✅ Use specific conditions to narrow trigger scope
3. ✅ Review all active workflows for same trigger
4. ✅ Consider consolidating workflows
5. ✅ Add unique tags to track workflow source

---

### Execution History Not Showing

**Problem:** Can't see workflow execution records.

**Solutions:**
1. ✅ Check date range filter
2. ✅ Verify workflow has actually executed
3. ✅ Look at workflow stats for execution count
4. ✅ Check database connection
5. ✅ Review browser console for errors

---

### Variable Not Substituting

**Problem:** Template variables showing as `{{lead.name}}` instead of actual value.

**Solutions:**
1. ✅ Check variable syntax: `{{lead.property}}`
2. ✅ Ensure property exists on lead object
3. ✅ Review available variables for trigger type
4. ✅ Check for typos in variable names
5. ✅ Test with simple variables first

**Available Objects:**
- `{{lead.*}}` - Lead properties
- `{{task.*}}` - Task properties (TASK_COMPLETED trigger)
- `{{property.*}}` - Property data (PROPERTY_VIEWED trigger)
- `{{appointment.*}}` - Appointment info

---

## API Reference

### Authentication

All workflow API endpoints require authentication. Include JWT token in header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### Get All Workflows

**Endpoint:** `GET /api/workflows`

**Query Parameters:**
- `isActive` (boolean) - Filter by active status
- `triggerType` (string) - Filter by trigger type
- `search` (string) - Search in name and description

**Example:**
```bash
curl -X GET "http://localhost:8000/api/workflows?isActive=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "workflows": [
    {
      "id": "workflow123",
      "name": "Welcome Series",
      "description": "Automated welcome for new leads",
      "isActive": true,
      "triggerType": "LEAD_CREATED",
      "triggerData": {},
      "actions": [...],
      "executions": 45,
      "successRate": 98.5,
      "lastRunAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### Get Single Workflow

**Endpoint:** `GET /api/workflows/:id`

**Example:**
```bash
curl -X GET "http://localhost:8000/api/workflows/workflow123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "id": "workflow123",
  "name": "Welcome Series",
  "description": "Automated welcome for new leads",
  "isActive": true,
  "triggerType": "LEAD_CREATED",
  "triggerData": {},
  "actions": [
    {
      "type": "SEND_EMAIL",
      "config": {
        "to": "{{lead.email}}",
        "subject": "Welcome!",
        "body": "Hello {{lead.name}}..."
      }
    }
  ],
  "executions": 45,
  "successRate": 98.5,
  "lastRunAt": "2024-01-15T10:30:00Z",
  "executionLogs": [...]
}
```

---

### Create Workflow

**Endpoint:** `POST /api/workflows`

**Body:**
```json
{
  "name": "Welcome New Leads",
  "description": "Send welcome email and create task",
  "triggerType": "LEAD_CREATED",
  "triggerData": {
    "source": "Website"
  },
  "actions": [
    {
      "type": "SEND_EMAIL",
      "config": {
        "to": "{{lead.email}}",
        "subject": "Welcome!",
        "body": "Hello {{lead.name}}..."
      }
    },
    {
      "type": "CREATE_TASK",
      "config": {
        "title": "Follow up with {{lead.name}}",
        "dueDate": "{{tomorrow}}",
        "priority": "HIGH"
      }
    }
  ]
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/workflows" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @workflow.json
```

**Response:** Same as Get Single Workflow

---

### Update Workflow

**Endpoint:** `PUT /api/workflows/:id`

**Body:** Same as Create (all fields optional)

**Example:**
```bash
curl -X PUT "http://localhost:8000/api/workflows/workflow123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Workflow Name"}'
```

---

### Toggle Workflow Status

**Endpoint:** `PATCH /api/workflows/:id/toggle`

**Body:**
```json
{
  "isActive": true
}
```

**Example:**
```bash
curl -X PATCH "http://localhost:8000/api/workflows/workflow123/toggle" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

---

### Delete Workflow

**Endpoint:** `DELETE /api/workflows/:id`

**Note:** Workflow must be inactive to delete.

**Example:**
```bash
curl -X DELETE "http://localhost:8000/api/workflows/workflow123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "message": "Workflow deleted successfully"
}
```

---

### Get Workflow Executions

**Endpoint:** `GET /api/workflows/:id/executions`

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `status` (string) - Filter by SUCCESS or FAILED

**Example:**
```bash
curl -X GET "http://localhost:8000/api/workflows/workflow123/executions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "executions": [
    {
      "id": "exec123",
      "workflowId": "workflow123",
      "status": "SUCCESS",
      "startedAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:30:05Z",
      "triggerData": {
        "leadId": "lead123"
      },
      "error": null,
      "actionsExecuted": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

### Get Workflow Stats

**Endpoint:** `GET /api/workflows/stats`

**Example:**
```bash
curl -X GET "http://localhost:8000/api/workflows/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "totalWorkflows": 5,
  "activeWorkflows": 3,
  "inactiveWorkflows": 2,
  "totalExecutions": 250,
  "successfulExecutions": 245,
  "failedExecutions": 5,
  "averageSuccessRate": 98.0
}
```

---

### Test Workflow

**Endpoint:** `POST /api/workflows/:id/test`

**Body:**
```json
{
  "testData": {
    "lead": {
      "id": "test123",
      "name": "Test Lead",
      "email": "test@example.com",
      "phone": "+1234567890",
      "status": "NEW"
    }
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/workflows/workflow123/test" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @testdata.json
```

**Response:**
```json
{
  "success": true,
  "executionId": "test-exec-123",
  "actionsExecuted": 2,
  "results": [
    {
      "action": "SEND_EMAIL",
      "success": true,
      "message": "Email sent successfully"
    },
    {
      "action": "CREATE_TASK",
      "success": true,
      "taskId": "task123"
    }
  ]
}
```

---

## Best Practices

### 1. Start Small
- Begin with simple 1-2 action workflows
- Test thoroughly before adding complexity
- Monitor execution logs

### 2. Use Descriptive Names
- ✅ Good: "Welcome Series - Website Leads"
- ❌ Bad: "Workflow 1"

### 3. Test Before Activating
- Use "Test Workflow" feature
- Verify all template variables
- Check email/SMS content
- Review task assignments

### 4. Monitor Performance
- Check execution success rates
- Review failed executions
- Optimize slow-running workflows
- Remove unused workflows

### 5. Document Workflows
- Add clear descriptions
- Note business rules
- Document template variables
- Track changes

### 6. Use Tags Strategically
- Create consistent naming conventions
- Avoid too many tags
- Review and clean up periodically
- Use tags for reporting

### 7. Handle Errors Gracefully
- Test edge cases (missing data)
- Validate email/phone formats
- Check for null values
- Plan for failures

### 8. Respect User Preferences
- Honor opt-out requests
- Follow email best practices
- Respect quiet hours for SMS
- Provide unsubscribe options

---

## Support

For additional help:
- Check execution logs for detailed errors
- Review this documentation
- Contact support team
- Check system status page

---

**Last Updated:** Day 10 - Phase 2 Week 5  
**Version:** 1.0  
**Status:** Production Ready ✅
