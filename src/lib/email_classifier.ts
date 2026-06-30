import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ExtractedEmailInsights {
  category: string;
  summary: string;
  reason: string;
  priorityScore: number;
  urgency: 'High' | 'Medium' | 'Low';
  actionRequired: boolean;
  
  // Granular Confidence Parameters (resolving Issue 4)
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
}

// 1. Preprocessing Layer: Clean email body to save tokens and improve quality
export function preprocessEmailBody(body: string): string {
  // Remove email history chains
  let cleaned = body.replace(/On\s+.*,\s+.*wrote:[\s\S]*/g, '');
  cleaned = cleaned.replace(/---\s*Original Message\s*---[\s\S]*/gi, '');
  cleaned = cleaned.replace(/>+/g, ''); // Strip quotes

  // Remove common signatures
  const sigIndex = cleaned.search(/(best regards|sincerely|thanks|regards|cheers|kind regards|warmly),?/i);
  if (sigIndex !== -1) {
    cleaned = cleaned.substring(0, sigIndex);
  }

  // Strip HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Normalize spacing
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim().slice(0, 3000); // Truncate safely
}

// 2. Programmatic Validation Layer (resolving Issue 4)
export function validateInsights(insights: ExtractedEmailInsights): ExtractedEmailInsights {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validate dates
  if (insights.dates && insights.dates.length > 0) {
    insights.dates = insights.dates.filter(d => {
      // Validate date format (YYYY-MM-DD)
      if (!dateRegex.test(d.date)) {
        insights.deadlineConfidence = 0.35; // Lower confidence dramatically if invalid format
        return false;
      }
      
      // Check if date is logically in the past (e.g. past deadlines cannot be auto-added)
      const dateVal = new Date(d.date);
      if (dateVal < today) {
        insights.deadlineConfidence = 0.45; // Flag date in past
      }
      return true;
    });
  }

  // Validate tasks deadline formats
  if (insights.tasks && insights.tasks.length > 0) {
    insights.tasks.forEach(t => {
      if (t.deadline && !dateRegex.test(t.deadline)) {
        insights.taskConfidence = Math.min(insights.taskConfidence, 0.5);
      }
    });
  }

  // Validate financial amounts
  if (insights.financials?.amount) {
    const cleanAmount = insights.financials.amount.replace(/[$\u20B9,\s]/g, '');
    if (isNaN(Number(cleanAmount))) {
      insights.financialsConfidence = Math.min(insights.financialsConfidence, 0.5); // Flag corrupt currency formats
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

Return a JSON object:
{
  "category": "Category name",
  "priorityScore": 85,
  "urgency": "High"|"Medium"|"Low",
  "actionRequired": true|false,
  "isSpam": true|false,
  "categoryConfidence": 0.95
}
`;

    const classificationResult = await model.generateContent(classificationPrompt);
    let classText = classificationResult.response.text().trim();
    if (classText.startsWith('```json')) classText = classText.substring(7);
    if (classText.startsWith('```')) classText = classText.substring(3);
    if (classText.endsWith('```')) classText = classText.substring(0, classText.length - 3);

    const classParsed = JSON.parse(classText.trim());

    // If promotions/spam or irrelevant, return early with low priority
    if (classParsed.isSpam || classParsed.category === 'Promotions and spam' || classParsed.category === 'Irrelevant') {
      return {
        category: classParsed.category || 'Promotions and spam',
        summary: 'Classified as promotional or irrelevant email.',
        reason: 'Subject line or body contents match commercial newsletter/promotional spam triggers.',
        priorityScore: classParsed.priorityScore || 20,
        urgency: 'Low',
        actionRequired: false,
        categoryConfidence: classParsed.categoryConfidence || 0.90,
        taskConfidence: 0.1,
        deadlineConfidence: 0.1,
        financialsConfidence: 0.1,
        trackingConfidence: 0.1,
        dates: [],
        tasks: [],
        tracking: {},
        financials: { alert: false },
        subscription: {},
      };
    }

    // Stage 2: Detailed Extraction
    const extractionModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const todayStr = new Date().toISOString().split('T')[0];

    const extractionPrompt = `
You are an email analysis AI. Analyze the email subject and body below for category: "${classParsed.category}".
Today is ${todayStr}.

Email Subject: ${subject}
Email Body:
"""
${body}
"""

Extract structured information. Provide an explicit explanation under "reason" clarifying why this email was flagged as important.
Provide confidence ratings (0.0 to 1.0) for:
- taskConfidence: how certain you are of tasks extracted
- deadlineConfidence: how certain you are of dates/deadlines extracted
- financialsConfidence: how certain you are of biller/cost parameters extracted
- trackingConfidence: how certain you are of shipping tracking parameters extracted

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
    { "task": "Actionable task", "assignee": "Person responsible (usually 'Me')", "deadline": "YYYY-MM-DD" }
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
  }
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
  } else if (bodyLower.includes('action') || bodyLower.includes('todo') || bodyLower.includes('please do') || bodyLower.includes('need you to')) {
    result.category = 'Tasks and action items';
    result.summary = `Action item requested in email: "${subject}".`;
    result.reason = 'Instructional wording detected in mail body indicating a direct task assignment.';
    result.priorityScore = 75;
    result.urgency = 'Medium';
    result.actionRequired = true;
    result.categoryConfidence = 0.88;
    result.taskConfidence = 0.80;
    result.dates = [{ label: 'Task deadline', date: futureDate(4) }];
    result.tasks = [{ task: `Complete task: ${subject}`, assignee: 'Me', deadline: futureDate(4) }];
  } else if (subjLower.includes('newsletter') || subjLower.includes('off') || subjLower.includes('deal') || subjLower.includes('save')) {
    result.category = 'Promotions and spam';
    result.summary = `Promotional deal or update newsletter.`;
    result.reason = 'Identified as mass marketing materials or newsletters.';
    result.priorityScore = 15;
    result.urgency = 'Low';
    result.actionRequired = false;
    result.categoryConfidence = 0.90;
    result.taskConfidence = 0.1;
    result.deadlineConfidence = 0.1;
  }

  return result;
}
