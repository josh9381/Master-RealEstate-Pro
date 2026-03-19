import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const orgId = 'cmmuwbfov00008ilvz7l77wkh';
const userId = 'cmmuwbfw900028ilv09rtgcms';
const tagHot = 'cmmuwbha0000x8ilvtxszzhxf';
const tagVIP = 'cmmuwbhit00138ilv279l3e90';
const tagWarm = 'cmmuwbhe5000z8ilv6z6rve8p';
const tagFirstTime = 'cmmuwbhl000158ilv2otsz758';

const now = new Date();

function futureDate(days: number, hours = 10) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hours, 0, 0, 0);
  return d;
}

function pastDate(days: number, hours = 10) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hours, 0, 0, 0);
  return d;
}

async function main() {
  const campaigns: any[] = [
    // ===== SCHEDULED (upcoming) =====
    {
      name: 'Spring Open House Invitation',
      type: 'EMAIL',
      status: 'SCHEDULED',
      subject: 'You are Invited to Our Exclusive Spring Open House!',
      body: '<h1>Spring Open House</h1><p>Join us this weekend for exclusive viewings of our newest luxury listings.</p>',
      startDate: futureDate(2, 10),
      audience: 45,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagHot }, { id: tagVIP }] },
    },
    {
      name: 'New Listings Weekly Digest',
      type: 'EMAIL',
      status: 'SCHEDULED',
      subject: "This Week's Hottest New Listings",
      body: '<h1>New Listings</h1><p>Check out the latest properties on the market.</p>',
      startDate: futureDate(1, 9),
      audience: 72,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagWarm }] },
    },
    {
      name: 'Mortgage Rate Update - March',
      type: 'EMAIL',
      status: 'SCHEDULED',
      subject: 'Great News: Mortgage Rates Are Dropping!',
      body: '<h1>Rate Update</h1><p>Mortgage rates have dropped to their lowest point this year.</p>',
      startDate: futureDate(4, 14),
      audience: 60,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagFirstTime }] },
    },
    {
      name: 'SMS: Price Drop Alert',
      type: 'SMS',
      status: 'SCHEDULED',
      body: 'Price drop alert! 3 properties in your saved area just reduced. View now: {{link}}',
      startDate: futureDate(3, 11),
      audience: 28,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagHot }] },
    },
    {
      name: 'Luxury Portfolio Showcase',
      type: 'EMAIL',
      status: 'SCHEDULED',
      subject: 'Exclusive: Our Premium Luxury Portfolio',
      body: '<h1>Luxury Living</h1><p>Browse our curated selection of luxury homes.</p>',
      startDate: futureDate(7, 10),
      audience: 15,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagVIP }] },
    },

    // ===== PAUSED =====
    {
      name: 'Investment Property Newsletter',
      type: 'EMAIL',
      status: 'PAUSED',
      subject: 'Top Investment Opportunities This Month',
      body: '<h1>Investment Picks</h1><p>Our analysts have identified the top investment properties.</p>',
      startDate: futureDate(5, 8),
      audience: 33,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagWarm }] },
    },

    // ===== RECURRING - ACTIVE =====
    {
      name: 'Weekly Market Report',
      type: 'EMAIL',
      status: 'ACTIVE',
      subject: 'Your Weekly Real Estate Market Report',
      body: '<h1>Market Report</h1><p>Here is your weekly summary of market trends and data.</p>',
      startDate: pastDate(14, 9),
      audience: 72,
      isRecurring: true,
      frequency: 'weekly',
      recurringPattern: { daysOfWeek: [1], time: '09:00' },
      nextSendAt: futureDate(3, 9),
      lastSentAt: pastDate(4, 9),
      occurrenceCount: 2,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagWarm }, { id: tagHot }] },
    },
    {
      name: 'Daily Hot Leads Digest',
      type: 'EMAIL',
      status: 'ACTIVE',
      subject: "Today's Hot Leads & Opportunities",
      body: '<h1>Daily Digest</h1><p>Your daily roundup of the hottest leads and opportunities.</p>',
      startDate: pastDate(7, 8),
      audience: 12,
      isRecurring: true,
      frequency: 'daily',
      recurringPattern: { time: '08:00' },
      nextSendAt: futureDate(1, 8),
      lastSentAt: pastDate(0, 8),
      occurrenceCount: 7,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagHot }] },
    },
    {
      name: 'Monthly Neighborhood Report',
      type: 'EMAIL',
      status: 'ACTIVE',
      subject: 'Your Monthly Neighborhood Market Summary',
      body: '<h1>Neighborhood Report</h1><p>See how your neighborhood is performing this month.</p>',
      startDate: pastDate(60, 10),
      audience: 50,
      isRecurring: true,
      frequency: 'monthly',
      recurringPattern: { dayOfMonth: 1, time: '10:00' },
      nextSendAt: futureDate(14, 10),
      lastSentAt: pastDate(17, 10),
      occurrenceCount: 2,
      maxOccurrences: 12,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagFirstTime }] },
    },

    // ===== RECURRING - SCHEDULED =====
    {
      name: 'SMS: Bi-Weekly Appointment Reminders',
      type: 'SMS',
      status: 'SCHEDULED',
      body: 'Hi {{firstName}}, reminder: you have upcoming property viewings this week. Reply STOP to opt out.',
      startDate: futureDate(2, 9),
      audience: 20,
      isRecurring: true,
      frequency: 'weekly',
      recurringPattern: { daysOfWeek: [1, 4], time: '09:00' },
      nextSendAt: futureDate(2, 9),
      maxOccurrences: 26,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagHot }] },
    },

    // ===== COMPLETED (recently sent) =====
    {
      name: "Valentine's Day Home Sale Event",
      type: 'EMAIL',
      status: 'COMPLETED',
      subject: 'Fall in Love With Your Dream Home',
      body: '<h1>Valentine Special</h1><p>Special financing available this month.</p>',
      startDate: pastDate(30, 10),
      endDate: pastDate(30, 10),
      audience: 68,
      sent: 65,
      delivered: 63,
      opened: 42,
      clicked: 18,
      converted: 3,
      bounced: 2,
      revenue: 4500,
      spent: 120,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagWarm }] },
    },
    {
      name: 'Q1 Market Insights Report',
      type: 'EMAIL',
      status: 'COMPLETED',
      subject: 'Q1 2026 Real Estate Market Insights',
      body: '<h1>Q1 Insights</h1><p>A comprehensive look at the first quarter.</p>',
      startDate: pastDate(7, 14),
      endDate: pastDate(7, 14),
      audience: 72,
      sent: 70,
      delivered: 69,
      opened: 51,
      clicked: 22,
      converted: 5,
      bounced: 1,
      revenue: 8200,
      spent: 95,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagHot }, { id: tagVIP }] },
    },
    {
      name: 'SMS: Weekend Showing Reminder',
      type: 'SMS',
      status: 'COMPLETED',
      body: 'Reminder: Your property showing is tomorrow! Reply YES to confirm or RESCHEDULE to change.',
      startDate: pastDate(3, 10),
      endDate: pastDate(3, 10),
      audience: 18,
      sent: 18,
      delivered: 18,
      opened: 18,
      clicked: 12,
      converted: 8,
      bounced: 0,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagHot }] },
    },
    {
      name: 'New Construction Pre-Sale Invite',
      type: 'EMAIL',
      status: 'COMPLETED',
      subject: 'Exclusive Pre-Sale Access: Parkview Estates',
      body: '<h1>Pre-Sale</h1><p>Get early access to Parkview Estates.</p>',
      startDate: pastDate(2, 10),
      endDate: pastDate(2, 10),
      audience: 25,
      sent: 24,
      delivered: 24,
      opened: 19,
      clicked: 11,
      converted: 4,
      bounced: 0,
      revenue: 12000,
      spent: 80,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagVIP }] },
    },
    {
      name: 'First-Time Buyer Workshop Invite',
      type: 'EMAIL',
      status: 'COMPLETED',
      subject: 'Free Workshop: First-Time Home Buying 101',
      body: '<h1>Free Workshop</h1><p>Learn everything you need to know about buying your first home.</p>',
      startDate: pastDate(1, 16),
      endDate: pastDate(1, 16),
      audience: 40,
      sent: 38,
      delivered: 37,
      opened: 28,
      clicked: 15,
      converted: 6,
      bounced: 1,
      revenue: 0,
      spent: 65,
      organizationId: orgId,
      createdById: userId,
      tags: { connect: [{ id: tagFirstTime }] },
    },
  ];

  console.log(`Creating ${campaigns.length} campaigns...`);

  for (const c of campaigns) {
    const created = await prisma.campaign.create({ data: c });
    console.log(`  ✅ ${created.name} — ${created.status}${created.isRecurring ? ' (recurring)' : ''}`);
  }

  console.log(`\nDone! Created ${campaigns.length} campaigns for the Schedule page.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
