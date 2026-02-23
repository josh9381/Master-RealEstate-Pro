// Comprehensive Mock Data for CRM Frontend
// This file contains all mock data used across the application

import { Lead } from '@/types'

// ==================== LEADS ====================

export const mockLeads: Lead[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@techcorp.com',
    phone: '+1 (555) 123-4567',
    company: 'Tech Corp',
    position: 'CTO',
    score: 85,
    status: 'qualified',
    source: 'website',
    value: 45000,
    stage: 'Proposal',
    assignedTo: 'Sarah Johnson',
    createdAt: '2025-10-15T10:30:00Z',
    lastContact: '2025-10-19T14:20:00Z',
    tags: ['Enterprise', 'Hot Lead', 'VIP'],
    notes: 'Very interested in our enterprise plan. Schedule demo for next week.',
    customFields: {
      industry: 'Technology',
      companySize: 250,
      budget: 50000
    }
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@enterpriseinc.com',
    phone: '+1 (555) 234-5678',
    company: 'Enterprise Inc',
    position: 'VP of Sales',
    score: 72,
    status: 'contacted',
    source: 'referral',
    value: 78000,
    stage: 'Qualified',
    assignedTo: 'Mike Chen',
    createdAt: '2025-10-10T09:15:00Z',
    lastContact: '2025-10-18T16:45:00Z',
    tags: ['Enterprise', 'Follow-up'],
    notes: 'Requested pricing for 100+ users. Follow up on Friday.',
    customFields: {
      industry: 'Finance',
      companySize: 500,
      budget: 100000
    }
  },
  {
    id: 3,
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.j@startupccompany.com',
    phone: '+1 (555) 345-6789',
    company: 'Startup Co',
    position: 'Founder',
    score: 91,
    status: 'qualified',
    source: 'social',
    value: 12000,
    stage: 'Demo Scheduled',
    assignedTo: 'Sarah Johnson',
    createdAt: '2025-10-18T11:00:00Z',
    lastContact: '2025-10-20T10:00:00Z',
    tags: ['Startup', 'Demo Scheduled'],
    notes: 'Excited about the product. Demo scheduled for Oct 22.',
    customFields: {
      industry: 'SaaS',
      companySize: 15,
      budget: 15000
    }
  },
  // Add 20 more leads...
  {
    id: 4,
    firstName: 'Alice',
    lastName: 'Brown',
    email: 'alice.brown@fortune500.com',
    phone: '+1 (555) 456-7890',
    company: 'Fortune 500 Co',
    position: 'Director of IT',
    score: 68,
    status: 'new',
    source: 'email',
    value: 125000,
    stage: 'New',
    assignedTo: 'David Lee',
    createdAt: '2025-10-20T08:30:00Z',
    lastContact: null,
    tags: ['Enterprise'],
    notes: 'Inbound inquiry from email campaign.',
    customFields: {
      industry: 'Healthcare',
      companySize: 2000,
      budget: 150000
    }
  },
  {
    id: 5,
    firstName: 'Charlie',
    lastName: 'Wilson',
    email: 'c.wilson@globaltech.com',
    phone: '+1 (555) 567-8901',
    company: 'Global Tech',
    position: 'Product Manager',
    score: 79,
    status: 'contacted',
    source: 'website',
    value: 32000,
    stage: 'Contacted',
    assignedTo: 'Sarah Johnson',
    createdAt: '2025-10-12T13:45:00Z',
    lastContact: '2025-10-17T09:30:00Z',
    tags: ['Follow-up', 'Long-term'],
    notes: 'Interested but wants to evaluate alternatives first.',
    customFields: {
      industry: 'Technology',
      companySize: 180,
      budget: 40000
    }
  },
  ...generateAdditionalLeads(95)
]

