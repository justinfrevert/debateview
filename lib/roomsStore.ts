import { customAlphabet, nanoid } from 'nanoid';

export type DebateContributionType =
  | 'claim'
  | 'fact-check'
  | 'fallacy'
  | 'evidence'
  | 'insight';

export interface DebateStats {
  claimsIdentified: number;
  claimsFactChecked: number;
  logicalFallacies: number;
  evidenceProvided: number;
  impactHighlights: number;
}

export interface DebateContribution {
  id: string;
  contributor: string;
  type: DebateContributionType;
  description: string;
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

const rooms = new Map<string, DebateRoom>();

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
    contributor: string;
    type: DebateContributionType;
    description: string;
  },
): DebateContribution | undefined {
  const room = rooms.get(code);
  if (!room) {
    return undefined;
  }
  const entry: DebateContribution = {
    id: nanoid(),
    contributor: contribution.contributor || 'Anonymous',
    type: contribution.type,
    description: contribution.description,
    createdAt: new Date().toISOString(),
  };
  room.contributions.unshift(entry);
  return entry;
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
  addParticipant(demo.code, { name: 'Ava (Pro)', side: 'Pro', role: 'Lead Debater' });
  addParticipant(demo.code, { name: 'Liam (Pro)', side: 'Pro', role: 'Researcher' });
  addParticipant(demo.code, { name: 'Noah (Con)', side: 'Con', role: 'Lead Debater' });
  addParticipant(demo.code, { name: 'Mia (Con)', side: 'Con', role: 'Researcher' });
  addContribution(demo.code, {
    contributor: 'Ava',
    type: 'claim',
    description: 'AI surveillance erodes civil liberties if left unregulated.',
  });
  addContribution(demo.code, {
    contributor: 'Mia',
    type: 'fact-check',
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
