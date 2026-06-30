import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ExtractedEmailInsights {
  category: string;
  summary: string;
  dates: { label: string; date: string }[];
  tasks: { task: string; assignee: string; deadline: string }[];
  tracking: { provider?: string; trackingNumber?: string; status?: string; deliveryDate?: string };
  financials: { amount?: string; dueDate?: string; alert?: boolean; biller?: string };
  subscription: { name?: string; cost?: string; renewalDate?: string; autoRenew?: boolean };
}

export async function classifyEmailAndExtractInsights(
  subject: string,
  body: string,
  apiKey: string | null
): Promise<ExtractedEmailInsights> {
  if (!apiKey || !apiKey.trim() || apiKey === 'mock-key') {
    return runMockClassifier(subject, body);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `
You are an email analysis AI. Analyze the email subject and body below.
1. Categorize the email into exactly one of these categories:
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

2. Generate a 1-2 sentence summary of the email.
3. Extract important dates mentioned (e.g. deadlines, flights, meetings).
4. Extract tasks or actions required from the recipient.
5. If the email contains a shipment/order, extract shipment tracking details.
6. If the email contains a bill/invoice, extract financial details and set alert to true.
7. If the email is about a subscription signup or renewal, extract subscription information.

Today is ${todayStr}.

Email Subject: ${subject}
Email Body:
"""
${body}
"""

Return a JSON object with the exact schema:
{
  "category": "One of the categories listed above",
  "summary": "Brief 1-2 sentence summary",
  "dates": [
    { "label": "Description of the date (e.g., Flight departure, Payment due)", "date": "YYYY-MM-DD" }
  ],
  "tasks": [
    { "task": "Actionable task", "assignee": "Person responsible (usually 'Me')", "deadline": "YYYY-MM-DD or relative" }
  ],
  "tracking": {
    "provider": "e.g. UPS, FedEx, DHL, Amazon (optional)",
    "trackingNumber": "tracking string (optional)",
    "status": "e.g. Shipped, Out for delivery, Delivered (optional)",
    "deliveryDate": "YYYY-MM-DD (optional)"
  },
  "financials": {
    "amount": "Amount due e.g., $150.00 (optional)",
    "dueDate": "YYYY-MM-DD (optional)",
    "alert": true|false,
    "biller": "Name of service/entity billing (optional)"
  },
  "subscription": {
    "name": "Name of service (optional)",
    "cost": "e.g. $14.99/month (optional)",
    "renewalDate": "YYYY-MM-DD (optional)",
    "autoRenew": true|false
  }
}
Ensure you ONLY return the valid JSON object. Do not include markdown code block formatting in your output, just raw JSON.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let cleanText = text;
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }

    return JSON.parse(cleanText.trim()) as ExtractedEmailInsights;
  } catch (error) {
    console.error('Error in real Gemini email classification:', error);
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

  // Default fallback
  const result: ExtractedEmailInsights = {
    category: 'Personal communication',
    summary: `An email regarding "${subject}".`,
    dates: [],
    tasks: [],
    tracking: {},
    financials: { alert: false },
    subscription: {},
  };

  if (subjLower.includes('invoice') || subjLower.includes('bill') || subjLower.includes('payment') || subjLower.includes('statement')) {
    result.category = 'Finance / bills';
    result.summary = `Invoice or billing statement received for ${subject}.`;
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
    result.dates = [{ label: 'Meeting date', date: futureDate(1) }];
    result.tasks = [{ task: `Attend meeting: ${subject}`, assignee: 'Me', deadline: futureDate(1) }];
  } else if (subjLower.includes('subscription') || subjLower.includes('renew') || subjLower.includes('membership')) {
    result.category = 'Subscriptions';
    result.summary = `Subscription details or upcoming renewal notice.`;
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
    result.dates = [{ label: 'Interview appointment', date: futureDate(2) }];
    result.tasks = [{ task: 'Prepare portfolio and review interview questions', assignee: 'Me', deadline: futureDate(2) }];
  } else if (subjLower.includes('trip') || subjLower.includes('flight') || subjLower.includes('hotel') || subjLower.includes('booking')) {
    result.category = 'Travel';
    result.summary = `Travel booking confirmation and itinerary details.`;
    result.dates = [{ label: 'Departure', date: futureDate(10) }];
    result.tasks = [{ task: 'Check-in for flight online', assignee: 'Me', deadline: futureDate(9) }];
  } else if (bodyLower.includes('action') || bodyLower.includes('todo') || bodyLower.includes('please do') || bodyLower.includes('need you to')) {
    result.category = 'Tasks and action items';
    result.summary = `Action item requested in email: "${subject}".`;
    result.dates = [{ label: 'Task deadline', date: futureDate(4) }];
    result.tasks = [{ task: `Complete task: ${subject}`, assignee: 'Me', deadline: futureDate(4) }];
  } else if (subjLower.includes('newsletter') || subjLower.includes('off') || subjLower.includes('deal') || subjLower.includes('save')) {
    result.category = 'Promotions and spam';
    result.summary = `Promotional deal or update newsletter.`;
  }

  return result;
}
