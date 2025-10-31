# 🚀 Quick Start: Phase 2 Communication Features

## Setup (5 minutes)

### 1. Configure SendGrid

```bash
# Get API key from https://sendgrid.com
# Add to backend/.env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Company
```

### 2. Configure Twilio

```bash
# Get credentials from https://twilio.com/console
# Add to backend/.env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Restart Backend

```bash
cd backend
npm run dev
```

---

## Quick Tests

### Send Email

```bash
curl -X POST http://localhost:8000/api/messages/email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "body": "<h1>Hello!</h1><p>This is a test.</p>"
  }'
```

### Send SMS

```bash
curl -X POST http://localhost:8000/api/messages/sms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "+1234567890",
    "body": "Test SMS message"
  }'
```

### Create Email Template

```bash
curl -X POST http://localhost:8000/api/templates/email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Welcome Email",
    "subject": "Welcome {{firstName}}!",
    "body": "<h1>Hi {{firstName}}!</h1><p>Welcome to {{companyName}}.</p>",
    "category": "onboarding",
    "isActive": true
  }'
```

### Create Workflow

```bash
curl -X POST http://localhost:8000/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Welcome New Lead",
    "description": "Send welcome email to new leads",
    "isActive": true,
    "triggerType": "LEAD_CREATED",
    "actions": [
      {
        "type": "send_email",
        "config": {
          "to": "{{lead.email}}",
          "subject": "Welcome!",
          "body": "<h1>Thanks for signing up!</h1>"
        }
      }
    ]
  }'
```

---

## Common Use Cases

### 1. Appointment Reminders

Create SMS template:
```json
{
  "name": "Appointment Reminder",
  "body": "Hi {{firstName}}, reminder: Your appointment is {{time}} at {{location}}",
  "category": "appointments"
}
```

Create workflow:
```json
{
  "name": "Send Appointment Reminders",
  "triggerType": "TIME_BASED",
  "actions": [{
    "type": "send_sms",
    "config": {
      "templateId": "TEMPLATE_ID",
      "to": "{{appointment.phone}}"
    }
  }]
}
```

### 2. Lead Nurturing

```json
{
  "name": "Nurture New Leads",
  "triggerType": "LEAD_CREATED",
  "actions": [
    {
      "type": "send_email",
      "config": {
        "templateId": "welcome_email",
        "to": "{{lead.email}}"
      }
    },
    {
      "type": "wait",
      "config": { "duration": 86400000 }
    },
    {
      "type": "send_email",
      "config": {
        "templateId": "follow_up_email",
        "to": "{{lead.email}}"
      }
    }
  ]
}
```

### 3. Status Change Notifications

```json
{
  "name": "Notify Team on Hot Lead",
  "triggerType": "LEAD_STATUS_CHANGED",
  "triggerData": {
    "newStatus": "QUALIFIED"
  },
  "actions": [
    {
      "type": "send_email",
      "config": {
        "to": "sales@company.com",
        "subject": "Hot Lead: {{lead.name}}",
        "body": "Lead {{lead.name}} is now qualified!"
      }
    },
    {
      "type": "create_task",
      "config": {
        "title": "Follow up with {{lead.name}}",
        "priority": "HIGH",
        "dueDate": "{{tomorrow}}"
      }
    }
  ]
}
```

---

## Testing Without API Keys

**Mock Mode** is enabled automatically if API keys are missing:

- ✅ All APIs work normally
- ✅ Messages logged to database
- ✅ Workflows execute
- ⚠️ No actual emails/SMS sent
- 📝 Check console for "MOCK MODE" logs

Perfect for development!

---

## Monitoring

### Check Message Stats

```bash
curl http://localhost:8000/api/messages/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Workflow Executions

```bash
curl http://localhost:8000/api/workflows/WORKFLOW_ID/executions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Template Usage Stats

```bash
curl http://localhost:8000/api/templates/email/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Emails not sending?
- Check `SENDGRID_API_KEY` in `.env`
- Verify sender email in SendGrid dashboard
- Check backend logs for errors

### SMS not sending?
- Check Twilio credentials in `.env`
- Verify phone number format (+1234567890)
- Check Twilio account balance

### Workflows not triggering?
- Ensure workflow `isActive: true`
- Check trigger conditions
- View execution logs at `/api/workflows/:id/executions`

---

## Next Steps

1. ✅ Set up API keys
2. ✅ Create 3-5 email templates
3. ✅ Create 2-3 SMS templates  
4. ✅ Create welcome workflow
5. ✅ Create appointment reminder workflow
6. ✅ Test with real leads

---

**Full Documentation:** See `PHASE_2_ESSENTIAL_FEATURES_COMPLETE.md`

**Status:** ✅ Production Ready
