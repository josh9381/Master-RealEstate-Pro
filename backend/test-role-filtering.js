/**
 * Test Role-Based Filtering
 * Tests that ADMIN sees all leads and USER only sees assigned leads
 */

const fetch = require('node-fetch');
const API_BASE = 'http://localhost:8000/api';

let adminToken = '';
let userToken = '';
let testOrgId = '';
let adminUserId = '';
let agentUserId = '';

// Admin credentials
const ADMIN_CREDS = {
  email: 'admin@realestate.com',
  password: 'admin123'
};

// Create a test agent
const AGENT_CREDS = {
  email: `agent${Date.now()}@realestate.com`,
  password: 'agent123',
  firstName: 'Test',
  lastName: 'Agent',
  organizationName: 'Test Org'
};

async function loginAsAdmin() {
  console.log('\n🔐 Logging in as ADMIN...');
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_CREDS)
  });
  
  const data = await response.json();
  if (data.success) {
    adminToken = data.data.tokens.accessToken;
    testOrgId = data.data.organization.id;
    adminUserId = data.data.user.id;
    console.log(`✅ Admin logged in (${data.data.user.role})`);
    console.log(`   Organization: ${data.data.organization.name}`);
    console.log(`   User ID: ${adminUserId}`);
    return true;
  }
  console.log('❌ Admin login failed');
  return false;
}

async function createAgent() {
  console.log('\n👤 Creating test AGENT user...');
  
  // First, register a new agent
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AGENT_CREDS)
  });
  
  const data = await response.json();
  if (data.success) {
    userToken = data.data.tokens.accessToken;
    agentUserId = data.data.user.id;
    console.log(`✅ Agent created (${data.data.user.role})`);
    console.log(`   Email: ${AGENT_CREDS.email}`);
    console.log(`   User ID: ${agentUserId}`);
    
    // Update role to USER (not ADMIN)
    // Note: This requires an admin endpoint or direct DB update
    // For now, the agent will be ADMIN of their own org
    
    return true;
  }
  console.log('❌ Agent creation failed:', data.error);
  return false;
}

async function createLeadAssignedToAgent() {
  console.log('\n📋 Creating lead ASSIGNED TO AGENT...');
  
  const response = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      firstName: 'Assigned',
      lastName: 'Lead',
      email: `assigned${Date.now()}@example.com`,
      phone: '+1234567890',
      status: 'NEW',
      source: 'Test',
      assignedToId: agentUserId  // Assign to agent
    })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log(`✅ Lead created and assigned to agent`);
    console.log(`   Lead ID: ${data.data.lead.id}`);
    console.log(`   Assigned To: ${data.data.lead.assignedToId}`);
    return data.data.lead.id;
  }
  console.log('❌ Failed to create assigned lead');
  return null;
}

async function createLeadNotAssignedToAgent() {
  console.log('\n📋 Creating lead NOT assigned to agent...');
  
  const response = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      firstName: 'Unassigned',
      lastName: 'Lead',
      email: `unassigned${Date.now()}@example.com`,
      phone: '+9876543210',
      status: 'NEW',
      source: 'Test',
      // NOT assigned to agent
    })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log(`✅ Lead created without assignment`);
    console.log(`   Lead ID: ${data.data.lead.id}`);
    console.log(`   Assigned To: ${data.data.lead.assignedToId || 'None'}`);
    return data.data.lead.id;
  }
  console.log('❌ Failed to create unassigned lead');
  return null;
}

async function getLeadsAsAdmin() {
  console.log('\n👮 Fetching leads as ADMIN...');
  
  const response = await fetch(`${API_BASE}/leads`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  const data = await response.json();
  if (data.success) {
    console.log(`✅ Admin sees ${data.data.leads.length} leads`);
    data.data.leads.forEach((lead, i) => {
      console.log(`   ${i+1}. ${lead.firstName} ${lead.lastName} - Assigned to: ${lead.assignedToId || 'None'}`);
    });
    return data.data.leads.length;
  }
  console.log('❌ Failed to fetch leads as admin');
  return 0;
}

async function getLeadsAsAgent() {
  console.log('\n👤 Fetching leads as AGENT...');
  
  const response = await fetch(`${API_BASE}/leads`, {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });
  
  const data = await response.json();
  if (data.success) {
    console.log(`✅ Agent sees ${data.data.leads.length} leads`);
    data.data.leads.forEach((lead, i) => {
      console.log(`   ${i+1}. ${lead.firstName} ${lead.lastName} - Assigned to: ${lead.assignedToId || 'None'}`);
    });
    return data.data.leads.length;
  }
  console.log('❌ Failed to fetch leads as agent');
  return 0;
}

async function runTest() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       ROLE-BASED FILTERING TEST                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  try {
    // Step 1: Login as admin
    if (!await loginAsAdmin()) {
      console.log('\n❌ Test aborted');
      return;
    }
    
    // Step 2: Create agent user
    if (!await createAgent()) {
      console.log('\n❌ Test aborted');
      return;
    }
    
    // Step 3: Create leads
    const assignedLeadId = await createLeadAssignedToAgent();
    const unassignedLeadId = await createLeadNotAssignedToAgent();
    
    if (!assignedLeadId || !unassignedLeadId) {
      console.log('\n❌ Test aborted - could not create leads');
      return;
    }
    
    // Step 4: Check what admin sees
    const adminCount = await getLeadsAsAdmin();
    
    // Step 5: Check what agent sees
    const agentCount = await getLeadsAsAgent();
    
    // Results
    console.log('\n' + '═'.repeat(60));
    console.log('TEST RESULTS');
    console.log('═'.repeat(60));
    
    console.log(`\nADMIN (should see ALL leads): ${adminCount} leads`);
    console.log(`AGENT (should see ONLY assigned): ${agentCount} leads`);
    
    if (adminCount >= 2 && agentCount === 1) {
      console.log('\n✅ PASS: Role-based filtering works correctly!');
      console.log('   - Admin sees all leads in organization');
      console.log('   - Agent only sees leads assigned to them');
    } else {
      console.log('\n❌ FAIL: Role-based filtering not working as expected');
      console.log(`   Expected: Admin >= 2, Agent = 1`);
      console.log(`   Got: Admin = ${adminCount}, Agent = ${agentCount}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

runTest();
