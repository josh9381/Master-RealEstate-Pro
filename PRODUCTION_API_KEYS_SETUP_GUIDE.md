# Production API Keys Setup Guide

**Last Updated**: November 1, 2025  
**Version**: 1.0

---

## Overview

Master RealEstate Pro supports **production API keys** for SendGrid (email) and Twilio (SMS). Users can input their own API keys through the settings UI, which are stored encrypted in the database and used for all campaign sends.

### Operating Modes

1. **Production Mode** 🟢
   - User has saved their own API keys
   - Emails/SMS are sent via SendGrid/Twilio
   - All messages delivered to recipients
   - Mode indicator: Green badge "Production Mode"

2. **Environment Mode** 🔵
   - No user keys, but server has environment variables
   - Uses server's SendGrid/Twilio credentials
   - Good for testing/development
   - Mode indicator: Blue badge "Environment Mode"

3. **Mock Mode** 🟡
   - No API keys configured anywhere
   - Messages logged but not sent
   - Useful for development/testing UI
   - Mode indicator: Gray badge "Mock Mode"

---

## SendGrid Email Setup

### Prerequisites
- SendGrid account (free tier available)
- Verified sender email address
- SendGrid API key with "Mail Send" permissions

### Step-by-Step Setup

1. **Create SendGrid Account**
   - Go to https://sendgrid.com
   - Sign up for free account (100 emails/day free tier)
   - Verify your email address

