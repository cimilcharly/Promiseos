import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ExtractedEmailInsights {
  category: string;
  summary: string;
  reason: string;
  priorityScore: number;
  urgency: 'High' | 'Medium' | 'Low';
  actionRequired: boolean;
  
  // Granular Confidence Parameters
  categoryConfidence: number;
  taskConfidence: number;
  deadlineConfidence: number;
  financialsConfidence: number;
  trackingConfidence: number;

  dates: { label: string; date: string }[];
  tasks: { task: string; assignee: string; deadline: string }[];
  tracking: { provider?: string; trackingNumber?: string; status?: string; deliveryDate?: string };
  financials: { amount?: string; dueDate?: string; alert?: boolean; biller?: string };
  subscription: { name?: string; cost?: string; renewalDate?: string; autoRenew?: boolean };
  
  meeting?: { time?: string; joinLink?: string; venue?: string };

  // AI Intent Understanding & Information Intelligence parameters (resolving Issue: Informational Emails Missed)
  intent: 'Action Required' | 'Informational' | 'Opportunity' | 'Reminder' | 'Security Alert' | 'Delivery Update' | 'Personal Communication' | 'Financial Notice' | 'Reference Information';
  importance: number; // 0 to 100 importance score
  entities: string[];
  dynamic_tags: string[];
}

// 1. Preprocessing Layer: Clean email body to save tokens and improve quality
export function preprocessEmailBody(body: string): string {
  let cleaned = body.replace(/On\s+.*,\s+.*wrote:[\s\S]*/g, '');
  cleaned = cleaned.replace(/---\s*Original Message\s*---[\s\S]*/gi, '');
  cleaned = cleaned.replace(/>+/g, '');
  const sigIndex = cleaned.search(/(best regards|sincerely|thanks|regards|cheers|kind regards|warmly),?/i);
  if (sigIndex !== -1) {
    cleaned = cleaned.substring(0, sigIndex);
  }
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim().slice(0, 3000);
}

// 2. Programmatic Validation Layer
export function validateInsights(insights: ExtractedEmailInsights): ExtractedEmailInsights {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (insights.dates && insights.dates.length > 0) {
    insights.dates = insights.dates.filter(d => {
      if (!dateRegex.test(d.date)) {
        insights.deadlineConfidence = 0.35;
        return false;
      }
      const dateVal = new Date(d.date);
      if (dateVal < today) {
        insights.deadlineConfidence = 0.45;
      }
      return true;
    });
  }

  if (insights.tasks && insights.tasks.length > 0) {
    insights.tasks.forEach(t => {
      if (t.deadline && !dateRegex.test(t.deadline)) {
        insights.taskConfidence = Math.min(insights.taskConfidence, 0.5);
      }
    });
  }

  if (insights.financials?.amount) {
    const cleanAmount = insights.financials.amount.replace(/[$\u20B9,\s]/g, '');
    if (isNaN(Number(cleanAmount))) {
      insights.financialsConfidence = Math.min(insights.financialsConfidence, 0.5);
    }
  }

  return insights;
}

