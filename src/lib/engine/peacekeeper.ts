// Peacekeeper — the AI-interpretation half of the Peace Engine (Build Plan v2 §6.3).
// Meaning/judgment only, behind the shared boundary prompt. Returns strict JSON that
// run.ts maps into planning_recommendations / planning_risks.
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Citation } from '@/lib/engine/weaver';

// Model + prompt version are recorded on every run (planning_engine_runs) for audit /
// reproducibility. Bump PROMPT_VERSION whenever the instruction contract below changes.
export const PEACEKEEPER_MODEL = 'claude-sonnet-4-6';
export const PROMPT_VERSION = 'pk-2026-07-22-citations';

let SYSTEM = 'You are the planning intelligence layer for The Missing Peace, a Wedding Planning Engine. Be calm, practical, emotionally intelligent, specific. Do not make final decisions, write vows, or give legal/financial advice.';
try { SYSTEM = readFileSync(join(process.cwd(), 'src/lib/seed/peacekeeper-system-prompt.txt'), 'utf8'); } catch { /* fallback above */ }

export interface EngineOutput {
  planningSummary: string;
  nextActions: { title: string; reason?: string; citations?: Citation[] }[];
  openDecisions: string[];
  risks: { type: string; title: string; severity?: string; citations?: Citation[] }[];
  dreamAlignment: string[];
  budgetGuidance: string[];
  vendorGaps: string[];
  guestImpact: string[];
  poofSuggestions: { boardItemId?: string; target?: string; why: string }[];
  discussionPrompts: string[];
}

export interface InterpretResult {
  output: EngineOutput;
  model: string;
  promptVersion: string;
  usage: { inputTokens?: number; outputTokens?: number } | null;
  raw: string;
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

export async function interpret(context: Record<string, unknown>): Promise<InterpretResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const instruction = [
    'Given this wedding planning context (JSON), return ONLY a JSON object with keys:',
    'planningSummary (string), nextActions (array of {title, reason, citations}), openDecisions (string[]),',
    'risks (array of {type, title, severity, citations}), dreamAlignment (string[]), budgetGuidance (string[]),',
    'vendorGaps (string[]), guestImpact (string[]), poofSuggestions (array of {boardItemId, target, why}),',
    'discussionPrompts (string[]). Keep next actions to 3-5. Never include prose outside the JSON.',
    '',
    'CITATIONS ARE REQUIRED for every nextAction and every risk. `citations` is an array of',
    '{type, id} where type is one of: board_item, budget_item, vendor, decision, task, compass, fact.',
    '`id` MUST be an exact id copied from the context (for `fact`, use the fact `kind`; for `compass`,',
    'omit id). An insight whose citations do not resolve to something in the context WILL BE DISCARDED,',
    'so only assert what the context supports.',
    '', 'CONTEXT:', JSON.stringify(context),
  ].join('\n');

  const msg = await client.messages.create({
    model: PEACEKEEPER_MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: 'user', content: instruction }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  const usage = msg.usage
    ? { inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens }
    : null;
  let output = EMPTY;
  try { output = parseJson(text); } catch { /* keep EMPTY */ }
  return { output, model: PEACEKEEPER_MODEL, promptVersion: PROMPT_VERSION, usage, raw: text };
}
