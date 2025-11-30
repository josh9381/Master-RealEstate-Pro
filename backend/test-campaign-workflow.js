/**
 * Test Script for Campaigns and Workflows
 * Tests actual sending functionality
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8000/api';
let authToken = '';
let testLeadId = '';
let testCampaignId = '';
let testWorkflowId = '';

// Test user credentials (you'll need to create a test user first)
const TEST_USER = {
  email: 'admin@realestate.com',
  password: 'admin123'
};

async function login() {
  console.log('\n🔐 Testing Login...');
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });
  
  const data = await response.json();
  if (data.success && data.data?.tokens?.accessToken) {
    authToken = data.data.tokens.accessToken;
    console.log('✅ Login successful');
    console.log('   User:', data.data.user.email);
    console.log('   Organization:', data.data.organization.name);
    return true;
  } else {
    console.log('❌ Login failed:', data.error || 'Unknown error');
    console.log('   Response:', JSON.stringify(data, null, 2));
    return false;
  }
}

async function register() {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...TEST_USER,
      firstName: 'Test',
      lastName: 'User',
      organizationName: 'Test Organization'
    })
  });
  
  const data = await response.json();
  if (data.success && data.data?.accessToken) {
    authToken = data.data.accessToken;
    console.log('✅ User registered and logged in');
    return true;
  }
  console.log('❌ Registration failed:', data.error);
  return false;
}

async function createTestLead() {
  console.log('\n📋 Creating Test Lead...');
  const response = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      status: 'NEW',
      source: 'Test'
    })
  });
  
  const data = await response.json();
  if (data.success && data.data?.lead) {
    testLeadId = data.data.lead.id;
    console.log('✅ Test lead created:', testLeadId);
    return true;
  }
  console.log('❌ Failed to create lead:', data.error);
  return false;
}

async function createEmailCampaign() {
  console.log('\n📧 Creating Email Campaign...');
  const response = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Test Email Campaign',
      type: 'EMAIL',
      subject: 'Test Email from Campaign',
      body: '<h1>Hello {{firstName}}!</h1><p>This is a test email from the campaign system.</p>',
      status: 'DRAFT',
      targetAudience: { status: ['NEW'] }
    })
  });
  
  const data = await response.json();
  if (data.success && data.data?.campaign) {
    testCampaignId = data.data.campaign.id;
    console.log('✅ Email campaign created:', testCampaignId);
    return true;
  }
  console.log('❌ Failed to create campaign:', data.error);
  return false;
}

async function executeCampaign() {
  console.log('\n🚀 Executing Campaign...');
  const response = await fetch(`${API_BASE}/campaigns/${testCampaignId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      leadIds: [testLeadId]
    })
  });
  
  const data = await response.json();
  console.log('Campaign execution result:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ Campaign executed successfully');
    console.log(`   Sent: ${data.data?.sent || 0}`);
    console.log(`   Failed: ${data.data?.failed || 0}`);
    return true;
  }
  console.log('❌ Campaign execution failed:', data.error);
  return false;
}

async function createWorkflow() {
  console.log('\n🔄 Creating Test Workflow...');
  const response = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Test Lead Created Workflow',
      description: 'Automatically send email when new lead is created',
      isActive: true,
      triggerType: 'LEAD_CREATED',
      triggerData: {},
      actions: [
        {
          type: 'SEND_EMAIL',
          config: {
            to: '{{lead.email}}',
            subject: 'Welcome {{lead.firstName}}!',
            body: 'Thank you for your interest, {{lead.firstName}} {{lead.lastName}}!'
          }
        }
      ]
    })
  });
  
  const data = await response.json();
  if (data.success && data.data?.workflow) {
    testWorkflowId = data.data.workflow.id;
    console.log('✅ Workflow created:', testWorkflowId);
    return true;
  }
  console.log('❌ Failed to create workflow:', data.error);
  return false;
}

async function triggerWorkflowByCreatingLead() {
  console.log('\n🎯 Creating New Lead to Trigger Workflow...');
  const response = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+9876543210',
      status: 'NEW',
      source: 'Workflow Test'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log('✅ New lead created - workflow should have been triggered');
    console.log('   Check backend logs for workflow execution');
    return true;
  }
  console.log('❌ Failed to create lead:', data.error);
  return false;
}

async function checkMessages() {
  console.log('\n📨 Checking Sent Messages...');
  const response = await fetch(`${API_BASE}/messages`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  const data = await response.json();
  if (data.success && data.data?.messages) {
    console.log(`✅ Found ${data.data.messages.length} messages:`);
    data.data.messages.forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg.type} to ${msg.toAddress} - Status: ${msg.status}`);
      console.log(`      Subject: ${msg.subject || 'N/A'}`);
      console.log(`      Provider: ${msg.provider || 'unknown'}`);
    });
    return true;
  }
  console.log('❌ Failed to fetch messages');
  return false;
}

async function runTests() {
  console.log('🧪 Starting Campaign & Workflow Tests...');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Login
    if (!await login()) {
      console.log('\n❌ Cannot proceed without authentication');
      return;
    }
    
    // Step 2: Create test lead
    if (!await createTestLead()) {
      console.log('\n⚠️  Continuing without test lead...');
    }
    
    // Step 3: Test Campaign
    console.log('\n' + '='.repeat(60));
    console.log('TESTING CAMPAIGNS');
    console.log('='.repeat(60));
    
    if (await createEmailCampaign()) {
      await executeCampaign();
    }
    
    // Step 4: Test Workflow
    console.log('\n' + '='.repeat(60));
    console.log('TESTING WORKFLOWS');
    console.log('='.repeat(60));
    
    if (await createWorkflow()) {
      await triggerWorkflowByCreatingLead();
    }
    
    // Step 5: Check results
    console.log('\n' + '='.repeat(60));
    console.log('CHECKING RESULTS');
    console.log('='.repeat(60));
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for async operations
    await checkMessages();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Tests Complete!');
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log('   - Campaigns: Created and executed');
    console.log('   - Workflows: Created and triggered');
    console.log('   - Check messages above to see if they were sent');
    console.log('   - Check backend logs for detailed execution info');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the tests
runTests();
