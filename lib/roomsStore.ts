import { customAlphabet, nanoid } from 'nanoid';

export type DebateContributionType =
  | 'claim'
  | 'fact-check'
  | 'fallacy'
  | 'evidence'
  | 'insight';

export type FactCheckVerdict = 'true' | 'false' | 'unverifiable';

export const LOGICAL_FALLACY_OPTIONS: string[] = [
  'Ad Hominem',
  'Strawman',
  'Appeal to Authority',
  'Appeal to Emotion',
  'Bandwagon',
  'Black-or-White (False Dilemma)',
  'Circular Reasoning',
  'False Cause',
  'Hasty Generalization',
  'Loaded Question',
  'No True Scotsman',
  'Slippery Slope',
  'Tu Quoque',
];

export interface DebateStats {
  claimsIdentified: number;
  claimsFactChecked: number;
  logicalFallacies: number;
  evidenceProvided: number;
  impactHighlights: number;
}

export interface DebateContribution {
  id: string;
  participantId?: string;
  contributor: string;
  type: DebateContributionType;
  description: string;
  statement?: string;
  verdict?: FactCheckVerdict;
  fallacyType?: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
}

export interface DebateParticipant {
  id: string;
  name: string;
  side?: string;
  role?: string;
}

export interface DebateRoom {
  code: string;
  title: string;
  watchUrl: string;
  format: string;
  createdAt: string;
  stats: DebateStats;
  contributions: DebateContribution[];
  participants: DebateParticipant[];
}

const codeGenerator = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6);

declare global {
  // eslint-disable-next-line no-var
  var __debateRooms: Map<string, DebateRoom> | undefined;
}

const rooms: Map<string, DebateRoom> =
  globalThis.__debateRooms ?? new Map<string, DebateRoom>();

if (!globalThis.__debateRooms) {
  globalThis.__debateRooms = rooms;
}

const defaultStats: DebateStats = {
  claimsIdentified: 0,
  claimsFactChecked: 0,
  logicalFallacies: 0,
  evidenceProvided: 0,
  impactHighlights: 0,
};

function createStats(): DebateStats {
  return { ...defaultStats };
}

