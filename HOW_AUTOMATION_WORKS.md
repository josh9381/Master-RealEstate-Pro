# 🤖 HOW AUTOMATION WORKS - DEPLOYMENT & SERVER ARCHITECTURE

**Last Updated:** October 29, 2025  
**Purpose:** Explain how your CRM works automatically for users and what needs to be deployed

---

## 🎯 THE SHORT ANSWER

**YES, you need to deploy your code to a server** for it to work automatically for users.

Here's what happens when deployed:

1. **Frontend (React)** → Hosted on a web server (Vercel/Netlify/Cloudflare)
2. **Backend (Node.js API)** → Hosted on a server (Heroku/Railway/AWS/DigitalOcean)
3. **Database (PostgreSQL)** → Hosted database (Neon/Supabase/AWS RDS)
4. **Background Jobs** → Same server or separate worker (optional Redis/Bull)

**Users access your CRM through a URL** (e.g., `https://mycrm.com`) and everything happens automatically on the server.

---

## 🏗️ ARCHITECTURE - HOW IT ALL WORKS

### **Current Setup (Local Development):**
```
Your Computer
├── Frontend (React) → http://localhost:5173
├── Backend (Node.js) → http://localhost:3000
└── Database (SQLite) → Local file
```

**Problem:** Only you can access it. Stops when you close your laptop.

---

### **Production Setup (What Users Need):**
```
Cloud Server (Always Running 24/7)
├── Frontend (React Build) → https://mycrm.com
├── Backend (Node.js API) → https://api.mycrm.com
└── Database (PostgreSQL) → Cloud database
```

**Solution:** Anyone can access it from anywhere. Runs 24/7 automatically.

---

## 🔄 AUTOMATIC FEATURES - WHAT RUNS IN BACKGROUND

### **1. AUTOMATION WORKFLOWS** ✅ Already Built

**How it works:**
```typescript
// When a lead is created:
User creates lead → 
  API saves to database → 
    Triggers automation.service.processTrigger() →
      Finds all active workflows with trigger "LEAD_CREATED" →
        Executes actions (send email, create task, etc.)
```

**Example workflow:**
```
Trigger: Lead Created
Condition: Lead score > 70
Actions:
  1. Send welcome email (executes immediately)
  2. Create follow-up task for tomorrow
  3. Add tag "Hot Lead"
  4. Assign to sales rep
```

**Where it runs:** On your backend server, in real-time, when events happen.

**No scheduling needed** - Runs instantly when triggered!

---

### **2. SCHEDULED CAMPAIGNS** ⚠️ Needs Cron Jobs

**How it currently works:**
- User creates campaign, sets schedule: "Send Jan 30, 10:00 AM"
- Campaign stored in database with `status: 'SCHEDULED'`, `scheduledAt: '2025-01-30T10:00:00Z'`
- **PROBLEM:** Nothing automatically checks if it's time to send!

**What's missing:**
A background job that runs every minute checking:
```typescript
// Pseudo-code for what we need:
setInterval(async () => {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now } // Time has passed
    }
  });
  
  for (const campaign of campaigns) {
    await sendCampaign(campaign.id); // Actually send it
  }
}, 60000); // Check every 60 seconds
```

**Solutions:**

#### **Option A: Simple Cron Job** (Easiest)
Add to `backend/src/server.ts`:
```typescript
import cron from 'node-cron';

// Run every minute
cron.schedule('* * * * *', async () => {
  console.log('Checking for scheduled campaigns...');
  await checkAndSendScheduledCampaigns();
});
```

**Pros:**
- Simple, no extra infrastructure
- Built into your Node.js app
- Free

**Cons:**
- If server restarts, jobs might be missed
- Not great for heavy workloads
- Server must always be running

---

#### **Option B: Redis + Bull Queue** (Better for scale)
```typescript
import Queue from 'bull';

const campaignQueue = new Queue('campaigns', {
  redis: { host: 'localhost', port: 6379 }
});

// When creating campaign:
await campaignQueue.add('send-campaign', 
  { campaignId: 'abc123' },
  { delay: scheduledTime - now } // Delay until scheduled time
);

// Worker processes jobs:
campaignQueue.process('send-campaign', async (job) => {
  await sendCampaign(job.data.campaignId);
});
```

**Pros:**
- Reliable - jobs persist across restarts
- Scalable - can run multiple workers
- Built-in retry logic
- Job status tracking

**Cons:**
- Requires Redis server
- More complex setup
- Extra $5-15/month for Redis hosting