// Helper function to generate additional leads
function generateAdditionalLeads(count: number): Lead[] {
  const firstNames = ['Michael', 'Sarah', 'David', 'Emily', 'James', 'Lisa', 'Robert', 'Jennifer', 'William', 'Jessica', 'Richard', 'Amanda', 'Thomas', 'Ashley', 'Daniel', 'Nicole', 'Matthew', 'Michelle', 'Christopher', 'Stephanie', 'Andrew', 'Rebecca', 'Joseph', 'Laura', 'Ryan', 'Elizabeth', 'Kevin', 'Melissa', 'Jason', 'Amy', 'Brian', 'Angela', 'Eric', 'Kimberly', 'Steven', 'Rachel', 'Brandon', 'Heather', 'Timothy', 'Kelly', 'Anthony', 'Christina', 'Mark', 'Lauren', 'Joshua', 'Brittany', 'Justin', 'Katherine', 'Paul', 'Victoria']
  const lastNames = ['Anderson', 'Baker', 'Clark', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris', 'Jackson', 'King', 'Lopez', 'Martinez', 'Nelson', 'O\'Brien', 'Parker', 'Quinn', 'Roberts', 'Stewart', 'Turner', 'Walker', 'White', 'Young', 'Allen', 'Bennett', 'Campbell', 'Collins', 'Cooper', 'Edwards', 'Fisher', 'Gray', 'Henderson', 'Hughes', 'Jenkins', 'Kelly', 'Long', 'Mitchell', 'Moore', 'Morgan', 'Murphy', 'Phillips', 'Powell', 'Reed', 'Rogers', 'Ross', 'Russell', 'Sanders', 'Simpson', 'Taylor', 'Thompson', 'Watson']
  const companies = ['Tech Innovations', 'Digital Solutions', 'Smart Systems', 'Future Corp', 'Bright Ideas', 'Global Partners', 'Elite Enterprises', 'Prime Industries', 'Summit Group', 'Apex Solutions', 'Nexus Technologies', 'Quantum Corp', 'Vision Systems', 'Catalyst Group', 'Momentum Inc', 'Synergy Partners', 'Velocity Corp', 'Zenith Solutions', 'Phoenix Tech', 'Horizon Enterprises', 'Infinity Systems', 'Pulse Digital', 'Radiant Group', 'Stellar Corp', 'Titan Industries', 'Unity Solutions', 'Vanguard Tech', 'Westgate Corp', 'Xcel Systems', 'Yield Partners']
  const positions = ['CEO', 'CTO', 'VP of Sales', 'VP of Marketing', 'Director of IT', 'Product Manager', 'Sales Manager', 'Marketing Director', 'Operations Manager', 'Account Executive', 'Business Development Manager', 'Chief Revenue Officer', 'Head of Growth', 'Regional Manager', 'General Manager']
  const statuses: Lead['status'][] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation']
  const sources = ['website', 'referral', 'social', 'email', 'linkedin', 'event', 'partner', 'cold_call']
  const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Consulting', 'E-commerce', 'SaaS']
  const tags = [
    ['Hot Lead', 'Enterprise'], ['Follow-up'], ['VIP', 'High Priority'], ['Startup'], 
    ['Long-term'], ['Demo Scheduled'], ['Proposal Sent'], ['Negotiating'], 
    ['Budget Approved'], ['Decision Maker'], ['Champion'], ['Competitor'],
    ['SMB'], ['Mid-Market'], ['Enterprise'], ['Warm Lead'], ['Cold Lead']
  ]

  const leads = []
  for (let i = 0; i < count; i++) {
    const id = i + 6
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const company = companies[Math.floor(Math.random() * companies.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const source = sources[Math.floor(Math.random() * sources.length)]
    const score = Math.floor(Math.random() * 40) + 60 // 60-100
    const companySize = [10, 25, 50, 100, 250, 500, 1000, 2000][Math.floor(Math.random() * 8)]
    const value = Math.floor(Math.random() * 150000) + 10000
    const daysAgo = Math.floor(Math.random() * 30) + 1
    const createdDate = new Date()
    createdDate.setDate(createdDate.getDate() - daysAgo)
    
    const hasContact = Math.random() > 0.3
    const lastContactDate = hasContact ? new Date(createdDate.getTime() + Math.random() * daysAgo * 24 * 60 * 60 * 1000) : null
    
    leads.push({
      id,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s/g, '')}.com`,
      phone: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      company,
      position: positions[Math.floor(Math.random() * positions.length)],
      score,
      status,
      source,
      value,
      stage: status === 'new' ? 'New' : status === 'contacted' ? 'Contacted' : status === 'qualified' ? 'Qualified' : status === 'proposal' ? 'Proposal' : 'Negotiation',
      assignedTo: ['Sarah Johnson', 'Mike Chen', 'David Lee', 'Emma Rodriguez', null][Math.floor(Math.random() * 5)],
      createdAt: createdDate.toISOString(),
      lastContact: lastContactDate ? lastContactDate.toISOString() : null,
      tags: tags[Math.floor(Math.random() * tags.length)],
      notes: hasContact ? 'Follow up scheduled.' : 'Initial contact pending.',
      customFields: {
        industry: industries[Math.floor(Math.random() * industries.length)],
        companySize,
        budget: value * (1 + Math.random() * 0.5)
      }
    })
  }
  return leads
}

// ==================== CAMPAIGNS ====================

import { Campaign } from '@/types'

export const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Q4 Product Launch',
    type: 'EMAIL',
    status: 'ACTIVE',
    startDate: '2025-10-01',
    endDate: '2025-12-31',
    budget: 5000,
    spent: 3200,
    audience: 2340,
    sent: 2340,
    opened: 1240,
    clicked: 680,
    converted: 145,
    revenue: 52000,
    roi: '340%',
    createdBy: 'Sarah Johnson',
    tags: ['Product Launch', 'High Priority'],
    subject: 'Introducing Our Revolutionary New Feature',
    previewText: 'Transform your workflow with our latest innovation'
  },
  {
    id: '2',
    name: 'Holiday Promotion',
    type: 'SMS',
    status: 'ACTIVE',
    startDate: '2025-10-15',
    endDate: '2025-11-30',
    budget: 2000,
    spent: 890,
    audience: 1890,
    sent: 1890,
    opened: 1890,
    clicked: 920,
    converted: 198,
    revenue: 39600,
    roi: '420%',
    createdBy: 'Mike Chen',
    tags: ['Promotion', 'SMS'],
    subject: null,
    previewText: '🎉 Special offer: 30% off all plans!'
  },
  {
    id: '3',
    name: 'Webinar Invitation',
    type: 'EMAIL',
    status: 'SCHEDULED',
    startDate: '2025-10-25',
    endDate: '2025-10-25',
    budget: 1500,
    spent: 0,
    audience: 3200,
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    revenue: 0,
    roi: '0%',
    createdBy: 'David Lee',
    tags: ['Webinar', 'Educational'],
    subject: 'Join Our Live Webinar: Mastering CRM Best Practices',
    previewText: 'Learn from industry experts on Oct 25th'
  },
  {
    id: '4',
    name: 'Social Media Blitz',
    type: 'SOCIAL',
    status: 'ACTIVE',
    startDate: '2025-10-10',
    endDate: '2025-11-10',
    budget: 3000,
    spent: 1800,
    audience: 25000,
    sent: 42,
    opened: 2100,
    clicked: 680,
    converted: 92,
    revenue: 27600,
    roi: '280%',
    createdBy: 'Sarah Johnson',
    tags: ['Social Media', 'Brand Awareness'],
    subject: null,
    previewText: 'Engaging content across LinkedIn, Twitter, and Facebook'
  },
  {
    id: '5',
    name: 'Customer Re-engagement',
    type: 'EMAIL',
    status: 'COMPLETED',
    startDate: '2025-09-01',
    endDate: '2025-09-30',
    budget: 1200,
    spent: 1200,
    audience: 1560,
    sent: 1560,
    opened: 820,
    clicked: 340,
    converted: 67,
    revenue: 20100,
    roi: '310%',
    createdBy: 'Mike Chen',
    tags: ['Re-engagement', 'Completed'],
    subject: 'We Miss You! Here\'s a Special Offer',
    previewText: 'Come back and get 20% off your next purchase'
  },
  ...generateAdditionalCampaigns(50)
]

function generateAdditionalCampaigns(count: number): Campaign[] {
  const types: Campaign['type'][] = ['EMAIL', 'SMS', 'PHONE', 'SOCIAL']
  const statuses: Campaign['status'][] = ['ACTIVE', 'SCHEDULED', 'PAUSED', 'COMPLETED', 'DRAFT']
  const names = [
    'Newsletter',
    'Product Update',
    'Flash Sale',
    'Event Invitation',
    'Customer Survey',
    'Thank You',
    'Announcement',
    'Limited Offer',
    'New Feature',
    'Case Study',
    'Tips & Tricks',
    'Industry Report',
    'Partnership',
    'Referral Program',
    'VIP Exclusive'
  ]
  const suffixes = ['Series', 'Campaign', 'Blast', 'Outreach', 'Drive', 'Initiative', 'Push', 'Promo']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const creators = ['Sarah Johnson', 'Mike Chen', 'David Lee', 'Emma Rodriguez']
  
  const campaigns: Campaign[] = []
  
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]
    const status = statuses[i % statuses.length]
    const name = `${names[i % names.length]} ${suffixes[i % suffixes.length]}`
    const month = months[i % months.length]
    
    // Generate dates
    const startDay = (i % 28) + 1
    const startMonth = (i % 12) + 1
    const startDate = `2025-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
    const endDay = Math.min(startDay + 14, 28)
    const endDate = `2025-${String(startMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    
    // Generate metrics
    const audience = Math.floor(Math.random() * 5000) + 500
    const sent = status === 'SCHEDULED' || status === 'DRAFT' ? 0 : Math.floor(audience * (0.8 + Math.random() * 0.2))
    const opens = status === 'SCHEDULED' || status === 'DRAFT' ? 0 : Math.floor(sent * (0.15 + Math.random() * 0.45))
    const clicks = Math.floor(opens * (0.1 + Math.random() * 0.4))
    const conversions = Math.floor(clicks * (0.05 + Math.random() * 0.25))
    const budget = Math.floor(Math.random() * 8000) + 1000
    const spent = status === 'SCHEDULED' || status === 'DRAFT' ? 0 : Math.floor(budget * (status === 'COMPLETED' ? 1 : 0.3 + Math.random() * 0.6))
    const revenue = conversions * (200 + Math.floor(Math.random() * 800))
    const roi = spent > 0 ? `${Math.floor((revenue / spent) * 100)}%` : '0%'
    
    // A/B test data for some campaigns
    const hasABTest = i % 5 === 0 && type === 'EMAIL'
    
    campaigns.push({
      id: String(i + 6),
      name: `${name} - ${month}`,
      type,
      status,
      startDate,
      endDate: status === 'COMPLETED' || status === 'ACTIVE' ? endDate : undefined,
      budget,
      spent,
      audience,
      sent,
      opened: opens,
      clicked: clicks,
      converted: conversions,
      revenue,
      roi,
      createdBy: creators[i % creators.length],
      tags: [
        type === 'EMAIL' ? 'Email Marketing' : type === 'SMS' ? 'SMS' : type === 'PHONE' ? 'Cold Calling' : 'Social Media',
        status === 'ACTIVE' ? 'Active' : status === 'COMPLETED' ? 'Completed' : 'Upcoming'
      ],
      subject: type === 'EMAIL' ? `${name} - Don't Miss Out!` : null,
      previewText: type === 'EMAIL' || type === 'SMS' ? `Special ${name.toLowerCase()} for you` : undefined,
      abTest: hasABTest ? {
        variant: 'A',
        winner: Math.random() > 0.5 ? 'A' : 'B',
        aOpens: Math.floor(opens * 0.48),
        bOpens: Math.floor(opens * 0.52),
        aClicks: Math.floor(clicks * 0.45),
        bClicks: Math.floor(clicks * 0.55)
      } : undefined
    })
  }
  
  return campaigns
}

