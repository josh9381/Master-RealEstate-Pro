const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestCampaign() {
  try {
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('❌ No user found');
      return;
    }
    
    // Schedule for 2 minutes from now
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() + 2);
    
    const campaign = await prisma.campaign.create({
      data: {
        name: 'TEST: Auto-Send Campaign',
        type: 'EMAIL',
        status: 'SCHEDULED',
        subject: 'Test Scheduled Campaign',
        body: '<h1>This is a test campaign!</h1><p>If you receive this, the cron job is working!</p>',
        startDate: startDate,
        audience: 3,
        createdById: user.id,
      },
    });
    
    console.log('✅ Test campaign created!');
    console.log('   ID:', campaign.id);
    console.log('   Name:', campaign.name);
    console.log('   Status:', campaign.status);
    console.log('   Scheduled for:', startDate.toLocaleString());
    console.log('');
    console.log('⏰ Campaign will send automatically in 2 minutes!');
    console.log('   Watch the logs: tail -f /tmp/backend.log');
    console.log('');
    console.log('🔍 Current time:', new Date().toLocaleString());
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCampaign();