---

#### **Option C: External Cron Service** (Simplest for MVP)
Use a service like **Cron-job.org** or **EasyCron** to ping your API:

```
External Service (Cron-job.org)
  ↓ Makes HTTP request every minute
  https://api.mycrm.com/api/cron/send-scheduled-campaigns
  ↓ Your API endpoint
  Checks database, sends campaigns
```

Create endpoint:
```typescript
// backend/src/routes/cron.routes.ts
router.post('/cron/send-scheduled-campaigns', async (req, res) => {
  const apiKey = req.headers['x-cron-api-key'];
  
  // Security: Verify it's from your cron service
  if (apiKey !== process.env.CRON_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const sent = await checkAndSendScheduledCampaigns();
  res.json({ success: true, sent });
});
```

**Pros:**
- No extra code needed
- No Redis required
- Reliable third-party service
- Free tier available

**Cons:**
- Depends on external service
- Less control over timing
- Small security risk (mitigated with API key)

---

### **3. APPOINTMENT REMINDERS** ⚠️ Needs Cron Jobs

**Current code:**
```typescript
// backend/src/services/reminder.service.ts
export async function sendUpcomingReminders(): Promise<number> {
  // Finds appointments in next 24 hours
  // Sends email/SMS reminders
  // Returns count of reminders sent
}
```

**What's missing:** Automatic daily execution

**Solution (add to cron jobs):**
```typescript
// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Sending appointment reminders...');
  const sent = await sendUpcomingReminders();
  console.log(`Sent ${sent} reminders`);
});
```

---

### **4. EMAIL TRACKING (Opens/Clicks)** ✅ Already Works!

**How it works:**
```
SendGrid sends email →
  Recipient opens email →
    SendGrid tracks open →
      SendGrid sends webhook to your API →
        Your API: POST /api/webhooks/sendgrid →
          Updates database (campaign.opens++)
```

**Your code (already built):**
```typescript
// backend/src/services/email.service.ts
export async function handleWebhookEvent(event: Record<string, unknown>) {
  const eventType = event.event as string;
  const sg_message_id = event.sg_message_id as string;
  
  // Find message in database
  const message = await prisma.message.findFirst({
    where: { externalId: sg_message_id }
  });
  
  // Update based on event
  switch (eventType) {
    case 'open':
      await prisma.message.update({
        where: { id: message.id },
        data: { opened: true, openedAt: new Date() }
      });
      // Trigger automation (email opened workflow)
      break;
    
    case 'click':
      // Update clicks...
      break;
  }
}
```

**Setup required:**
1. Deploy your backend to a server with public URL
2. Go to SendGrid dashboard → Settings → Mail Settings → Event Webhook
3. Enter your webhook URL: `https://api.mycrm.com/api/webhooks/sendgrid`
4. Select events: Opened, Clicked, Bounced, Unsubscribed
5. Save

**Now it works automatically!** Every email open updates your database in real-time.

---

### **5. SMS DELIVERY TRACKING** ✅ Already Works!

**Same concept as email:**
```
Twilio sends SMS →
  SMS delivered →
    Twilio sends webhook to your API →
      POST /api/webhooks/twilio →
        Updates database (message.status = 'DELIVERED')
```

**Setup:**
1. Deploy backend
2. Twilio dashboard → Phone Numbers → Configure
3. Messaging webhook: `https://api.mycrm.com/api/webhooks/twilio`
4. Save

---

## 🚀 DEPLOYMENT OPTIONS - WHERE TO HOST

### **OPTION 1: All-in-One Platform** (Easiest - Recommended for MVP)

#### **Railway.app** (My #1 Recommendation)
```
What you get:
- Frontend hosting
- Backend hosting
- PostgreSQL database
- Automatic deployments from GitHub
- Free SSL certificates
- $5 credit free, then ~$5-20/month
```

**Setup (literally 5 minutes):**
1. Push your code to GitHub
2. Go to railway.app
3. Click "New Project" → "Deploy from GitHub"
4. Select your repo
5. Railway auto-detects:
   - Frontend (Vite React app)
   - Backend (Node.js Express)
   - Database (Creates PostgreSQL)
6. Add environment variables (SendGrid key, Twilio, etc.)
7. Click Deploy
8. **Done!** Your app is live at `your-app.railway.app`

**Pros:**
- Stupidly easy
- One platform for everything
- Auto-deploys on git push
- Built-in monitoring
- Great for startups

**Cons:**
- Gets expensive at scale ($100+/mo with traffic)
- Less control than AWS

