import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Plan, POLICIES } from '../../data/policies';
import { DemoProfile } from '../../data/demoProfiles';

export interface FitScore {
  planId: string;
  score: number;
  reason: string;
}

export interface CompareCard {
  plans: Plan[];
  rows: { label: string; values: string[] }[];
  fitScores?: FitScore[];
}

export type ReplyBlock =
  | { type: 'text'; content: string }
  | { type: 'header'; content: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'note'; content: string };

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  blocks?: ReplyBlock[];
  compareCard?: CompareCard;
}

export interface GeminiResponse {
  reply: string | ReplyBlock[];
  chips: string[];
  fitScores?: FitScore[];
}

@Injectable({ providedIn: 'root' })
export class GeminiService {

  private apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${environment.geminiApiKey}`;

  constructor(private http: HttpClient) { }

  private detectCategory(message: string): string {
    const msg = message.toLowerCase();

    if (msg.includes('pruactive life') || msg.includes('pru active life')) return 'ci';
    if (msg.includes('prumajor') || msg.includes('pru major') || msg.includes('pruearly') || msg.includes('pru early')) return 'ci';
    if (msg.includes('prushield') || msg.includes('pru shield') || msg.includes('pruhealth') || msg.includes('prupersonal')) return 'health';
    if (msg.includes('pruactive term') || msg.includes('pruvital') || msg.includes('prulife') || msg.includes('prugolden')) return 'life';
    if (msg.includes('pruactive saver') || msg.includes('prulink') || msg.includes('prucash')) return 'wealth';

    if (msg.includes('health') || msg.includes('hospital') || msg.includes('medical') || msg.includes('accident')) return 'health';
    if (msg.includes('critical') || msg.includes('cancer') || msg.includes('ci') || msg.includes('illness') || msg.includes('stroke')) return 'ci';
    if (msg.includes('savings') || msg.includes('investment') || msg.includes('wealth') || msg.includes('retirement') || msg.includes('endowment')) return 'wealth';
    if (msg.includes('life') || msg.includes('death') || msg.includes('tpd') || msg.includes('term')) return 'life';

    return 'health';
  }
  private formatProfile(profile: DemoProfile): string {
    return `
ACTIVE USER PROFILE:
- Name: ${profile.name}
- Age: ${profile.age}
- Occupation: ${profile.occupation}
- Life stage: ${profile.lifeStage}
- Monthly Income: ${profile.monthlyIncome}
- Monthly budget for insurance: ${profile.monthlyBudget}
- Existing health conditions: ${profile.healthConditions.length > 0 ? profile.healthConditions.join(', ') : 'None'}
- Current coverage: ${profile.existingCoverage.join(', ')}
- Main concerns: ${profile.concerns.join('; ')}
- Goals: ${profile.goals.join('; ')}

Use this profile to personalise all responses. Reference the user by name naturally.
Tailor fit scores, recommendations, and explanations to their specific situation.
`.trim();
  }

  private parseResponse(raw: string): GeminiResponse {
    try {
      const clean = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(clean);

      let reply = parsed.reply;

      // Gemini sometimes double-encodes the blocks array as a JSON string
      // instead of a real nested array — detect and unwrap that case.
      if (typeof reply === 'string') {
        const trimmedReply = reply.trim();
        if (trimmedReply.startsWith('[') || trimmedReply.startsWith('{')) {
          try {
            reply = JSON.parse(trimmedReply);
          } catch {
            // genuinely just a plain string reply — leave as is
          }
        }
      }

      if (Array.isArray(reply)) {
        return { reply, chips: parsed.chips ?? [], fitScores: parsed.fitScores };
      }

      if (typeof reply === 'string') {
        return { reply, chips: parsed.chips ?? [], fitScores: parsed.fitScores };
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

  async sendMessage(
    userMessage: string,
    history: Message[],
    profile: DemoProfile
  ): Promise<GeminiResponse> {

    const category = this.detectCategory(userMessage);
    const relevantPolicies = POLICIES[category] ?? [];

    const systemPrompt = `
You are Cova, a friendly insurance assistant for Prudential Singapore.
Respond conversationally and simply — like explaining to a friend over WhatsApp.
Always explain jargon immediately after using it.
Never invent figures or coverage details not in the policy data below.
If something isn't in the data, say "I don't have that detail — a Prudential advisor can help."
Never tell the user which plan to buy — guide and explain only.
Never recommend or suggest a plan whose premium clearly exceeds the user's stated monthly budget without explicitly flagging that mismatch.

PERSONALIZATION RULES:
- Don't give generic insurance advice — connect your answer back to at least one specific detail from the profile below (a named concern, goal, existing coverage item, or health condition) wherever it's relevant to the question.
- If the user's question relates to something in their "Main concerns" or "Goals", say so explicitly (e.g. "since you mentioned wanting X...").
- If they have a listed health condition, consider whether it affects underwriting or exclusions for the topic being discussed, and mention it if relevant.
- Two different users asking the same question should get answers that feel tailored to them, not interchangeable boilerplate.

${this.formatProfile(profile)}

Relevant Prudential policy data:
${JSON.stringify(relevantPolicies, null, 2)}

RESPONSE FORMAT RULES:
- For simple questions (greetings, definitions, short clarifications):
  reply must be a plain string, max 3 sentences.
- For policy explanations, plan details, or anything needing structure:
  reply must be an array of blocks. Available block types:
  { "type": "text", "content": "..." }
  { "type": "header", "content": "..." }
  { "type": "bullets", "items": ["...", "..."] }
  { "type": "note", "content": "..." }

Return ONLY a raw JSON object, no markdown, no backticks:
{
  "reply": <string OR array of blocks>,
  "chips": ["follow-up q 1", "follow-up q 2", "follow-up q 3"]
}`.trim();



    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: '{"reply":"Understood.","chips":[]}' }] },
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{
          text: m.blocks ? JSON.stringify(m.blocks) : m.content
        }]
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const body = {
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
    };

    const res: any = await firstValueFrom(this.http.post(this.apiUrl, body));
    const raw = res.candidates[0].content.parts[0].text.trim();
    return this.parseResponse(raw);
  }

  async compareMessage(
    plans: Plan[],
    history: Message[],
    profile: DemoProfile  // ← add
  ): Promise<GeminiResponse> {

    const recentContext = history
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Cova'}: ${m.content || ''}`)
      .join('\n');

    const prompt = `
You are Cova, a friendly insurance assistant for Prudential Singapore.
Compare these plans in simple, conversational language.
Never tell the user which to buy — just explain clearly.
Keep the reply to 2 sentences maximum.
Calculate fit scores based on these specific criteria:
- Budget match: does the premium fit within ${profile.monthlyBudget}? (25% weight)
- Coverage match: does it address their stated concerns and goals? (35% weight)
- Life stage match: is it suitable for their current situation? (15% weight)
- Health condition compatibility: any exclusions that affect them? (10% weight)
- Redundancy check: does the user already have this exact type of coverage in "Current coverage" below? If so, reduce the score to reflect that this plan adds little new value, and say so in the reason. (15% weight)

Scoring anchors (use these as reference points, not hard rules):
- 80-100: strongly addresses their stated concerns/goals, fits budget, no redundancy with existing coverage
- 50-79: partially useful but has a gap — e.g. tight budget fit, doesn't cover a top concern, or partially overlaps existing coverage
- 20-49: significant mismatch — wrong life stage, exclusion hits a real health condition, or largely duplicates something they already have
- 0-19: fundamentally unsuitable for this specific user

Score strictly 0-100 based on these criteria only. Two different user profiles comparing the same plans should generally NOT get similar scores unless their situations are genuinely similar — reflect real differences in budget, concerns, health, and existing coverage.
Keep each fitScore reason to 10 words maximum, and make the reason specific to this user (reference their concern, budget, or existing coverage — not generic language).

${this.formatProfile(profile)}

Recent conversation:
${recentContext || 'No prior context.'}

Plans to compare:
${JSON.stringify(plans.map(p => ({
      id: p.id,
      name: p.name,
      premium: p.premium,
      description: p.description,
      covered: p.covered,
      notCovered: p.notCovered,
      bestFor: p.bestFor,
      risks: p.risks,
      considerations: p.considerations
    })), null, 2)}

Calculate fit scores based specifically on this user's profile — age, budget, health conditions, existing coverage, concerns and goals.
A high score means the plan strongly addresses their needs. A low score means it's less relevant or has issues for their situation.

Return ONLY a raw JSON object, no markdown, no backticks:
{
  "reply": "your comparison in plain conversational language",
  "chips": ["follow-up q 1", "follow-up q 2", "follow-up q 3"],
  "fitScores": [
{ "planId": "<exact plan id>", "score": <0-100>, "reason": "<max 10 words>" }
  ]
}`.trim();


    const body = {
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text: '{"reply":"Understood.","chips":[],"fitScores":[]}' }] },
        { role: 'user', parts: [{ text: 'Now compare the plans.' }] }
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4000 }
    };

    const res: any = await firstValueFrom(this.http.post(this.apiUrl, body));
    const raw = res.candidates[0].content.parts[0].text.trim();
    // console.log('COMPARE RAW:', raw);
    return this.parseResponse(raw);
  }

  async generateSummary(messages: Message[]): Promise<string> {
    const transcript = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Cova'}: ${m.content || JSON.stringify(m.blocks)}`)
      .join('\n');

    const prompt = `
Based on this insurance chat, generate a structured summary with these exact sections:
1. Plans Discussed (list plan names and categories mentioned)
2. Key Questions Asked (list main questions the user had)
3. Comparisons Done (if any, summarise what was compared and key differences)
4. Important Terms Explained (any jargon that was clarified)
5. A short disclaimer that this is for reference only

Chat transcript:
${transcript}

Return plain text only, no JSON, no markdown symbols. Use clear section headers in ALL CAPS.
Keep it concise — this is a reference document, not a full transcript.
    `.trim();

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1500 }
    };

    const res: any = await firstValueFrom(this.http.post(this.apiUrl, body));
    return res.candidates[0].content.parts[0].text.trim();
  }
}