// ==================== ACTIVITIES ====================

export const mockActivities = [
  {
    id: 1,
    type: 'email_sent',
    title: 'Email sent to John Doe',
    description: 'Sent proposal email regarding enterprise plan pricing',
    leadId: 1,
    leadName: 'John Doe',
    userId: 'sarah',
    userName: 'Sarah Johnson',
    timestamp: '2025-10-19T14:20:00Z',
    metadata: {
      subject: 'Enterprise Plan Proposal',
      opened: true,
      clicked: true
    }
  },
  {
    id: 2,
    type: 'call',
    title: 'Call with Jane Smith',
    description: '30-minute discovery call. Discussed requirements and timeline.',
    leadId: 2,
    leadName: 'Jane Smith',
    userId: 'mike',
    userName: 'Mike Chen',
    timestamp: '2025-10-18T16:45:00Z',
    metadata: {
      duration: '30 minutes',
      outcome: 'positive',
      nextSteps: 'Send custom quote by end of week'
    }
  },
  {
    id: 3,
    type: 'meeting',
    title: 'Demo scheduled with Bob Johnson',
    description: 'Product demo scheduled for Oct 22 at 2:00 PM',
    leadId: 3,
    leadName: 'Bob Johnson',
    userId: 'sarah',
    userName: 'Sarah Johnson',
    timestamp: '2025-10-20T10:00:00Z',
    metadata: {
      meetingTime: '2025-10-22T14:00:00Z',
      duration: '60 minutes',
      type: 'Product Demo'
    }
  },
  {
    id: 4,
    type: 'note',
    title: 'Note added for Alice Brown',
    description: 'Inbound inquiry from email campaign. High potential value.',
    leadId: 4,
    leadName: 'Alice Brown',
    userId: 'david',
    userName: 'David Lee',
    timestamp: '2025-10-20T08:35:00Z',
    metadata: {}
  },
  {
    id: 5,
    type: 'stage_change',
    title: 'Lead moved to Qualified',
    description: 'John Doe moved from Contacted to Qualified',
    leadId: 1,
    leadName: 'John Doe',
    userId: 'sarah',
    userName: 'Sarah Johnson',
    timestamp: '2025-10-19T11:15:00Z',
    metadata: {
      fromStage: 'Contacted',
      toStage: 'Qualified'
    }
  }
]

