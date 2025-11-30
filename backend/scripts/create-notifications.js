const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createNotifications() {
  try {
    // Find admin user account
    const user = await prisma.user.findFirst({
      where: { email: 'admin@realestate.com' }
    });

    if (!user) {
      console.error('❌ User not found: admin@realestate.com');
      process.exit(1);
    }

    console.log('✅ Found user:', user.email);

    // Create sample notifications
    const notifications = await Promise.all([
      prisma.notification.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          type: 'assignment',
          title: 'New lead assigned',
          message: 'You have been assigned a new lead: Tech Solutions Inc.',
          link: '/leads',
          read: false
        }
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          type: 'update',
          title: 'Lead status changed',
          message: 'Lead moved from Contacted to Qualified stage',
          link: '/leads',
          read: false
        }
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          type: 'email',
          title: 'Email campaign sent',
          message: 'Your email campaign "Monthly Newsletter" was sent to 100 leads',
          link: '/campaigns',
          read: false
        }
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          type: 'system',
          title: 'Welcome to CRM Platform',
          message: 'Your account has been set up successfully!',
          read: true
        }
      })
    ]);

    console.log(`✅ Created ${notifications.length} notifications`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createNotifications();
