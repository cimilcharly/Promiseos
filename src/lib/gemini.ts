import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedCommitment } from './types';
import { DEMO_MEMBERS } from './mockData';

// Main extraction function
export async function extractCommitmentsWithGemini(
  transcript: string,
  apiKey: string | null,
  modelName: string = 'gemini-1.5-flash',
  confidenceThreshold: number = 0.75
): Promise<ExtractedCommitment[]> {
  // If API Key is not set, run mock simulation
  if (!apiKey || !apiKey.trim() || apiKey === 'mock-key') {
    return extractCommitmentsMock(transcript);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `
You are the PromiseOS AI commitment extractor. Analyze the transcript below to identify all verbal commitments, promises, action items, or assurances made by the speakers.

For each commitment:
1. Identify the speaker who is making the commitment (owner). Try to match speaker names to standard capitalizations.
2. Formulate a clear, actionable description of the task promised (task).
3. Extract or infer the deadline. Use the relative calendar context to infer dates. Today is ${todayStr}.
4. Provide a confidence score (from 0.0 to 1.0) on whether this represents a real commitment.

Transcript:
"""
${transcript}
"""

Return a JSON array of objects with the exact schema:
\`\`\`json
[
  {
    "owner": "Full Name or Speaker Name",
    "task": "Actionable task description",
    "deadline": "Friendly deadline representation (e.g. 'Tomorrow', 'Friday', 'June 20')",
    "deadlineIso": "YYYY-MM-DD",
    "confidence": 0.85,
    "rawText": "The exact sentence or line from transcript where commitment was made"
  }
]
\`\`\`
Ensure you ONLY return the valid JSON array. Do not include markdown code block formatting in your output, just raw JSON.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Clean codeblock formatting if Gemini still outputted it
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }

    const parsed: ExtractedCommitment[] = JSON.parse(cleanText.trim());
    return parsed.filter((item) => item.confidence >= confidenceThreshold);
  } catch (error) {
    console.error('Error in real Gemini extraction:', error);
    // Fall back to mock on error
    return extractCommitmentsMock(transcript);
  }
}

// Fallback mock simulation helper
export async function extractCommitmentsMock(transcript: string): Promise<ExtractedCommitment[]> {
  await new Promise((res) => setTimeout(res, 1800));

  const results: ExtractedCommitment[] = [];
  const lines = transcript.split('\n');

  const futureDate = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const deadlineMap: Record<string, [string, string]> = {
    today: ['Today', futureDate(0)],
    tomorrow: ['Tomorrow', futureDate(1)],
    friday: ['Friday', futureDate(4)],
    monday: ['Monday', futureDate(3)],
    tuesday: ['Tuesday', futureDate(2)],
    wednesday: ['Wednesday', futureDate(3)],
    thursday: ['Thursday', futureDate(4)],
    'next week': ['Next Week', futureDate(7)],
    'end of week': ['End of Week', futureDate(5)],
    'end of month': ['End of Month', futureDate(20)],
    'within the week': ['This Week', futureDate(5)],
    'within the next 3 days': ['In 3 Days', futureDate(3)],
    'within the next 5 days': ['In 5 Days', futureDate(5)],
    'within the month': ['This Month', futureDate(20)],
  };

  for (const line of lines) {
    const willMatch = line.match(/(?:I'll|I will|we'll|we will|will)\s+([^.!?\n]{10,80})/i);
    if (!willMatch) continue;

    const speakerMatch = line.match(/\]\s*([A-Za-z]+(?:\s[A-Za-z]+)?)\s*:/);
    const ownerRaw = speakerMatch ? speakerMatch[1] : 'Unknown';

    // Try to match against demo members
    const memberMatch = DEMO_MEMBERS.find((m) => m.name.toLowerCase().includes(ownerRaw.toLowerCase()));
    const owner = memberMatch ? memberMatch.name : ownerRaw;

    const taskRaw = willMatch[1].replace(/\s*by .*/i, '').trim();
    const task = taskRaw.charAt(0).toUpperCase() + taskRaw.slice(1);

    const lineLower = line.toLowerCase();
    let deadline = 'Next Week';
    let deadlineIso = futureDate(7);

    for (const [key, [dl, iso]] of Object.entries(deadlineMap)) {
      if (lineLower.includes(key)) { deadline = dl; deadlineIso = iso; break; }
    }

    if (task.length > 5 && results.length < 8) {
      results.push({
        owner,
        task,
        deadline,
        deadlineIso,
        confidence: 0.75 + Math.random() * 0.2,
        rawText: line.replace(/\[\d+:\d+:\d+\]\s*/, '').trim(),
      });
    }
  }

  return results.filter((r, i, arr) =>
    i === arr.findIndex((x) => x.task.slice(0, 30) === r.task.slice(0, 30))
  );
}