// ==================== TASKS ====================

export const mockTasks = [
  {
    id: 1,
    title: 'Follow up with Tech Corp',
    description: 'Send pricing proposal for enterprise plan',
    dueDate: '2025-10-20T14:00:00Z',
    priority: 'high',
    status: 'pending',
    assignedTo: 'Sarah Johnson',
    leadId: 1,
    leadName: 'John Doe',
    createdAt: '2025-10-18T09:00:00Z',
    completedAt: null
  },
  {
    id: 2,
    title: 'Send proposal to Enterprise Inc',
    description: 'Custom quote for 100+ users with premium support',
    dueDate: '2025-10-20T16:30:00Z',
    priority: 'high',
    status: 'pending',
    assignedTo: 'Mike Chen',
    leadId: 2,
    leadName: 'Jane Smith',
    createdAt: '2025-10-19T10:30:00Z',
    completedAt: null
  },
  {
    id: 3,
    title: 'Demo call with Startup Co',
    description: 'Product demonstration and Q&A session',
    dueDate: '2025-10-22T14:00:00Z',
    priority: 'medium',
    status: 'SCHEDULED',
    assignedTo: 'Sarah Johnson',
    leadId: 3,
    leadName: 'Bob Johnson',
    createdAt: '2025-10-20T10:00:00Z',
    completedAt: null
  },
  {
    id: 4,
    title: 'Review contract for Global Solutions',
    description: 'Legal review of enterprise agreement',
    dueDate: '2025-10-21T14:00:00Z',
    priority: 'medium',
    status: 'in_progress',
    assignedTo: 'David Lee',
    leadId: null,
    leadName: null,
    createdAt: '2025-10-18T15:00:00Z',
    completedAt: null
  },
  {
    id: 5,
    title: 'Quarterly review meeting',
    description: 'Q4 performance review with sales team',
    dueDate: '2025-10-24T09:00:00Z',
    priority: 'low',
    status: 'SCHEDULED',
    assignedTo: 'Sarah Johnson',
    leadId: null,
    leadName: null,
    createdAt: '2025-10-15T12:00:00Z',
    completedAt: null
  }
]

