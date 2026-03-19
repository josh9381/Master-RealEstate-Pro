/**
 * Seed realistic multi-channel conversations for the Communication Hub.
 * Creates conversations with proper phone numbers for SMS, email addresses for email,
 * call logs, and a mix of read/unread + starred messages.
 *
 * Run with: npx ts-node scripts/seed-inbox-conversations.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('No organization found - run prisma seed first');

  const leads = await prisma.lead.findMany({
    take: 10,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  });
  if (leads.length === 0) throw new Error('No leads found - run prisma seed first');

  // Clear existing messages so we start fresh with clean demo data
  const deleted = await prisma.message.deleteMany({ where: { organizationId: org.id } });
  console.log(`🗑️  Cleared ${deleted.count} existing messages`);

  const agentEmail = 'josh@pinnaclerealty.com';
  const agentPhone = '+15551234567';

  // Normalize a lead phone to E.164-ish for SMS fromAddress/toAddress
  function phoneToE164(phone: string | null): string {
    if (!phone) return '+15550000000';
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 ? `+1${digits}` : `+${digits}`;
  }

  const now = new Date();
  function hoursAgo(h: number): Date {
    return new Date(now.getTime() - h * 3600_000);
  }
  function daysAgo(d: number, extraHours = 0): Date {
    return new Date(now.getTime() - d * 86400_000 - extraHours * 3600_000);
  }

  type Msg = {
    type: 'EMAIL' | 'SMS' | 'CALL';
    direction: 'INBOUND' | 'OUTBOUND';
    subject?: string;
    body: string;
    fromAddress: string;
    toAddress: string;
    status: 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'FAILED';
    leadId: string;
    organizationId: string;
    createdAt: Date;
    sentAt: Date;
    deliveredAt: Date;
    readAt?: Date | null;
    starred?: boolean;
    archived?: boolean;
  };

  const messages: Msg[] = [];

  // ── Lead 0: Rachel Carter — Email + SMS multi-channel, recent activity ──
  const l0 = leads[0];
  const l0Phone = phoneToE164(l0.phone);
  const l0Msgs: Partial<Msg>[] = [
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'New Listings Matching Your Criteria', body: `Hi ${l0.firstName},\n\nI found 3 beautiful properties in your price range that I think you'll love. Would you like to schedule viewings this weekend?\n\n1. 4BR/3BA Colonial at 142 Oak Lane - $485,000\n2. 3BR/2BA Ranch at 78 Maple Dr - $375,000\n3. 5BR/4BA Modern at 201 Cedar Ave - $625,000\n\nLet me know which ones interest you!\n\nBest,\nJosh`, fromAddress: agentEmail, toAddress: l0.email, createdAt: daysAgo(3, 4), readAt: daysAgo(3, 2), status: 'OPENED' },
    { type: 'EMAIL', direction: 'INBOUND', subject: 'Re: New Listings Matching Your Criteria', body: `Josh,\n\nThose look amazing! I'm definitely interested in #1 and #3. Can we see them Saturday morning?\n\nThanks,\n${l0.firstName}`, fromAddress: l0.email, toAddress: agentEmail, createdAt: daysAgo(3, 1), readAt: daysAgo(3), status: 'DELIVERED' },
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'Re: New Listings Matching Your Criteria', body: `Perfect! I've scheduled viewings:\n\n- 142 Oak Lane: Saturday 10:00 AM\n- 201 Cedar Ave: Saturday 11:30 AM\n\nI'll send you the lockbox codes the morning of. See you there!`, fromAddress: agentEmail, toAddress: l0.email, createdAt: daysAgo(2, 20), readAt: daysAgo(2, 18), status: 'OPENED' },
    { type: 'SMS', direction: 'OUTBOUND', body: `Hi ${l0.firstName}! Confirming tomorrow's showings at 10am (Oak Lane) and 11:30am (Cedar Ave). Text me if anything changes! 🏡`, fromAddress: agentPhone, toAddress: l0Phone, createdAt: daysAgo(1, 14), status: 'DELIVERED' },
    { type: 'SMS', direction: 'INBOUND', body: `Sounds great! See you at 10. Quick question - is the Oak Lane one pet friendly? We have a golden retriever 🐕`, fromAddress: l0Phone, toAddress: agentPhone, createdAt: daysAgo(1, 13), readAt: daysAgo(1, 12), status: 'DELIVERED' },
    { type: 'SMS', direction: 'OUTBOUND', body: `Yes! Oak Lane has a fenced backyard, perfect for your pup. The HOA allows dogs up to 80 lbs.`, fromAddress: agentPhone, toAddress: l0Phone, createdAt: daysAgo(1, 12), status: 'DELIVERED' },
    { type: 'SMS', direction: 'INBOUND', body: `That's perfect! We're so excited. See you tomorrow! 😊`, fromAddress: l0Phone, toAddress: agentPhone, createdAt: daysAgo(1, 11), readAt: null, status: 'DELIVERED', starred: true },
    { type: 'EMAIL', direction: 'INBOUND', subject: 'Loved the Oak Lane property!', body: `Hi Josh,\n\nWe absolutely loved 142 Oak Lane! The backyard is perfect and the kitchen renovation is stunning. We'd like to put in an offer.\n\nWhat's the process from here?\n\nBest,\n${l0.firstName}`, fromAddress: l0.email, toAddress: agentEmail, createdAt: hoursAgo(5), readAt: null, status: 'DELIVERED', starred: true },
  ];
  l0Msgs.forEach(m => messages.push({ ...m, leadId: l0.id, organizationId: org.id, sentAt: m.createdAt!, deliveredAt: new Date(m.createdAt!.getTime() + 5000) } as Msg));

  // ── Lead 1: Raj Mitchell — SMS-only conversation ──
  const l1 = leads[1];
  const l1Phone = phoneToE164(l1.phone);
  const l1Msgs: Partial<Msg>[] = [
    { type: 'SMS', direction: 'OUTBOUND', body: `Hi ${l1.firstName}, this is Josh from Pinnacle Realty. I saw you requested info about condos downtown. Would love to help!`, fromAddress: agentPhone, toAddress: l1Phone, createdAt: daysAgo(5, 8), status: 'DELIVERED' },
    { type: 'SMS', direction: 'INBOUND', body: `Hey Josh! Yes, I'm looking for a 2BR condo near the waterfront. Budget around 400K.`, fromAddress: l1Phone, toAddress: agentPhone, createdAt: daysAgo(5, 6), readAt: daysAgo(5, 5), status: 'DELIVERED' },
    { type: 'SMS', direction: 'OUTBOUND', body: `Great taste! There are 4 units available in that area. Want to grab coffee and go through them this week?`, fromAddress: agentPhone, toAddress: l1Phone, createdAt: daysAgo(5, 5), status: 'DELIVERED' },
    { type: 'SMS', direction: 'INBOUND', body: `Sounds good. Thursday afternoon works for me?`, fromAddress: l1Phone, toAddress: agentPhone, createdAt: daysAgo(4, 10), readAt: daysAgo(4, 9), status: 'DELIVERED' },
    { type: 'SMS', direction: 'OUTBOUND', body: `Thursday 2pm at Blue Bottle on Main St? ☕`, fromAddress: agentPhone, toAddress: l1Phone, createdAt: daysAgo(4, 9), status: 'DELIVERED' },
    { type: 'SMS', direction: 'INBOUND', body: `See you there 👍`, fromAddress: l1Phone, toAddress: agentPhone, createdAt: daysAgo(4, 8), readAt: daysAgo(4, 7), status: 'DELIVERED' },
    { type: 'SMS', direction: 'INBOUND', body: `Hey Josh, I really liked the Harbor Point unit. Can we schedule a second viewing with my partner?`, fromAddress: l1Phone, toAddress: agentPhone, createdAt: hoursAgo(3), readAt: null, status: 'DELIVERED' },
  ];
  l1Msgs.forEach(m => messages.push({ ...m, leadId: l1.id, organizationId: org.id, sentAt: m.createdAt!, deliveredAt: new Date(m.createdAt!.getTime() + 3000) } as Msg));

  // ── Lead 2: Derek Perez — Email-only, formal buyer ──
  const l2 = leads[2];
  const l2Msgs: Partial<Msg>[] = [
    { type: 'EMAIL', direction: 'INBOUND', subject: 'Inquiry About Commercial Properties', body: `Dear Josh,\n\nMy company is looking to purchase commercial real estate in the downtown corridor. We need approximately 5,000 sq ft of office space with parking for at least 20 vehicles.\n\nCould you please send me any current listings that match these requirements?\n\nRegards,\n${l2.firstName} ${l2.lastName}\nPerez Industries`, fromAddress: l2.email, toAddress: agentEmail, createdAt: daysAgo(7, 3), readAt: daysAgo(7, 1), status: 'DELIVERED' },
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'Re: Inquiry About Commercial Properties', body: `Dear ${l2.firstName},\n\nThank you for reaching out! I have several properties that could be a great fit:\n\n1. 500 Commerce Blvd - 5,200 sq ft, 25 parking spots - $1.2M\n2. 312 Business Park Way - 4,800 sq ft, 30 parking spots - $985K\n3. 201 Executive Dr - 6,100 sq ft, 22 parking spots - $1.45M\n\nI've attached detailed brochures. Would you like to tour any of these?\n\nBest regards,\nJosh`, fromAddress: agentEmail, toAddress: l2.email, createdAt: daysAgo(6, 20), readAt: daysAgo(6, 15), status: 'CLICKED' },
    { type: 'EMAIL', direction: 'INBOUND', subject: 'Re: Inquiry About Commercial Properties', body: `Josh,\n\nExcellent options. #1 and #3 look promising. Could we arrange tours next week? Monday or Tuesday work best for our team.\n\nAlso, do you know if 500 Commerce Blvd allows exterior signage?\n\nThanks,\n${l2.firstName}`, fromAddress: l2.email, toAddress: agentEmail, createdAt: daysAgo(6, 2), readAt: daysAgo(6), status: 'DELIVERED' },
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'Re: Inquiry About Commercial Properties', body: `${l2.firstName},\n\nGreat news - both properties allow exterior signage! I've scheduled:\n\n- Monday 10 AM: 500 Commerce Blvd\n- Monday 2 PM: 201 Executive Dr\n\nI'll meet you in the lobby. Bring anyone from your team who'd like to see the spaces.\n\nLooking forward to it!`, fromAddress: agentEmail, toAddress: l2.email, createdAt: daysAgo(5, 18), status: 'OPENED' },
  ];
  l2Msgs.forEach(m => messages.push({ ...m, leadId: l2.id, organizationId: org.id, sentAt: m.createdAt!, deliveredAt: new Date(m.createdAt!.getTime() + 8000) } as Msg));

  // ── Lead 3: Christopher Lee — Email + SMS + Call, very active ──
  const l3 = leads[3];
  const l3Phone = phoneToE164(l3.phone);
  const l3Msgs: Partial<Msg>[] = [
    { type: 'CALL', direction: 'INBOUND', body: `Incoming call from ${l3.firstName} ${l3.lastName}. Discussed first-time homebuyer options and pre-approval process. Duration: 18 mins.`, fromAddress: l3Phone, toAddress: agentPhone, createdAt: daysAgo(10, 5), readAt: daysAgo(10, 5), status: 'DELIVERED' },
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'First-Time Homebuyer Resources', body: `Hi ${l3.firstName},\n\nGreat chatting with you today! As promised, here are the resources we discussed:\n\n- FHA Loan Guide (attached)\n- Local down payment assistance programs\n- Pre-approval checklist\n\nOnce you get pre-approved, we can start looking at properties right away. I recommend reaching out to Maria at First National Bank - she's excellent with first-time buyers.\n\nTalk soon!`, fromAddress: agentEmail, toAddress: l3.email, createdAt: daysAgo(10, 3), status: 'OPENED' },
    { type: 'EMAIL', direction: 'INBOUND', subject: 'Re: First-Time Homebuyer Resources', body: `Josh!\n\nThis is so helpful, thank you! I've already reached out to Maria. She says I should be pre-approved within the week.\n\nI'm really excited - this is happening!\n\n${l3.firstName}`, fromAddress: l3.email, toAddress: agentEmail, createdAt: daysAgo(9, 8), readAt: daysAgo(9, 6), status: 'DELIVERED' },
    { type: 'SMS', direction: 'INBOUND', body: `Hey Josh! Got pre-approved for $350K!! 🎉🎉`, fromAddress: l3Phone, toAddress: agentPhone, createdAt: daysAgo(6, 4), readAt: daysAgo(6, 3), status: 'DELIVERED', starred: true },
    { type: 'SMS', direction: 'OUTBOUND', body: `That's amazing ${l3.firstName}!!! 🎊 Congrats! I've already started pulling listings. Let's meet this weekend?`, fromAddress: agentPhone, toAddress: l3Phone, createdAt: daysAgo(6, 3), status: 'DELIVERED' },
    { type: 'SMS', direction: 'INBOUND', body: `Saturday works! Morning or afternoon?`, fromAddress: l3Phone, toAddress: agentPhone, createdAt: daysAgo(6, 2), readAt: daysAgo(6, 1), status: 'DELIVERED' },
    { type: 'CALL', direction: 'OUTBOUND', body: `Called ${l3.firstName} to discuss showing schedule. Set up 4 viewings for Saturday. Duration: 12 mins.`, fromAddress: agentPhone, toAddress: l3Phone, createdAt: daysAgo(5, 20), readAt: daysAgo(5, 20), status: 'DELIVERED' },
    { type: 'SMS', direction: 'INBOUND', body: `Josh, I think I found THE ONE. The blue craftsman on Willow St. Can we make an offer today?!`, fromAddress: l3Phone, toAddress: agentPhone, createdAt: daysAgo(2, 6), readAt: null, status: 'DELIVERED', starred: true },
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'Offer Package - 45 Willow Street', body: `${l3.firstName},\n\nI've prepared the offer package for 45 Willow Street. Here are the details:\n\n- Offer Price: $339,000 (asking is $345K)\n- Earnest Money: $10,000\n- Closing Date: 45 days\n- Contingencies: Inspection, Appraisal, Financing\n\nPlease review the attached documents and sign electronically. Call me if you have any questions!\n\nExciting times ahead! 🏡`, fromAddress: agentEmail, toAddress: l3.email, createdAt: daysAgo(2, 4), status: 'OPENED' },
    { type: 'EMAIL', direction: 'INBOUND', subject: 'Re: Offer Package - 45 Willow Street', body: `Josh,\n\nEverything looks great! I signed all the documents. Fingers crossed!! 🤞\n\nHow long until we hear back?\n\n${l3.firstName}`, fromAddress: l3.email, toAddress: agentEmail, createdAt: daysAgo(2, 2), readAt: null, status: 'DELIVERED' },
  ];
  l3Msgs.forEach(m => messages.push({ ...m, leadId: l3.id, organizationId: org.id, sentAt: m.createdAt!, deliveredAt: new Date(m.createdAt!.getTime() + 4000) } as Msg));

  // ── Lead 4: Samantha Morales — Seller, email conversations ──
  const l4 = leads[4];
  const l4Phone = phoneToE164(l4.phone);
  const l4Msgs: Partial<Msg>[] = [
    { type: 'EMAIL', direction: 'INBOUND', subject: 'Thinking of Selling My Home', body: `Hi Josh,\n\nI was referred by my neighbor who sold their house with you last year. I'm thinking of listing my home at 88 Birch Court.\n\n3BR/2BA, about 1,800 sq ft, updated kitchen. What do you think it could sell for?\n\nThanks,\n${l4.firstName}`, fromAddress: l4.email, toAddress: agentEmail, createdAt: daysAgo(4, 10), readAt: daysAgo(4, 8), status: 'DELIVERED' },
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'Re: Thinking of Selling My Home', body: `Hi ${l4.firstName},\n\nThanks for reaching out! I'd love to help. Based on recent comps in your area, homes like yours are selling between $420K-$460K.\n\nI'd love to do a walkthrough to give you a more precise CMA. Are you available this week?\n\nBest,\nJosh`, fromAddress: agentEmail, toAddress: l4.email, createdAt: daysAgo(4, 6), readAt: daysAgo(4, 3), status: 'OPENED' },
    { type: 'SMS', direction: 'INBOUND', body: `Hi Josh, it's ${l4.firstName}. Wednesday at 4pm for the walkthrough?`, fromAddress: l4Phone, toAddress: agentPhone, createdAt: daysAgo(3, 8), readAt: daysAgo(3, 7), status: 'DELIVERED' },
    { type: 'SMS', direction: 'OUTBOUND', body: `Wednesday 4pm works perfectly! I'll bring the comp report. See you at 88 Birch Court 👋`, fromAddress: agentPhone, toAddress: l4Phone, createdAt: daysAgo(3, 7), status: 'DELIVERED' },
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'CMA Report - 88 Birch Court', body: `${l4.firstName},\n\nIt was great seeing your home yesterday! It's in fantastic condition. Here's my recommendation:\n\n📊 Suggested List Price: $449,900\n📈 Expected Sale Price: $440K-$455K\n⏰ Estimated Days on Market: 14-21\n\nI've attached the full CMA report. If you'd like to proceed, I can have the listing agreement ready within 24 hours.\n\nLet me know what you think!`, fromAddress: agentEmail, toAddress: l4.email, createdAt: daysAgo(1, 16), status: 'OPENED' },
    { type: 'EMAIL', direction: 'INBOUND', subject: 'Re: CMA Report - 88 Birch Court', body: `Josh,\n\nThis is very thorough, thank you! My husband and I discussed it and we'd like to go ahead with listing at $449,900.\n\nWhen can we sign the listing agreement?\n\n${l4.firstName}`, fromAddress: l4.email, toAddress: agentEmail, createdAt: hoursAgo(8), readAt: null, status: 'DELIVERED' },
  ];
  l4Msgs.forEach(m => messages.push({ ...m, leadId: l4.id, organizationId: org.id, sentAt: m.createdAt!, deliveredAt: new Date(m.createdAt!.getTime() + 6000) } as Msg));

  // ── Lead 5: Just a missed call + voicemail ──
  if (leads[5]) {
    const l5 = leads[5];
    const l5Phone = phoneToE164(l5.phone);
    messages.push({
      type: 'CALL', direction: 'INBOUND',
      body: `Missed call from ${l5.firstName} ${l5.lastName}. No voicemail left.`,
      fromAddress: l5Phone, toAddress: agentPhone,
      status: 'DELIVERED', leadId: l5.id, organizationId: org.id,
      createdAt: hoursAgo(1), sentAt: hoursAgo(1),
      deliveredAt: hoursAgo(1), readAt: null,
    });
  }

  // ── Lead 6: Email that was archived ──
  if (leads[6]) {
    const l6 = leads[6];
    messages.push({
      type: 'EMAIL', direction: 'INBOUND',
      subject: 'Just browsing for now',
      body: `Hi, I'm not ready to buy yet but wanted to be on your mailing list for when prices come down. Thanks!`,
      fromAddress: l6.email, toAddress: agentEmail,
      status: 'DELIVERED', leadId: l6.id, organizationId: org.id,
      createdAt: daysAgo(14), sentAt: daysAgo(14),
      deliveredAt: daysAgo(14), readAt: daysAgo(13), archived: true,
    });
  }

  // ── Lead 7: Failed SMS ──
  if (leads[7]) {
    const l7 = leads[7];
    const l7Phone = phoneToE164(l7.phone);
    messages.push({
      type: 'SMS', direction: 'OUTBOUND',
      body: `Hi ${l7.firstName}, following up on your property inquiry. Are you still interested in scheduling a viewing?`,
      fromAddress: agentPhone, toAddress: l7Phone,
      status: 'FAILED', leadId: l7.id, organizationId: org.id,
      createdAt: daysAgo(2), sentAt: daysAgo(2),
      deliveredAt: daysAgo(2),
    });
  }

  // ── Lead 8: Recent non-lead email (no leadId), from unknown sender ──
  if (leads[8]) {
    const l8 = leads[8];
    messages.push({
      type: 'EMAIL', direction: 'INBOUND',
      subject: 'Question about your listing on Zillow',
      body: `Hi there,\n\nI saw your listing for 322 Sunset Blvd on Zillow. Is it still available? I'd like to schedule a tour this weekend if possible.\n\nThanks,\n${l8.firstName}`,
      fromAddress: l8.email, toAddress: agentEmail,
      status: 'DELIVERED', leadId: l8.id, organizationId: org.id,
      createdAt: hoursAgo(2), sentAt: hoursAgo(2),
      deliveredAt: hoursAgo(2), readAt: null,
    });
  }

  // ── Lead 9: Starred old conversation ──
  if (leads[9]) {
    const l9 = leads[9];
    const l9Phone = phoneToE164(l9.phone);
    const l9Msgs: Partial<Msg>[] = [
      { type: 'SMS', direction: 'INBOUND', body: `Is the open house at 500 Pine still happening Sunday?`, fromAddress: l9Phone, toAddress: agentPhone, createdAt: daysAgo(8, 4), readAt: daysAgo(8, 3), status: 'DELIVERED' },
      { type: 'SMS', direction: 'OUTBOUND', body: `Yes! Sunday 1-4pm. I'll be there personally. Come say hi! 🏠`, fromAddress: agentPhone, toAddress: l9Phone, createdAt: daysAgo(8, 3), status: 'DELIVERED', starred: true },
      { type: 'SMS', direction: 'INBOUND', body: `Loved the house! My wife wants to come back Tuesday for a second look.`, fromAddress: l9Phone, toAddress: agentPhone, createdAt: daysAgo(7, 6), readAt: daysAgo(7, 5), status: 'DELIVERED' },
      { type: 'SMS', direction: 'OUTBOUND', body: `That's great to hear! Tuesday works. I'll set it up for 5:30pm so you can see the sunset from the deck 🌅`, fromAddress: agentPhone, toAddress: l9Phone, createdAt: daysAgo(7, 5), status: 'DELIVERED' },
    ];
    l9Msgs.forEach(m => messages.push({ ...m, leadId: l9.id, organizationId: org.id, sentAt: m.createdAt!, deliveredAt: new Date(m.createdAt!.getTime() + 3000) } as Msg));
  }

  // Insert all messages
  let created = 0;
  for (const msg of messages) {
    await prisma.message.create({
      data: {
        type: msg.type,
        direction: msg.direction,
        subject: msg.subject || null,
        body: msg.body,
        fromAddress: msg.fromAddress,
        toAddress: msg.toAddress,
        status: msg.status,
        leadId: msg.leadId,
        organizationId: msg.organizationId,
        createdAt: msg.createdAt,
        sentAt: msg.sentAt,
        deliveredAt: msg.deliveredAt,
        readAt: msg.readAt ?? undefined,
        starred: msg.starred ?? false,
        archived: msg.archived ?? false,
      },
    });
    created++;
  }

  console.log(`✅ Created ${created} messages across ${leads.length} contacts`);
  console.log(`   📧 Emails: ${messages.filter(m => m.type === 'EMAIL').length}`);
  console.log(`   💬 SMS: ${messages.filter(m => m.type === 'SMS').length}`);
  console.log(`   📞 Calls: ${messages.filter(m => m.type === 'CALL').length}`);
  console.log(`   🔴 Unread: ${messages.filter(m => !m.readAt && m.direction === 'INBOUND').length}`);
  console.log(`   ⭐ Starred: ${messages.filter(m => m.starred).length}`);
  console.log(`   📦 Archived: ${messages.filter(m => m.archived).length}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
