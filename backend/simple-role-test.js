/**
 * Simple Role Filtering Demonstration
 * Shows the role-based query construction
 */

// Simulate the role filter function
function getLeadsFilter(roleFilter, additionalWhere = {}) {
  const { role, organizationId, userId } = roleFilter;
  
  const baseWhere = {
    organizationId,
    ...additionalWhere,
  };
  
  // ADMIN/MANAGER: See all organization data
  if (role === 'ADMIN' || role === 'MANAGER') {
    console.log(`✅ ${role} role: Returning filter for ALL leads in organization`);
    return baseWhere;
  }
  
  // USER: Only see assigned data
  console.log(`✅ USER role: Returning filter for ONLY assigned leads`);
  return {
    ...baseWhere,
    assignedToId: userId,
  };
}

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║          ROLE-BASED FILTERING DEMONSTRATION                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const orgId = 'org-123';
const adminId = 'user-admin';
const agentId = 'user-agent';

console.log('━'.repeat(65));
console.log('SCENARIO 1: ADMIN querying leads');
console.log('━'.repeat(65));

const adminFilter = getLeadsFilter({
  role: 'ADMIN',
  organizationId: orgId,
  userId: adminId
});

console.log('\nGenerated Prisma where clause:');
console.log(JSON.stringify(adminFilter, null, 2));
console.log('\n📊 Result: Admin will see ALL leads where organizationId = "org-123"');

console.log('\n');
console.log('━'.repeat(65));
console.log('SCENARIO 2: USER/AGENT querying leads');
console.log('━'.repeat(65));

const agentFilter = getLeadsFilter({
  role: 'USER',
  organizationId: orgId,
  userId: agentId
});

console.log('\nGenerated Prisma where clause:');
console.log(JSON.stringify(agentFilter, null, 2));
console.log('\n📊 Result: Agent will ONLY see leads where:');
console.log('   - organizationId = "org-123" AND');
console.log('   - assignedToId = "user-agent"');

console.log('\n');
console.log('━'.repeat(65));
console.log('SUMMARY');
console.log('━'.repeat(65));
console.log('\n✅ Role-based filtering is implemented!');
console.log('\n📋 How it works:');
console.log('   1. ADMIN/MANAGER: See all leads in their organization');
console.log('   2. USER: Only see leads assigned to them');
console.log('\n🔒 Security:');
console.log('   - All queries filter by organizationId (multi-tenancy)');
console.log('   - USER role adds additional assignedToId filter');
console.log('   - No user can see leads from other organizations');
console.log('\n💡 To test live:');
console.log('   1. Create 2 users in the same organization');
console.log('   2. Set one as ADMIN, one as USER');
console.log('   3. Create leads assigned to different users');
console.log('   4. Login as each and query /api/leads');
console.log('   5. ADMIN sees all, USER sees only assigned\n');

