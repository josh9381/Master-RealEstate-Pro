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
      firstName: 'Admin',
      lastName: 'User',
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
      firstName: 'Test',
      lastName: 'User',
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

  // Create sample leads (using upsert to avoid conflicts)
  const leads = await Promise.all([
    prisma.lead.upsert({
      where: { email: 'john.smith@example.com' },
      update: {},
      create: {
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
    prisma.lead.upsert({
      where: { email: 'sarah.j@example.com' },
      update: {},
      create: {
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
    prisma.lead.upsert({
      where: { email: 'mbrown@example.com' },
      update: {},
      create: {
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
    prisma.lead.upsert({
      where: { email: 'emily.davis@example.com' },
      update: {},
      create: {
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

  // Create example workflows
  const workflows = await Promise.all([
    // 1. Welcome Series Workflow
    prisma.workflow.create({
      data: {
        name: 'New Lead Welcome Series',
        description: 'Automatically send welcome email and create follow-up task for new leads',
        isActive: true,
        triggerType: 'LEAD_CREATED',
        triggerData: {},
        actions: [
          {
            type: 'SEND_EMAIL',
            config: {
              to: '{{lead.email}}',
              subject: 'Welcome to Our Real Estate Platform',
              body: 'Hi {{lead.firstName}},\n\nThank you for your interest in our real estate services. We\'re excited to help you find the perfect property.\n\nBest regards,\nThe Team',
            },
          },
          {
            type: 'CREATE_TASK',
            config: {
              title: 'Follow up with {{lead.name}}',
              description: 'Initial contact and needs assessment',
              dueDate: '+3 days',
              priority: 'HIGH',
            },
          },
        ],
        executions: 0,
      },
    }),

    // 2. Hot Lead Alert Workflow
    prisma.workflow.create({
      data: {
        name: 'Hot Lead Notification',
        description: 'Alert sales team when lead status changes to HOT and create urgent task',
        isActive: true,
        triggerType: 'LEAD_STATUS_CHANGED',
        triggerData: {
          conditions: [
            {
              field: 'newStatus',
              operator: 'equals',
              value: 'HOT',
            },
          ],
        },
        actions: [
          {
            type: 'SEND_SMS',
            config: {
              to: '{{manager.phone}}',
              message: '🔥 Hot Lead Alert: {{lead.name}} ({{lead.email}}) - Contact ASAP!',
            },
          },
          {
            type: 'CREATE_TASK',
            config: {
              title: 'Contact hot lead: {{lead.name}}',
              description: 'Priority contact required - Lead is highly interested',
              dueDate: '+1 day',
              priority: 'URGENT',
            },
          },
          {
            type: 'ADD_TAG',
            config: {
              tagName: 'Urgent Follow-up',
            },
          },
        ],
        executions: 0,
      },
    }),

    // 3. Re-engagement Campaign Workflow
    prisma.workflow.create({
      data: {
        name: 'Cold Lead Re-engagement',
        description: 'Automatically re-engage cold leads after 7 days with follow-up email',
        isActive: false, // Start inactive for this example
        triggerType: 'LEAD_STATUS_CHANGED',
        triggerData: {
          conditions: [
            {
              field: 'newStatus',
              operator: 'equals',
              value: 'COLD',
            },
          ],
        },
        actions: [
          {
            type: 'SEND_EMAIL',
            config: {
              to: '{{lead.email}}',
              subject: 'Still Looking for the Perfect Property?',
              body: 'Hi {{lead.firstName}},\n\nWe noticed you were interested in our services. We have some exciting new properties that might interest you.\n\nWould you like to schedule a call to discuss your needs?\n\nBest regards,\nThe Team',
            },
          },
          {
            type: 'ADD_TAG',
            config: {
              tagName: 'Re-engagement Campaign',
            },
          },
          {
            type: 'UPDATE_STATUS',
            config: {
              status: 'CONTACTED',
            },
          },
        ],
        executions: 0,
      },
    }),
  ]);

  console.log('✅ Created workflows:', workflows.length);

  // Create some email templates
  const emailTemplates = await Promise.all([
    prisma.emailTemplate.create({
      data: {
        name: 'Welcome Email',
        subject: 'Welcome to {{company}}',
        body: 'Hi {{firstName}},\n\nThank you for joining us!\n\nBest regards,\nThe Team',
        category: 'welcome',
        isActive: true,
        variables: { firstName: 'string', company: 'string' },
      },
    }),
    prisma.emailTemplate.create({
      data: {
        name: 'Follow-up Email',
        subject: 'Following up on your inquiry',
        body: 'Hi {{firstName}},\n\nI wanted to follow up on your recent inquiry about {{topic}}.\n\nBest regards,\n{{senderName}}',
        category: 'follow-up',
        isActive: true,
        variables: { firstName: 'string', topic: 'string', senderName: 'string' },
      },
    }),
  ]);

  console.log('✅ Created email templates:', emailTemplates.length);

  // Create some SMS templates
  const smsTemplates = await Promise.all([
    prisma.sMSTemplate.create({
      data: {
        name: 'Meeting Reminder',
        body: 'Hi {{firstName}}, reminder: Meeting tomorrow at {{time}}. Reply CONFIRM.',
        category: 'reminder',
        isActive: true,
        variables: { firstName: 'string', time: 'string' },
      },
    }),
    prisma.sMSTemplate.create({
      data: {
        name: 'Hot Lead Alert',
        body: '🔥 Hot lead: {{leadName}} - {{phone}}. Contact ASAP!',
        category: 'alert',
        isActive: true,
        variables: { leadName: 'string', phone: 'string' },
      },
    }),
  ]);

  console.log('✅ Created SMS templates:', smsTemplates.length);

  // Create some appointments
  const appointmentDate1 = new Date();
  appointmentDate1.setDate(appointmentDate1.getDate() + 2);
  appointmentDate1.setHours(14, 0, 0, 0);

  const appointmentDate2 = new Date();
  appointmentDate2.setDate(appointmentDate2.getDate() + 5);
  appointmentDate2.setHours(10, 30, 0, 0);

  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        title: 'Property Viewing - Downtown Condo',
        description: 'Show luxury condo to John Smith',
        startTime: appointmentDate1,
        endTime: new Date(appointmentDate1.getTime() + 60 * 60 * 1000), // +1 hour
        location: '123 Main St, Downtown',
        type: 'MEETING',
        status: 'SCHEDULED',
        userId: adminUser.id,
        leadId: leads[0].id,
        attendees: ['john.smith@example.com', 'admin@realestate.com'],
      },
    }),
    prisma.appointment.create({
      data: {
        title: 'Initial Consultation - Sarah Johnson',
        description: 'Discuss investment opportunities',
        startTime: appointmentDate2,
        endTime: new Date(appointmentDate2.getTime() + 45 * 60 * 1000), // +45 min
        meetingUrl: 'https://zoom.us/j/123456789',
        type: 'CONSULTATION',
        status: 'SCHEDULED',
        userId: testUser.id,
        leadId: leads[1].id,
        attendees: ['sarah.j@example.com', 'test@realestate.com'],
      },
    }),
  ]);

  console.log('✅ Created appointments:', appointments.length);

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
