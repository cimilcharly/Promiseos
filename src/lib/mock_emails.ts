import { ExtractedEmailInsights } from './email_classifier';

export interface MockEmail {
  id: string;
  emailId: string;
  subject: string;
  fromAddress: string;
  toAddress: string;
  snippet: string;
  body: string;
  dateSent: string;
  insights: ExtractedEmailInsights;
}

export function getMockEmails(): MockEmail[] {
  const today = new Date();
  const dateOffset = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  return [
    {
      id: 'mock-email-1',
      emailId: 'gmail_msg_101',
      subject: 'Invoice #2026-8942 from Vercel hosting',
      fromAddress: 'billing@vercel.com',
      toAddress: 'cimilcharly@gmail.com',
      snippet: 'Your invoice for team plan billing has been generated. Total amount due is $40.00 by July 5th.',
      body: 'Hi Charlie,\n\nThis email is to notify you that your monthly invoice for the team plan is now available.\n\nSummary:\n- Billing period: June 1 - June 30\n- Amount Due: $40.00 USD\n- Due Date: July 5th, 2026\n\nWe will charge your default payment method on file. If you need to update your credit card details, please visit your billing settings.\n\nThank you,\nThe Vercel Billing Team',
      dateSent: dateOffset(-1),
      insights: {
        category: 'Finance / bills',
        summary: 'Monthly Vercel team plan invoice generated. $40.00 will be auto-charged on July 5, 2026.',
        reason: 'Payment-related transaction alert detected. Amount of $40.00 is due in 5 days (July 5th). Auto-added to prevent payment disruption.',
        priorityScore: 98,
        urgency: 'High',
        actionRequired: true,
        categoryConfidence: 0.98,
        taskConfidence: 0.95,
        deadlineConfidence: 0.96,
        financialsConfidence: 0.98,
        trackingConfidence: 0.90,
        dates: [
          { label: 'Payment Due Date', date: dateOffset(5).split('T')[0] }
        ],
        tasks: [
          { task: 'Verify Vercel invoice card billing details', assignee: 'Me', deadline: dateOffset(5).split('T')[0] }
        ],
        tracking: {},
        financials: {
          amount: '$40.00',
          dueDate: dateOffset(5).split('T')[0],
          alert: true,
          biller: 'Vercel Inc.'
        },
        subscription: {},
        intent: 'Financial Notice',
        importance: 98,
        entities: ['Vercel', 'Charlie'],
        dynamic_tags: ['Billing', 'Finance', 'High Priority']
      }
    },
    {
      id: 'mock-email-2',
      emailId: 'gmail_msg_102',
      subject: 'Your order #4893829 has shipped!',
      fromAddress: 'shipments@amazon.com',
      toAddress: 'cimilcharly@gmail.com',
      snippet: 'Great news! Your package containing the Ergonomic Mechanical Keyboard has been shipped via UPS.',
      body: 'Hi Charlie,\n\nWe are pleased to let you know that your order #4893829 has been shipped and is on its way to you!\n\nShipment Details:\n- Item: Keychron K2 Ergonomic Mechanical Keyboard\n- Courier: UPS\n- Tracking Number: 1Z999AA10123456784\n- Estimated Delivery: Tomorrow by 8:00 PM\n\nYou can track your delivery status using the link below or entering the tracking number on the carrier site.\n\nBest,\nAmazon Logistics',
      dateSent: dateOffset(0),
      insights: {
        category: 'Purchases and orders',
        summary: 'Your Keychron K2 Mechanical Keyboard has shipped via UPS. Estimated delivery is tomorrow.',
        reason: 'Courier shipping dispatch notification detected. Contains valid tracking code and delivery window estimates.',
        priorityScore: 82,
        urgency: 'Medium',
        actionRequired: true,
        categoryConfidence: 0.96,
        taskConfidence: 0.90,
        deadlineConfidence: 0.92,
        financialsConfidence: 0.80,
        trackingConfidence: 0.95,
        dates: [
          { label: 'Estimated Delivery Date', date: dateOffset(1).split('T')[0] }
        ],
        tasks: [],
        tracking: {
          provider: 'UPS',
          trackingNumber: '1Z999AA10123456784',
          status: 'In Transit',
          deliveryDate: dateOffset(1).split('T')[0]
        },
        financials: { alert: false },
        subscription: {},
        intent: 'Delivery Update',
        importance: 82,
        entities: ['Amazon', 'UPS', 'Keychron Keyboard'],
        dynamic_tags: ['Logistics', 'Shipping', 'Transit']
      }
    },
    {
      id: 'mock-email-3',
      emailId: 'gmail_msg_103',
      subject: 'Meeting Confirmation: Q3 Product Roadmap Review',
      fromAddress: 'sarah.jones@agency-apex.com',
      toAddress: 'cimilcharly@gmail.com',
      snippet: 'We have confirmed our roadmap review meeting for Thursday at 3:00 PM EST. Agenda attached.',
      body: 'Hi Charlie,\n\nI have scheduled the Q3 Product Roadmap review session. Please confirm your attendance.\n\nDetails:\n- Date: Thursday, July 2nd, 2026\n- Time: 3:00 PM - 4:00 PM EST\n- Platform: Google Meet link (meet.google.com/abc-defg-hij)\n\nAgenda:\n1. Review Q2 milestones & delivery scorecard\n2. Align on Q3 high-priority features & resourcing\n3. Review feedback from early pilot clients\n\nPlease review the attached slide deck before the meeting.\n\nBest,\nSarah Jones\nProduct Manager',
      dateSent: dateOffset(-2),
      insights: {
        category: 'Meetings and calendar events',
        summary: 'Roadmap review meeting scheduled with Sarah Jones on Thursday, July 2, 2026, at 3:00 PM EST.',
        reason: 'Calendar invitation with Google Meet details detected. Handled schedule alignment block.',
        priorityScore: 88,
        urgency: 'High',
        actionRequired: true,
        categoryConfidence: 0.94,
        taskConfidence: 0.92,
        deadlineConfidence: 0.94,
        financialsConfidence: 0.80,
        trackingConfidence: 0.80,
        dates: [
          { label: 'Meeting Date', date: dateOffset(2).split('T')[0] }
        ],
        tasks: [
          { task: 'Review roadmap slides before Q3 review meeting', assignee: 'Me', deadline: dateOffset(2).split('T')[0] }
        ],
        tracking: {},
        financials: { alert: false },
        subscription: {},
        meeting: {
          time: '3:00 PM EST',
          joinLink: 'https://meet.google.com/abc-defg-hij',
          venue: 'Google Meet'
        },
        intent: 'Reminder',
        importance: 88,
        entities: ['Sarah Jones', 'Apex Digital Agency', 'Google Meet'],
        dynamic_tags: ['Meeting', 'Schedule', 'Professional']
      }
    },
    {
      id: 'mock-email-4',
      emailId: 'gmail_msg_104',
      subject: 'Action Required: Update repository dependencies by Friday',
      fromAddress: 'dev-ops@agency-apex.com',
      toAddress: 'cimilcharly@gmail.com',
      snippet: 'A critical vulnerability was found in our main web application. Please update packages by Friday.',
      body: 'Hey Team,\n\nWe found a security alert regarding the express-jwt library in our production repository. We need to upgrade all package versions to patch it.\n\nCharlie - can you update the dependencies in both `temp-app` and the main container by Friday?\n\nSteps:\n1. Run npm audit fix to update patch versions.\n2. Verify the OAuth redirection callback logic is unaffected.\n3. Deploy the container updates to staging.\n\nWe need this completed and verified by end of day Friday.\n\nDevOps Team',
      dateSent: dateOffset(-1),
      insights: {
        category: 'Tasks and action items',
        summary: 'Charlie needs to update express-jwt package dependencies in git and deploy to staging by Friday.',
        reason: 'Direct task instructions detected ("Charlie - can you update..."). Handled in Suggested queue for verification.',
        priorityScore: 78,
        urgency: 'Medium',
        actionRequired: true,
        categoryConfidence: 0.88,
        taskConfidence: 0.84,
        deadlineConfidence: 0.82,
        financialsConfidence: 0.70,
        trackingConfidence: 0.70,
        dates: [
          { label: 'Vulnerability patch deadline', date: dateOffset(3).split('T')[0] }
        ],
        tasks: [
          { task: 'Run npm audit and update express-jwt library packages', assignee: 'Me', deadline: dateOffset(3).split('T')[0] },
          { task: 'Deploy container dependency fixes to staging', assignee: 'Me', deadline: dateOffset(3).split('T')[0] }
        ],
        tracking: {},
        financials: { alert: false },
        subscription: {},
        intent: 'Action Required',
        importance: 85,
        entities: ['DevOps', 'GitHub Dependency', 'express-jwt'],
        dynamic_tags: ['Vulnerability', 'Patch', 'High Priority']
      }
    },
    {
      id: 'mock-email-5',
      emailId: 'gmail_msg_105',
      subject: 'Claude Pro subscription: Renewal notice',
      fromAddress: 'billing@anthropic.com',
      toAddress: 'cimilcharly@gmail.com',
      snippet: 'Your Claude Pro subscription will automatically renew on July 14th. Amount: $20.00 USD.',
      body: 'Hello,\n\nThis is a friendly reminder that your Claude Pro subscription is scheduled to auto-renew.\n\nSubscription Details:\n- Plan: Claude Pro\n- Renewal Date: July 14th, 2026\n- Billing Frequency: Monthly\n- Price: $20.00 USD plus applicable taxes\n\nNo action is required from you if you wish to continue. The charge will be processed automatically using your card ending in 8921.\n\nThanks,\nThe Anthropic Team',
      dateSent: dateOffset(-3),
      insights: {
        category: 'Subscriptions',
        summary: 'Claude Pro subscription is renewing on July 14, 2026. $20.00 will be auto-charged.',
        reason: 'Subscription renewal warnings detected. Placed in Suggested queue to confirm ongoing billing preferences.',
        priorityScore: 72,
        urgency: 'Medium',
        actionRequired: true,
        categoryConfidence: 0.90,
        taskConfidence: 0.80,
        deadlineConfidence: 0.82,
        financialsConfidence: 0.81,
        trackingConfidence: 0.70,
        dates: [
          { label: 'Subscription Renewal Date', date: dateOffset(14).split('T')[0] }
        ],
        tasks: [],
        tracking: {},
        financials: { alert: false },
        subscription: {
          name: 'Claude Pro',
          cost: '$20.00/month',
          renewalDate: dateOffset(14).split('T')[0],
          autoRenew: true
        },
        intent: 'Reminder',
        importance: 72,
        entities: ['Anthropic', 'Claude Pro'],
        dynamic_tags: ['SaaS', 'Billing', 'Renewal']
      }
    },
    {
      id: 'mock-email-6',
      emailId: 'gmail_msg_106',
      subject: 'Flight Booking Confirmation: SFO to JFK',
      fromAddress: 'bookings@delta.com',
      toAddress: 'cimilcharly@gmail.com',
      snippet: 'Your flight is confirmed. Flight DL142 departing San Francisco (SFO) on July 10th.',
      body: 'Dear Charles,\n\nYour travel booking is confirmed. Here is your flight itinerary.\n\nFlight Details:\n- Flight: DL142\n- Date: July 10th, 2026\n- Departure: San Francisco (SFO) at 8:30 AM\n- Arrival: New York (JFK) at 5:00 PM\n- Seat: 12C (Main Cabin)\n\nPlease check in online 24 hours prior to departure to receive your mobile boarding pass.\n\nWe look forward to welcoming you on board,\nDelta Air Lines',
      dateSent: dateOffset(-4),
      insights: {
        category: 'Travel',
        summary: 'Delta Flight DL142 from SFO to JFK confirmed for July 10, 2026. Depart at 8:30 AM, seat 12C.',
        reason: 'Flight boarding reservation confirmations detected. Bundled into Travel groups.',
        priorityScore: 92,
        urgency: 'High',
        actionRequired: true,
        categoryConfidence: 0.96,
        taskConfidence: 0.95,
        deadlineConfidence: 0.96,
        financialsConfidence: 0.90,
        trackingConfidence: 0.92,
        dates: [
          { label: 'Flight Departure Date', date: dateOffset(10).split('T')[0] }
        ],
        tasks: [
          { task: 'Check-in online for Delta flight DL142', assignee: 'Me', deadline: dateOffset(9).split('T')[0] }
        ],
        tracking: {},
        financials: { alert: false },
        subscription: {},
        intent: 'Reminder',
        importance: 92,
        entities: ['Delta Airlines', 'SFO Airport', 'JFK Airport'],
        dynamic_tags: ['Travel', 'Itinerary', 'Flight']
      }
    },
    
    // Novel Mock Item 7: Security Alert (resolving Informational Emails Missed)
    {
      id: 'mock-email-7',
      emailId: 'gmail_msg_107',
      subject: 'Security Alert: Your password has been changed successfully',
      fromAddress: 'accounts@google.com',
      toAddress: 'cimilcharly@gmail.com',
      snippet: 'The password for your Google account was recently changed. If this was not you, lock access.',
      body: 'Hi Charlie,\n\nThe password for your Google account cimilcharly@gmail.com was changed on June 30, 2026 at 10:20 PM UTC.\n\nIf you initiated this change, no action is required.\n\nIf you did not change your password, someone else may be accessing your account. Please check your account security status immediately to lock down unauthorized access.\n\nBest,\nGoogle Accounts Team',
      dateSent: dateOffset(0),
      insights: {
        category: 'Personal communication',
        summary: 'Google security alert notifying password change on cimilcharly@gmail.com.',
        reason: 'Security credential modification logged. Critical verification required to rule out breach.',
        priorityScore: 98,
        urgency: 'High',
        actionRequired: false,
        categoryConfidence: 0.98,
        taskConfidence: 0.20,
        deadlineConfidence: 0.20,
        financialsConfidence: 0.10,
        trackingConfidence: 0.10,
        dates: [],
        tasks: [],
        tracking: {},
        financials: { alert: false },
        subscription: {},
        intent: 'Security Alert',
        importance: 98,
        entities: ['Google Account', 'Charlie'],
        dynamic_tags: ['Security', 'Google', 'Critical Alert']
      }
    },

    // Novel Mock Item 8: Opportunity (resolving Informational Emails Missed)
    {
      id: 'mock-email-8',
      emailId: 'gmail_msg_108',
      subject: 'AI Conference 2026: Registrations are now open!',
      fromAddress: 'events@aiconference.org',
      toAddress: 'cimilcharly@gmail.com',
      snippet: 'Early bird registration is now open for the annual Global AI conference in San Francisco.',
      body: 'Dear AI Enthusiast,\n\nWe are excited to announce that registration for the Global AI Conference 2026 is officially open!\n\nEvent details:\n- Venue: Moscone Center, San Francisco\n- Dates: September 14-16, 2026\n- Focus areas: Generative Models, Agentic Workflows, and In-Context Caching.\n\nSave 40% by registering during our early-bird window opening today. Secure your spot now!\n\nSincerely,\nThe AI Conference Organizers',
      dateSent: dateOffset(-2),
      insights: {
        category: 'Personal communication',
        summary: 'Early bird ticket registration announcement for Global AI Conference 2026 in SF.',
        reason: 'Opportunity invitation for professional networking and technical career growth.',
        priorityScore: 75,
        urgency: 'Medium',
        actionRequired: false,
        categoryConfidence: 0.90,
        taskConfidence: 0.40,
        deadlineConfidence: 0.80,
        financialsConfidence: 0.10,
        trackingConfidence: 0.10,
        dates: [{ label: 'Conference starts', date: '2026-09-14' }],
        tasks: [],
        tracking: {},
        financials: { alert: false },
        subscription: {},
        intent: 'Opportunity',
        importance: 82,
        entities: ['AI Conference', 'Moscone Center', 'San Francisco'],
        dynamic_tags: ['Career', 'AI', 'Event']
      }
    },

    // Novel Mock Item 9: Informational Update (resolving Informational Emails Missed)
    {
      id: 'mock-email-9',
      emailId: 'gmail_msg_109',
      subject: 'Chase Bank: Important updates to your account terms',
      fromAddress: 'no-reply@chase.com',
      toAddress: 'cimilcharly@gmail.com',
      snippet: 'We are updating our terms of service regarding cash back limits and online banking fees.',
      body: 'Dear Customer,\n\nWe are writing to inform you of changes to your Chase Credit Card agreement terms starting August 2026.\n\nSummary of updates:\n- Cash back limits on grocery shopping will increase to 4%.\n- Monthly paper statement fees will be adjusted to $2.00 starting next billing cycle.\n\nNo action is required from you. The updated terms will automatically apply to your account.\n\nThank you,\nChase Cardmember Services',
      dateSent: dateOffset(-5),
      insights: {
        category: 'Personal communication',
        summary: 'Chase Credit Card account terms of service policy modification update.',
        reason: 'Compliance notice regarding cash back rewards and bank fee adjustments.',
        priorityScore: 60,
        urgency: 'Low',
        actionRequired: false,
        categoryConfidence: 0.94,
        taskConfidence: 0.10,
        deadlineConfidence: 0.10,
        financialsConfidence: 0.30,
        trackingConfidence: 0.10,
        dates: [],
        tasks: [],
        tracking: {},
        financials: { alert: false },
        subscription: {},
        intent: 'Informational',
        importance: 60,
        entities: ['Chase Bank', 'Credit Agreement'],
        dynamic_tags: ['Bank', 'Compliance', 'Informational']
      }
    }
  ];
}
