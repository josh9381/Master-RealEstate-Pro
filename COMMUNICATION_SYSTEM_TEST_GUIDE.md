# 🧪 Communication System Test Guide

## ✅ Complete Integration Test Checklist

### Pre-Test Setup
1. ✅ Backend running on port 8000
2. ✅ Frontend running on port 3000
3. ✅ Logged in as admin user
4. ✅ Database clean state (or existing data)

---

## 🎯 Test Flow: Campaign → Messages → Inbox

### Part 1: Create Test Leads (2 minutes)

1. Navigate to **Leads** page
2. Create **3-5 test leads** with:
   - ✅ Name
   - ✅ Valid email (test@example.com, etc.)
   - ✅ Phone number
   - ✅ Status: NEW or QUALIFIED

**Expected:** Leads appear in list

---

### Part 2: Create & Send Email Campaign (3 minutes)

1. Navigate to **Campaigns** page
2. Click **"Create Campaign"**
3. Fill out campaign:
   - **Name:** Test Email Campaign
   - **Type:** EMAIL
   - **Status:** DRAFT
   - **Subject:** `Hello {{lead.firstName}}!`
   - **Body:** 
     ```
     Hi {{lead.name}},
     
     This is a test email from our CRM system.
     
     Best regards,
     {{user.firstName}}
     ```

4. **Save** campaign
5. Open campaign detail page
6. Click **"Send Campaign"** button

**Expected Results:**
- ✅ Button shows "Sending..." during execution
- ✅ Success toast: "Campaign sent successfully to X leads"
- ✅ Campaign metrics update (sent count)
- ✅ Campaign status changes to ACTIVE

---

### Part 3: Verify Messages in Inbox (2 minutes)

1. Navigate to **Communication** / **Inbox**
2. Look for new message threads

**Expected Results:**
- ✅ One thread per lead (3-5 threads)
- ✅ Contact name shows lead name
- ✅ Subject shows rendered template
- ✅ Preview shows message body
- ✅ Type shows "email" icon
- ✅ Timestamp shows "Just now" or recent

3. Click on a thread
4. View full message

**Expected:**
- ✅ Subject rendered with lead's name
- ✅ Body rendered with lead data
- ✅ Proper formatting

---

### Part 4: Send Individual Email (2 minutes)

1. In **Communication** tab
2. Click **"Compose"** or find existing thread
3. Send email to a lead:
   - **To:** lead@example.com
   - **Subject:** Follow-up Test
   - **Body:** Testing individual send

4. Click **Send**

**Expected:**
- ✅ "Sending..." indicator
- ✅ Success toast
- ✅ Message appears in thread immediately
- ✅ Can be found in inbox

---

### Part 5: Create & Send SMS Campaign (3 minutes)

1. Navigate to **Campaigns**
2. Create new campaign:
   - **Type:** SMS
   - **Body:** 
     ```
     Hi {{lead.firstName}}, quick update from our team! - {{user.firstName}}
     ```

3. Save and Send

**Expected:**
- ✅ SMS messages created
- ✅ Appear in inbox with SMS icon
- ✅ Body truncated in preview (160 chars)

---

### Part 6: Reply to Message (2 minutes)

1. Open any thread in **Communication**
2. Type a reply in the compose box
3. Click **Send**

**Expected:**
- ✅ Reply added to thread
- ✅ Shows in conversation view
- ✅ Thread updated timestamp

---

## 🔍 What to Check

### Campaign Metrics
- [ ] `sent` count increases
- [ ] Campaign status changes to ACTIVE
- [ ] Start date is set

### Messages Database
- [ ] Message records created
- [ ] `leadId` is set correctly
- [ ] `campaignId` is set
- [ ] `type` is EMAIL or SMS
- [ ] `direction` is OUTBOUND
- [ ] `status` is DELIVERED (mock mode)

### Inbox Display
- [ ] Messages grouped by thread
- [ ] Contact names display
- [ ] Last message preview
- [ ] Timestamps formatted nicely
- [ ] Channel icons correct
- [ ] Unread counts (if applicable)

### Template Rendering
- [ ] `{{lead.name}}` replaced with actual name
- [ ] `{{lead.firstName}}` works
- [ ] `{{user.firstName}}` replaced
- [ ] `{{currentDate}}` shows date

---

## 🐛 Common Issues & Solutions

### Issue: Campaign sends but no messages in inbox
**Solution:**
- Check backend console for errors
- Verify leads have emails
- Check `leadId` in message records
- Refresh inbox manually

### Issue: Template variables not replaced
**Solution:**
- Check Handlebars syntax: `{{variable}}` not `{variable}`
- Verify variable names match exactly
- Check backend logs for template errors

### Issue: "Failed to send campaign"
**Solution:**
- Check backend is running
- Verify campaign has valid template
- Check leads exist
- Look at backend error logs

### Issue: Messages don't group into threads
**Solution:**
- Check `threadId` or `leadId` consistency
- Verify backend grouping logic
- Refresh page

---

## 📊 Success Criteria

### ✅ All Tests Pass When:

1. **Campaigns Send Successfully**
   - Button feedback works
   - Toast notifications appear
   - Metrics update correctly

2. **Messages Appear in Inbox**
   - All sent messages visible
   - Properly threaded
   - Correct metadata

3. **Individual Sending Works**
   - Email sending functional
   - SMS sending functional
   - Replies work

4. **No Console Errors**
   - Frontend clean
   - Backend clean
   - Database operations succeed

5. **User Experience is Smooth**
   - Loading states show
   - Success feedback clear
   - No UI glitches

---

## 🎉 When Complete

You have a **FULLY FUNCTIONAL** communication system:
- ✅ Bulk campaign sending
- ✅ Individual message sending
- ✅ Unified inbox
- ✅ Threaded conversations
- ✅ Template rendering
- ✅ Mock mode (no API keys needed)
- ✅ Ready for production APIs

---

## 🚀 Next Steps (Optional)

After all tests pass:
1. Add SendGrid API key for real emails
2. Add Twilio credentials for real SMS
3. Test with real external recipients
4. Set up webhook endpoints for tracking
5. Deploy to production!

---

## 📝 Test Log Template

```
Date: _____________
Tester: ___________

[ ] Part 1: Leads Created
[ ] Part 2: Email Campaign Sent  
[ ] Part 3: Messages in Inbox
[ ] Part 4: Individual Email Sent
[ ] Part 5: SMS Campaign Sent
[ ] Part 6: Reply Functionality

Issues Found:
_______________________________
_______________________________
_______________________________

Overall Result: PASS / FAIL
```

---

**🎯 Goal: All checkboxes ✅ = Communication System Complete!**
