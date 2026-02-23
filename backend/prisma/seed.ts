import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ============================================================================
// REALISTIC REAL ESTATE CRM SEED DATA
// ============================================================================

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// ============================================================================
// DATA POOLS — realistic real-estate themed
// ============================================================================

const firstNames = [
  'James', 'Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 'Robert', 'Jessica',
  'William', 'Ashley', 'Carlos', 'Maria', 'Daniel', 'Amanda', 'Richard', 'Stephanie',
  'Thomas', 'Nicole', 'Kevin', 'Rachel', 'Brian', 'Lisa', 'Anthony', 'Michelle',
  'Marcus', 'Sophia', 'Andrew', 'Lauren', 'Christopher', 'Megan', 'Eric', 'Katherine',
  'Jason', 'Patricia', 'Ryan', 'Samantha', 'Tyler', 'Victoria', 'Nathan', 'Olivia',
  'Derek', 'Alyssa', 'Brandon', 'Christina', 'Gregory', 'Hannah', 'Tony', 'Gabriella',
  'Jose', 'Angela', 'Luis', 'Diana', 'Raj', 'Priya', 'Wei', 'Mei', 'Abdul', 'Fatima'
];

const lastNames = [
  'Thompson', 'Martinez', 'Johnson', 'Williams', 'Anderson', 'Chen', 'Garcia',
  'Davis', 'Rodriguez', 'Wilson', 'Lee', 'Taylor', 'Brown', 'Harris', 'Clark',
  'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott',
  'Green', 'Baker', 'Adams', 'Hill', 'Nelson', 'Carter', 'Mitchell', 'Perez',
  'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards',
  'Collins', 'Stewart', 'Patel', 'Shah', 'Singh', 'Kim', 'Chang', 'Santos',
  'Rivera', 'Cooper', 'Richardson', 'Morales'
];

const companies = [
  'Keller Williams Realty', 'RE/MAX Premier', 'Coldwell Banker Prestige',
  'Century 21 Gold', 'Berkshire Hathaway HomeServices', 'Sotheby\'s International',
  'Compass Real Estate', 'eXp Realty', 'Redfin', 'Douglas Elliman',
  'Howard Hanna', 'Windermere Real Estate', 'Long & Foster', 'Weichert Realtors',
  'Home Smart International', 'EXIT Realty', 'Real Broker', 'United Real Estate',
  'Better Homes and Gardens RE', 'HomeSmart', 'Nest Seekers International',
  'Pinnacle Real Estate Group', 'Luxury Living Realty', 'Metro Properties Inc',
  'Pacific Coast Real Estate', 'Summit Realty', 'Heritage Real Estate',
  'Platinum Realty Partners', 'First Choice Properties', 'Golden Gate Realty',
  'TechStart Inc', 'Goldman Financial', 'Northwestern Mutual', 'JPMorgan Chase',
  'Amazon Web Services', 'Microsoft Corp', 'Apple Inc', 'Google LLC',
  'Tesla Motors', 'SpaceX Ventures', 'Oracle Systems', 'Salesforce Inc'
];

const positions = [
  'Real Estate Agent', 'Broker', 'Property Manager', 'Real Estate Investor',
  'First-Time Buyer', 'Home Seller', 'Relocating Executive', 'Property Developer',
  'Rental Property Owner', 'Commercial Investor', 'Flipper', 'REIT Manager',
  'VP of Operations', 'CEO', 'CFO', 'Director of Sales', 'Marketing Manager',
  'Software Engineer', 'Doctor', 'Attorney', 'Teacher', 'Retired',
  'Business Owner', 'Entrepreneur', 'Consultant', 'Architect'
];

const leadSources = [
  'Zillow', 'Realtor.com', 'Referral', 'Open House', 'Facebook Ads',
  'Google Ads', 'Instagram', 'LinkedIn', 'Website Form', 'Cold Call',
  'Trulia', 'Door Knocking', 'Sphere of Influence', 'Past Client',
  'Builder Referral', 'Lender Referral', 'Sign Call', 'Expired Listing',
  'FSBO', 'Direct Mail', 'YouTube', 'TikTok', 'Networking Event',
  'MLS', 'Walk-In', 'Radio Ad', 'Print Ad', 'Community Event'
];

const tagNames = [
  'Hot Lead', 'Warm Lead', 'Cold Lead', 'VIP Client', 'First-Time Buyer',
  'Luxury Buyer', 'Investor', 'Seller', 'Buyer', 'Renter',
  'Pre-Approved', 'Cash Buyer', 'Relocating', 'Downsizing', 'Upsizing',
  'Commercial', 'Residential', 'Condo', 'Single Family', 'Multi-Family',
  'New Construction', 'Fixer Upper', 'Waterfront', 'Golf Course', 'Gated Community',
  'Priority Follow-Up', 'Nurture', 'Past Client', 'Referral Source', 'Agent'
];

const tagColors = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6',
  '#6366F1', '#A855F7', '#EC4899', '#14B8A6', '#F43F5E',
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#64748B'
];

const cities = [
  'Miami, FL', 'Los Angeles, CA', 'New York, NY', 'Austin, TX', 'Denver, CO',
  'Seattle, WA', 'Chicago, IL', 'Nashville, TN', 'Atlanta, GA', 'Phoenix, AZ',
  'San Diego, CA', 'Dallas, TX', 'Tampa, FL', 'Charlotte, NC', 'Portland, OR',
  'Las Vegas, NV', 'Raleigh, NC', 'San Antonio, TX', 'Orlando, FL', 'Scottsdale, AZ'
];

const emailDomains = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'aol.com', 'protonmail.com', 'comcast.net', 'att.net', 'live.com'
];

const noteContents = [
  'Called client to discuss property preferences. They are looking for a 3-bedroom home in a good school district. Budget is $450K-$550K.',
  'Met at open house on Maple Street. Very interested in the neighborhood. Will follow up with comparable listings.',
  'Pre-approval letter received from First National Bank. Approved for up to $600,000.',
  'Client mentioned they need to sell their current home before purchasing. Listed at $380K, expecting offers within 2 weeks.',
  'Sent 5 property listings matching criteria. Client liked the one on Oak Avenue. Scheduling a showing for Saturday.',
  'Showing went well — loved the kitchen renovation and backyard. Concerned about HOA fees ($350/mo). Running numbers.',
  'Submitted offer at $475,000 with 3% earnest money. Waiting for seller response.',
  'Negotiation: Seller countered at $490K. Client willing to go to $482K. Will present counter-offer.',
  'Inspection scheduled for Thursday with ABC Home Inspectors. Hoping for clean report.',
  'Appraisal came in at $480K — right on target. Proceeding to close.',
  'Closing scheduled for March 15th at Metro Title Company. All docs being prepared.',
  'Client interested in investment properties. Looking for multi-family units with 6%+ cap rate.',
  'Referred by past client Sarah Johnson. High net worth, looking for luxury waterfront property.',
  'Discussed commercial lease options for their expanding dental practice. Need 2,500+ sq ft.',
  'Follow-up call — still shopping around. Not ready to commit. Set reminder for 30 days.',
  'Client mentioned potential relocation to Austin for work. Wants virtual tours of properties.',
  'Great conversation about the market. Very knowledgeable investor — owns 12 rental properties already.',
  'Needs to close before school year starts in August. Timeline is tight but doable.',
  'Just got married, looking for their first home together. Excited and motivated buyers!',
  'Downsizing from 4BR to 2BR condo. Empty nesters. Want walkability and amenities.',
];