---

#### **Render.com** (Similar to Railway)
```
Pricing:
- Static sites (frontend): FREE
- Web services (backend): $7/month
- PostgreSQL: $7/month
Total: ~$14/month
```

**Setup:**
Same as Railway - connect GitHub, deploy, done.

---

#### **Vercel + Railway** (Best Performance)
```
Vercel (Frontend only): FREE
Railway (Backend + DB): $5-10/month
Total: $5-10/month
```

**Why this combo:**
- Vercel is INSANELY fast for React apps (built by Next.js team)
- Railway handles backend well
- Best of both worlds

**Setup:**
1. Push frontend to Vercel (1-click deploy from GitHub)
2. Push backend to Railway
3. Update frontend API URL to point to Railway backend

---

### **OPTION 2: Traditional VPS** (More Control)

#### **DigitalOcean Droplet**
```
$6/month Droplet:
- 1 GB RAM
- 25 GB SSD
- Enough for 100-500 users

$12/month Droplet:
- 2 GB RAM
- 50 GB SSD
- Enough for 500-2,000 users
```

**What you manage:**
- Install Node.js
- Install PostgreSQL
- Setup Nginx (web server)
- SSL certificates (Let's Encrypt)
- Firewall
- Server updates

**Pros:**
- Full control
- Cheaper at scale
- Can run anything

**Cons:**
- More work to set up
- You handle security
- Server maintenance

---

#### **AWS Lightsail** (DigitalOcean competitor)
```
$5/month instance
- Similar to DigitalOcean
- Slightly harder to use
- Better integration with other AWS services
```

---

### **OPTION 3: Serverless** (Pay per use)

#### **Vercel (Frontend) + AWS Lambda (Backend)**
```
Vercel Frontend: FREE (hobby tier)
AWS Lambda: $0.20 per 1M requests
AWS RDS (Database): ~$15/month minimum

Best for:
- Unpredictable traffic
- Low usage apps
- Pay only for what you use
```

**Pros:**
- Infinitely scalable
- No server management
- Can be very cheap

**Cons:**
- Cold starts (slower first request)
- Complex setup
- Database not serverless (costs money even idle)
- **NOT RECOMMENDED** for cron jobs (Lambda times out after 15 min)

---

## 💾 DATABASE OPTIONS

### **Option 1: Neon.tech** (Serverless PostgreSQL)
```
Free tier:
- 0.5 GB storage
- 1 branch
- Auto-hibernates when idle

Paid:
- $19/month → 10 GB
- Scales automatically
```

**Perfect for:** Startups, low traffic apps

---

### **Option 2: Supabase** (PostgreSQL + Backend as a Service)
```
Free tier:
- 500 MB database
- 2 GB storage
- 50,000 monthly active users

Paid:
- $25/month → Unlimited
```

**Bonus:** Comes with authentication, storage, real-time subscriptions

---

### **Option 3: Railway PostgreSQL**
```
$5/month minimum
- 1 GB storage included
- $0.25/GB beyond that
```

**Perfect for:** If you're already using Railway for hosting

---

### **Option 4: AWS RDS**
```
$15-30/month minimum
- Production-grade
- Automatic backups
- Multi-region failover
```

**Perfect for:** Enterprise apps, high availability needs

---

## ⚙️ CRON JOBS SETUP - MAKING THINGS AUTOMATIC

### **What needs cron jobs?**

1. ✅ **Send scheduled campaigns** - Check every minute
2. ✅ **Send appointment reminders** - Check daily at 9 AM
3. ✅ **Clean up old data** - Weekly (optional)
4. ✅ **Generate analytics reports** - Daily (optional)
5. ✅ **Send digest emails** - Daily/Weekly (optional)

---

### **Implementation Options:**

#### **Option A: Node-Cron (Built into your app)**

**Install:**
```bash
npm install node-cron
```

**Add to `backend/src/server.ts`:**
```typescript
import cron from 'node-cron';
import { sendUpcomingReminders } from './services/reminder.service';

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
  
  // Schedule jobs
  setupCronJobs();
});

function setupCronJobs() {
  // Send scheduled campaigns - Every minute
  cron.schedule('* * * * *', async () => {
    console.log('[CRON] Checking for scheduled campaigns...');
    await checkAndSendScheduledCampaigns();
  });
  
  // Send appointment reminders - Daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Sending appointment reminders...');
    const sent = await sendUpcomingReminders();
    console.log(`[CRON] Sent ${sent} reminders`);
  });
  
  // Clean up old sessions - Daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Cleaning up old sessions...');
    await cleanupOldSessions();
  });
  
  console.log('✅ Cron jobs scheduled');
}
```

**Cron syntax:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-6, Sunday = 0)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)

