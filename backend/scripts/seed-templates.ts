/**
 * Seed email and SMS templates (only — does not touch other data).
 * Usage: npx tsx scripts/seed-templates.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const emailTemplateData = [
  { name: 'Welcome New Lead', subject: 'Welcome to {{companyName}} Real Estate!', body: 'Hi {{firstName}},\n\nThank you for your interest in {{companyName}}! We\'re excited to help you find your perfect property.\n\nI\'d love to learn more about what you\'re looking for. Would you have time for a quick call this week?\n\nBest regards,\n{{agentName}}', category: 'Welcome' },
  { name: 'Property Showing Follow-Up', subject: 'Great seeing you at {{propertyAddress}}!', body: 'Hi {{firstName}},\n\nIt was wonderful showing you {{propertyAddress}} today! I hope you enjoyed the tour.\n\nHere are a few key highlights:\n- Renovated kitchen with granite countertops\n- Spacious backyard with mature trees\n- Walking distance to top-rated schools\n\nWould you like to schedule a second showing or see similar properties? Let me know!\n\nBest,\n{{agentName}}', category: 'Follow-Up' },
  { name: 'Market Update', subject: '📊 Your Market Update — March 2026', body: 'Hi {{firstName}},\n\nHere\'s your monthly market update:\n\n📈 Median Home Price: $485,000\n🏠 Active Listings: 1,247\n⏱️ Avg Days on Market: 22\n\nThe market is showing strong buyer demand with limited inventory. Now is a great time to explore your options.\n\nReady to make your move? Let\'s chat!\n\n{{agentName}}', category: 'Market Update' },
  { name: 'Open House Invitation', subject: 'You\'re Invited! Open House at {{propertyAddress}}', body: 'Hi {{firstName}},\n\n🏡 You\'re invited to an exclusive open house!\n\n📍 {{propertyAddress}}\n📅 This Saturday | 1:00 PM - 4:00 PM\n💰 Listed at {{price}}\n\nThis beautiful 4BR/3BA home features a chef\'s kitchen and resort-style pool.\n\nRSVP or let me know if you\'d like a private showing!\n\n{{agentName}}', category: 'Events' },
  { name: 'Price Reduction Alert', subject: '🔔 Price Drop Alert: {{propertyAddress}}', body: 'Hi {{firstName}},\n\nGreat news! A property you showed interest in just had a price reduction:\n\n{{propertyAddress}}\nNew Price: $449,000 (was $479,000)\n\nThis is a savings of $30,000! Don\'t miss this opportunity.\n\nWant to schedule a showing?\n\n{{agentName}}', category: 'Alerts' },
  { name: 'Happy Anniversary', subject: '🎉 Happy Home Anniversary, {{firstName}}!', body: 'Hi {{firstName}},\n\nHappy anniversary! It\'s been another wonderful year in your home.\n\nI hope you\'re loving it! If there\'s anything I can help with — whether it\'s a home value update, renovation recommendations, or anything else — don\'t hesitate to reach out.\n\nWarmly,\n{{agentName}}', category: 'Client Retention' },
  { name: 'Just Listed', subject: '🆕 Just Listed: {{propertyAddress}}', body: 'Hi {{firstName}},\n\nI wanted to be the first to let you know about a brand new listing:\n\n🏠 {{propertyAddress}}\n💰 $525,000\n🛏️ 4 BR | 🛁 3 BA\n📐 2,450 sq ft\n\nStunning modern home with open floor plan, quartz countertops, and a two-car garage in a sought-after neighborhood.\n\nInterested? I can arrange a private showing!\n\n{{agentName}}', category: 'New Listings' },
  { name: 'Under Contract Congratulations', subject: '🎉 Congratulations! You\'re Under Contract!', body: 'Hi {{firstName}},\n\nExciting news — your offer on {{propertyAddress}} has been accepted! 🎉\n\nHere are the next steps:\n1. Earnest money deposit due within 3 business days\n2. Home inspection within 10 days\n3. Appraisal scheduled by lender\n4. Estimated closing date: 30 days from now\n\nI\'ll be with you every step of the way.\n\n{{agentName}}', category: 'Transaction' },
]

const smsTemplateData = [
  { name: 'Quick Follow-Up', body: 'Hi {{firstName}}, this is {{agentName}} from {{companyName}}. Just checking in — are you still interested in properties in the area? Let me know and I\'ll send some great options!', category: 'Follow-Up' },
  { name: 'Showing Reminder', body: 'Reminder: Your property showing at {{address}} is tomorrow at {{time}}. See you there! — {{agentName}}', category: 'Reminders' },
  { name: 'Open House Reminder', body: '🏡 Don\'t forget! Open house today at {{address}} from 1-4 PM. Come check it out! — {{agentName}}', category: 'Events' },
  { name: 'New Listing Alert', body: '🆕 Just listed! 4BR/3BA at {{address}} for $525K. Want to see it? Reply YES! — {{agentName}}', category: 'Alerts' },
  { name: 'Price Drop Alert', body: '🔔 Price dropped! {{address}} now listed at $449K (was $479K). Interested? — {{agentName}}', category: 'Alerts' },
  { name: 'Closing Day', body: '🎉 Congratulations {{firstName}}! Today\'s the big day — closing on {{address}}! See you at 10 AM. — {{agentName}}', category: 'Transaction' },
  { name: 'Anniversary Check-In', body: 'Happy home anniversary {{firstName}}! 🏠 It\'s been another great year. Need a home value update? — {{agentName}}', category: 'Client Retention' },
  { name: 'Appointment Confirmation', body: 'Confirmed: Meeting with {{agentName}} on {{date}} at {{time}}. Reply CHANGE to reschedule.', category: 'Reminders' },
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  // Find the first organization
  const org = await prisma.organization.findFirst()
  if (!org) {
    console.error('❌ No organization found. Run the main seed first.')
    process.exit(1)
  }
  console.log(`📦 Using organization: ${org.name} (${org.id})`)

  // Check existing counts
  const existingEmail = await prisma.emailTemplate.count({ where: { organizationId: org.id } })
  const existingSMS = await prisma.sMSTemplate.count({ where: { organizationId: org.id } })

  if (existingEmail > 0) {
    console.log(`📧 ${existingEmail} email templates already exist — deleting and re-seeding...`)
    await prisma.emailTemplate.deleteMany({ where: { organizationId: org.id } })
  }
  if (existingSMS > 0) {
    console.log(`💬 ${existingSMS} SMS templates already exist — deleting and re-seeding...`)
    await prisma.sMSTemplate.deleteMany({ where: { organizationId: org.id } })
  }

  // Seed email templates
  console.log('📧 Creating email templates...')
  for (const tmpl of emailTemplateData) {
    await prisma.emailTemplate.create({
      data: {
        name: tmpl.name,
        subject: tmpl.subject,
        body: tmpl.body,
        category: tmpl.category,
        isActive: true,
        usageCount: randomInt(5, 150),
        lastUsedAt: new Date(Date.now() - randomInt(1, 30) * 86400000),
        organizationId: org.id,
        variables: ['firstName', 'lastName', 'agentName', 'companyName', 'propertyAddress'],
      },
    })
  }
  console.log(`   ✅ Created ${emailTemplateData.length} email templates`)

  // Seed SMS templates
  console.log('💬 Creating SMS templates...')
  for (const tmpl of smsTemplateData) {
    await prisma.sMSTemplate.create({
      data: {
        name: tmpl.name,
        body: tmpl.body,
        category: tmpl.category,
        isActive: true,
        usageCount: randomInt(5, 80),
        lastUsedAt: new Date(Date.now() - randomInt(1, 30) * 86400000),
        organizationId: org.id,
        variables: ['firstName', 'agentName', 'companyName', 'address', 'price'],
      },
    })
  }
  console.log(`   ✅ Created ${smsTemplateData.length} SMS templates`)

  console.log('\n🎉 Template seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
