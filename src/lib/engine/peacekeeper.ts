// Peacekeeper — the AI-interpretation half of the Peace Engine (Build Plan v2 §6.3).
// Meaning/judgment only, behind the shared boundary prompt. Returns strict JSON that
// run.ts maps into planning_recommendations / planning_risks.
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let SYSTEM = 'You are the planning intelligence layer for The Missing Peace, a Wedding Planning Engine. Be calm, practical, emotionally intelligent, specific. Do not make final decisions, write vows, or give legal/financial advice.';
try { SYSTEM = readFileSync(join(process.cwd(), 'src/lib/seed/peacekeeper-system-prompt.txt'), 'utf8'); } catch { /* fallback above */ }

export interface EngineOutput {
  planningSummary: string;
  nextActions: { title: string; reason?: string }[];
  openDecisions: string[];
  risks: { type: string; title: string; severity?: string }[];
  dreamAlignment: string[];
  budgetGuidance: string[];
  vendorGaps: string[];
  guestImpact: string[];
  poofSuggestions: { boardItemId?: string; target?: string; why: string }[];
  discussionPrompts: string[];
}

const EMPTY: EngineOutput = {
  planningSummary: '', nextActions: [], openDecisions: [], risks: [], dreamAlignment: [],
  budgetGuidance: [], vendorGaps: [], guestImpact: [], poofSuggestions: [], discussionPrompts: [],
};

function parseJson(text: string): EngineOutput {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(slice);
  return { ...EMPTY, ...parsed };
}

export async function interpret(context: Record<string, unknown>): Promise<EngineOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const instruction = [
    'Given this wedding planning context (JSON), return ONLY a JSON object with keys:',
    'planningSummary (string), nextActions (array of {title, reason}), openDecisions (string[]),',
    'risks (array of {type, title, severity}), dreamAlignment (string[]), budgetGuidance (string[]),',
    'vendorGaps (string[]), guestImpact (string[]), poofSuggestions (array of {boardItemId, target, why}),',
    'discussionPrompts (string[]). Keep next actions to 3-5. Never include prose outside the JSON.',
    '', 'CONTEXT:', JSON.stringify(context),
  ].join('\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: 'user', content: instruction }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  try { return parseJson(text); } catch { return EMPTY; }
}
