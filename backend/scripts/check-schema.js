const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const schemaModels = ['Activity','ABTest','AIAssistant','Appointment','Call','Campaign','ChatMessage','EmailTemplate','Lead','LeadScoringModel','Message','Notification','SMSTemplate','Subscription','Tag','Task','User','UserAIPreferences','Workflow'];
  
  const dbTables = await p.$queryRaw`SELECT table_name FROM information_schema.columns WHERE column_name = 'organizationId' ORDER BY table_name`;
  const dbSet = new Set(dbTables.map(t => t.table_name));
  
  const missing = schemaModels.filter(m => !dbSet.has(m));
  console.log('Tables missing organizationId:', missing.length === 0 ? 'NONE - all good!' : missing);
  
  // Check onDelete rules for organizationId FKs
  const fks = await p.$queryRaw`
    SELECT tc.table_name, tc.constraint_name, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.constraint_name LIKE '%organizationId%'
    ORDER BY tc.table_name`;
  
  console.log('\norganizationId FK constraints and delete rules:');
  fks.forEach(f => {
    const icon = f.delete_rule === 'CASCADE' ? '✓' : '✗';
    console.log(`  ${icon} ${f.table_name}: ON DELETE ${f.delete_rule}`);
  });
  
  // Check if prisma thinks schema is in sync
  console.log('\nDone.');
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
