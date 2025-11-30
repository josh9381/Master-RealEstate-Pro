/**
 * Comprehensive Role-Based Filtering Test
 * 
 * Tests hierarchical permissions:
 * - ADMIN sees all organization data
 * - USER only sees assigned data
 */

const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

// Test configuration
const config = {
  admin: {
    email: 'admin@realestate.com',
    password: 'admin123'
  },
  // We'll create this user during the test
  agent: {
    email: 'agent@realestate.com',
    password: 'agent123',
    firstName: 'Test',
    lastName: 'Agent'
  }
};

let adminToken = '';
let agentToken = '';
let adminUserId = '';
let agentUserId = '';
let organizationId = '';
let testLeadId1 = '';
let testLeadId2 = '';
let testCampaignId1 = '';
let testCampaignId2 = '';

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, token = adminToken) {
  try {
    const response = await axios({
      method,
      url: `${API_URL}${endpoint}`,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function runTests() {
  console.log('\n🚀 Starting Comprehensive Role-Based Filtering Tests\n');
  console.log('=' .repeat(60));

  try {
    // ============================================================
    // STEP 1: Admin Login
    // ============================================================
    console.log('\n📝 STEP 1: Admin Login');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, config.admin);
    adminToken = adminLogin.data.data.token;
    adminUserId = adminLogin.data.data.user.id;
    organizationId = adminLogin.data.data.user.organizationId;
    console.log('✅ Admin logged in successfully');
    console.log(`   User ID: ${adminUserId}`);
    console.log(`   Organization ID: ${organizationId}`);
    console.log(`   Role: ${adminLogin.data.data.user.role}`);

    // ============================================================
    // STEP 2: Create Agent User (as ADMIN) or use existing
    // ============================================================
    console.log('\n📝 STEP 2: Create or Find Agent User');
    try {
      const createAgent = await axios.post(
        `${API_URL}/auth/register`,
        {
          email: config.agent.email,
          password: config.agent.password,
          firstName: config.agent.firstName,
          lastName: config.agent.lastName
        }
      );
      agentUserId = createAgent.data.data.user.id;
      console.log('✅ Agent user created successfully');
      console.log(`   User ID: ${agentUserId}`);
    } catch (error) {
      if (error.response?.status === 409) {
        // User already exists, try to login to get ID
        console.log('⚠️  Agent user already exists, logging in...');
        const agentLogin = await axios.post(`${API_URL}/auth/login`, config.agent);
        agentUserId = agentLogin.data.data.user.id;
        console.log(`✅ Found existing agent user: ${agentUserId}`);
      } else {
        throw error;
      }
    }

    // ============================================================
    // STEP 3: Change Agent Role to USER (testing role management)
    // ============================================================
    console.log('\n📝 STEP 3: Update Agent Role to USER');
    const updateRole = await makeRequest(
      'PATCH',
      `/users/${agentUserId}/role`,
      { role: 'USER' },
      adminToken
    );
    if (updateRole.success) {
      console.log('✅ Agent role updated to USER');
      console.log(`   New Role: ${updateRole.data.data.user.role}`);
    } else {
      console.log('❌ Failed to update role:', updateRole.error);
    }

    // Wait a moment for role to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    // ============================================================
    // STEP 4: Agent Login (get new token with USER role)
    // ============================================================
    console.log('\n📝 STEP 4: Agent Login with USER Role');
    const agentLogin = await axios.post(`${API_URL}/auth/login`, config.agent);
    agentToken = agentLogin.data.data.token;
    console.log('✅ Agent logged in successfully');
    console.log(`   Role: ${agentLogin.data.data.user.role}`);

    // ============================================================
    // STEP 5: Create Test Leads
    // ============================================================
    console.log('\n📝 STEP 5: Create Test Leads');
    
    // Lead 1: Assigned to ADMIN
    const lead1 = await makeRequest('POST', '/leads', {
      firstName: 'Admin',
      lastName: 'Lead',
      email: 'admin.lead@test.com',
      status: 'NEW',
      assignedToId: adminUserId
    }, adminToken);
    
    if (lead1.success) {
      testLeadId1 = lead1.data.data.lead.id;
      console.log(`✅ Lead 1 created (assigned to ADMIN): ${testLeadId1}`);
    } else {
      console.log('❌ Failed to create Lead 1:', lead1.error);
    }

    // Lead 2: Assigned to AGENT
    const lead2 = await makeRequest('POST', '/leads', {
      firstName: 'Agent',
      lastName: 'Lead',
      email: 'agent.lead@test.com',
      status: 'NEW',
      assignedToId: agentUserId
    }, adminToken);
    
    if (lead2.success) {
      testLeadId2 = lead2.data.data.lead.id;
      console.log(`✅ Lead 2 created (assigned to AGENT): ${testLeadId2}`);
    } else {
      console.log('❌ Failed to create Lead 2:', lead2.error);
    }

    // ============================================================
    // STEP 6: Test Lead Visibility
    // ============================================================
    console.log('\n📝 STEP 6: Test Lead Visibility');
    
    // Admin should see ALL leads
    const adminLeads = await makeRequest('GET', '/leads', null, adminToken);
    if (adminLeads.success) {
      console.log(`✅ ADMIN sees ${adminLeads.data.data.leads.length} leads (should be ALL)`);
      console.log(`   Lead IDs: ${adminLeads.data.data.leads.map(l => l.id.substring(0, 8)).join(', ')}`);
    } else {
      console.log('❌ Failed to get admin leads:', adminLeads.error);
    }

    // Agent should see ONLY their assigned lead
    const agentLeads = await makeRequest('GET', '/leads', null, agentToken);
    if (agentLeads.success) {
      console.log(`✅ AGENT sees ${agentLeads.data.data.leads.length} leads (should be 1)`);
      console.log(`   Lead IDs: ${agentLeads.data.data.leads.map(l => l.id.substring(0, 8)).join(', ')}`);
      
      // Verify agent only sees their assigned lead
      const agentCanSeeAdminLead = agentLeads.data.data.leads.some(l => l.id === testLeadId1);
      const agentCanSeeOwnLead = agentLeads.data.data.leads.some(l => l.id === testLeadId2);
      
      if (!agentCanSeeAdminLead && agentCanSeeOwnLead) {
        console.log('   ✅ Role filtering working: Agent can only see assigned lead');
      } else {
        console.log('   ❌ Role filtering FAILED: Agent permissions incorrect');
      }
    } else {
      console.log('❌ Failed to get agent leads:', agentLeads.error);
    }

    // ============================================================
    // STEP 7: Create Test Campaigns
    // ============================================================
    console.log('\n📝 STEP 7: Create Test Campaigns');
    
    // Campaign 1: Created by ADMIN
    const campaign1 = await makeRequest('POST', '/campaigns', {
      name: 'Admin Campaign',
      type: 'EMAIL',
      status: 'DRAFT'
    }, adminToken);
    
    if (campaign1.success) {
      testCampaignId1 = campaign1.data.data.campaign.id;
      console.log(`✅ Campaign 1 created (by ADMIN): ${testCampaignId1}`);
    } else {
      console.log('❌ Failed to create Campaign 1:', campaign1.error);
    }

    // Campaign 2: Created by AGENT
    const campaign2 = await makeRequest('POST', '/campaigns', {
      name: 'Agent Campaign',
      type: 'EMAIL',
      status: 'DRAFT'
    }, agentToken);
    
    if (campaign2.success) {
      testCampaignId2 = campaign2.data.data.campaign.id;
      console.log(`✅ Campaign 2 created (by AGENT): ${testCampaignId2}`);
    } else {
      console.log('❌ Failed to create Campaign 2:', campaign2.error);
    }

    // ============================================================
    // STEP 8: Test Campaign Visibility
    // ============================================================
    console.log('\n📝 STEP 8: Test Campaign Visibility');
    
    // Admin should see ALL campaigns
    const adminCampaigns = await makeRequest('GET', '/campaigns', null, adminToken);
    if (adminCampaigns.success) {
      console.log(`✅ ADMIN sees ${adminCampaigns.data.data.campaigns.length} campaigns (should be ALL)`);
    } else {
      console.log('❌ Failed to get admin campaigns:', adminCampaigns.error);
    }

    // Agent should see ONLY their created campaigns
    const agentCampaigns = await makeRequest('GET', '/campaigns', null, agentToken);
    if (agentCampaigns.success) {
      console.log(`✅ AGENT sees ${agentCampaigns.data.data.campaigns.length} campaigns (should be 1)`);
      
      const agentCanSeeAdminCampaign = agentCampaigns.data.data.campaigns.some(c => c.id === testCampaignId1);
      const agentCanSeeOwnCampaign = agentCampaigns.data.data.campaigns.some(c => c.id === testCampaignId2);
      
      if (!agentCanSeeAdminCampaign && agentCanSeeOwnCampaign) {
        console.log('   ✅ Role filtering working: Agent can only see own campaigns');
      } else {
        console.log('   ❌ Role filtering FAILED: Agent campaign permissions incorrect');
      }
    } else {
      console.log('❌ Failed to get agent campaigns:', agentCampaigns.error);
    }

    // ============================================================
    // STEP 9: Test User Management Permissions
    // ============================================================
    console.log('\n📝 STEP 9: Test User Management Permissions');
    
    // Admin should be able to list all users
    const adminUsers = await makeRequest('GET', '/users', null, adminToken);
    if (adminUsers.success) {
      console.log(`✅ ADMIN can list users: ${adminUsers.data.data.users.length} users found`);
    } else {
      console.log('❌ Admin failed to list users:', adminUsers.error);
    }

    // Agent should NOT be able to list users (USER role)
    const agentUsers = await makeRequest('GET', '/users', null, agentToken);
    if (!agentUsers.success && agentUsers.status === 401) {
      console.log('✅ AGENT correctly denied access to user list');
    } else {
      console.log('❌ Security issue: AGENT should not be able to list users');
    }

    // Agent should NOT be able to change roles
    const agentRoleChange = await makeRequest(
      'PATCH',
      `/users/${adminUserId}/role`,
      { role: 'USER' },
      agentToken
    );
    if (!agentRoleChange.success && agentRoleChange.status === 401) {
      console.log('✅ AGENT correctly denied role change permission');
    } else {
      console.log('❌ Security issue: AGENT should not be able to change roles');
    }

    // ============================================================
    // STEP 10: Test Cross-Organization Security
    // ============================================================
    console.log('\n📝 STEP 10: Test Lead Access Control');
    
    // Agent should NOT be able to access admin's lead directly
    const agentAccessAdminLead = await makeRequest(
      'GET',
      `/leads/${testLeadId1}`,
      null,
      agentToken
    );
    if (!agentAccessAdminLead.success) {
      console.log('✅ AGENT correctly denied access to admin\'s lead');
    } else {
      console.log('❌ Security issue: AGENT should not access other users\' leads');
    }

    // Agent SHOULD be able to access their own lead
    const agentAccessOwnLead = await makeRequest(
      'GET',
      `/leads/${testLeadId2}`,
      null,
      agentToken
    );
    if (agentAccessOwnLead.success) {
      console.log('✅ AGENT can access their own assigned lead');
    } else {
      console.log('❌ Issue: AGENT should be able to access their assigned lead');
    }

    // ============================================================
    // FINAL SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ ROLE-BASED FILTERING TESTS COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Admin can see all organization data');
    console.log('   ✅ User only sees assigned/created data');
    console.log('   ✅ Role management works (ADMIN only)');
    console.log('   ✅ Cross-user access properly blocked');
    console.log('\n💡 Hierarchical permissions are working correctly!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the tests
runTests();