// 3. Main Classification + Extraction Separator
export async function classifyEmailAndExtractInsights(
  subject: string,
  rawBody: string,
  apiKey: string | null
): Promise<ExtractedEmailInsights> {
  const body = preprocessEmailBody(rawBody);

  if (!apiKey || !apiKey.trim() || apiKey === 'mock-key') {
    return validateInsights(runMockClassifier(subject, body));
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Stage 1: Classify Relevance, Intent, and Priority
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const classificationPrompt = `
Analyze this email and classify its intent and relevance.
Email Subject: ${subject}
Email Body: ${body.slice(0, 1000)}

Determine:
1. Category: "Finance / bills", "Job and career", "Meetings and calendar events", "Purchases and orders", "Travel", "Subscriptions", "Personal communication", "Promotions and spam", "Tasks and action items", "Deadlines and reminders", or "Irrelevant".
2. Priority Score: 0 to 100.
3. Urgency: "High", "Medium", or "Low".
4. Action Required: true if the user needs to reply, pay, attend, do a task, track delivery, or review critical information. Otherwise false.
5. Is Spam: true if marketing, ads, or newsletters. Otherwise false.
6. Category Confidence: score from 0.0 to 1.0.
7. Intent: "Action Required", "Informational", "Opportunity", "Reminder", "Security Alert", "Delivery Update", "Personal Communication", "Financial Notice", or "Reference Information".
8. Importance: 0 to 100 importance score considering sender relevance and context.

Return a JSON object:
{
  "category": "Category name",
  "priorityScore": 85,
  "urgency": "High"|"Medium"|"Low",
  "actionRequired": true|false,
  "isSpam": true|false,
  "categoryConfidence": 0.95,
  "intent": "Intent category",
  "importance": 80
}
`;

    const classificationResult = await model.generateContent(classificationPrompt);
    let classText = classificationResult.response.text().trim();
    if (classText.startsWith('```json')) classText = classText.substring(7);
    if (classText.startsWith('```')) classText = classText.substring(3);
    if (classText.endsWith('```')) classText = classText.substring(0, classText.length - 3);

    const classParsed = JSON.parse(classText.trim());

    // If promotions/spam, return early
    if (classParsed.isSpam || classParsed.category === 'Promotions and spam') {
      return {
        category: 'Promotions and spam',
        summary: 'Classified as promotional or irrelevant email.',
        reason: 'Subject line or body contents match commercial newsletter/promotional spam triggers.',
        priorityScore: 20,
        urgency: 'Low',
        actionRequired: false,
        categoryConfidence: 0.90,
        taskConfidence: 0.1,
        deadlineConfidence: 0.1,
        financialsConfidence: 0.1,
        trackingConfidence: 0.1,
        dates: [],
        tasks: [],
        tracking: {},
        financials: { alert: false },
        subscription: {},
        intent: 'Informational',
        importance: 15,
        entities: [],
        dynamic_tags: ['Spam', 'Newsletter'],
      };
    }

    // Stage 2: Detailed Extraction
    const extractionModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const todayStr = new Date().toISOString().split('T')[0];

    const extractionPrompt = `
You are an email analysis AI. Analyze the email subject and body below for intent: "${classParsed.intent}".
Today is ${todayStr}.

Email Subject: ${subject}
Email Body:
"""
${body}
"""

Extract structured information. Provide an explicit explanation under "reason" clarifying why this email was flagged as important.
Provide confidence ratings (0.0 to 1.0) for extraction.

Extract:
- entities: string array of key nouns, names, events, organizations (e.g. ["Delta Air Lines", "JFK"])
- dynamic_tags: string array of dynamic contextual tags (e.g. ["Career", "AI", "Event"])

Return a JSON object:
{
  "summary": "Brief 1-2 sentence summary of the email",
  "reason": "Clear explanation of priority/relevance for the user",
  "taskConfidence": 0.95,
  "deadlineConfidence": 0.92,
  "financialsConfidence": 0.98,
  "trackingConfidence": 0.90,
  "dates": [
    { "label": "e.g. Payment due, Flight departure", "date": "YYYY-MM-DD" }
  ],
  "tasks": [
    { "task": "Actionable task", "assignee": "Person responsible", "deadline": "YYYY-MM-DD" }
  ],
  "tracking": {
    "provider": "UPS|FedEx|DHL|Amazon (optional)",
    "trackingNumber": "tracking string (optional)",
    "status": "Shipped|In transit|Delivered (optional)",
    "deliveryDate": "YYYY-MM-DD (optional)"
  },
  "financials": {
    "amount": "e.g., $150.00 (optional)",
    "dueDate": "YYYY-MM-DD (optional)",
    "alert": true|false,
    "biller": "Biller name (optional)"
  },
  "subscription": {
    "name": "Service name (optional)",
    "cost": "e.g., $10/mo (optional)",
    "renewalDate": "YYYY-MM-DD (optional)",
    "autoRenew": true|false
  },
  "meeting": {
    "time": "Meeting start time (optional)",
    "joinLink": "Google Meet or Zoom URL (optional)",
    "venue": "Location or platform (optional)"
  },
  "entities": [],
  "dynamic_tags": []
}
Return ONLY valid JSON.
`;

    const extractionResult = await extractionModel.generateContent(extractionPrompt);
    let text = extractionResult.response.text().trim();

    if (text.startsWith('```json')) text = text.substring(7);
    if (text.startsWith('```')) text = text.substring(3);
    if (text.endsWith('```')) text = text.substring(0, text.length - 3);

    const parsed = JSON.parse(text.trim());
    
    // Apply Programmatic Validation Layer on output
    return validateInsights({
      category: classParsed.category,
      priorityScore: classParsed.priorityScore,
      urgency: classParsed.urgency,
      actionRequired: classParsed.actionRequired,
      categoryConfidence: classParsed.categoryConfidence,
      intent: classParsed.intent,
      importance: classParsed.importance,
      ...parsed,
    });
  } catch (error) {
    console.error('Error in two-stage Gemini processing, falling back:', error);
    return validateInsights(runMockClassifier(subject, body));
  }
}