const emailTemplateData = [
  { name: 'Welcome New Lead', subject: 'Welcome to {{companyName}} Real Estate!', body: 'Hi {{firstName}},\n\nThank you for your interest in {{companyName}}! We\'re excited to help you find your perfect property.\n\nI\'d love to learn more about what you\'re looking for. Would you have time for a quick call this week?\n\nBest regards,\n{{agentName}}', category: 'Welcome' },
  { name: 'Property Showing Follow-Up', subject: 'Great seeing you at {{propertyAddress}}!', body: 'Hi {{firstName}},\n\nIt was wonderful showing you {{propertyAddress}} today! I hope you enjoyed the tour.\n\nHere are a few key highlights:\n- {{highlight1}}\n- {{highlight2}}\n- {{highlight3}}\n\nWould you like to schedule a second showing or see similar properties? Let me know!\n\nBest,\n{{agentName}}', category: 'Follow-Up' },
  { name: 'Market Update', subject: '📊 Your {{city}} Market Update — {{month}} {{year}}', body: 'Hi {{firstName}},\n\nHere\'s your monthly market update for {{city}}:\n\n📈 Median Home Price: {{medianPrice}}\n🏠 Active Listings: {{activeListings}}\n⏱️ Avg Days on Market: {{daysOnMarket}}\n\nThe market is {{marketCondition}}. {{marketAdvice}}\n\nReady to make your move? Let\'s chat!\n\n{{agentName}}', category: 'Market Update' },
  { name: 'Open House Invitation', subject: 'You\'re Invited! Open House at {{propertyAddress}}', body: 'Hi {{firstName}},\n\n🏡 You\'re invited to an exclusive open house!\n\n📍 {{propertyAddress}}\n📅 {{date}} | {{time}}\n💰 Listed at {{price}}\n\nThis beautiful {{bedrooms}}BR/{{bathrooms}}BA home features {{feature1}} and {{feature2}}.\n\nRSVP or let me know if you\'d like a private showing!\n\n{{agentName}}', category: 'Events' },
  { name: 'Price Reduction Alert', subject: '🔔 Price Drop Alert: {{propertyAddress}}', body: 'Hi {{firstName}},\n\nGreat news! A property you showed interest in just had a price reduction:\n\n{{propertyAddress}}\nNew Price: {{newPrice}} (was {{oldPrice}})\n\nThis is a savings of {{savings}}! Don\'t miss this opportunity.\n\nWant to schedule a showing?\n\n{{agentName}}', category: 'Alerts' },
  { name: 'Happy Anniversary', subject: '🎉 Happy Home Anniversary, {{firstName}}!', body: 'Hi {{firstName}},\n\nHappy anniversary! It\'s been {{years}} year(s) since you found your dream home at {{address}}.\n\nI hope you\'re loving it! If there\'s anything I can help with — whether it\'s a home value update, renovation recommendations, or anything else — don\'t hesitate to reach out.\n\nWarmly,\n{{agentName}}', category: 'Client Retention' },
  { name: 'Just Listed', subject: '🆕 Just Listed: {{propertyAddress}}', body: 'Hi {{firstName}},\n\nI wanted to be the first to let you know about a brand new listing:\n\n🏠 {{propertyAddress}}\n💰 {{price}}\n🛏️ {{bedrooms}} BR | 🛁 {{bathrooms}} BA\n📐 {{sqft}} sq ft\n\n{{description}}\n\nInterested? I can arrange a private showing!\n\n{{agentName}}', category: 'New Listings' },
  { name: 'Under Contract Congratulations', subject: '🎉 Congratulations! You\'re Under Contract!', body: 'Hi {{firstName}},\n\nExciting news — your offer on {{propertyAddress}} has been accepted! 🎉\n\nHere are the next steps:\n1. Earnest money deposit due by {{earnestDeadline}}\n2. Home inspection by {{inspectionDeadline}}\n3. Appraisal scheduled\n4. Estimated closing date: {{closingDate}}\n\nI\'ll be with you every step of the way.\n\n{{agentName}}', category: 'Transaction' },
];