// ==================== TEAM MEMBERS ====================

export const mockTeamMembers = [
  {
    id: 'sarah',
    name: 'Sarah Johnson',
    email: 'sarah.j@company.com',
    role: 'Sales Manager',
    avatar: null,
    status: 'online',
    leadsAssigned: 45,
    tasksCompleted: 127,
    dealsWon: 23,
    totalRevenue: 234000,
    joinedAt: '2024-01-15'
  },
  {
    id: 'mike',
    name: 'Mike Chen',
    email: 'mike.c@company.com',
    role: 'Sales Representative',
    avatar: null,
    status: 'online',
    leadsAssigned: 38,
    tasksCompleted: 95,
    dealsWon: 18,
    totalRevenue: 189000,
    joinedAt: '2024-03-20'
  },
  {
    id: 'david',
    name: 'David Lee',
    email: 'david.l@company.com',
    role: 'Sales Representative',
    avatar: null,
    status: 'away',
    leadsAssigned: 32,
    tasksCompleted: 82,
    dealsWon: 15,
    totalRevenue: 156000,
    joinedAt: '2024-05-10'
  },
  {
    id: 'emma',
    name: 'Emma Rodriguez',
    email: 'emma.r@company.com',
    role: 'Account Executive',
    avatar: null,
    status: 'offline',
    leadsAssigned: 28,
    tasksCompleted: 71,
    dealsWon: 12,
    totalRevenue: 132000,
    joinedAt: '2024-07-01'
  }
]

