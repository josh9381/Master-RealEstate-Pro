/**
 * Campaign Templates
 * Pre-made campaign templates for common real estate use cases
 */

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'EMAIL' | 'SMS' | 'PHONE';
  subject?: string;
  body: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  isRecurring: boolean;
  recurringPattern?: {
    daysOfWeek?: number[];
    time?: string;
    dayOfMonth?: number;
  };
  tags: string[];
  icon: string;
  usageCount: number;
  lastUsedAt?: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'weekly-market-report',
    name: 'Weekly Market Report',
    description: 'Send weekly updates about local real estate market trends and statistics',
    category: 'Newsletter',
    type: 'EMAIL',
    subject: 'Your Weekly Market Update - {{currentDate}}',
    body: `Hi {{lead.firstName}},

Here's your weekly real estate market update for our area:

📊 Market Highlights:
• Average home price: {{market.averagePrice}}
• Days on market: {{market.daysOnMarket}}
• Homes sold this week: {{market.homesSold}}

🏠 Featured Listings:
{{market.featuredListings}}

💡 Market Insight:
{{market.commentary}}

Ready to make a move? Let's talk about your real estate goals.

Best regards,
{{user.firstName}} {{user.lastName}}
{{user.email}}`,
    frequency: 'weekly',
    isRecurring: true,
    recurringPattern: {
      daysOfWeek: [1], // Monday
      time: '09:00',
    },
    tags: ['newsletter', 'market-update'],
    icon: '📊',
    usageCount: 0,
  },
  
  {
    id: 'monthly-newsletter',
    name: 'Monthly Newsletter',
    description: 'Comprehensive monthly newsletter with market trends, tips, and featured properties',
    category: 'Newsletter',
    type: 'EMAIL',
    subject: 'Your Monthly Real Estate Newsletter - {{currentDate}}',
    body: `Hello {{lead.firstName}},

Welcome to your monthly real estate update!

🎯 This Month's Highlights:
• Market trends and analysis
• Featured properties
• Home buying/selling tips
• Local community news

📈 Market Overview:
{{market.analysis}}

🏡 Featured Properties:
{{market.featuredListings}}

💼 Real Estate Tips:
{{market.tips}}

📅 Upcoming Open Houses:
{{market.openHouseSchedule}}

Questions? I'm here to help!

Cheers,
{{user.firstName}} {{user.lastName}}`,
    frequency: 'monthly',
    isRecurring: true,
    recurringPattern: {
      dayOfMonth: 1,
      time: '10:00',
    },
    tags: ['newsletter', 'monthly'],
    icon: '📰',
    usageCount: 0,
  },
  
  {
    id: 'new-listing-alert',
    name: 'New Listing Alert',
    description: 'Instantly notify interested buyers when new properties matching their criteria hit the market',
    category: 'Alert',
    type: 'EMAIL',
    subject: '🏠 New Listing Alert: Perfect Match for You!',
    body: `Hi {{lead.firstName}},

Great news! A new property just hit the market that matches your search criteria:

🏡 Property Details:
• Address: {{property.address}}
• Price: {{property.price}}
• Beds/Baths: {{property.bedsBaths}}
• Square Feet: {{property.sqft}}
• Key Features: {{property.features}}

📸 {{property.photos}}

This one won't last long! Want to schedule a viewing?

Click here to see more details: {{property.link}}

Best,
{{user.firstName}} {{user.lastName}}
{{user.email}}`,
    isRecurring: false,
    tags: ['alert', 'listing', 'buyer'],
    icon: '🏠',
    usageCount: 0,
  },
  
  {
    id: 'open-house-invite',
    name: 'Open House Invitation',
    description: 'Invite qualified buyers to upcoming open house events',
    category: 'Event',
    type: 'EMAIL',
    subject: '🎉 You\'re Invited: Open House This Weekend!',
    body: `Hi {{lead.firstName}},

You're invited to an exclusive open house this weekend!

🏡 Property Address:
{{property.address}}

📅 Open House Details:
• Date: {{event.date}}
• Time: {{event.time}}
• Duration: {{event.duration}}

🌟 Property Highlights:
{{property.highlights}}

💰 Listed at: {{property.price}}

Refreshments will be served! RSVP to secure your spot.

Can't make it? Let me know and we'll schedule a private showing.

Looking forward to seeing you!

{{user.firstName}} {{user.lastName}}
{{user.email}}`,
    isRecurring: false,
    tags: ['event', 'open-house', 'buyer'],
    icon: '🎉',
    usageCount: 0,
  },
  
  {
    id: 'price-drop-notice',
    name: 'Price Drop Notice',
    description: 'Alert interested buyers when properties they viewed have a price reduction',
    category: 'Alert',
    type: 'EMAIL',
    subject: '💰 Price Reduced! Property You Viewed',
    body: `Hi {{lead.firstName}},

Exciting news! The property you expressed interest in has just had a price reduction:

🏠 Property: {{property.address}}

💵 Original Price: {{property.originalPrice}}
💰 New Price: {{property.newPrice}}
📉 Savings: {{property.savings}}

This is a great opportunity to make an offer! Properties with price reductions often attract multiple buyers quickly.

Key Features You Loved:
{{property.features}}

Want to take another look or make an offer?

Let me know ASAP - I'll help you move fast!

Best,
{{user.firstName}} {{user.lastName}}
{{user.email}}`,
    isRecurring: false,
    tags: ['alert', 'price-drop', 'buyer'],
    icon: '💰',
    usageCount: 0,
  },
  
  {
    id: 'just-sold-celebration',
    name: 'Just Sold Celebration',
    description: 'Celebrate successful sales and generate referrals from happy clients',
    category: 'Follow-up',
    type: 'EMAIL',
    subject: '🎊 Congratulations on Your New Home!',
    body: `Dear {{lead.firstName}},

Congratulations! 🎉

It was an absolute pleasure helping you find and close on your new home at {{property.address}}.

🏡 What's Next?
• Enjoy settling into your new space
• Don't forget to update your address
• Keep my contact info handy for any questions

📝 Quick Favor:
If you enjoyed working with me, I'd be grateful if you could:
• Leave a review: {{user.reviewLink}}
• Refer friends who might need help buying or selling
• Connect on social media: {{user.socialLinks}}

🎁 Housewarming Gift:
I'm sending you a small housewarming gift - keep an eye out!

Thank you for trusting me with this important milestone. I'm always here if you need anything.

Warmest congratulations,
{{user.firstName}} {{user.lastName}}
{{user.email}}`,
    isRecurring: false,
    tags: ['follow-up', 'celebration', 'referral'],
    icon: '🎊',
    usageCount: 0,
  },
  
  {
    id: 'seasonal-market-update',
    name: 'Seasonal Market Update',
    description: 'Quarterly market insights and trends for each season',
    category: 'Newsletter',
    type: 'EMAIL',
    subject: '📊 Seasonal Market Update: What You Need to Know',
    body: `Hi {{lead.firstName}},

As we move into {{market.season}}, the real estate market is showing interesting trends!

🌟 Seasonal Highlights:
• Market conditions: {{market.conditions}}
• Best time to: {{market.recommendation}}
• Average prices: {{market.pricingTrends}}

📊 Market Statistics:
• Homes sold this quarter: {{market.homesSold}}
• Average days on market: {{market.daysOnMarket}}
• Price trends: {{market.priceTrend}}

💡 Seasonal Tips:
{{market.seasonalAdvice}}

🏠 Featured Properties:
{{market.featuredListings}}

Thinking about making a move? Now might be the perfect time!

Let's chat about your goals.

Best regards,
{{user.firstName}} {{user.lastName}}
{{user.email}}`,
    frequency: 'monthly',
    isRecurring: true,
    recurringPattern: {
      dayOfMonth: 15,
      time: '10:00',
    },
    tags: ['newsletter', 'seasonal', 'market-update'],
    icon: '📊',
    usageCount: 0,
  },

  // SMS Templates
  {
    id: 'sms-new-listing-alert',
    name: 'SMS: New Listing Alert',
    description: 'Quick text notification when a matching listing hits the market',
    category: 'Alert',
    type: 'SMS',
    body: `Hi {{lead.firstName}}! A new listing just dropped that matches what you're looking for: {{property.address}} at {{property.price}}. Want to schedule a tour? Reply YES or call me! - {{user.firstName}}`,
    isRecurring: false,
    tags: ['sms', 'alert', 'listing'],
    icon: '📱',
    usageCount: 0,
  },

  {
    id: 'sms-open-house-reminder',
    name: 'SMS: Open House Reminder',
    description: 'Day-of reminder for open house attendees',
    category: 'Event',
    type: 'SMS',
    body: `Reminder: Open house TODAY at {{property.address}} from {{event.time}}. Can't wait to see you there! - {{user.firstName}} {{user.lastName}}`,
    isRecurring: false,
    tags: ['sms', 'event', 'reminder'],
    icon: '🔔',
    usageCount: 0,
  },

  {
    id: 'sms-showing-followup',
    name: 'SMS: Showing Follow-up',
    description: 'Quick follow-up text after a property showing',
    category: 'Follow-up',
    type: 'SMS',
    body: `Hi {{lead.firstName}}, thanks for viewing {{property.address}} today! What did you think? Let me know if you have any questions or want to make an offer. - {{user.firstName}}`,
    isRecurring: false,
    tags: ['sms', 'follow-up', 'showing'],
    icon: '💬',
    usageCount: 0,
  },

  // Phone (Call Script) Templates
  {
    id: 'phone-new-lead-intro',
    name: 'Phone: New Lead Introduction',
    description: 'Call script for reaching out to new leads for the first time',
    category: 'Follow-up',
    type: 'PHONE',
    body: `Call Script — New Lead Introduction

Opening: "Hi {{lead.firstName}}, this is {{user.firstName}} {{user.lastName}}. I'm a real estate agent in your area. I noticed you were interested in properties — do you have a moment to chat?"

Discovery Questions:
• "Are you currently looking to buy, sell, or both?"
• "What's your ideal timeline for making a move?"
• "Do you have a specific neighborhood or price range in mind?"
• "Have you been pre-approved for a mortgage yet?"

Value Proposition: "I specialize in helping people find their perfect home. I have access to off-market listings and can set up personalized property alerts for you."

Close: "I'd love to set up a time to meet and discuss your goals in more detail. Would [suggest two times] work for a quick coffee?"

If voicemail: "Hi {{lead.firstName}}, this is {{user.firstName}} from [company]. I'd love to help with your real estate search. Please call me back at {{user.phone}} or reply to the email I'll send over. Talk soon!"`,
    isRecurring: false,
    tags: ['phone', 'new-lead', 'introduction'],
    icon: '📞',
    usageCount: 0,
  },

  {
    id: 'phone-listing-followup',
    name: 'Phone: Listing Follow-up',
    description: 'Call script for following up after a property showing',
    category: 'Follow-up',
    type: 'PHONE',
    body: `Call Script — Post-Showing Follow-up

Opening: "Hi {{lead.firstName}}, it's {{user.firstName}}. I wanted to follow up on the property at {{property.address}} that we viewed. How are you feeling about it?"

Key Questions:
• "What were your favorite features of the home?"
• "Were there any concerns or things you'd like to know more about?"
• "On a scale of 1-10, how interested are you in this property?"
• "Would you like to see any comparable properties in the area?"

If interested: "Great! The listing is getting a lot of attention. Would you like me to prepare an offer analysis so you can see what a competitive offer might look like?"

If not interested: "No worries at all. Based on what you've shared, I have a few other properties that might be a better fit. Can I send those over?"

Close: "I'll follow up with an email summary. Let me know if you have any questions!"`,
    isRecurring: false,
    tags: ['phone', 'follow-up', 'showing'],
    icon: '🏡',
    usageCount: 0,
  },

  {
    id: 'phone-seller-listing-pitch',
    name: 'Phone: Seller Listing Pitch',
    description: 'Call script for pitching listing services to potential sellers',
    category: 'Event',
    type: 'PHONE',
    body: `Call Script — Seller Listing Pitch

Opening: "Hi {{lead.firstName}}, this is {{user.firstName}} {{user.lastName}}. I specialize in real estate in your area and I wanted to share some exciting market news with you."

Market Hook: "Homes in your neighborhood have been selling for strong prices lately — the average sale price is {{market.averagePrice}} and properties are moving in just {{market.daysOnMarket}} days."

Key Questions:
• "Have you thought about what your home might be worth in today's market?"
• "Is there a timeline you're considering for a potential move?"
• "What's most important to you in choosing an agent?"

Value Proposition: "I offer a comprehensive marketing strategy including professional photography, virtual tours, targeted digital marketing, and access to my network of qualified buyers."

Close: "I'd love to provide you with a free, no-obligation home valuation. Would [suggest two times] work for a quick walkthrough?"

If voicemail: "Hi {{lead.firstName}}, this is {{user.firstName}}. Homes in your area are selling fast and I'd love to share what yours could be worth. Call me at {{user.phone}} for a free home valuation!"`,
    isRecurring: false,
    tags: ['phone', 'seller', 'listing-pitch'],
    icon: '🏷️',
    usageCount: 0,
  },
];

/**
 * Get all campaign templates
 */
export function getAllTemplates(): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find(template => template.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter(template => template.category === category);
}

/**
 * Get templates by type (EMAIL, SMS, PHONE)
 */
export function getTemplatesByType(type: 'EMAIL' | 'SMS' | 'PHONE'): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter(template => template.type === type);
}

/**
 * Get recurring templates only
 */
export function getRecurringTemplates(): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter(template => template.isRecurring);
}

/**
 * Track template usage — increments usageCount and sets lastUsedAt
 */
export function trackTemplateUsage(id: string): void {
  const template = CAMPAIGN_TEMPLATES.find(t => t.id === id);
  if (template) {
    template.usageCount += 1;
    template.lastUsedAt = new Date().toISOString();
  }
}