const smsTemplateData = [
  { name: 'Quick Follow-Up', body: 'Hi {{firstName}}, this is {{agentName}} from {{companyName}}. Just checking in — are you still interested in properties in {{area}}? Let me know and I\'ll send some great options!', category: 'Follow-Up' },
  { name: 'Showing Reminder', body: 'Reminder: Your property showing at {{address}} is tomorrow at {{time}}. See you there! — {{agentName}}', category: 'Reminders' },
  { name: 'Open House Reminder', body: '🏡 Don\'t forget! Open house today at {{address}} from {{time}}. Come check it out! — {{agentName}}', category: 'Events' },
  { name: 'New Listing Alert', body: '🆕 Just listed! {{bedrooms}}BR/{{bathrooms}}BA at {{address}} for {{price}}. Want to see it? Reply YES! — {{agentName}}', category: 'Alerts' },
  { name: 'Price Drop Alert', body: '🔔 Price dropped! {{address}} now listed at {{newPrice}} (was {{oldPrice}}). Interested? — {{agentName}}', category: 'Alerts' },
  { name: 'Closing Day', body: '🎉 Congratulations {{firstName}}! Today\'s the big day — closing on {{address}}! See you at {{time}}. — {{agentName}}', category: 'Transaction' },
  { name: 'Anniversary Check-In', body: 'Happy home anniversary {{firstName}}! 🏠 It\'s been {{years}} year(s). Need a home value update? — {{agentName}}', category: 'Client Retention' },
  { name: 'Appointment Confirmation', body: 'Confirmed: Meeting with {{agentName}} on {{date}} at {{time}}. Reply CHANGE to reschedule.', category: 'Reminders' },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🌱 Starting seed...');
  console.log('🗑️  Wiping existing data...');

  // Delete all data in dependency order
  await prisma.$transaction([
    prisma.aBTestResult.deleteMany(),
    prisma.aBTest.deleteMany(),
    prisma.workflowExecution.deleteMany(),
    prisma.workflow.deleteMany(),
    prisma.usageTracking.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.leadScoringModel.deleteMany(),
    prisma.userAIPreferences.deleteMany(),
    prisma.call.deleteMany(),
    prisma.aIAssistant.deleteMany(),
    prisma.aPIKeyAudit.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.note.deleteMany(),
    prisma.task.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.emailTemplate.deleteMany(),
    prisma.sMSTemplate.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.businessSettings.deleteMany(),
    prisma.emailConfig.deleteMany(),
    prisma.sMSConfig.deleteMany(),
    prisma.notificationSettings.deleteMany(),
    prisma.integration.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.team.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  console.log('✅ Database wiped');

  // ==========================================================================
  // 1. CREATE ORGANIZATION
  // ==========================================================================
  console.log('🏢 Creating organization...');
  const org = await prisma.organization.create({
    data: {
      name: 'Pinnacle Real Estate Group',
      slug: 'pinnacle-realty',
      domain: 'pinnaclerealty.com',
      logo: null,
      subscriptionTier: 'PROFESSIONAL',
      isActive: true,
    },
  });

  // ==========================================================================
  // 2. CREATE USERS (TEAM)
  // ==========================================================================
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const adminUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'admin@pinnaclerealty.com',
      password: hashedPassword,
      firstName: 'Josh',
      lastName: 'Mitchell',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
      subscriptionTier: 'PROFESSIONAL',
      timezone: 'America/New_York',
      lastLoginAt: new Date(),
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'sarah@pinnaclerealty.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Thompson',
      role: 'MANAGER',
      isActive: true,
      emailVerified: true,
      subscriptionTier: 'PROFESSIONAL',
      timezone: 'America/New_York',
      lastLoginAt: randomDate(new Date('2025-12-01'), new Date()),
    },
  });

  const agentUser1 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'michael@pinnaclerealty.com',
      password: hashedPassword,
      firstName: 'Michael',
      lastName: 'Rivera',
      role: 'USER',
      isActive: true,
      emailVerified: true,
      subscriptionTier: 'PROFESSIONAL',
      timezone: 'America/Chicago',
      lastLoginAt: randomDate(new Date('2025-12-01'), new Date()),
    },
  });

  const agentUser2 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'emily@pinnaclerealty.com',
      password: hashedPassword,
      firstName: 'Emily',
      lastName: 'Chen',
      role: 'USER',
      isActive: true,
      emailVerified: true,
      subscriptionTier: 'PROFESSIONAL',
      timezone: 'America/Los_Angeles',
      lastLoginAt: randomDate(new Date('2025-12-01'), new Date()),
    },
  });

  const users = [adminUser, managerUser, agentUser1, agentUser2];
  console.log(`   ✅ Created ${users.length} users`);

  // ==========================================================================
  // 3. SUBSCRIPTION
  // ==========================================================================
  console.log('💳 Creating subscription...');
  const subscription = await prisma.subscription.create({
    data: {
      organizationId: org.id,
      tier: 'PROFESSIONAL',
      status: 'ACTIVE',
      currentPeriodStart: new Date('2025-11-01'),
      currentPeriodEnd: new Date('2026-11-01'),
    },
  });

  // Usage tracking
  await prisma.usageTracking.create({
    data: {
      subscriptionId: subscription.id,
      month: '2026-02',
      aiMessages: randomInt(50, 200),
      callMinutes: randomFloat(10, 120),
      enhancements: randomInt(5, 30),
    },
  });

  // ==========================================================================
  // 4. TEAM
  // ==========================================================================
  console.log('🏠 Creating team...');
  const team = await prisma.team.create({
    data: {
      name: 'Pinnacle Real Estate Group',
      slug: 'pinnacle-team',
      subscriptionTier: 'PROFESSIONAL',
    },
  });

  for (const [i, user] of users.entries()) {
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: i === 0 ? 'OWNER' : i === 1 ? 'ADMIN' : 'MEMBER',
      },
    });
  }

  // ==========================================================================
  // 5. BUSINESS SETTINGS
  // ==========================================================================
  console.log('⚙️  Creating business settings...');
  await prisma.businessSettings.create({
    data: {
      userId: adminUser.id,
      companyName: 'Pinnacle Real Estate Group',
      address: '1250 Ocean Drive, Suite 400, Miami, FL 33139',
      phone: '(305) 555-0100',
      website: 'https://pinnaclerealty.com',
      billingEmail: 'billing@pinnaclerealty.com',
      businessHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { open: '10:00', close: '14:00' },
        sunday: { open: 'closed', close: 'closed' },
      },
    },
  });

  // ==========================================================================
  // 6. NOTIFICATION SETTINGS
  // ==========================================================================
  for (const user of users) {
    await prisma.notificationSettings.create({
      data: {
        userId: user.id,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: user.role === 'ADMIN',
      },
    });
  }

  // ==========================================================================
  // 7. TAGS
  // ==========================================================================
  console.log('🏷️  Creating tags...');
  const tags: any[] = [];
  for (let i = 0; i < tagNames.length; i++) {
    const tag = await prisma.tag.create({
      data: {
        name: tagNames[i],
        color: tagColors[i % tagColors.length],
        organizationId: org.id,
      },
    });
    tags.push(tag);
  }
  console.log(`   ✅ Created ${tags.length} tags`);

  // ==========================================================================
  // 8. LEADS (75 realistic leads)
  // ==========================================================================
  console.log('👤 Creating leads...');
  const leads: any[] = [];
  const usedEmails = new Set<string>();
  const leadStatuses: any[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
  const leadStatusWeights = [15, 15, 15, 12, 10, 8, 5]; // skew towards active stages

  for (let i = 0; i < 75; i++) {
    const fn = randomPick(firstNames);
    const ln = randomPick(lastNames);
    let email = `${fn.toLowerCase()}.${ln.toLowerCase()}@${randomPick(emailDomains)}`;
    
    // Ensure unique email per org
    while (usedEmails.has(email)) {
      email = `${fn.toLowerCase()}.${ln.toLowerCase()}${randomInt(1, 999)}@${randomPick(emailDomains)}`;
    }
    usedEmails.add(email);

    // Weighted status selection
    const totalWeight = leadStatusWeights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let statusIdx = 0;
    for (let j = 0; j < leadStatusWeights.length; j++) {
      r -= leadStatusWeights[j];
      if (r <= 0) { statusIdx = j; break; }
    }
    const status = leadStatuses[statusIdx];

    const score = status === 'WON' ? randomInt(80, 100) :
                  status === 'NEGOTIATION' ? randomInt(60, 90) :
                  status === 'PROPOSAL' ? randomInt(50, 80) :
                  status === 'QUALIFIED' ? randomInt(40, 70) :
                  status === 'CONTACTED' ? randomInt(20, 50) :
                  status === 'LOST' ? randomInt(5, 30) :
                  randomInt(10, 40);

    const value = status === 'WON' ? randomFloat(200000, 2500000) :
                  status === 'NEGOTIATION' ? randomFloat(300000, 1800000) :
                  status === 'PROPOSAL' ? randomFloat(250000, 1500000) :
                  randomFloat(150000, 900000);

    const stages = ['Discovery', 'Showing', 'Offer', 'Under Contract', 'Closed'];
    const stage = status === 'WON' ? 'Closed' :
                  status === 'NEGOTIATION' ? 'Under Contract' :
                  status === 'PROPOSAL' ? 'Offer' :
                  status === 'QUALIFIED' ? 'Showing' :
                  'Discovery';

    const createdAt = randomDate(new Date('2025-06-01'), new Date('2026-02-15'));
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        firstName: fn,
        lastName: ln,
        email,
        phone: `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${String(randomInt(1000, 9999)).padStart(4, '0')}`,
        company: Math.random() > 0.3 ? randomPick(companies) : null,
        position: Math.random() > 0.25 ? randomPick(positions) : null,
        status,
        score,
        source: randomPick(leadSources),
        value,
        stage,
        assignedToId: randomPick(users).id,
        createdAt,
        updatedAt: randomDate(createdAt, new Date()),
        lastContactAt: Math.random() > 0.2 ? randomDate(createdAt, new Date()) : null,
        emailOptIn: Math.random() > 0.1,
        unsubscribeToken: crypto.randomUUID(),
        customFields: Math.random() > 0.5 ? {
          preferredArea: randomPick(cities),
          budgetMin: randomInt(150, 500) * 1000,
          budgetMax: randomInt(500, 2500) * 1000,
          bedrooms: randomInt(2, 6),
          bathrooms: randomInt(1, 4),
          propertyType: randomPick(['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Commercial']),
          preApproved: Math.random() > 0.5,
          timeline: randomPick(['ASAP', '1-3 months', '3-6 months', '6-12 months', 'Just browsing']),
        } : null,
      },
    });
    leads.push(lead);

    // Assign 1-3 random tags to each lead
    const numTags = randomInt(1, 3);
    const shuffledTags = [...tags].sort(() => Math.random() - 0.5).slice(0, numTags);
    await prisma.lead.update({
      where: { id: lead.id },
      data: { tags: { connect: shuffledTags.map(t => ({ id: t.id })) } },
    });
  }
  console.log(`   ✅ Created ${leads.length} leads`);

  // ==========================================================================
  // 9. NOTES (2-4 per lead, totaling ~200)
  // ==========================================================================
  console.log('📝 Creating notes...');
  let noteCount = 0;
  for (const lead of leads) {
    const numNotes = randomInt(1, 4);
    for (let j = 0; j < numNotes; j++) {
      await prisma.note.create({
        data: {
          content: randomPick(noteContents),
          leadId: lead.id,
          authorId: randomPick(users).id,
          createdAt: randomDate(lead.createdAt, new Date()),
        },
      });
      noteCount++;
    }
  }
  console.log(`   ✅ Created ${noteCount} notes`);

  // ==========================================================================
  // 10. TASKS
  // ==========================================================================
  console.log('✅ Creating tasks...');
  const taskTitles = [
    'Follow up with {{name}} about property showing',
    'Send comparative market analysis to {{name}}',
    'Schedule home inspection for {{name}}',
    'Prepare listing presentation for {{name}}',
    'Call {{name}} about pre-approval status',
    'Send new listings matching {{name}}\'s criteria',
    'Review and submit offer for {{name}}',
    'Coordinate closing documents for {{name}}',
    'Send thank you gift to {{name}}',
    'Update MLS listing photos',
    'Schedule virtual tour for {{name}}',
    'Follow up on open house leads',
    'Reach out to expired listing owners',
    'Prepare monthly market update newsletter',
    'Review contract terms with {{name}}',
    'Order property appraisal for {{name}}',
    'Coordinate with lender on {{name}}\'s file',
    'Confirm appointment with {{name}}',
    'Draft counter-offer for {{name}}',
    'Send home maintenance checklist to {{name}}',
  ];
  const taskStatuses: any[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const taskPriorities: any[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  let taskCount = 0;

  for (let i = 0; i < 40; i++) {
    const lead = randomPick(leads);
    const status = randomPick(taskStatuses);
    const title = randomPick(taskTitles).replace('{{name}}', `${lead.firstName} ${lead.lastName}`);
    const dueDate = randomDate(new Date(), new Date('2026-04-01'));

    await prisma.task.create({
      data: {
        title,
        description: `Task related to ${lead.firstName} ${lead.lastName}'s real estate transaction.`,
        status,
        priority: randomPick(taskPriorities),
        dueDate,
        leadId: lead.id,
        assignedToId: randomPick(users).id,
        organizationId: org.id,
        completedAt: status === 'COMPLETED' ? randomDate(new Date('2025-12-01'), new Date()) : null,
        createdAt: randomDate(new Date('2025-10-01'), new Date()),
      },
    });
    taskCount++;
  }
  console.log(`   ✅ Created ${taskCount} tasks`);

  // ==========================================================================
  // 11. APPOINTMENTS
  // ==========================================================================
  console.log('📅 Creating appointments...');
  const appointmentTypes: any[] = ['CALL', 'MEETING', 'DEMO', 'CONSULTATION', 'FOLLOW_UP'];
  const appointmentStatuses: any[] = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  let apptCount = 0;

  for (let i = 0; i < 35; i++) {
    const lead = randomPick(leads);
    const user = randomPick(users);
    const startTime = randomDate(new Date('2025-12-01'), new Date('2026-03-30'));
    const endTime = new Date(startTime.getTime() + randomInt(30, 120) * 60000);
    const isFuture = startTime > new Date();
    const status: any = isFuture ? randomPick(['SCHEDULED', 'CONFIRMED']) : randomPick(appointmentStatuses);

    const locations = [
      '1250 Ocean Drive, Suite 400, Miami, FL',
      '456 Palm Ave, Fort Lauderdale, FL',
      '789 Brickell Blvd, Miami, FL',
      'Virtual — Zoom Meeting',
      'Starbucks on Main Street',
      `${lead.firstName}'s current residence`,
      'Office — Conference Room A',
      `Property: ${randomInt(100, 9999)} ${randomPick(['Oak', 'Maple', 'Pine', 'Elm', 'Cedar'])} ${randomPick(['St', 'Ave', 'Blvd', 'Dr', 'Ln'])}`,
    ];

    await prisma.appointment.create({
      data: {
        title: `${randomPick(['Property Showing', 'Listing Consultation', 'Buyer Consultation', 'Offer Review', 'Closing Meeting', 'Home Inspection', 'Market Analysis Review', 'Contract Signing'])} — ${lead.firstName} ${lead.lastName}`,
        description: `Meeting with ${lead.firstName} ${lead.lastName} to discuss their real estate needs.`,
        startTime,
        endTime,
        location: randomPick(locations),
        meetingUrl: Math.random() > 0.5 ? 'https://zoom.us/j/' + randomInt(10000000000, 99999999999) : null,
        type: randomPick(appointmentTypes),
        status,
        userId: user.id,
        leadId: lead.id,
        organizationId: org.id,
        reminderSent: !isFuture,
      },
    });
    apptCount++;
  }
  console.log(`   ✅ Created ${apptCount} appointments`);

  // ==========================================================================
  // 12. CAMPAIGNS
  // ==========================================================================
  console.log('📨 Creating campaigns...');
  const campaignData = [
    { name: 'Spring Market Kickoff 2026', type: 'EMAIL', status: 'COMPLETED', subject: '🌸 Spring is Here — Hot New Listings!', body: 'Check out the latest properties hitting the market this spring...', budget: 2500 },
    { name: 'First-Time Buyer Workshop', type: 'EMAIL', status: 'ACTIVE', subject: '🏠 Free First-Time Buyer Workshop — Reserve Your Spot!', body: 'Join us for a free workshop covering everything you need to know...', budget: 1500 },
    { name: 'Investment Property Alert', type: 'EMAIL', status: 'ACTIVE', subject: '💰 Exclusive Investment Opportunities', body: 'We\'ve identified high-yield investment properties in your area...', budget: 3000 },
    { name: 'Holiday Season Greetings', type: 'EMAIL', status: 'COMPLETED', subject: '🎄 Happy Holidays from Pinnacle Realty!', body: 'Wishing you a wonderful holiday season and a happy new year!', budget: 800 },
    { name: 'New Listing Blast — Luxury', type: 'EMAIL', status: 'DRAFT', subject: '✨ Just Listed: Luxury Waterfront Estate', body: 'A stunning waterfront property just hit the market...', budget: 5000 },
    { name: 'Open House Weekend SMS', type: 'SMS', status: 'COMPLETED', subject: null, body: '🏡 Open Houses this weekend! 3 amazing properties to tour. Reply YES for details!', budget: 500 },
    { name: 'Seller Lead Nurture', type: 'EMAIL', status: 'ACTIVE', subject: 'What\'s Your Home Worth in Today\'s Market?', body: 'Curious about your home\'s current value? Get a free market analysis...', budget: 2000 },
    { name: 'Price Reduction Alerts', type: 'SMS', status: 'ACTIVE', subject: null, body: '🔔 Price drops on properties you liked! Check your inbox for details.', budget: 400 },
    { name: 'Q1 Market Report', type: 'EMAIL', status: 'SCHEDULED', subject: '📊 Q1 2026 Real Estate Market Report', body: 'Your comprehensive quarterly market analysis is here...', budget: 1200 },
    { name: 'Referral Program Launch', type: 'EMAIL', status: 'DRAFT', subject: '🎁 Earn $500 for Every Referral!', body: 'Know someone looking to buy or sell? Refer them and earn $500...', budget: 3000 },
    { name: 'Cold Call Follow-Up', type: 'PHONE', status: 'ACTIVE', subject: null, body: 'Follow-up call script for expired listing leads...', budget: 200 },
    { name: 'Social Media Lead Capture', type: 'SOCIAL', status: 'ACTIVE', subject: null, body: 'Targeted ad campaign for Facebook and Instagram lead generation...', budget: 4500 },
  ];

  const campaigns: any[] = [];
  for (const c of campaignData) {
    const audience = randomInt(50, 500);
    const sent = c.status === 'DRAFT' ? 0 : randomInt(Math.floor(audience * 0.7), audience);
    const delivered = Math.floor(sent * randomFloat(0.92, 0.99));
    const opened = Math.floor(delivered * randomFloat(0.15, 0.45));
    const clicked = Math.floor(opened * randomFloat(0.1, 0.35));
    const converted = Math.floor(clicked * randomFloat(0.05, 0.2));
    const bounced = sent - delivered;

    const startDate = c.status === 'COMPLETED'
      ? randomDate(new Date('2025-09-01'), new Date('2026-01-15'))
      : c.status === 'ACTIVE'
      ? randomDate(new Date('2026-01-01'), new Date('2026-02-10'))
      : new Date('2026-03-01');

    const campaign = await prisma.campaign.create({
      data: {
        name: c.name,
        type: c.type as any,
        status: c.status as any,
        subject: c.subject,
        body: c.body,
        startDate,
        endDate: c.status === 'COMPLETED' ? new Date(startDate.getTime() + randomInt(7, 30) * 86400000) : null,
        budget: c.budget,
        spent: c.status === 'DRAFT' ? 0 : randomFloat(c.budget * 0.3, c.budget * 0.95),
        audience,
        sent,
        delivered,
        opened,
        clicked,
        converted,
        bounced,
        unsubscribed: randomInt(0, 5),
        revenue: converted * randomFloat(5000, 25000),
        roi: randomFloat(1.5, 8.0),
        createdById: randomPick(users).id,
        organizationId: org.id,
        createdAt: randomDate(new Date('2025-08-01'), startDate),
      },
    });
    campaigns.push(campaign);
  }

  // Tag some campaigns
  for (const campaign of campaigns.slice(0, 5)) {
    const campaignTags = [...tags].sort(() => Math.random() - 0.5).slice(0, randomInt(1, 3));
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { tags: { connect: campaignTags.map(t => ({ id: t.id })) } },
    });
  }
  console.log(`   ✅ Created ${campaigns.length} campaigns`);

  // ==========================================================================
  // 13. EMAIL TEMPLATES
  // ==========================================================================
  console.log('📧 Creating email templates...');
  for (const tmpl of emailTemplateData) {
    await prisma.emailTemplate.create({
      data: {
        name: tmpl.name,
        subject: tmpl.subject,
        body: tmpl.body,
        category: tmpl.category,
        isActive: true,
        usageCount: randomInt(0, 150),
        organizationId: org.id,
        variables: ['firstName', 'lastName', 'agentName', 'companyName', 'propertyAddress'],
      },
    });
  }
  console.log(`   ✅ Created ${emailTemplateData.length} email templates`);

  // ==========================================================================
  // 14. SMS TEMPLATES
  // ==========================================================================
  console.log('💬 Creating SMS templates...');
  for (const tmpl of smsTemplateData) {
    await prisma.sMSTemplate.create({
      data: {
        name: tmpl.name,
        body: tmpl.body,
        category: tmpl.category,
        isActive: true,
        usageCount: randomInt(0, 80),
        organizationId: org.id,
        variables: ['firstName', 'agentName', 'companyName', 'address', 'price'],
      },
    });
  }
  console.log(`   ✅ Created ${smsTemplateData.length} SMS templates`);

  // ==========================================================================
  // 15. MESSAGES (email/sms history)
  // ==========================================================================
  console.log('✉️  Creating messages...');
  const messageTypes: any[] = ['EMAIL', 'SMS'];
  const messageStatuses: any[] = ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'];
  let msgCount = 0;

  for (let i = 0; i < 120; i++) {
    const lead = randomPick(leads);
    const direction: any = Math.random() > 0.3 ? 'OUTBOUND' : 'INBOUND';
    const type = randomPick(messageTypes);
    const sentAt = randomDate(new Date('2025-09-01'), new Date());

    await prisma.message.create({
      data: {
        type,
        direction,
        subject: type === 'EMAIL' ? randomPick([
          `Re: Property at ${randomInt(100, 9999)} Oak Street`,
          'Your Home Search Update',
          'New Listings Matching Your Criteria',
          'Following Up on Our Conversation',
          'Market Update for Your Area',
          'Offer Status Update',
          'Documents Needed for Closing',
          `Open House This Weekend!`,
        ]) : null,
        body: type === 'EMAIL'
          ? `Hi ${lead.firstName},\n\nI wanted to follow up on our recent conversation about your property search. ${randomPick(['I found some new listings that match your criteria.', 'I have an update on the property you were interested in.', 'Please let me know if you have any questions.', 'I have great news about the market in your preferred area.'])}\n\nBest regards,\n${randomPick(users).firstName}`
          : randomPick([
              `Hi ${lead.firstName}, just checking in about your home search. Any questions?`,
              `New listing alert! ${randomInt(3, 6)}BR in ${randomPick(cities)} for $${randomInt(250, 950)}K. Interested?`,
              `Reminder: Your showing is tomorrow at 2pm. See you there!`,
              `Thanks for visiting the open house today! Let's chat about next steps.`,
              `Your home value estimate is ready. Want to discuss over coffee?`,
            ]),
        fromAddress: direction === 'OUTBOUND' ? `${randomPick(users).firstName.toLowerCase()}@pinnaclerealty.com` : lead.email,
        toAddress: direction === 'OUTBOUND' ? lead.email : `${randomPick(users).firstName.toLowerCase()}@pinnaclerealty.com`,
        status: randomPick(messageStatuses),
        leadId: lead.id,
        organizationId: org.id,
        sentAt,
        createdAt: sentAt,
        deliveredAt: new Date(sentAt.getTime() + randomInt(1, 60) * 1000),
      },
    });
    msgCount++;
  }
  console.log(`   ✅ Created ${msgCount} messages`);

  // ==========================================================================
  // 16. ACTIVITIES
  // ==========================================================================
  console.log('📊 Creating activities...');
  const activityTypes: any[] = [
    'EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'SMS_SENT', 'SMS_DELIVERED',
    'CALL_MADE', 'CALL_RECEIVED', 'MEETING_SCHEDULED', 'MEETING_COMPLETED',
    'NOTE_ADDED', 'STATUS_CHANGED', 'LEAD_CREATED', 'LEAD_ASSIGNED',
  ];
  let actCount = 0;

  for (let i = 0; i < 200; i++) {
    const lead = randomPick(leads);
    const type = randomPick(activityTypes);
    const user = randomPick(users);

    const titleMap: Record<string, string> = {
      'EMAIL_SENT': `Email sent to ${lead.firstName} ${lead.lastName}`,
      'EMAIL_OPENED': `${lead.firstName} opened email`,
      'EMAIL_CLICKED': `${lead.firstName} clicked email link`,
      'SMS_SENT': `SMS sent to ${lead.firstName}`,
      'SMS_DELIVERED': `SMS delivered to ${lead.firstName}`,
      'CALL_MADE': `${user.firstName} called ${lead.firstName}`,
      'CALL_RECEIVED': `Incoming call from ${lead.firstName}`,
      'MEETING_SCHEDULED': `Meeting scheduled with ${lead.firstName}`,
      'MEETING_COMPLETED': `Meeting completed with ${lead.firstName}`,
      'NOTE_ADDED': `Note added for ${lead.firstName}`,
      'STATUS_CHANGED': `${lead.firstName}'s status updated`,
      'LEAD_CREATED': `New lead: ${lead.firstName} ${lead.lastName}`,
      'LEAD_ASSIGNED': `${lead.firstName} assigned to ${user.firstName}`,
    };

    await prisma.activity.create({
      data: {
        type,
        title: titleMap[type] || `Activity for ${lead.firstName}`,
        description: `${type.replace(/_/g, ' ').toLowerCase()} — ${lead.firstName} ${lead.lastName}`,
        leadId: lead.id,
        userId: user.id,
        organizationId: org.id,
        createdAt: randomDate(lead.createdAt, new Date()),
      },
    });
    actCount++;
  }
  console.log(`   ✅ Created ${actCount} activities`);

  // ==========================================================================
  // 17. WORKFLOWS
  // ==========================================================================
  console.log('⚡ Creating workflows...');
  const workflowData = [
    {
      name: 'New Lead Welcome Sequence',
      description: 'Automatically sends a welcome email and assigns a follow-up task when a new lead is created.',
      triggerType: 'LEAD_CREATED',
      isActive: true,
      actions: [
        { type: 'SEND_EMAIL', template: 'Welcome New Lead', delay: 0 },
        { type: 'CREATE_TASK', title: 'Follow up with new lead', delay: 86400000, priority: 'HIGH' },
        { type: 'SEND_SMS', template: 'Quick Follow-Up', delay: 172800000 },
      ],
    },
    {
      name: 'Hot Lead Escalation',
      description: 'When a lead score reaches 80+, notify the manager and schedule a priority follow-up.',
      triggerType: 'SCORE_THRESHOLD',
      triggerData: { threshold: 80 },
      isActive: true,
      actions: [
        { type: 'NOTIFY_USER', userId: managerUser.id, message: 'Hot lead detected!' },
        { type: 'CREATE_TASK', title: 'Priority follow-up with hot lead', priority: 'URGENT' },
        { type: 'SEND_EMAIL', template: 'VIP Lead Introduction' },
      ],
    },
    {
      name: 'Listing Anniversary Nurture',
      description: 'Send anniversary emails to past clients on their home purchase anniversary.',
      triggerType: 'TIME_BASED',
      triggerData: { cron: '0 9 * * *', condition: 'anniversary' },
      isActive: true,
      actions: [
        { type: 'SEND_EMAIL', template: 'Happy Anniversary' },
        { type: 'SEND_SMS', template: 'Anniversary Check-In' },
      ],
    },
    {
      name: 'Stale Lead Re-engagement',
      description: 'Re-engage leads that haven\'t been contacted in 30 days.',
      triggerType: 'TIME_BASED',
      triggerData: { cron: '0 10 * * 1', condition: 'no_contact_30_days' },
      isActive: true,
      actions: [
        { type: 'SEND_EMAIL', template: 'Market Update', delay: 0 },
        { type: 'CREATE_TASK', title: 'Re-engage stale lead', priority: 'MEDIUM', delay: 86400000 },
      ],
    },
    {
      name: 'Campaign Completion Follow-Up',
      description: 'After a campaign completes, create follow-up tasks for engaged leads.',
      triggerType: 'CAMPAIGN_COMPLETED',
      isActive: false,
      actions: [
        { type: 'CREATE_TASK', title: 'Follow up on campaign engagement', priority: 'HIGH' },
        { type: 'SEND_EMAIL', template: 'Property Showing Follow-Up' },
      ],
    },
    {
      name: 'Lead Status Change Notification',
      description: 'Notify team when a lead moves to Proposal or Negotiation stage.',
      triggerType: 'LEAD_STATUS_CHANGED',
      triggerData: { toStatus: ['PROPOSAL', 'NEGOTIATION'] },
      isActive: true,
      actions: [
        { type: 'NOTIFY_USER', message: 'Lead advanced to {{newStatus}}!' },
        { type: 'CREATE_TASK', title: 'Review and prepare for next steps', priority: 'HIGH' },
      ],
    },
  ];

  const workflows: any[] = [];
  for (const w of workflowData) {
    const workflow = await prisma.workflow.create({
      data: {
        name: w.name,
        description: w.description,
        isActive: w.isActive,
        triggerType: w.triggerType as any,
        triggerData: w.triggerData || null,
        actions: w.actions,
        executions: w.isActive ? randomInt(10, 200) : 0,
        successRate: w.isActive ? randomFloat(85, 99) : null,
        lastRunAt: w.isActive ? randomDate(new Date('2026-01-01'), new Date()) : null,
        organizationId: org.id,
      },
    });
    workflows.push(workflow);

    // Add some execution history for active workflows
    if (w.isActive) {
      const numExecs = randomInt(3, 8);
      for (let i = 0; i < numExecs; i++) {
        const startedAt = randomDate(new Date('2026-01-01'), new Date());
        const success = Math.random() > 0.1;
        await prisma.workflowExecution.create({
          data: {
            workflowId: workflow.id,
            status: success ? 'SUCCESS' : 'FAILED',
            error: success ? null : 'Failed to send email: connection timeout',
            leadId: randomPick(leads).id,
            startedAt,
            completedAt: new Date(startedAt.getTime() + randomInt(1000, 30000)),
            metadata: { triggeredBy: 'system', executionTime: randomInt(500, 5000) },
          },
        });
      }
    }
  }
  console.log(`   ✅ Created ${workflows.length} workflows with execution history`);

  // ==========================================================================
  // 18. NOTIFICATIONS
  // ==========================================================================
  console.log('🔔 Creating notifications...');
  const notificationData = [
    { type: 'lead_assigned', title: 'New Lead Assigned', message: 'You\'ve been assigned a new lead: {{name}}' },
    { type: 'appointment_reminder', title: 'Upcoming Appointment', message: 'You have a showing in 1 hour with {{name}}' },
    { type: 'task_due', title: 'Task Due Today', message: 'Task "{{task}}" is due today' },
    { type: 'campaign_completed', title: 'Campaign Completed', message: 'Campaign "{{campaign}}" has finished with {{opens}} opens' },
    { type: 'lead_converted', title: '🎉 Lead Converted!', message: '{{name}} has been marked as WON — Congratulations!' },
    { type: 'new_message', title: 'New Message', message: 'You received a new {{type}} from {{name}}' },
    { type: 'workflow_error', title: 'Workflow Error', message: 'Workflow "{{workflow}}" failed — please check' },
    { type: 'system', title: 'System Update', message: 'New features available! Check out AI Compose and Smart Scoring.' },
  ];

  let notifCount = 0;
  for (const user of users) {
    const numNotifs = randomInt(5, 15);
    for (let i = 0; i < numNotifs; i++) {
      const notif = randomPick(notificationData);
      const lead = randomPick(leads);
      await prisma.notification.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          type: notif.type,
          title: notif.title,
          message: notif.message
            .replace('{{name}}', `${lead.firstName} ${lead.lastName}`)
            .replace('{{task}}', `Follow up with ${lead.firstName}`)
            .replace('{{campaign}}', randomPick(campaigns).name)
            .replace('{{opens}}', String(randomInt(50, 300)))
            .replace('{{type}}', randomPick(['email', 'SMS']))
            .replace('{{workflow}}', randomPick(workflows).name),
          read: Math.random() > 0.4,
          createdAt: randomDate(new Date('2026-01-01'), new Date()),
          link: Math.random() > 0.5 ? `/leads/${lead.id}` : null,
        },
      });
      notifCount++;
    }
  }
  console.log(`   ✅ Created ${notifCount} notifications`);

  // ==========================================================================
  // 19. AI ASSISTANT (Voice AI)
  // ==========================================================================
  console.log('🤖 Creating AI assistants...');
  const assistant = await prisma.aIAssistant.create({
    data: {
      organizationId: org.id,
      vapiAssistantId: 'vapi_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20),
      name: 'Pinnacle AI Receptionist',
      businessName: 'Pinnacle Real Estate Group',
      greeting: 'Hello! Thank you for calling Pinnacle Real Estate Group. My name is Alex, your AI assistant. How can I help you today?',
      voice: 'alloy',
      knowledgeBase: {
        services: ['Residential Sales', 'Luxury Properties', 'Commercial Leasing', 'Property Management', 'Investment Consulting'],
        areas: ['Miami', 'Fort Lauderdale', 'Boca Raton', 'Palm Beach', 'Coral Gables'],
        hours: 'Monday-Friday 9am-6pm, Saturday 10am-2pm',
        team: users.map(u => ({ name: `${u.firstName} ${u.lastName}`, role: u.role })),
      },
      phoneNumber: '(305) 555-0100',
      isActive: true,
    },
  });

  // ==========================================================================
  // 20. CALLS
  // ==========================================================================
  console.log('📞 Creating call history...');
  let callCount = 0;
  for (let i = 0; i < 30; i++) {
    const lead = randomPick(leads);
    const direction = Math.random() > 0.4 ? 'outbound' : 'inbound';
    const statuses = ['completed', 'no-answer', 'busy', 'voicemail', 'failed'];
    const status = randomPick(statuses);
    const duration = status === 'completed' ? randomInt(30, 600) : status === 'voicemail' ? randomInt(15, 60) : 0;

    await prisma.call.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        assistantId: Math.random() > 0.6 ? assistant.id : null,
        vapiCallId: 'call_' + crypto.randomUUID().replace(/-/g, ''),
        direction,
        phoneNumber: lead.phone || '(305) 555-0000',
        status,
        duration,
        cost: duration > 0 ? randomFloat(0.01, 0.15) * duration / 60 : 0,
        transcript: status === 'completed' ? `Agent: Hello ${lead.firstName}, this is ${randomPick(users).firstName} from Pinnacle Real Estate. How are you today?\n${lead.firstName}: Hi! I'm doing well, thanks for calling back.\nAgent: Of course! I wanted to follow up on some properties we discussed...\n${lead.firstName}: Yes, I'm particularly interested in the one on Oak Street.\nAgent: Great choice! Let me tell you more about it...` : null,
        sentiment: status === 'completed' ? randomPick(['positive', 'neutral', 'positive', 'very_positive']) : null,
        appointmentBooked: status === 'completed' && Math.random() > 0.6,
        createdAt: randomDate(new Date('2025-12-01'), new Date()),
        metadata: { source: direction === 'inbound' ? 'sign_call' : 'crm_dialer' },
      },
    });
    callCount++;
  }
  console.log(`   ✅ Created ${callCount} calls`);

  // ==========================================================================
  // 21. CHAT MESSAGES (AI Chatbot history)
  // ==========================================================================
  console.log('💭 Creating chat history...');
  const chatConversations = [
    [
      { role: 'user', content: 'What\'s the average home price in Miami right now?' },
      { role: 'assistant', content: 'Based on current market data, the average home price in Miami is approximately $580,000 as of February 2026. However, this varies significantly by neighborhood:\n\n- **Coral Gables**: ~$850K\n- **Brickell**: ~$650K (condos)\n- **Coconut Grove**: ~$1.2M\n- **Kendall**: ~$420K\n\nWould you like me to pull up specific listings or a detailed market analysis for a particular area?' },
    ],
    [
      { role: 'user', content: 'Help me draft a follow-up email for a lead who attended my open house' },
      { role: 'assistant', content: 'Here\'s a personalized follow-up email draft:\n\n**Subject:** Great meeting you at the open house! 🏡\n\nHi [First Name],\n\nIt was wonderful meeting you at the open house on [Property Address] this weekend! I hope you enjoyed touring the home.\n\nA few highlights that stood out:\n- The renovated chef\'s kitchen with quartz countertops\n- The spacious backyard perfect for entertaining\n- The excellent school district\n\nI\'d love to help you explore more options. Would you be available for a quick call this week to discuss what you\'re looking for?\n\nBest regards,\n[Your Name]\n\nWould you like me to adjust the tone or add any specific details?' },
    ],
    [
      { role: 'user', content: 'What should my lead scoring criteria be for real estate?' },
      { role: 'assistant', content: 'Here\'s a recommended lead scoring framework for real estate:\n\n**High Value (20-30 pts each):**\n- Pre-approved for financing (+30)\n- Timeline within 3 months (+25)\n- Responded to outreach (+20)\n\n**Medium Value (10-15 pts each):**\n- Attended open house (+15)\n- Clicked email links (+10)\n- Has specific area preferences (+10)\n\n**Low Value (5 pts each):**\n- Website form submission (+5)\n- Opened email (+5)\n- Social media follow (+5)\n\n**Negative Signals:**\n- No response in 30 days (-10)\n- Unsubscribed from emails (-15)\n- Marked as not interested (-20)\n\nWould you like me to help set up automated scoring rules in your workflow?' },
    ],
    [
      { role: 'user', content: 'Show me my pipeline summary' },
      { role: 'assistant', content: 'Here\'s your current pipeline overview:\n\n📊 **Pipeline Summary**\n\n| Stage | Leads | Total Value |\n|-------|-------|-------------|\n| New | 15 | $4.2M |\n| Contacted | 12 | $3.8M |\n| Qualified | 18 | $7.5M |\n| Proposal | 10 | $5.2M |\n| Negotiation | 8 | $4.1M |\n| Won | 6 | $3.6M |\n| Lost | 6 | $1.9M |\n\n**Key Insights:**\n- 🔥 8 leads in negotiation stage need attention\n- ⚠️ 5 leads haven\'t been contacted in 14+ days\n- 📈 Win rate this month: 42%\n- 💰 Projected revenue: $4.1M\n\nWould you like me to drill into any specific stage?' },
    ],
  ];

  let chatCount = 0;
  for (const user of users) {
    const numConvos = randomInt(1, chatConversations.length);
    for (let i = 0; i < numConvos; i++) {
      const convo = chatConversations[i % chatConversations.length];
      for (const msg of convo) {
        await prisma.chatMessage.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            role: msg.role,
            content: msg.content,
            tokens: randomInt(50, 500),
            cost: msg.role === 'assistant' ? randomFloat(0.001, 0.05) : 0,
            createdAt: randomDate(new Date('2026-01-15'), new Date()),
          },
        });
        chatCount++;
      }
    }
  }
  console.log(`   ✅ Created ${chatCount} chat messages`);

  // ==========================================================================
  // 22. AB TESTS
  // ==========================================================================
  console.log('🔬 Creating A/B tests...');
  const abTests = [
    {
      name: 'Subject Line Test — Open House',
      description: 'Testing emoji vs plain text subject lines for open house invitations.',
      type: 'EMAIL_SUBJECT',
      status: 'COMPLETED',
      variantA: { subject: 'You\'re Invited to Our Open House!', openRate: 0.22, clickRate: 0.08 },
      variantB: { subject: '🏡 Open House This Weekend — Don\'t Miss Out!', openRate: 0.31, clickRate: 0.12 },
      winnerId: 'B',
      confidence: 95.2,
      participantCount: 450,
    },
    {
      name: 'Email Content — Market Update',
      description: 'Short vs detailed market update emails.',
      type: 'EMAIL_CONTENT',
      status: 'RUNNING',
      variantA: { format: 'brief', wordCount: 150, includesCharts: false },
      variantB: { format: 'detailed', wordCount: 500, includesCharts: true },
      participantCount: 280,
    },
    {
      name: 'Send Time Test — Newsletter',
      description: 'Testing Tuesday 9am vs Thursday 2pm send times.',
      type: 'EMAIL_TIMING',
      status: 'RUNNING',
      variantA: { day: 'Tuesday', time: '09:00', timezone: 'EST' },
      variantB: { day: 'Thursday', time: '14:00', timezone: 'EST' },
      participantCount: 600,
    },
  ];

  for (const test of abTests) {
    const startDate = test.status === 'COMPLETED'
      ? randomDate(new Date('2025-11-01'), new Date('2026-01-01'))
      : randomDate(new Date('2026-01-15'), new Date('2026-02-10'));

    const abTest = await prisma.aBTest.create({
      data: {
        name: test.name,
        description: test.description,
        type: test.type as any,
        organizationId: org.id,
        createdBy: adminUser.id,
        variantA: test.variantA,
        variantB: test.variantB,
        status: test.status as any,
        startDate,
        endDate: test.status === 'COMPLETED' ? new Date(startDate.getTime() + 14 * 86400000) : null,
        participantCount: test.participantCount,
        winnerId: test.winnerId || null,
        confidence: test.confidence || null,
      },
    });

    // Create results for completed tests
    if (test.status === 'COMPLETED' || test.status === 'RUNNING') {
      const numResults = randomInt(10, 20);
      for (let i = 0; i < numResults; i++) {
        await prisma.aBTestResult.create({
          data: {
            testId: abTest.id,
            variant: Math.random() > 0.5 ? 'A' : 'B',
            leadId: randomPick(leads).id,
            campaignId: randomPick(campaigns).id,
            converted: Math.random() > 0.7,
            openedAt: Math.random() > 0.3 ? randomDate(startDate, new Date()) : null,
            clickedAt: Math.random() > 0.6 ? randomDate(startDate, new Date()) : null,
          },
        });
      }
    }
  }
  console.log(`   ✅ Created ${abTests.length} A/B tests`);

  // ==========================================================================
  // 23. LEAD SCORING MODELS
  // ==========================================================================
  console.log('📈 Creating lead scoring models...');
  await prisma.leadScoringModel.create({
    data: {
      userId: adminUser.id,
      organizationId: org.id,
      factors: {
        emailOpens: { weight: 5, description: 'Points per email opened' },
        emailClicks: { weight: 10, description: 'Points per email link clicked' },
        propertyViews: { weight: 8, description: 'Points per property viewed' },
        formSubmissions: { weight: 15, description: 'Points per form submitted' },
        phoneCall: { weight: 20, description: 'Points per phone conversation' },
        openHouseAttendance: { weight: 25, description: 'Points per open house attended' },
        preApproval: { weight: 30, description: 'Points for having pre-approval' },
        referral: { weight: 15, description: 'Points for being a referral' },
        noContactDecay: { weight: -2, description: 'Points lost per day without contact' },
        unsubscribe: { weight: -20, description: 'Points lost for unsubscribing' },
      },
      accuracy: 78.5,
      lastTrainedAt: randomDate(new Date('2026-01-01'), new Date()),
      trainingDataCount: 450,
    },
  });

  // ==========================================================================
  // 24. USER AI PREFERENCES
  // ==========================================================================
  console.log('🧠 Creating AI preferences...');
  const tones = ['professional', 'friendly', 'casual', 'formal'];
  for (const user of users) {
    await prisma.userAIPreferences.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        chatbotTone: randomPick(tones),
        autoSuggestActions: true,
        enableProactive: true,
        preferredContactTime: randomPick(['morning', 'afternoon', 'evening']),
        aiInsightsFrequency: randomPick(['daily', 'weekly', 'realtime']),
        customInstructions: user.role === 'ADMIN'
          ? 'Focus on pipeline health, team performance metrics, and revenue forecasting.'
          : 'Prioritize lead follow-up suggestions and showing scheduling assistance.',
      },
    });
  }

  // ==========================================================================
  // 25. INVOICES
  // ==========================================================================
  console.log('💰 Creating invoices...');
  const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'];
  for (const month of months) {
    const invoiceDate = new Date(`${month}-01`);
    const dueDate = new Date(`${month}-15`);
    const isPaid = invoiceDate < new Date('2026-02-01');

    await prisma.invoice.create({
      data: {
        subscriptionId: subscription.id,
        amount: 99.00,
        currency: 'usd',
        status: isPaid ? 'PAID' : 'OPEN',
        invoiceDate,
        dueDate,
        paidAt: isPaid ? new Date(dueDate.getTime() - randomInt(1, 10) * 86400000) : null,
      },
    });
  }
  console.log(`   ✅ Created ${months.length} invoices`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEED COMPLETE!');
  console.log('='.repeat(60));
  console.log(`
📦 Data Created:
   🏢 1 Organization: Pinnacle Real Estate Group
   👥 ${users.length} Users (1 Admin, 1 Manager, 2 Agents)
   💳 1 Subscription (Professional)
   🏠 1 Team
   🏷️  ${tags.length} Tags
   👤 ${leads.length} Leads
   📝 ${noteCount} Notes
   ✅ ${taskCount} Tasks
   📅 ${apptCount} Appointments
   📨 ${campaigns.length} Campaigns
   📧 ${emailTemplateData.length} Email Templates
   💬 ${smsTemplateData.length} SMS Templates
   ✉️  ${msgCount} Messages
   📊 ${actCount} Activities
   ⚡ ${workflows.length} Workflows
   🔔 ${notifCount} Notifications
   🤖 1 AI Assistant
   📞 ${callCount} Calls
   💭 ${chatCount} Chat Messages
   🔬 ${abTests.length} A/B Tests
   📈 1 Lead Scoring Model
   💰 ${months.length} Invoices

🔑 Login Credentials:
   Admin:   admin@pinnaclerealty.com / Password123!
   Manager: sarah@pinnaclerealty.com / Password123!
   Agent 1: michael@pinnaclerealty.com / Password123!
   Agent 2: emily@pinnaclerealty.com / Password123!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
