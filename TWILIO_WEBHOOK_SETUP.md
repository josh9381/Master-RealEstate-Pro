# Twilio SMS Webhook Setup Guide

## ✅ What's Been Done

Your CRM now has **webhook endpoints** to receive incoming SMS messages from Twilio!

- ✅ Webhook route created: `/api/webhooks/twilio/sms`
- ✅ Status callback route: `/api/webhooks/twilio/status`
- ✅ Backend restarted with webhook support
- ✅ Inbound messages will be saved to database automatically

## 📋 How to Configure Twilio

### Step 1: Get Your Webhook URL

Your webhook URL is:
```
https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/webhooks/twilio/sms
```

**Important:** Make sure port 8000 is set to **PUBLIC** in VS Code Ports tab!

### Step 2: Configure Twilio Phone Number

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click on your phone number: **+16479311890**
3. Scroll down to **Messaging Configuration**
4. Under "A MESSAGE COMES IN":
   - Set "Webhook" (not "TwiML Bins")
   - Enter URL: `https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/webhooks/twilio/sms`
   - Method: **POST**
5. Under "PRIMARY HANDLER FAILS":
   - (Optional) Same URL as backup
6. Click **Save** at the bottom

### Step 3: Configure Status Callbacks (Optional)

To track delivery status (delivered, failed, etc.):

1. Same Twilio phone number page
2. Scroll to **Messaging Configuration**
3. Under "STATUS CALLBACK URL":
   - Enter: `https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/webhooks/twilio/status`
   - Method: **POST**
4. Click **Save**

### Step 4: Test It!

1. **Send an SMS TO your Twilio number** from any phone
2. Text: "Hello CRM!"
3. Check your Communication Hub - the message should appear as INBOUND
4. Check backend logs:
   ```bash
   tail -f /tmp/backend.log | grep WEBHOOK
   ```

## 🎯 What Happens When Someone Texts You

1. Person sends SMS to **+16479311890**
2. Twilio receives it and calls your webhook
3. Your CRM:
   - ✅ Saves the message to database
   - ✅ Marks it as INBOUND
   - ✅ Links it to a Lead (if phone number matches)
   - ✅ Shows it in Communication Hub
   - ✅ Creates a thread for the conversation

## 📱 Testing Inbound SMS

From any phone, text your Twilio number:
```
Text "ur a waste yute" to +16479311890
```

Then check:
1. **Communication Hub** → Inbox → Look for the message
2. **Backend logs**: `tail -f /tmp/backend.log`
3. **Database**: Check Messages table for direction='INBOUND'

## 🔧 Troubleshooting

### Webhook not receiving messages?

1. **Check port visibility**:
   - VS Code → Ports tab
   - Port 8000 must be **PUBLIC** (not Private)

2. **Test webhook directly**:
   ```bash
   curl -X POST https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev/api/webhooks/twilio/sms \
     -d "MessageSid=TEST123" \
     -d "From=+16475712925" \
     -d "To=+16479311890" \
     -d "Body=Test message"
   ```

3. **Check Twilio debugger**:
   - https://console.twilio.com/us1/monitor/logs/debugger
   - Look for webhook errors

4. **Check backend logs**:
   ```bash
   tail -20 /tmp/backend.log | grep -E "WEBHOOK|SMS"
   ```

### Messages not showing in UI?

1. Make sure you're logged in as `admin@realestate.com` (password: `admin123`)
2. Refresh the Communication Hub page
3. Check "All Messages" filter (not just "Email" or "SMS")

## 🌐 Production Deployment

When you deploy to production:

1. Update Twilio webhook URL to your production domain:
   ```
   https://yourdomain.com/api/webhooks/twilio/sms
   ```

2. Make sure your production server:
   - ✅ Has SSL/HTTPS (Twilio requires it)
   - ✅ Backend is publicly accessible
   - ✅ No firewall blocking Twilio IPs

3. Add webhook signature verification (for security):
   - Use `twilio.validateRequest()` in production
   - Verify requests actually come from Twilio

## 📊 Next Steps

- [ ] Test receiving an SMS
- [ ] Reply to an inbound SMS from Communication Hub
- [ ] Set up auto-reply workflows
- [ ] Configure email webhooks (SendGrid)
- [ ] Add SMS keyword triggers (e.g., "STOP", "HELP")

## 🎉 You're All Set!

Your CRM can now:
- ✅ **Send** SMS via Twilio (working!)
- ✅ **Receive** SMS via webhooks (configured!)
- ✅ **Track** delivery status
- ✅ **Link** messages to leads
- ✅ **Create** conversation threads

Go ahead and **text your Twilio number** to test it out! 📱
