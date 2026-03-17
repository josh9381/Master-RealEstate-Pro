import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) { console.log('No org found'); return; }
  
  const users = await prisma.user.findMany({ where: { organizationId: org.id }, take: 4 });
  if (users.length === 0) { console.log('No users found'); return; }

  const existing = await prisma.campaign.count({ where: { organizationId: org.id } });
  console.log('Existing campaigns:', existing);
  if (existing > 0) { console.log('Campaigns already exist, skipping'); return; }

  const campaignData = [
    { name: 'Spring Market Kickoff 2026', type: 'EMAIL' as const, status: 'COMPLETED' as const, subject: 'Spring is Here - Hot New Listings!', body: 'Check out the latest properties hitting the market this spring...', budget: 2500 },
    { name: 'First-Time Buyer Workshop', type: 'EMAIL' as const, status: 'ACTIVE' as const, subject: 'Free First-Time Buyer Workshop', body: 'Join us for a free workshop covering everything you need to know...', budget: 1500 },
    { name: 'Investment Property Alert', type: 'EMAIL' as const, status: 'ACTIVE' as const, subject: 'Exclusive Investment Opportunities', body: 'High-yield investment properties in your area...', budget: 3000 },
    { name: 'Holiday Season Greetings', type: 'EMAIL' as const, status: 'COMPLETED' as const, subject: 'Happy Holidays from Pinnacle Realty!', body: 'Wishing you a wonderful holiday season!', budget: 800 },
    { name: 'New Listing Blast - Luxury', type: 'EMAIL' as const, status: 'DRAFT' as const, subject: 'Just Listed: Luxury Waterfront Estate', body: 'A stunning waterfront property just hit the market...', budget: 5000 },
    { name: 'Open House Weekend SMS', type: 'SMS' as const, status: 'COMPLETED' as const, subject: 'Open House Weekend', body: 'Open Houses this weekend! 3 amazing properties to tour.', budget: 500 },
    { name: 'Seller Lead Nurture', type: 'EMAIL' as const, status: 'ACTIVE' as const, subject: 'What is Your Home Worth?', body: 'Curious about your home current value?', budget: 2000 },
    { name: 'Price Reduction Alerts', type: 'SMS' as const, status: 'ACTIVE' as const, subject: 'Price Drops', body: 'Price drops on properties you liked!', budget: 400 },
    { name: 'Q1 Market Report', type: 'EMAIL' as const, status: 'SCHEDULED' as const, subject: 'Q1 2026 Real Estate Market Report', body: 'Your comprehensive quarterly market analysis is here...', budget: 1200 },
    { name: 'Referral Program Launch', type: 'EMAIL' as const, status: 'DRAFT' as const, subject: 'Earn $500 for Every Referral!', body: 'Know someone looking to buy or sell?', budget: 3000 },
    { name: 'Cold Call Follow-Up', type: 'PHONE' as const, status: 'ACTIVE' as const, subject: 'Follow-up Calls', body: 'Follow-up call script for expired listing leads...', budget: 200 },
    { name: 'Social Media Leads', type: 'EMAIL' as const, status: 'ACTIVE' as const, subject: 'Social Media Lead Capture', body: 'Targeted lead generation campaign...', budget: 4500 },
  ];

  let count = 0;
  for (const c of campaignData) {
    const audience = Math.floor(Math.random() * 450) + 50;
    const sent = c.status === 'DRAFT' ? 0 : Math.floor(Math.random() * (audience * 0.3)) + Math.floor(audience * 0.7);
    const delivered = Math.floor(sent * (0.92 + Math.random() * 0.07));
    const opened = Math.floor(delivered * (0.15 + Math.random() * 0.3));
    const clicked = Math.floor(opened * (0.1 + Math.random() * 0.25));
    const converted = Math.floor(clicked * (0.05 + Math.random() * 0.15));
    const bounced = sent - delivered;

    await prisma.campaign.create({
      data: {
        name: c.name,
        type: c.type,
        status: c.status,
        subject: c.subject,
        body: c.body,
        startDate: new Date(Date.now() - Math.random() * 90 * 86400000),
        budget: c.budget,
        spent: c.status === 'DRAFT' ? 0 : c.budget * (0.3 + Math.random() * 0.65),
        audience,
        sent,
        delivered,
        opened,
        clicked,
        converted,
        bounced,
        unsubscribed: Math.floor(Math.random() * 5),
        revenue: converted * (5000 + Math.random() * 20000),
        roi: 1.5 + Math.random() * 6.5,
        createdById: users[Math.floor(Math.random() * users.length)].id,
        organizationId: org.id,
      },
    });
    count++;
  }
  console.log(`Created ${count} campaigns successfully`);
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