Examples:
'* * * * *'     - Every minute
'0 * * * *'     - Every hour
'0 9 * * *'     - Every day at 9 AM
'0 0 * * 0'     - Every Sunday at midnight
'*/15 * * * *'  - Every 15 minutes
'0 0 1 * *'     - First day of every month
```

---

#### **Option B: External Cron Service** (Recommended for reliability)

**Services:**
- **Cron-job.org** - Free, reliable
- **EasyCron** - Free tier, 100 jobs
- **Cronitor** - Paid, monitoring included

**How it works:**
1. Create API endpoint in your backend
2. External service pings it on schedule
3. Your endpoint does the work

**Example:**
```typescript
// backend/src/routes/cron.routes.ts
import { Router } from 'express';
import { sendUpcomingReminders } from '../services/reminder.service';

const router = Router();

// Middleware to verify cron requests
const verifyCronKey = (req, res, next) => {
  const apiKey = req.headers['x-cron-api-key'];
  if (apiKey !== process.env.CRON_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Send scheduled campaigns
router.post('/send-campaigns', verifyCronKey, async (req, res) => {
  try {
    const sent = await checkAndSendScheduledCampaigns();
    res.json({ success: true, sent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send campaigns' });
  }
});

// Send appointment reminders
router.post('/send-reminders', verifyCronKey, async (req, res) => {
  try {
    const sent = await sendUpcomingReminders();
    res.json({ success: true, sent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

export default router;
```

**Setup on Cron-job.org:**
1. Sign up (free)
2. Create new cron job
3. URL: `https://api.mycrm.com/api/cron/send-campaigns`
4. Schedule: Every 1 minute
5. Method: POST
6. Headers: `x-cron-api-key: your-secret-key-here`
7. Save

**Pros:**
- Works even if your server restarts
- No code running in background
- Monitoring included
- Free

**Cons:**
- Slight delay (1-2 seconds)
- Depends on external service

---

## 🔐 WHAT RUNS AUTOMATICALLY VS. WHAT USERS TRIGGER

### **Automatic (Background Jobs):**
✅ Send scheduled campaigns (cron job checks every minute)  
✅ Send appointment reminders (cron job daily at 9 AM)  
✅ Process email webhooks (SendGrid triggers when email opened)  
✅ Process SMS webhooks (Twilio triggers when SMS delivered)  
✅ Clean up old data (cron job weekly)

### **User-Triggered (Real-Time):**
✅ Create lead → Automation workflows execute immediately  
✅ Send email → Goes out instantly via SendGrid  
✅ Create campaign (immediate send) → Sends right away  
✅ Update lead status → Triggers workflows instantly  
✅ Add tag to lead → Triggers workflows instantly

**Key difference:**
- **User-triggered** = Happens when user clicks button (API processes immediately)
- **Automatic** = Happens on schedule without user action (cron job or webhook)

---

## 🎯 MINIMAL VIABLE DEPLOYMENT (What You NEED)

### **To launch your CRM:**

1. **Host Backend** → Railway.app ($5/month)
   - Node.js API
   - PostgreSQL database
   - Includes: Auto-deploy, SSL, monitoring

2. **Host Frontend** → Vercel (FREE)
   - React app build
   - Global CDN (fast worldwide)
   - Auto-deploy from GitHub

3. **Add Cron Jobs** → Cron-job.org (FREE)
   - Schedule campaign sending
   - Appointment reminders

4. **Configure Services:**
   - SendGrid (FREE tier → 100 emails/day)
   - Twilio ($20 credit → ~2,500 SMS)

5. **Environment Variables:**
```env
# Backend (.env on Railway)
DATABASE_URL=postgresql://...  (Railway provides this)
JWT_SECRET=your-secret-key-here
SENDGRID_API_KEY=SG.xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
FROM_EMAIL=noreply@yourcrm.com
CRON_API_KEY=random-secret-for-cron-jobs
FRONTEND_URL=https://yourcrm.vercel.app
```

**Total Cost:** $5-10/month

**Setup Time:** 2-3 hours

**Result:** Fully functional CRM accessible at `https://yourcrm.vercel.app`

---

## 🚦 DEPLOYMENT CHECKLIST

### **Pre-Deployment:**
- [ ] Environment variables configured
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Frontend API URL updated to production backend
- [ ] CORS configured for production domain
- [ ] Security headers enabled (Helmet.js ✅ already done)
- [ ] Rate limiting configured (✅ already done)

### **Backend Deployment:**
- [ ] Push code to GitHub
- [ ] Connect Railway to GitHub repo
- [ ] Set environment variables
- [ ] Deploy backend
- [ ] Test API endpoints

### **Frontend Deployment:**
- [ ] Update `.env.production` with backend API URL
- [ ] Push to GitHub
- [ ] Connect Vercel to GitHub repo
- [ ] Deploy frontend
- [ ] Test login and navigation

### **Services Setup:**
- [ ] SendGrid: Verify sender email
- [ ] SendGrid: Configure webhook URL
- [ ] Twilio: Buy phone number ($1/month)
- [ ] Twilio: Configure SMS webhook URL
- [ ] Cron-job.org: Set up scheduled jobs

### **Testing:**
- [ ] Create test lead (automation triggers?)
- [ ] Send test email (webhook tracking works?)
- [ ] Schedule test campaign (will it send at scheduled time?)
- [ ] Create appointment (reminder will send tomorrow?)

---

## 📊 MONITORING - HOW TO KNOW IT'S WORKING

### **Backend Monitoring (Built-in to Railway):**
- Request logs (see all API calls)
- Error logs (catch bugs)
- CPU/Memory usage
- Response times

### **Application Monitoring (Add Later):**
- **Sentry** - Error tracking (free tier)
- **LogTail** - Log aggregation (free tier)
- **Uptime Robot** - Uptime monitoring (free)

### **Database Monitoring:**
- Railway dashboard shows:
  - Database size
  - Active connections
  - Query performance

### **Email/SMS Monitoring:**
- SendGrid dashboard:
  - Delivery rate
  - Open rate
  - Bounce rate
  - Spam complaints
- Twilio dashboard:
  - SMS sent
  - Delivery status
  - Costs

---

## ❓ FAQ

**Q: Do users need to keep their browser open for campaigns to send?**  
**A:** NO! Once deployed to a server, everything runs on the server 24/7. Users can close their laptop and campaigns still send.

**Q: What happens if the server crashes?**  
**A:** Railway auto-restarts your app. Scheduled campaigns might be delayed a few seconds but won't be lost (stored in database). With Bull queue + Redis, jobs are guaranteed not to be lost.

**Q: Can I run this on my home computer?**  
**A:** Technically yes (use ngrok for public URL), but NOT recommended. Your computer must be on 24/7, your IP might change, and security is harder. Use a cloud server.

**Q: How do I update the app after deployment?**  
**A:** Just push to GitHub. Railway/Vercel auto-deploy new code in ~2 minutes.

**Q: What if I get 10,000 users?**  
**A:** Railway scales automatically (you just pay more). Or migrate to AWS/DigitalOcean for better pricing at scale.

**Q: Do I need a separate server for cron jobs?**  
**A:** No. Either run node-cron in your existing backend, or use external cron service (recommended).

---

## 🎯 NEXT STEPS

1. **Test Locally:**
   - Make sure everything works on `localhost`
   - Create test workflows, campaigns, appointments

2. **Deploy to Railway** (this weekend):
   - 5-minute setup
   - Get production URL

3. **Configure SendGrid:**
   - Verify domain
   - Set up webhook

4. **Configure Twilio:**
   - Buy phone number
   - Set up webhook

5. **Set up Cron Jobs:**
   - Cron-job.org account
   - Schedule campaign checker
   - Schedule reminder sender

6. **Test Everything:**
   - Create real campaign
   - Schedule for 5 minutes from now
   - Confirm it sends automatically
   - Check email tracking works

7. **Invite Beta Users:**
   - Start with 5-10 people
   - Get feedback
   - Fix bugs
   - Scale up

---

## 🎓 SUMMARY

**Your CRM is 90% ready to deploy.**

What works NOW:
- ✅ All features function when user interacts (create lead, send email, etc.)
- ✅ Automation triggers fire when events happen (lead created, etc.)
- ✅ Email/SMS webhooks ready (just need to configure URLs)

What needs 1-2 hours of setup:
- ⚠️ Deploy to Railway/Vercel (30 min)
- ⚠️ Set up cron jobs (15 min)
- ⚠️ Configure SendGrid webhook (5 min)
- ⚠️ Configure Twilio webhook (5 min)

**Then it works 100% automatically for unlimited users, 24/7, from anywhere in the world!** 🚀