// ==================== EMAIL TEMPLATES ====================

export const mockEmailTemplates = [
  {
    id: 1,
    name: 'Welcome Email',
    subject: 'Welcome to {{company_name}}!',
    category: 'Onboarding',
    body: '<h2>Welcome aboard!</h2><p>We\'re excited to have you as part of our community...</p>',
    variables: ['company_name', 'user_name', 'login_link'],
    usageCount: 234,
    lastUsed: '2025-10-19'
  },
  {
    id: 2,
    name: 'Follow-up After Demo',
    subject: 'Thanks for joining our demo, {{contact_name}}',
    category: 'Sales',
    body: '<p>Hi {{contact_name}},</p><p>Thank you for attending our product demo today...</p>',
    variables: ['contact_name', 'company_name', 'demo_link'],
    usageCount: 156,
    lastUsed: '2025-10-20'
  },
  {
    id: 3,
    name: 'Pricing Proposal',
    subject: 'Custom Pricing Proposal for {{company_name}}',
    category: 'Sales',
    body: '<p>Dear {{contact_name}},</p><p>Based on our conversation, here\'s a custom pricing proposal...</p>',
    variables: ['contact_name', 'company_name', 'pricing_link'],
    usageCount: 89,
    lastUsed: '2025-10-18'
  }
]

// ==================== INTEGRATIONS ====================

