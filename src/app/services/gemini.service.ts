import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Plan, POLICIES } from '../../data/policies';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeminiResponse {
  reply: string;
  chips: string[];
  // removed profileUpdates
}

@Injectable({ providedIn: 'root' })
export class GeminiService {

  private apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${environment.geminiApiKey}`;
  constructor(private http: HttpClient) { }

  private detectCategory(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('health') || msg.includes('hospital') || msg.includes('medical') || msg.includes('prushield')) return 'health';
    if (msg.includes('life') || msg.includes('death') || msg.includes('tpd')) return 'life';
    if (msg.includes('critical') || msg.includes('cancer') || msg.includes('illness')) return 'critical_illness';
    return 'health';
  }

  async sendMessage(
    userMessage: string,
    history: Message[]
  ): Promise<GeminiResponse> {

    const category = this.detectCategory(userMessage);
    const relevantPolicies = POLICIES[category] ?? [];

    const systemPrompt = `
You are Cova, a friendly insurance assistant for Prudential Singapore.
Respond conversationally and simply — like explaining to a friend over WhatsApp.
Keep replies to 3-5 sentences unless more detail is asked for.
Always explain jargon immediately after using it.
Never invent figures or coverage details not in the policy data below.
If something isn't in the data, say "I don't have that detail — a Prudential advisor can help."
Never tell the user which plan to buy — guide and explain only.

Relevant Prudential policy data:
${JSON.stringify(relevantPolicies, null, 2)}

Return ONLY a raw JSON object (no markdown, no backticks) with exactly these keys:
{
  "reply": "your conversational response",
  "chips": ["follow-up q 1", "follow-up q 2", "follow-up q 3"]
}`.trim();

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: '{"reply":"Understood.","chips":[]}' }] },
    
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const body = {
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
    };

    const res: any = await this.http.post(this.apiUrl, body).toPromise();
    const raw = res.candidates[0].content.parts[0].text.trim();
    try {
      const clean = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(clean);

      if (parsed.reply && typeof parsed.reply === 'string') {
        return { reply: parsed.reply, chips: parsed.chips ?? [] };
      }
      return { reply: clean, chips: [] };

    } catch {
      const match = raw.match(/"reply"\s*:\s*"([\s\S]*?)(?<!\\)"/);
      if (match) {
        return { reply: match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'), chips: [] };
      }
      return { reply: "Sorry, I couldn't process that response. Try again?", chips: [] };
    }
  }
  async compareMessage(plans: Plan[]): Promise<GeminiResponse> {
    const prompt = `
You are Cova, a friendly insurance assistant for Prudential Singapore.
Compare these plans in simple, conversational language — like explaining to a friend.
Focus on: key differences, who each plan suits best, and one honest takeaway.
Never tell the user which to buy — just explain clearly.
Keep the reply concise — maximum 4 sentences.

Plans to compare:
${JSON.stringify(plans.map(p => ({
      name: p.name,
      premium: p.premium,
      description: p.description,
      covered: p.covered,
      notCovered: p.notCovered,
      bestFor: p.bestFor
    })), null, 2)}

Return ONLY a raw JSON object, no markdown, no backticks:
{
  "reply": "your comparison in plain conversational language",
  "chips": ["follow-up q 1", "follow-up q 2", "follow-up q 3"]
}`.trim();

    const body = {
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text: '{"reply":"Understood.","chips":[]}' }] },
        { role: 'user', parts: [{ text: 'Now compare the plans.' }] }
      ],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 } // ← increased
    };

    const res: any = await this.http.post(this.apiUrl, body).toPromise();
    const raw = res.candidates[0].content.parts[0].text.trim();

    try {
      const clean = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(clean);

      if (parsed.reply && typeof parsed.reply === 'string') {
        return { reply: parsed.reply, chips: parsed.chips ?? [] };
      }
      return { reply: clean, chips: [] };

    } catch {
      const match = raw.match(/"reply"\s*:\s*"([\s\S]*?)(?<!\\)"/);
      if (match) {
        return { reply: match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'), chips: [] };
      }
      return { reply: "Sorry, I couldn't process that response. Try again?", chips: [] };
    }
  }
}