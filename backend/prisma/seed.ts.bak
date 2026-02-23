import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================================
  // ORGANIZATION 1: Josh's Real Estate Agency
  // ============================================================
  console.log('\n📊 Creating Josh\'s Organization...');
  
  const joshOrg = await prisma.organization.upsert({
    where: { slug: 'josh-real-estate' },
    update: {},
    create: {
      name: 'Josh Real Estate Agency',
      slug: 'josh-real-estate',
      domain: 'josh-realestate.com',
      subscriptionTier: 'ENTERPRISE',
      isActive: true,
    },
  });
  console.log('✅ Created Josh\'s organization:', joshOrg.name);

  // Create Josh as admin user
  const joshPassword = await bcrypt.hash('josh123', 10);
  
  const joshUser = await prisma.user.upsert({
    where: { 
      organizationId_email: {
        organizationId: joshOrg.id,
        email: 'josh@realestate.com'
      }
    },
    update: {},
    create: {
      email: 'josh@realestate.com',
      password: joshPassword,
      firstName: 'Josh',
      lastName: 'Thompson',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
      subscriptionTier: 'ENTERPRISE',
      organizationId: joshOrg.id,
    },
  });
  console.log('✅ Created Josh user:', joshUser.email);

  // ============================================================
  // ORGANIZATION 2: Arshia's Property Group
  // ============================================================
  console.log('\n📊 Creating Arshia\'s Organization...');
  
  const arshiaOrg = await prisma.organization.upsert({
    where: { slug: 'arshia-property-group' },
    update: {},
    create: {
      name: 'Arshia Property Group',
      slug: 'arshia-property-group',
      domain: 'arshia-properties.com',
      subscriptionTier: 'PROFESSIONAL',
      isActive: true,
    },
  });
  console.log('✅ Created Arshia\'s organization:', arshiaOrg.name);

  // Create Arshia as admin user
  const arshiaPassword = await bcrypt.hash('arshia123', 10);
  
  const arshiaUser = await prisma.user.upsert({
    where: { 
      organizationId_email: {
        organizationId: arshiaOrg.id,
        email: 'arshia@properties.com'
      }
    },
    update: {},
    create: {
      email: 'arshia@properties.com',
      password: arshiaPassword,
      firstName: 'Arshia',
      lastName: 'Mansouri',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
      subscriptionTier: 'PROFESSIONAL',
      organizationId: arshiaOrg.id,
    },
  });
  console.log('✅ Created Arshia user:', arshiaUser.email);

  // ============================================================
  // JOSH'S DATA (Organization 1)
  // ============================================================
  console.log('\n📝 Creating Josh\'s Tags...');

  // ============================================================
  // JOSH'S DATA (Organization 1)
  // ============================================================
  console.log('\n📝 Creating Josh\'s Tags...');

  // Create Josh's tags
  const joshTags = await Promise.all([
    prisma.tag.upsert({
      where: { 
        organizationId_name: {
          organizationId: joshOrg.id,
          name: 'Hot Lead'
        }
      },
      update: {},
      create: { 
        name: 'Hot Lead', 
        color: '#ef4444',
        organizationId: joshOrg.id
      },
    }),
    prisma.tag.upsert({
      where: { 
        organizationId_name: {
          organizationId: joshOrg.id,
          name: 'Follow Up'
        }
      },
      update: {},
      create: { 
        name: 'Follow Up', 
        color: '#f59e0b',
        organizationId: joshOrg.id
      },
    }),
    prisma.tag.upsert({
      where: { 
        organizationId_name: {
          organizationId: joshOrg.id,
          name: 'VIP'
        }
      },
      update: {},
      create: { 
        name: 'VIP', 
        color: '#8b5cf6',
        organizationId: joshOrg.id
      },
    }),
  ]);
  console.log('✅ Created Josh\'s tags:', joshTags.length);

  console.log('\n👥 Creating Josh\'s Leads...');

  // Create Josh's leads
  const joshLeads = await Promise.all([
    prisma.lead.upsert({
      where: { 
        organizationId_email: {
          organizationId: joshOrg.id,
          email: 'john.smith@example.com'
        }
      },
      update: {},
      create: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-0101',
        company: 'Smith Properties',
        position: 'CEO',
        status: 'NEW',
        score: 85,
        source: 'website',
        value: 250000,
        organizationId: joshOrg.id,
        assignedToId: joshUser.id,
        tags: {
          connect: [
            { id: joshTags[0].id }, // Hot Lead
            { id: joshTags[2].id }  // VIP
          ],
        },
      },
    }),
    prisma.lead.upsert({
      where: { 
        organizationId_email: {
          organizationId: joshOrg.id,
          email: 'sarah.j@example.com'
        }
      },
      update: {},
      create: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.j@example.com',
        phone: '+1-555-0202',
        company: 'Johnson Realty',
        status: 'CONTACTED',
        score: 72,
        source: 'referral',
        value: 180000,
        organizationId: joshOrg.id,
        assignedToId: joshUser.id,
        tags: {
          connect: [{ id: joshTags[1].id }], // Follow Up
        },
      },
    }),
    prisma.lead.upsert({
      where: { 
        organizationId_email: {
          organizationId: joshOrg.id,
          email: 'mike.wilson@example.com'
        }
      },
      update: {},
      create: {
        firstName: 'Mike',
        lastName: 'Wilson',
        email: 'mike.wilson@example.com',
        phone: '+1-555-0303',
        status: 'QUALIFIED',
        score: 90,
        source: 'linkedin',
        value: 350000,
        organizationId: joshOrg.id,
        assignedToId: joshUser.id,
        tags: {
          connect: [
            { id: joshTags[0].id }, // Hot Lead
            { id: joshTags[2].id }  // VIP
          ],
        },
      },
    }),
  ]);
  console.log('✅ Created Josh\'s leads:', joshLeads.length);

  // ============================================================
  // ARSHIA'S DATA (Organization 2)
  // ============================================================
  console.log('\n📝 Creating Arshia\'s Tags...');

  // Create Arshia's tags (same names but different organization)
  const arshiaTags = await Promise.all([
    prisma.tag.upsert({
      where: { 
        organizationId_name: {
          organizationId: arshiaOrg.id,
          name: 'Hot Lead'
        }
      },
      update: {},
      create: { 
        name: 'Hot Lead', 
        color: '#10b981',  // Different color
        organizationId: arshiaOrg.id
      },
    }),
    prisma.tag.upsert({
      where: { 
        organizationId_name: {
          organizationId: arshiaOrg.id,
          name: 'Premium Client'
        }
      },
      update: {},
      create: { 
        name: 'Premium Client', 
        color: '#3b82f6',
        organizationId: arshiaOrg.id
      },
    }),
    prisma.tag.upsert({
      where: { 
        organizationId_name: {
          organizationId: arshiaOrg.id,
          name: 'Investor'
        }
      },
      update: {},
      create: { 
        name: 'Investor', 
        color: '#6366f1',
        organizationId: arshiaOrg.id
      },
    }),
  ]);
  console.log('✅ Created Arshia\'s tags:', arshiaTags.length);

  console.log('\n👥 Creating Arshia\'s Leads...');

  // Create Arshia's leads (completely separate from Josh's)
  const arshiaLeads = await Promise.all([
    prisma.lead.upsert({
      where: { 
        organizationId_email: {
          organizationId: arshiaOrg.id,
          email: 'emily.davis@example.com'
        }
      },
      update: {},
      create: {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@example.com',
        phone: '+1-555-1001',
        company: 'Davis Investments',
        position: 'Portfolio Manager',
        status: 'NEW',
        score: 78,
        source: 'website',
        value: 420000,
        organizationId: arshiaOrg.id,
        assignedToId: arshiaUser.id,
        tags: {
          connect: [
            { id: arshiaTags[0].id }, // Hot Lead
            { id: arshiaTags[2].id }  // Investor
          ],
        },
      },
    }),
    prisma.lead.upsert({
      where: { 
        organizationId_email: {
          organizationId: arshiaOrg.id,
          email: 'robert.chen@example.com'
        }
      },
      update: {},
      create: {
        firstName: 'Robert',
        lastName: 'Chen',
        email: 'robert.chen@example.com',
        phone: '+1-555-2002',
        company: 'Chen Holdings',
        position: 'CEO',
        status: 'QUALIFIED',
        score: 95,
        source: 'referral',
        value: 850000,
        organizationId: arshiaOrg.id,
        assignedToId: arshiaUser.id,
        tags: {
          connect: [
            { id: arshiaTags[1].id }, // Premium Client
            { id: arshiaTags[2].id }  // Investor
          ],
        },
      },
    }),
    prisma.lead.upsert({
      where: { 
        organizationId_email: {
          organizationId: arshiaOrg.id,
          email: 'lisa.anderson@example.com'
        }
      },
      update: {},
      create: {
        firstName: 'Lisa',
        lastName: 'Anderson',
        email: 'lisa.anderson@example.com',
        phone: '+1-555-3003',
        status: 'CONTACTED',
        score: 68,
        source: 'cold_call',
        value: 220000,
        organizationId: arshiaOrg.id,
        assignedToId: arshiaUser.id,
        tags: {
          connect: [{ id: arshiaTags[0].id }], // Hot Lead
        },
      },
    }),
  ]);
  console.log('✅ Created Arshia\'s leads:', arshiaLeads.length);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n✅ Seed completed successfully!');
  console.log('\n📊 MULTI-TENANT DATA SUMMARY:');
  console.log('════════════════════════════════════════');
  console.log(`\n🏢 ORGANIZATION 1: ${joshOrg.name}`);
  console.log(`   👤 User: ${joshUser.email} / Password: josh123`);
  console.log(`   📋 Tags: ${joshTags.length}`);
  console.log(`   👥 Leads: ${joshLeads.length}`);
  console.log(`\n🏢 ORGANIZATION 2: ${arshiaOrg.name}`);
  console.log(`   👤 User: ${arshiaUser.email} / Password: arshia123`);
  console.log(`   📋 Tags: ${arshiaTags.length}`);
  console.log(`   👥 Leads: ${arshiaLeads.length}`);
  console.log('\n════════════════════════════════════════');
  console.log('🔒 DATA ISOLATION: Josh and Arshia have completely separate data!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