function runMockClassifier(subject: string, body: string): ExtractedEmailInsights {
  const subjLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();

  const futureDate = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const result: ExtractedEmailInsights = {
    category: 'Personal communication',
    summary: `An email regarding "${subject}".`,
    reason: 'Contains general personal communication without immediate commitments.',
    priorityScore: 30,
    urgency: 'Low',
    actionRequired: false,
    
    // Granular Confidences
    categoryConfidence: 0.95,
    taskConfidence: 0.80,
    deadlineConfidence: 0.85,
    financialsConfidence: 0.90,
    trackingConfidence: 0.80,

    dates: [],
    tasks: [],
    tracking: {},
    financials: { alert: false },
    subscription: {},

    // Fallback intent parameters
    intent: 'Personal Communication',
    importance: 40,
    entities: [],
    dynamic_tags: ['Personal', 'General'],
  };

  if (subjLower.includes('invoice') || subjLower.includes('bill') || subjLower.includes('payment') || subjLower.includes('statement')) {
    result.category = 'Finance / bills';
    result.summary = `Invoice or billing statement received for ${subject}.`;
    result.reason = 'Invoice statements require attention; payment details extracted to prevent late fee penalties.';
    result.priorityScore = 95;
    result.urgency = 'High';
    result.actionRequired = true;
    result.categoryConfidence = 0.98;
    result.taskConfidence = 0.95;
    result.deadlineConfidence = 0.96;
    result.financialsConfidence = 0.98;
    result.dates = [{ label: 'Payment due date', date: futureDate(5) }];
    result.tasks = [{ task: `Pay outstanding bill for ${subject}`, assignee: 'Me', deadline: futureDate(5) }];
    result.financials = {
      amount: '$149.00',
      dueDate: futureDate(5),
      alert: true,
      biller: subject.split(' ')[0] || 'Vendor',
    };
    result.intent = 'Financial Notice';
    result.importance = 95;
    result.entities = [subject.split(' ')[0] || 'Biller'];
    result.dynamic_tags = ['Billing', 'Finance', 'High Priority'];
  } else if (subjLower.includes('order') || subjLower.includes('shipment') || subjLower.includes('shipped') || subjLower.includes('tracking')) {
    result.category = 'Purchases and orders';
    result.summary = `Order confirmation and shipping status update.`;
    result.reason = 'Tracking code detected for active shipment. Placed in tracker progress pipeline.';
    result.priorityScore = 80;
    result.urgency = 'Medium';
    result.actionRequired = true;
    result.categoryConfidence = 0.96;
    result.trackingConfidence = 0.94;
    result.dates = [{ label: 'Estimated delivery', date: futureDate(3) }];
    result.tracking = {
      provider: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      status: 'In transit',
      deliveryDate: futureDate(3),
    };
    result.intent = 'Delivery Update';
    result.importance = 80;
    result.entities = ['Amazon', 'UPS'];
    result.dynamic_tags = ['Logistics', 'Shipping', 'Tracked'];
  } else if (subjLower.includes('meeting') || subjLower.includes('calendar') || subjLower.includes('invite') || subjLower.includes('scheduled')) {
    result.category = 'Meetings and calendar events';
    result.summary = `Invitation or details for a meeting: "${subject}".`;
    result.reason = 'Calendar invitation details detected. Action item created for scheduling agenda review.';
    result.priorityScore = 85;
    result.urgency = 'High';
    result.actionRequired = true;
    result.categoryConfidence = 0.94;
    result.taskConfidence = 0.92;
    result.deadlineConfidence = 0.94;
    result.dates = [{ label: 'Meeting date', date: futureDate(1) }];
    result.tasks = [{ task: `Attend meeting: ${subject}`, assignee: 'Me', deadline: futureDate(1) }];
    result.meeting = {
      time: '3:00 PM EST',
      joinLink: 'https://meet.google.com/abc-defg-hij',
      venue: 'Google Meet',
    };
    result.intent = 'Reminder';
    result.importance = 88;
    result.entities = ['Sarah Jones', 'Google Meet'];
    result.dynamic_tags = ['Meeting', 'Schedule', 'Professional'];
  } else if (subjLower.includes('subscription') || subjLower.includes('renew') || subjLower.includes('membership')) {
    result.category = 'Subscriptions';
    result.summary = `Subscription details or upcoming renewal notice.`;
    result.reason = 'SaaS subscription renewal warning. Tracked in Subscriptions list to manage ongoing monthly outlays.';
    result.priorityScore = 65;
    result.urgency = 'Medium';
    result.actionRequired = true;
    result.categoryConfidence = 0.92;
    result.financialsConfidence = 0.92;
    result.dates = [{ label: 'Renewal date', date: futureDate(14) }];
    result.subscription = {
      name: subject.replace(/subscription|renew|membership/gi, '').trim() || 'Software Service',
      cost: '$29.99/mo',
      renewalDate: futureDate(14),
      autoRenew: true,
    };
    result.intent = 'Reminder';
    result.importance = 68;
    result.entities = ['Anthropic', 'Claude Pro'];
    result.dynamic_tags = ['SaaS', 'Renewal', 'Billing'];
  } else if (subjLower.includes('job') || subjLower.includes('application') || subjLower.includes('interview') || subjLower.includes('resume')) {
    result.category = 'Job and career';
    result.summary = `Correspondence regarding a job application or interview status.`;
    result.reason = 'Active career opportunities or interview scheduling detected. Flagged for preparation support.';
    result.priorityScore = 78;
    result.urgency = 'Medium';
    result.actionRequired = true;
    result.categoryConfidence = 0.90;
    result.taskConfidence = 0.85;
    result.dates = [{ label: 'Interview appointment', date: futureDate(2) }];
    result.tasks = [{ task: 'Prepare portfolio and review interview questions', assignee: 'Me', deadline: futureDate(2) }];
    result.meeting = {
      time: '10:00 AM',
      joinLink: 'https://meet.google.com/xyz-pdqr-lmn',
      venue: 'Google Meet',
    };
    result.intent = 'Action Required';
    result.importance = 85;
    result.entities = ['Apex Digital Agency'];
    result.dynamic_tags = ['Career', 'Interview', 'High Priority'];
  } else if (subjLower.includes('trip') || subjLower.includes('flight') || subjLower.includes('hotel') || subjLower.includes('booking')) {
    result.category = 'Travel';
    result.summary = `Travel booking confirmation and itinerary details.`;
    result.reason = 'Itinerary ticket confirmation detected. Bundled under trip tracker.';
    result.priorityScore = 90;
    result.urgency = 'High';
    result.actionRequired = true;
    result.categoryConfidence = 0.96;
    result.deadlineConfidence = 0.96;
    result.dates = [{ label: 'Departure', date: futureDate(10) }];
    result.tasks = [{ task: 'Check-in for flight online', assignee: 'Me', deadline: futureDate(9) }];
    result.intent = 'Reminder';
    result.importance = 92;
    result.entities = ['Delta Airlines', 'SFO', 'JFK'];
    result.dynamic_tags = ['Travel', 'Flight', 'Itinerary'];
  } else if (subjLower.includes('password') || subjLower.includes('security') || subjLower.includes('login') || subjLower.includes('unauthorized')) {
    result.category = 'Personal communication';
    result.summary = `Security alert or system alert for password modifications.`;
    result.reason = 'Security credential alerts detected. Critical to inspect for unauthorized logins.';
    result.priorityScore = 98;
    result.urgency = 'High';
    result.actionRequired = false;
    result.intent = 'Security Alert';
    result.importance = 98;
    result.entities = ['Google Account', 'System Access'];
    result.dynamic_tags = ['Security', 'Alert', 'High Priority'];
  } else if (subjLower.includes('conference') || subjLower.includes('workshop') || subjLower.includes('announcement') || subjLower.includes('register')) {
    result.category = 'Personal communication';
    result.summary = `Announcement regarding upcoming workshops or conference registrations.`;
    result.reason = 'Opportunity invitations matching professional growth goals. Added to Opportunity center.';
    result.priorityScore = 75;
    result.urgency = 'Medium';
    result.actionRequired = false;
    result.intent = 'Opportunity';
    result.importance = 82;
    result.entities = ['AI Conference', 'Global Academy'];
    result.dynamic_tags = ['Career', 'AI', 'Event'];
  } else if (subjLower.includes('policy') || subjLower.includes('update') || subjLower.includes('terms') || subjLower.includes('informational')) {
    result.category = 'Personal communication';
    result.summary = `Informational notice or bank policy adjustments.`;
    result.reason = 'Compliance or service agreement modifications reported. Logged under Updates feed.';
    result.priorityScore = 55;
    result.urgency = 'Low';
    result.actionRequired = false;
    result.intent = 'Informational';
    result.importance = 60;
    result.entities = ['Chase Bank', 'Account Policy'];
    result.dynamic_tags = ['Bank', 'Compliance', 'Informational'];
  }

  return result;
}