export function listRooms(): DebateRoom[] {
  return Array.from(rooms.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

export function createRoom({
  title,
  watchUrl,
  format,
}: {
  title: string;
  watchUrl: string;
  format: string;
}): DebateRoom {
  let code = codeGenerator();
  while (rooms.has(code)) {
    code = codeGenerator();
  }

  const room: DebateRoom = {
    code,
    title,
    watchUrl,
    format,
    createdAt: new Date().toISOString(),
    stats: createStats(),
    contributions: [],
    participants: [],
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): DebateRoom | undefined {
  return rooms.get(code);
}

export function updateRoom(
  code: string,
  updates: Partial<Pick<DebateRoom, 'title' | 'watchUrl' | 'format'>>,
): DebateRoom | undefined {
  const room = rooms.get(code);
  if (!room) {
    return undefined;
  }
  if (updates.title !== undefined) {
    room.title = updates.title;
  }
  if (updates.watchUrl !== undefined) {
    room.watchUrl = updates.watchUrl;
  }
  if (updates.format !== undefined) {
    room.format = updates.format;
  }
  return room;
}

type StatUpdates = Partial<Record<keyof DebateStats, number>>;

export function incrementStats(code: string, updates: StatUpdates): DebateStats | undefined {
  const room = rooms.get(code);
  if (!room) {
    return undefined;
  }
  Object.entries(updates).forEach(([key, delta]) => {
    if (delta === undefined) return;
    const statKey = key as keyof DebateStats;
    const current = room.stats[statKey] ?? 0;
    const nextValue = current + delta;
    room.stats[statKey] = nextValue < 0 ? 0 : nextValue;
  });
  return room.stats;
}

export function addContribution(
  code: string,
  contribution: {
    participantId?: string;
    contributorName?: string;
    type: DebateContributionType;
    description?: string;
    statement?: string;
    verdict?: FactCheckVerdict;
    fallacyType?: string;
  },
): DebateContribution | undefined {
  const room = rooms.get(code);
  if (!room) {
    return undefined;
  }

  const requiresParticipant =
    contribution.type === 'claim' || contribution.type === 'fact-check' || contribution.type === 'fallacy';

  let participantName: string | undefined;
  if (contribution.participantId) {
    const participant = room.participants.find((entry) => entry.id === contribution.participantId);
    if (!participant) {
      throw new Error('Participant not found for attribution.');
    }
    participantName = participant.name;
  } else if (requiresParticipant) {
    throw new Error('A participant attribution is required for this contribution type.');
  }

  const trimmedDescription = contribution.description?.trim() ?? '';
  const trimmedStatement = contribution.statement?.trim();
  const normalizedFallacy = contribution.fallacyType?.trim();

  if (contribution.type === 'fact-check') {
    if (!trimmedStatement) {
      throw new Error('A paraphrased claim or quote is required for fact checks.');
    }
    if (!contribution.verdict || !['true', 'false', 'unverifiable'].includes(contribution.verdict)) {
      throw new Error('A fact-check verdict must be true, false, or unverifiable.');
    }
  }

  if (contribution.type === 'fallacy') {
    if (!trimmedStatement) {
      throw new Error('A paraphrased statement is required for logical fallacies.');
    }
    if (!normalizedFallacy || !LOGICAL_FALLACY_OPTIONS.includes(normalizedFallacy)) {
      throw new Error('A recognized logical fallacy selection is required.');
    }
  }

  const entry: DebateContribution = {
    id: nanoid(),
    participantId: contribution.participantId,
    contributor: participantName
      ? participantName
      : contribution.contributorName?.trim().length
      ? contribution.contributorName.trim()
      : 'Anonymous',
    type: contribution.type,
    description: trimmedDescription,
    statement: trimmedStatement,
    verdict: contribution.type === 'fact-check' ? contribution.verdict : undefined,
    fallacyType: contribution.type === 'fallacy' ? normalizedFallacy : undefined,
    upvotes: 0,
    downvotes: 0,
    createdAt: new Date().toISOString(),
  };
  room.contributions.unshift(entry);
  return entry;
}

export function voteOnContribution(
  code: string,
  contributionId: string,
  direction: 'up' | 'down',
): DebateContribution | undefined {
  const room = rooms.get(code);
  if (!room) {
    return undefined;
  }
  const contribution = room.contributions.find((entry) => entry.id === contributionId);
  if (!contribution) {
    return undefined;
  }
  if (direction === 'up') {
    contribution.upvotes += 1;
  } else if (direction === 'down') {
    contribution.downvotes += 1;
  }
  return contribution;
}

export function addParticipant(
  code: string,
  participant: {
    name: string;
    side?: string;
    role?: string;
  },
): DebateParticipant | undefined {
  const room = rooms.get(code);
  if (!room) {
    return undefined;
  }
  const entry: DebateParticipant = {
    id: nanoid(),
    name: participant.name,
    side: participant.side,
    role: participant.role,
  };
  room.participants.push(entry);
  return entry;
}

export function seedDemoRoom(): DebateRoom {
  if (rooms.size > 0) {
    return rooms.values().next().value as DebateRoom;
  }
  const demo = createRoom({
    title: 'Demo Debate: AI Ethics',
    watchUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    format: '2 vs 2',
  });
  const ava = addParticipant(demo.code, { name: 'Ava (Pro)', side: 'Pro', role: 'Lead Debater' });
  addParticipant(demo.code, { name: 'Liam (Pro)', side: 'Pro', role: 'Researcher' });
  addParticipant(demo.code, { name: 'Noah (Con)', side: 'Con', role: 'Lead Debater' });
  const mia = addParticipant(demo.code, { name: 'Mia (Con)', side: 'Con', role: 'Researcher' });
  addContribution(demo.code, {
    participantId: ava?.id,
    type: 'claim',
    description: 'AI surveillance erodes civil liberties if left unregulated.',
  });
  addContribution(demo.code, {
    participantId: mia?.id,
    type: 'fact-check',
    statement: 'Pro side claim that EU lacks safeguards on AI oversight readiness.',
    verdict: 'true',
    description: 'Linked to 2023 EU report on AI oversight readiness.',
  });
  incrementStats(demo.code, {
    claimsIdentified: 3,
    claimsFactChecked: 1,
    logicalFallacies: 1,
    evidenceProvided: 2,
  });
  return demo;
}
