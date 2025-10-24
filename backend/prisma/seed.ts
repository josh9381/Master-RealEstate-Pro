import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@realestate.com' },
    update: {},
    create: {
      email: 'admin@realestate.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
      subscriptionTier: 'ENTERPRISE',
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create test user
  const testPassword = await bcrypt.hash('test123', 10);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@realestate.com' },
    update: {},
    create: {
      email: 'test@realestate.com',
      password: testPassword,
      name: 'Test User',
      role: 'USER',
      isActive: true,
      emailVerified: true,
      subscriptionTier: 'PROFESSIONAL',
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Create some sample tags
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: 'Hot Lead' },
      update: {},
      create: { name: 'Hot Lead', color: '#ef4444' },
    }),
    prisma.tag.upsert({
      where: { name: 'Follow Up' },
      update: {},
      create: { name: 'Follow Up', color: '#f59e0b' },
    }),
    prisma.tag.upsert({
      where: { name: 'VIP' },
      update: {},
      create: { name: 'VIP', color: '#8b5cf6' },
    }),
    prisma.tag.upsert({
      where: { name: 'Cold' },
      update: {},
      create: { name: 'Cold', color: '#6b7280' },
    }),
  ]);

  console.log('✅ Created tags:', tags.length);

  // Create sample leads
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-0101',
        company: 'Smith Properties',
        position: 'CEO',
        status: 'NEW',
        score: 85,
        source: 'website',
        value: 250000,
        assignedToId: adminUser.id,
        tags: {
          connect: [{ name: 'Hot Lead' }, { name: 'VIP' }],
        },
      },
    }),
    prisma.lead.create({
      data: {
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        phone: '+1-555-0102',
        company: 'Johnson Real Estate',
        position: 'Director',
        status: 'CONTACTED',
        score: 72,
        source: 'referral',
        value: 180000,
        assignedToId: testUser.id,
        tags: {
          connect: [{ name: 'Follow Up' }],
        },
      },
    }),
    prisma.lead.create({
      data: {
        name: 'Michael Brown',
        email: 'mbrown@example.com',
        phone: '+1-555-0103',
        company: 'Brown Investments',
        status: 'QUALIFIED',
        score: 90,
        source: 'social',
        value: 500000,
        assignedToId: adminUser.id,
        tags: {
          connect: [{ name: 'Hot Lead' }, { name: 'VIP' }],
        },
      },
    }),
    prisma.lead.create({
      data: {
        name: 'Emily Davis',
        email: 'emily.davis@example.com',
        phone: '+1-555-0104',
        status: 'NEW',
        score: 45,
        source: 'website',
        assignedToId: testUser.id,
        tags: {
          connect: [{ name: 'Cold' }],
        },
      },
    }),
  ]);

  console.log('✅ Created leads:', leads.length);

  // Create a sample campaign
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Welcome Email Campaign',
      type: 'EMAIL',
      status: 'COMPLETED',
      subject: 'Welcome to Our Real Estate Platform',
      body: 'Thank you for your interest in our services...',
      audience: 150,
      sent: 150,
      delivered: 148,
      opened: 95,
      clicked: 42,
      converted: 12,
      revenue: 180000,
      createdById: adminUser.id,
      tags: {
        connect: [{ name: 'Hot Lead' }],
      },
    },
  });

  console.log('✅ Created campaign:', campaign.name);

  // Create some activities
  await prisma.activity.createMany({
    data: [
      {
        type: 'LEAD_CREATED',
        title: 'Lead Created',
        description: 'John Smith was added to the system',
        userId: adminUser.id,
        leadId: leads[0].id,
      },
      {
        type: 'EMAIL_SENT',
        title: 'Email Sent',
        description: 'Welcome email sent to Sarah Johnson',
        userId: testUser.id,
        leadId: leads[1].id,
      },
      {
        type: 'CAMPAIGN_LAUNCHED',
        title: 'Campaign Launched',
        description: 'Welcome Email Campaign started',
        userId: adminUser.id,
        campaignId: campaign.id,
      },
    ],
  });

  console.log('✅ Created activities');

  // Create some tasks
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  await prisma.task.createMany({
    data: [
      {
        title: 'Follow up with John Smith',
        description: 'Discuss property investment opportunities',
        dueDate: tomorrow,
        priority: 'HIGH',
        status: 'PENDING',
        assignedToId: adminUser.id,
        leadId: leads[0].id,
      },
      {
        title: 'Send proposal to Sarah Johnson',
        description: 'Prepare and send investment proposal',
        dueDate: nextWeek,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        assignedToId: testUser.id,
        leadId: leads[1].id,
      },
      {
        title: 'Schedule demo with Michael Brown',
        description: 'Book demo call for next week',
        dueDate: tomorrow,
        priority: 'URGENT',
        status: 'PENDING',
        assignedToId: adminUser.id,
        leadId: leads[2].id,
      },
    ],
  });

  console.log('✅ Created tasks');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
