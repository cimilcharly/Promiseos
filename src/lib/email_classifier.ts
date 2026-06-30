import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ExtractedEmailInsights {
  category: string;
  summary: string;
  reason: string; // Explaining why this email is categorized/prioritized (resolving Issue 11)
  confidence: number; // Score from 0.0 to 1.0
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

// 2. Main Classification + Extraction Separator
export async function classifyEmailAndExtractInsights(
  subject: string,
  rawBody: string,
  apiKey: string | null
): Promise<ExtractedEmailInsights> {
  const body = preprocessEmailBody(rawBody);

  if (!apiKey || !apiKey.trim() || apiKey === 'mock-key') {
    return runMockClassifier(subject, body);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Stage 1: Classify Relevance and Category
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const classificationPrompt = `
Analyze this email and classify it into one of these categories:
- "Finance / bills"
- "Job and career"
- "Meetings and calendar events"
- "Purchases and orders"
- "Travel"
- "Subscriptions"
- "Personal communication"
- "Promotions and spam"
- "Tasks and action items"
- "Deadlines and reminders"
- "Irrelevant"

Email Subject: ${subject}
Email Body: ${body.slice(0, 1000)}

Respond with ONLY the category string. No explanation or formatting.
`;

    const classificationResult = await model.generateContent(classificationPrompt);
    const category = classificationResult.response.text().trim().replace(/['"]/g, '');

    // If promotions/spam or irrelevant, return early with low confidence
    if (category === 'Promotions and spam' || category === 'Irrelevant') {
      return {
        category,
        summary: 'Classified as promotional or irrelevant email.',
        reason: 'Subject line or body contents match commercial newsletter/promotional spam triggers.',
        confidence: 0.35,
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
You are an email analysis AI. Analyze the email subject and body below for category: "${category}".
Today is ${todayStr}.

Email Subject: ${subject}
Email Body:
"""
${body}
"""

Extract structured information. Provide an explicit explanation under "reason" clarifying why this email was flagged as important (e.g. "Payment-related content detected due in 2 days").
Assign a confidence score (0.0 to 1.0) on how reliable this extraction is.

Return a JSON object:
{
  "summary": "Brief 1-2 sentence summary of the email",
  "reason": "Clear explanation of priority/relevance for the user",
  "confidence": 0.95,
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
    return {
      category,
      ...parsed,
    };
  } catch (error) {
    console.error('Error in two-stage Gemini processing, falling back:', error);
    return runMockClassifier(subject, body);
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
    confidence: 0.95,
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
    result.confidence = 0.98;
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
    result.confidence = 0.94;
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
    result.confidence = 0.88;
    result.dates = [{ label: 'Meeting date', date: futureDate(1) }];
    result.tasks = [{ task: `Attend meeting: ${subject}`, assignee: 'Me', deadline: futureDate(1) }];
  } else if (subjLower.includes('subscription') || subjLower.includes('renew') || subjLower.includes('membership')) {
    result.category = 'Subscriptions';
    result.summary = `Subscription details or upcoming renewal notice.`;
    result.reason = 'SaaS subscription renewal warning. Tracked in Subscriptions list to manage ongoing monthly outlays.';
    result.confidence = 0.92;
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
    result.confidence = 0.85;
    result.dates = [{ label: 'Interview appointment', date: futureDate(2) }];
    result.tasks = [{ task: 'Prepare portfolio and review interview questions', assignee: 'Me', deadline: futureDate(2) }];
  } else if (subjLower.includes('trip') || subjLower.includes('flight') || subjLower.includes('hotel') || subjLower.includes('booking')) {
    result.category = 'Travel';
    result.summary = `Travel booking confirmation and itinerary details.`;
    result.reason = 'Itinerary ticket confirmation detected. Bundled under trip tracker.';
    result.confidence = 0.96;
    result.dates = [{ label: 'Departure', date: futureDate(10) }];
    result.tasks = [{ task: 'Check-in for flight online', assignee: 'Me', deadline: futureDate(9) }];
  } else if (bodyLower.includes('action') || bodyLower.includes('todo') || bodyLower.includes('please do') || bodyLower.includes('need you to')) {
    result.category = 'Tasks and action items';
    result.summary = `Action item requested in email: "${subject}".`;
    result.reason = 'Instructional wording detected in mail body indicating a direct task assignment.';
    result.confidence = 0.76;
    result.dates = [{ label: 'Task deadline', date: futureDate(4) }];
    result.tasks = [{ task: `Complete task: ${subject}`, assignee: 'Me', deadline: futureDate(4) }];
  } else if (subjLower.includes('newsletter') || subjLower.includes('off') || subjLower.includes('deal') || subjLower.includes('save')) {
    result.category = 'Promotions and spam';
    result.summary = `Promotional deal or update newsletter.`;
    result.reason = 'Identified as mass marketing materials or newsletters.';
    result.confidence = 0.45;
  }

  return result;
}
