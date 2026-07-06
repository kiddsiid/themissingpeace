// Dream -> Wedding Compass. The Compass is the durable north star the whole
// planning engine reasons against.

export interface DreamResponses {
  priorities?: string[];
  nonNegotiables?: string[];
  avoid?: string[];
  culturalValues?: string[];
  traditions?: string[];
  meaning?: string;
  partnerOneReflection?: string;
  partnerTwoReflection?: string;
  sharedMeaning?: string;
  planningValues?: string[];
  hospitalityMeaning?: string;
  musicAtmosphere?: string;
  familyMeaning?: string;
  budgetValues?: string;
  dateSeason?: string;
  dateYear?: string;
  desiredYear?: string;
  creatorRole?: 'couple' | 'planner';
  cloudPriorities?: Record<string, number>;
  compassApproved?: boolean;
  compassApprovedAt?: string;
}

export interface CompassDraft {
  summary: string;
  priorities: string[];
  nonNegotiables: string[];
  avoid: string[];
  culturalValues: string[];
  traditions: string[];
  tone: string;
}

export async function buildCompass(
  dream: DreamResponses,
  summarize: (d: DreamResponses) => Promise<{ summary: string; tone: string }>
): Promise<CompassDraft> {
  const { summary, tone } = await summarize(dream);
  return {
    summary,
    tone,
    priorities: dream.priorities ?? [],
    nonNegotiables: dream.nonNegotiables ?? [],
    avoid: dream.avoid ?? [],
    culturalValues: dream.culturalValues ?? [],
    traditions: dream.traditions ?? [],
  };
}
