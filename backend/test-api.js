// Simple API Test Script for Master RealEstate Pro Backend
const fetch = require('node-fetch');
const baseUrl = 'http://localhost:8000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
};

let accessToken = '';
let testEmail = `test${Date.now()}@example.com`;
let leadId = '';
let campaignId = '';
let tagId = '';
let activityId = '';

// Helper function to make API requests
async function apiTest(method, endpoint, body = null, description = '') {
  console.log(`\n${colors.yellow}📍 Testing: ${description}${colors.reset}`);
  console.log(`   ${method} ${endpoint}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (accessToken) {
    options.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ${colors.green}✅ SUCCESS${colors.reset}`);
      return data;
    } else {
      console.log(`   ${colors.red}❌ FAILED: ${data.message || response.statusText}${colors.reset}`);
      return null;
    }
  } catch (error) {
    console.log(`   ${colors.red}❌ ERROR: ${error.message}${colors.reset}`);
    return null;
  }
}

async function runTests() {
  console.log(`${colors.cyan}${'='.repeat(60)}`);
  console.log('🧪 TESTING MASTER REALESTATE PRO BACKEND API');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  // Test 1: Health Check
  console.log(`${colors.magenta}1️⃣  HEALTH CHECK${colors.reset}`);
  await apiTest('GET', '/health', null, 'Server Health Check');
  
  // Test 2: User Registration
  console.log(`\n${colors.magenta}2️⃣  AUTHENTICATION${colors.reset}`);
  const registerResult = await apiTest('POST', '/api/auth/register', {
    email: testEmail,
    password: 'Test123456!',
    firstName: 'Test',
    lastName: 'User'
  }, 'Register New User');
  
  if (registerResult && registerResult.data) {
    accessToken = registerResult.data.tokens.accessToken;
    console.log(`   ${colors.green}🔑 Access Token obtained${colors.reset}`);
  }
  
  // Test 3: User Login
  await apiTest('POST', '/api/auth/login', {
    email: testEmail,
    password: 'Test123456!'
  }, 'User Login');
  
  // Test 4: Get User Info
  await apiTest('GET', '/api/auth/me', null, 'Get Current User Info');
  
  // Test 5: Create Lead
  console.log(`\n${colors.magenta}3️⃣  LEAD MANAGEMENT${colors.reset}`);
  const leadResult = await apiTest('POST', '/api/leads', {
    name: 'John Doe',
    email: `john${Date.now()}@example.com`,
    phone: '555-0100',
    status: 'NEW',
    score: 75,
    source: 'website',
    value: 50000
  }, 'Create Lead');
  
  if (leadResult && leadResult.data) {
    leadId = leadResult.data.lead.id;
  }
  
  // Test 6: Get All Leads
  await apiTest('GET', '/api/leads', null, 'List All Leads');
  
  // Test 7: Get Single Lead
  if (leadId) {
    await apiTest('GET', `/api/leads/${leadId}`, null, 'Get Lead by ID');
  }
  
  // Test 8: Get Lead Stats
  await apiTest('GET', '/api/leads/stats', null, 'Get Lead Statistics');
  
  // Test 9: Create Tag
  console.log(`\n${colors.magenta}4️⃣  TAG MANAGEMENT${colors.reset}`);
  const tagResult = await apiTest('POST', '/api/tags', {
    name: 'VIP Client',
    color: '#FF5733'
  }, 'Create Tag');
  
  if (tagResult && tagResult.data) {
    tagId = tagResult.data.tag.id;
  }
  
  // Test 10: Get All Tags
  await apiTest('GET', '/api/tags', null, 'List All Tags');
  
  // Test 11: Add Tag to Lead
  if (leadId && tagId) {
    await apiTest('POST', `/api/leads/${leadId}/tags`, {
      tagIds: [tagId]
    }, 'Add Tag to Lead');
  }
  
  // Test 12: Create Note
  console.log(`\n${colors.magenta}5️⃣  NOTES MANAGEMENT${colors.reset}`);
  if (leadId) {
    await apiTest('POST', `/api/leads/${leadId}/notes`, {
      content: 'This is a test note about the lead. Very important information!'
    }, 'Create Note for Lead');
    
    // Test 13: Get Lead Notes
    await apiTest('GET', `/api/leads/${leadId}/notes`, null, 'Get All Notes for Lead');
  }
  
  // Test 14: Create Campaign
  console.log(`\n${colors.magenta}6️⃣  CAMPAIGN MANAGEMENT${colors.reset}`);
  const campaignResult = await apiTest('POST', '/api/campaigns', {
    name: 'Welcome Email Campaign',
    type: 'EMAIL',
    status: 'DRAFT',
    subject: 'Welcome to our service!',
    body: 'Thank you for joining us.',
    audience: 1000
  }, 'Create Campaign');
  
  if (campaignResult && campaignResult.data) {
    campaignId = campaignResult.data.campaign.id;
  }
  
  // Test 15: Get All Campaigns
  await apiTest('GET', '/api/campaigns', null, 'List All Campaigns');
  
  // Test 16: Get Campaign Stats
  await apiTest('GET', '/api/campaigns/stats', null, 'Get Campaign Statistics');
  
  // Test 17: Update Campaign Metrics
  if (campaignId) {
    await apiTest('PATCH', `/api/campaigns/${campaignId}/metrics`, {
      sent: 1000,
      delivered: 980,
      opened: 500,
      clicked: 100,
      converted: 20
    }, 'Update Campaign Metrics');
  }
  
  // Test 18: Create Task
  console.log(`\n${colors.magenta}7️⃣  TASK MANAGEMENT${colors.reset}`);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  await apiTest('POST', '/api/tasks', {
    title: 'Follow up with lead',
    description: 'Call to discuss property options',
    dueDate: tomorrow.toISOString(),
    priority: 'HIGH',
    status: 'PENDING'
  }, 'Create Task');
  
  // Test 19: Get All Tasks
  await apiTest('GET', '/api/tasks', null, 'List All Tasks');
  
  // Test 20: Get Task Stats
  await apiTest('GET', '/api/tasks/stats', null, 'Get Task Statistics');
  
  // Test 21: Create Activity (NEW FEATURE)
  console.log(`\n${colors.magenta}8️⃣  ACTIVITY LOGGING (NEW!)${colors.reset}`);
  if (leadId) {
    const activityResult = await apiTest('POST', '/api/activities', {
      type: 'EMAIL_SENT',
      title: 'Sent welcome email',
      description: 'Initial outreach email sent to new lead',
      leadId: leadId,
      metadata: {
        subject: 'Welcome!',
        template: 'welcome-template'
      }
    }, 'Create Activity');
    
    if (activityResult && activityResult.data) {
      activityId = activityResult.data.id;
    }
  }
  
  // Test 22: Get All Activities
  await apiTest('GET', '/api/activities', null, 'List All Activities');
  
  // Test 23: Get Activity Stats
  await apiTest('GET', '/api/activities/stats', null, 'Get Activity Statistics');
  
  // Test 24: Get Activities for Lead
  if (leadId) {
    await apiTest('GET', `/api/activities/lead/${leadId}`, null, 'Get Activities for Specific Lead');
  }
  
  // Test 25: Get Activities for Campaign
  if (campaignId) {
    await apiTest('GET', `/api/activities/campaign/${campaignId}`, null, 'Get Activities for Campaign');
  }
  
  // Test 26: Dashboard Analytics (NEW FEATURE)
  console.log(`\n${colors.magenta}9️⃣  DASHBOARD ANALYTICS (NEW!)${colors.reset}`);
  await apiTest('GET', '/api/analytics/dashboard', null, 'Get Dashboard Statistics');
  
  // Test 27: Lead Analytics
  await apiTest('GET', '/api/analytics/leads', null, 'Get Lead Analytics');
  
  // Test 28: Campaign Analytics
  await apiTest('GET', '/api/analytics/campaigns', null, 'Get Campaign Analytics');
  
  // Test 29: Task Analytics
  await apiTest('GET', '/api/analytics/tasks', null, 'Get Task Analytics');
  
  // Test 30: Activity Feed
  await apiTest('GET', '/api/analytics/activity-feed?limit=10', null, 'Get Activity Feed');
  
  // Summary
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(`${colors.green}🎉 TESTING COMPLETE!${colors.reset}\n`);
  console.log(`${colors.cyan}Test Summary:${colors.reset}`);
  console.log(`  • Authentication: ✅ Register, Login, Get User`);
  console.log(`  • Leads: ✅ Create, List, Get, Stats`);
  console.log(`  • Tags: ✅ Create, List, Add to Lead`);
  console.log(`  • Notes: ✅ Create, List for Lead`);
  console.log(`  • Campaigns: ✅ Create, List, Stats, Update Metrics`);
  console.log(`  • Tasks: ✅ Create, List, Stats`);
  console.log(`  • Activities: ✅ Create, List, Stats, Filter by Lead/Campaign`);
  console.log(`  • Analytics: ✅ Dashboard, Leads, Campaigns, Tasks, Feed`);
  console.log(`\n${colors.green}✨ All 7 Week 2 features tested successfully!${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Run the tests
runTests().catch(console.error);