export const mockIntegrations = [
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    description: 'Sync leads and contacts with Salesforce',
    icon: '☁️',
    connected: true,
    status: 'ACTIVE',
    lastSync: '2025-10-20T08:00:00Z',
    recordsSynced: 1234
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Email',
    description: 'Send and receive emails through Gmail',
    icon: '📧',
    connected: true,
    status: 'ACTIVE',
    lastSync: '2025-10-20T09:30:00Z',
    recordsSynced: 567
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    description: 'Get notifications in Slack channels',
    icon: '💬',
    connected: true,
    status: 'ACTIVE',
    lastSync: '2025-10-20T09:45:00Z',
    recordsSynced: 89
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'Marketing',
    description: 'Sync marketing data with HubSpot',
    icon: '🚀',
    connected: false,
    status: 'inactive',
    lastSync: null,
    recordsSynced: 0
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payment',
    description: 'Process payments and track revenue',
    icon: '💳',
    connected: true,
    status: 'ACTIVE',
    lastSync: '2025-10-20T07:00:00Z',
    recordsSynced: 345
  }
]

// ==================== INVOICES ====================

export const mockInvoices = [
  {
    id: 'INV-001',
    date: '2025-10-01',
    dueDate: '2025-10-31',
    amount: 299,
    status: 'paid',
    paidDate: '2025-10-15',
    plan: 'Professional',
    billingPeriod: 'October 2025'
  },
  {
    id: 'INV-002',
    date: '2025-09-01',
    dueDate: '2025-09-30',
    amount: 299,
    status: 'paid',
    paidDate: '2025-09-12',
    plan: 'Professional',
    billingPeriod: 'September 2025'
  },
  {
    id: 'INV-003',
    date: '2025-08-01',
    dueDate: '2025-08-31',
    amount: 149,
    status: 'paid',
    paidDate: '2025-08-10',
    plan: 'Starter',
    billingPeriod: 'August 2025'
  }
]

// ==================== WORKFLOWS ====================

export const mockWorkflows = [
  {
    id: 1,
    name: 'New Lead Assignment',
    description: 'Automatically assign new leads to sales reps based on territory',
    trigger: 'Lead Created',
    status: 'ACTIVE',
    executions: 456,
    successRate: 98.5,
    lastRun: '2025-10-20T09:15:00Z',
    createdBy: 'Sarah Johnson',
    actions: ['Assign to User', 'Send Email', 'Create Task']
  },
  {
    id: 2,
    name: 'Follow-up Reminder',
    description: 'Send reminder if lead hasn\'t been contacted in 3 days',
    trigger: 'Time-based',
    status: 'ACTIVE',
    executions: 234,
    successRate: 95.2,
    lastRun: '2025-10-20T06:00:00Z',
    createdBy: 'Mike Chen',
    actions: ['Send Notification', 'Create Task']
  },
  {
    id: 3,
    name: 'Deal Won Celebration',
    description: 'Notify team and update records when deal is won',
    trigger: 'Deal Stage Changed',
    status: 'ACTIVE',
    executions: 89,
    successRate: 100,
    lastRun: '2025-10-19T15:30:00Z',
    createdBy: 'Sarah Johnson',
    actions: ['Send Slack Message', 'Update CRM', 'Send Email']
  }
]

// ==================== HELP ARTICLES ====================

export const mockHelpArticles = [
  {
    id: 1,
    title: 'Getting Started with CRM',
    category: 'Getting Started',
    views: 1234,
    helpful: 456,
    lastUpdated: '2025-09-15',
    author: 'Support Team'
  },
  {
    id: 2,
    title: 'How to Create Your First Campaign',
    category: 'Campaigns',
    views: 892,
    helpful: 340,
    lastUpdated: '2025-09-20',
    author: 'Support Team'
  },
  {
    id: 3,
    title: 'Lead Scoring Best Practices',
    category: 'Leads',
    views: 678,
    helpful: 256,
    lastUpdated: '2025-10-01',
    author: 'Support Team'
  }
]

// Export all mock data
export default {
  leads: mockLeads,
  campaigns: mockCampaigns,
  activities: mockActivities,
  tasks: mockTasks,
  teamMembers: mockTeamMembers,
  emailTemplates: mockEmailTemplates,
  integrations: mockIntegrations,
  invoices: mockInvoices,
  workflows: mockWorkflows,
  helpArticles: mockHelpArticles
}
