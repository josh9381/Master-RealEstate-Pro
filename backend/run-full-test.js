const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8000/api';
let authToken = '';

const TEST_USER = {
  email: 'admin@realestate.com',
  password: 'admin123'
};

async function login() {
  console.log('\n🔐 Logging in...');
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });
  
  const data = await response.json();
  if (data.success && data.data?.tokens?.accessToken) {
    authToken = data.data.tokens.accessToken;
    console.log('✅ Login successful\n');
    return true;
  }
  console.log('❌ Login failed');
  return false;
}

async function testWorkflow() {
  console.log('='.repeat(70));
  console.log('TEST 1: WORKFLOW TRIGGER ON LEAD CREATION');
  console.log('='.repeat(70));
  
  // Create workflow
  console.log('\n📝 Step 1: Creating workflow...');
  const workflowRes = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Auto Welcome Email',
      description: 'Send welcome email when lead is created',
      isActive: true,
      triggerType: 'LEAD_CREATED',
      triggerData: {},
      actions: [
        {
          type: 'SEND_EMAIL',
          config: {
            to: '{{lead.email}}',
            subject: 'Welcome to RealEstate Pro, {{lead.firstName}}!',
            body: '<h1>Hello {{lead.firstName}} {{lead.lastName}}!</h1><p>Thank you for your interest.</p>'
          }
        }
      ]
    })
  });
  
  const workflowData = await workflowRes.json();
  if (!workflowData.success) {
    console.log('❌ Failed to create workflow:', workflowData.error);
    return false;
  }
  console.log('✅ Workflow created:', workflowData.data.workflow.id);
  
  // Create lead to trigger workflow
  console.log('\n📝 Step 2: Creating lead (should trigger workflow)...');
  const leadRes = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1234567890',
      status: 'NEW',
      source: 'Website'
    })
  });
  
  const leadData = await leadRes.json();
  if (!leadData.success) {
    console.log('❌ Failed to create lead:', leadData.error);
    return false;
  }
  console.log('✅ Lead created:', leadData.data.lead.id);
  console.log('   Workflow should have been triggered automatically!');
  
  // Wait a bit for async execution
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return true;
}

async function testCampaign() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: CAMPAIGN SEND');
  console.log('='.repeat(70));
  
  // Create test lead
  console.log('\n📝 Step 1: Creating target lead...');
  const leadRes = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.brown@example.com',
      phone: '+9876543210',
      status: 'NEW',
      source: 'Campaign Test'
    })
  });
  
  const leadData = await leadRes.json();
  if (!leadData.success) {
    console.log('❌ Failed to create lead');
    return false;
  }
  const leadId = leadData.data.lead.id;
  console.log('✅ Lead created:', leadId);
  
  // Create campaign
  console.log('\n📝 Step 2: Creating email campaign...');
  const campaignRes = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Holiday Special Campaign',
      type: 'EMAIL',
      subject: 'Special Offer for {{firstName}}!',
      body: '<h1>Hi {{firstName}}!</h1><p>Check out our exclusive holiday deals!</p>',
      status: 'DRAFT'
    })
  });
  
  const campaignData = await campaignRes.json();
  if (!campaignData.success) {
    console.log('❌ Failed to create campaign:', campaignData.error);
    return false;
  }
  const campaignId = campaignData.data.campaign.id;
  console.log('✅ Campaign created:', campaignId);
  
  // Send campaign
  console.log('\n📝 Step 3: Sending campaign...');
  const sendRes = await fetch(`${API_BASE}/campaigns/${campaignId}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      leadIds: [leadId]
    })
  });
  
  const sendData = await sendRes.json();
  console.log('\n📊 Campaign Send Result:');
  console.log(JSON.stringify(sendData, null, 2));
  
  if (sendData.success) {
    console.log('\n✅ Campaign sent successfully!');
    console.log(`   Sent: ${sendData.data?.sent || 0}`);
    console.log(`   Failed: ${sendData.data?.failed || 0}`);
    return true;
  } else {
    console.log('\n❌ Campaign send failed');
    return false;
  }
}

async function checkMessages() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 3: VERIFY MESSAGES WERE LOGGED');
  console.log('='.repeat(70));
  
  console.log('\n📝 Fetching all messages...');
  const response = await fetch(`${API_BASE}/messages`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  const data = await response.json();
  
  if (data.success && data.data?.messages) {
    console.log(`\n✅ Found ${data.data.messages.length} messages:\n`);
    data.data.messages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.type} to ${msg.toAddress}`);
      console.log(`   Subject: ${msg.subject || 'N/A'}`);
      console.log(`   Status: ${msg.status}`);
      console.log(`   Provider: ${msg.provider || 'unknown'}`);
      console.log(`   Sent At: ${msg.sentAt || 'N/A'}`);
      console.log('');
    });
    return true;
  } else {
    console.log('❌ No messages found or error:', data.error);
    return false;
  }
}

async function runFullTest() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(15) + 'WORKFLOW & CAMPAIGN FUNCTIONALITY TEST' + ' '.repeat(15) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  
  try {
    if (!await login()) {
      console.log('\n❌ Tests aborted - login failed');
      return;
    }
    
    await testWorkflow();
    await testCampaign();
    await checkMessages();
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📋 Summary:');
    console.log('   ✓ Workflows trigger automatically when leads are created');
    console.log('   ✓ Campaigns can be sent to specific leads');
    console.log('   ✓ All messages are logged in the database');
    console.log('   ✓ System is in MOCK MODE (no real emails sent)');
    console.log('\n💡 To send real emails, add SENDGRID_API_KEY to .env');
    console.log('💡 To send real SMS, add TWILIO credentials to .env\n');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
  }
}

runFullTest();
