const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function comprehensiveCheck() {
  console.log('\n🔍 COMPREHENSIVE FINAL VERIFICATION\n');
  console.log('='.repeat(60));
  
  const issues = [];
  
  try {
    // 1. Schema check - Both fields present
    console.log('\n1️⃣ Database Schema:');
    const lsmFields = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'LeadScoringModel'
      AND column_name IN ('organizationId', 'userId')
      ORDER BY column_name
    `;
    
    console.log('   LeadScoringModel:');
    lsmFields.forEach(f => {
      console.log(`     - ${f.column_name}: ${f.data_type} (nullable: ${f.is_nullable})`);
    });
    
    if (lsmFields.length !== 2) {
      issues.push('❌ LeadScoringModel missing organizationId or userId');
    } else {
      console.log('     ✅ Both organizationId and userId present');
    }
    
    const uapFields = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'UserAIPreferences'
      AND column_name IN ('organizationId', 'userId')
      ORDER BY column_name
    `;
    
    console.log('   UserAIPreferences:');
    uapFields.forEach(f => {
      console.log(`     - ${f.column_name}: ${f.data_type} (nullable: ${f.is_nullable})`);
    });
    
    if (uapFields.length !== 2) {
      issues.push('❌ UserAIPreferences missing organizationId or userId');
    } else {
      console.log('     ✅ Both organizationId and userId present');
    }
    
    // 2. Foreign key constraints
    console.log('\n2️⃣ Foreign Key Constraints:');
    const fks = await prisma.$queryRaw`
      SELECT 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('LeadScoringModel', 'UserAIPreferences')
      ORDER BY tc.table_name, kcu.column_name
    `;
    
    fks.forEach(fk => {
      console.log(`     ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    const expectedFKs = [
      'LeadScoringModel.organizationId -> Organization',
      'LeadScoringModel.userId -> User',
      'UserAIPreferences.organizationId -> Organization',
      'UserAIPreferences.userId -> User'
    ];
    
    const actualFKs = fks.map(fk => `${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}`);
    const allFKsPresent = expectedFKs.every(expected => 
      actualFKs.some(actual => actual === expected)
    );
    
    if (allFKsPresent) {
      console.log('     ✅ All foreign keys correctly configured');
    } else {
      issues.push('❌ Missing or incorrect foreign keys');
    }
    
    // 3. Indexes check
    console.log('\n3️⃣ Indexes:');
    const indexes = await prisma.$queryRaw`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes 
      WHERE tablename IN ('LeadScoringModel', 'UserAIPreferences')
      AND indexname LIKE '%organizationId%'
      ORDER BY tablename
    `;
    
    indexes.forEach(idx => {
      console.log(`     ${idx.tablename}: ${idx.indexname}`);
    });
    
    if (indexes.length >= 2) {
      console.log('     ✅ organizationId indexes present');
    } else {
      issues.push('⚠️ organizationId indexes missing (performance impact)');
    }
    
    // 4. Unique constraints
    console.log('\n4️⃣ Unique Constraints:');
    const uniques = await prisma.$queryRaw`
      SELECT 
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_name IN ('LeadScoringModel', 'UserAIPreferences')
      AND kcu.column_name = 'userId'
    `;
    
    uniques.forEach(u => {
      console.log(`     ${u.table_name}.${u.column_name} is UNIQUE`);
    });
    
    if (uniques.length >= 2) {
      console.log('     ✅ userId unique constraints present');
    } else {
      issues.push('❌ userId unique constraints missing');
    }
    
    // 5. Test actual queries work
    console.log('\n5️⃣ Query Functionality:');
    
    try {
      // Test finding by userId
      await prisma.leadScoringModel.findUnique({ where: { userId: 'test-user-id' } });
      console.log('     ✅ LeadScoringModel.findUnique by userId works');
    } catch (e) {
      console.log('     ❌ LeadScoringModel.findUnique failed:', e.message);
      issues.push('❌ LeadScoringModel queries broken');
    }
    
    try {
      // Test finding by organizationId
      await prisma.leadScoringModel.findMany({ 
        where: { organizationId: 'test-org-id' },
        take: 1
      });
      console.log('     ✅ LeadScoringModel.findMany by organizationId works');
    } catch (e) {
      console.log('     ❌ LeadScoringModel.findMany failed:', e.message);
      issues.push('❌ LeadScoringModel organizationId queries broken');
    }
    
    try {
      await prisma.userAIPreferences.findUnique({ where: { userId: 'test-user-id' } });
      console.log('     ✅ UserAIPreferences.findUnique by userId works');
    } catch (e) {
      console.log('     ❌ UserAIPreferences.findUnique failed:', e.message);
      issues.push('❌ UserAIPreferences queries broken');
    }
    
    try {
      await prisma.userAIPreferences.findMany({ 
        where: { organizationId: 'test-org-id' },
        take: 1
      });
      console.log('     ✅ UserAIPreferences.findMany by organizationId works');
    } catch (e) {
      console.log('     ❌ UserAIPreferences.findMany failed:', e.message);
      issues.push('❌ UserAIPreferences organizationId queries broken');
    }
    
    // 6. Test relations work
    console.log('\n6️⃣ Relations:');
    
    const user = await prisma.user.findFirst({
      include: {
        Organization: true,
        LeadScoringModel: true,
        UserAIPreferences: true
      }
    });
    
    if (user) {
      console.log(`     Sample User: ${user.email}`);
      console.log(`       organizationId: ${user.organizationId}`);
      console.log(`       Organization: ${user.Organization ? user.Organization.name : 'null'}`);
      console.log(`       LeadScoringModel: ${user.LeadScoringModel ? 'exists' : 'null'}`);
      console.log(`       UserAIPreferences: ${user.UserAIPreferences ? 'exists' : 'null'}`);
      
      if (user.LeadScoringModel) {
        if (user.LeadScoringModel.organizationId !== user.organizationId) {
          issues.push('❌ LeadScoringModel.organizationId does not match User.organizationId');
        } else {
          console.log('     ✅ LeadScoringModel.organizationId matches User');
        }
        
        if (user.LeadScoringModel.userId !== user.id) {
          issues.push('❌ LeadScoringModel.userId does not match User.id');
        } else {
          console.log('     ✅ LeadScoringModel.userId matches User');
        }
      }
      
      if (user.UserAIPreferences) {
        if (user.UserAIPreferences.organizationId !== user.organizationId) {
          issues.push('❌ UserAIPreferences.organizationId does not match User.organizationId');
        } else {
          console.log('     ✅ UserAIPreferences.organizationId matches User');
        }
        
        if (user.UserAIPreferences.userId !== user.id) {
          issues.push('❌ UserAIPreferences.userId does not match User.id');
        } else {
          console.log('     ✅ UserAIPreferences.userId matches User');
        }
      }
      
      console.log('     ✅ All relations working correctly');
    } else {
      console.log('     ⚠️ No users in database to test relations');
    }
    
    // 7. Check migrations applied
    console.log('\n7️⃣ Migrations:');
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM "_prisma_migrations" 
      WHERE migration_name LIKE '%ai%' OR migration_name LIKE '%per_user%'
      ORDER BY finished_at DESC
    `;
    
    migrations.forEach(m => {
      console.log(`     ${m.migration_name}`);
    });
    
    if (migrations.length >= 2) {
      console.log('     ✅ Both migrations applied (initial + corrective)');
    } else {
      issues.push('⚠️ Expected 2 AI-related migrations, found ' + migrations.length);
    }
    
    // Final Summary
    console.log('\n' + '='.repeat(60));
    
    if (issues.length === 0) {
      console.log('✅✅✅ ALL CHECKS PASSED - EVERYTHING IS CORRECT! ✅✅✅');
      console.log('\n📊 Summary:');
      console.log('   • Database schema: ✅ Correct');
      console.log('   • Foreign keys: ✅ Configured');
      console.log('   • Indexes: ✅ Present');
      console.log('   • Unique constraints: ✅ Working');
      console.log('   • Queries: ✅ Functional');
      console.log('   • Relations: ✅ Valid');
      console.log('   • Migrations: ✅ Applied');
      console.log('\n🎉 System ready for production!\n');
    } else {
      console.log('⚠️ ISSUES FOUND:');
      issues.forEach(issue => console.log('   ' + issue));
      console.log('\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveCheck();