2. **Create API Key**
   - Login to SendGrid dashboard
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name: `Master RealEstate Pro`
   - Permissions: Select "Mail Send" (Full Access or Restricted with Mail Send enabled)
   - Click "Create & View"
   - **IMPORTANT**: Copy the API key immediately (you won't see it again!)

3. **Verify Sender Email**
   - Go to Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Fill in your details (From Name, From Email)
   - Click verification link in email

4. **Configure in Master RealEstate Pro**
   - Navigate to Settings → Email Configuration
   - Enter your details:
     - **SendGrid API Key**: Paste the key from step 2 (starts with `SG.`)
     - **From Email**: Your verified sender email
     - **From Name**: Your name or company name
     - **SMTP Host**: `smtp.sendgrid.net` (pre-filled)
     - **SMTP Port**: `587` (pre-filled)
     - **Username**: `apikey` (pre-filled)
   - Click "Save Credentials"

5. **Test Connection**
   - Click "Send Test Email"
   - Should show "Production Mode" badge
   - Check your email inbox
   - Success message: "Test email sent successfully in PRODUCTION mode!"

### Troubleshooting

**Problem**: Still showing "Mock Mode" after saving API key
- **Solution**: Make sure API key starts with `SG.`
- **Solution**: Click "Save Credentials" before testing
- **Solution**: Refresh the page and check if config was saved

**Problem**: Test email not received
- **Solution**: Check spam folder
- **Solution**: Verify sender email is authenticated in SendGrid
- **Solution**: Check SendGrid dashboard → Activity for delivery status
- **Solution**: Ensure API key has "Mail Send" permission

**Problem**: "Invalid API key" error
- **Solution**: Double-check you copied the entire key from SendGrid
- **Solution**: Regenerate a new API key in SendGrid
- **Solution**: Ensure key hasn't expired

---

## Twilio SMS Setup

### Prerequisites
- Twilio account (free trial available with $15 credit)
- Verified phone number
- Twilio phone number purchased
- Account SID and Auth Token

### Step-by-Step Setup

1. **Create Twilio Account**
   - Go to https://www.twilio.com
   - Sign up for free account (gets $15 trial credit)
   - Verify your phone number

2. **Get Credentials**
   - Login to Twilio Console
   - Dashboard shows:
     - **Account SID** (starts with `AC`)
     - **Auth Token** (click to reveal)
   - Copy both values

3. **Purchase Phone Number** (Required for production)
   - Go to Phone Numbers → Manage → Buy a Number
   - Select country (US: +1)
   - Filter: SMS capable
   - Choose a number and purchase ($1/month)
   - Note the phone number (format: +15551234567)

   **Trial Account**: Can only send to verified numbers
   **Upgraded Account**: Can send to any number

4. **Configure in Master RealEstate Pro**
   - Navigate to Settings → Twilio Configuration
   - Enter your details:
     - **Account SID**: From Twilio Console (starts with `AC`)
     - **Auth Token**: From Twilio Console (click "Show" to reveal)
     - **Phone Number**: Your Twilio number in E.164 format (+15551234567)
   - Click "Save Credentials"

5. **Test Connection**
   - Click "Send Test SMS"
   - Should show "Production Mode" badge
   - Check your phone for test SMS
   - Success message: "Test SMS sent successfully in PRODUCTION mode!"

### Troubleshooting

**Problem**: Still showing "Mock Mode" after saving credentials
- **Solution**: Ensure Account SID starts with `AC`
- **Solution**: Click "Save Credentials" before testing
- **Solution**: Refresh page and verify config was saved

**Problem**: Test SMS not received
- **Solution**: Trial accounts can only text verified numbers
- **Solution**: Add recipient number to Verified Caller IDs in Twilio
- **Solution**: Or upgrade account to send to any number
- **Solution**: Check Twilio Console → Monitor → Logs for delivery status

**Problem**: "Unverified number" error (Trial accounts)
- **Solution**: Verify the recipient number in Twilio Console
- **Solution**: Or upgrade to paid account (no minimum spend required)

**Problem**: "Invalid credentials" error
- **Solution**: Double-check Account SID and Auth Token
- **Solution**: Ensure Auth Token hasn't been rotated
- **Solution**: Try generating a new Auth Token in Twilio

---

## Campaign Sending

Once configured, all campaigns will automatically use your API keys:

### Email Campaigns
1. Create campaign (type: EMAIL)
2. Add recipients (leads with email addresses)
3. Click "Send Campaign"
4. System uses **your SendGrid API key** automatically
5. Check SendGrid Activity feed for delivery stats

### SMS Campaigns
1. Create campaign (type: SMS)
2. Add recipients (leads with phone numbers)
3. Click "Send Campaign"
4. System uses **your Twilio credentials** automatically
5. Check Twilio Console → Monitor → Logs for delivery

### Configuration Priority

System checks in this order:
1. **Database** - Your saved API keys (highest priority)
2. **Environment Variables** - Server configuration
3. **Mock Mode** - No API keys available (development)

---

## Security Features

### Encryption
- All API keys encrypted at rest using AES-256
- Keys never logged or exposed in responses
- Masked display in UI (`••••••••` + last 4 chars)

### Per-User Isolation
- Each user has their own encrypted config
- No cross-user access
- Keys stored in user-specific database records

### Best Practices
- Never share your API keys
- Rotate keys every 90 days
- Use restricted permissions (Mail Send only for SendGrid)
- Monitor usage in SendGrid/Twilio dashboards
- Revoke keys immediately if compromised

---

## Cost Considerations

### SendGrid Pricing
- **Free Tier**: 100 emails/day free forever
- **Essentials**: $19.95/month (50,000 emails/month)
- **Pro**: $89.95/month (100,000 emails/month)
- See: https://sendgrid.com/pricing/

### Twilio Pricing
- **SMS**: $0.0079 per message (US)
- **Phone Number**: $1.00/month per number
- **Free Trial**: $15 credit (no credit card required)
- See: https://www.twilio.com/pricing

### Cost Management
- Set daily limits in Email Configuration
- Monitor usage in provider dashboards
- Start with free tiers for testing
- Scale up as needed

---

## Support Resources

### SendGrid
- Documentation: https://docs.sendgrid.com
- Support: https://support.sendgrid.com
- Status: https://status.sendgrid.com
- API Docs: https://docs.sendgrid.com/api-reference

### Twilio
- Documentation: https://www.twilio.com/docs
- Support: https://support.twilio.com
- Status: https://status.twilio.com
- Console: https://console.twilio.com

### Master RealEstate Pro
- Email: support@realestatepro.com
- Docs: /docs
- GitHub Issues: [repo]/issues

---

## Frequently Asked Questions

**Q: Can I use Gmail SMTP instead of SendGrid?**
A: Currently only SendGrid is supported for production email. Gmail SMTP has strict limits and isn't recommended for CRM use.

**Q: Do I need to upgrade from Twilio trial?**
A: For testing, trial is fine. For production, upgrade to send to unverified numbers.

**Q: What happens if I run out of SendGrid credits?**
A: Emails will fail and you'll see errors in campaign logs. Upgrade your SendGrid plan.

**Q: Can I use different API keys for different campaigns?**
A: Not currently. All campaigns use your configured API keys. You can change keys anytime in settings.

**Q: Is my API key safe?**
A: Yes. Keys are encrypted at rest with AES-256 and never exposed in logs or API responses.

**Q: Can I see mock mode messages somewhere?**
A: Yes, check the Messages tab in the app. Mock messages are logged with `provider: 'mock'`.

---

**Ready to Go Live?** 🚀

1. ✅ SendGrid API key configured and tested
2. ✅ Twilio credentials configured and tested
3. ✅ Test campaign sent successfully
4. ✅ Production mode confirmed

You're all set to start sending real campaigns to your leads!
