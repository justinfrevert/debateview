import type { NextApiRequest, NextApiResponse } from 'next';
import { addContribution } from '../../../../lib/roomsStore';
import type { DebateContributionType, FactCheckVerdict } from '../../../../lib/roomsStore';

const allowedContributionTypes: DebateContributionType[] = [
  'claim',
  'fact-check',
  'fallacy',
  'evidence',
  'insight',
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (typeof code !== 'string') {
    res.status(400).json({ error: 'A valid room code is required.' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { contributorName, participantId, type, description, statement, verdict, fallacyType } = req.body ?? {};

  if (!type || typeof type !== 'string') {
    res.status(400).json({ error: 'A contribution type is required.' });
    return;
  }

  const normalizedType = type.trim().toLowerCase() as DebateContributionType;

  if (!allowedContributionTypes.includes(normalizedType)) {
    res.status(400).json({ error: 'Unsupported contribution type.' });
    return;
  }

  try {
    const entry = addContribution(code, {
      participantId: typeof participantId === 'string' ? participantId : undefined,
      contributorName: typeof contributorName === 'string' ? contributorName : undefined,
      type: normalizedType,
      description: typeof description === 'string' ? description : undefined,
      statement: typeof statement === 'string' ? statement : undefined,
      verdict: typeof verdict === 'string' ? (verdict as FactCheckVerdict) : undefined,
      fallacyType: typeof fallacyType === 'string' ? fallacyType : undefined,
    });

    if (!entry) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }

    res.status(201).json({ contribution: entry });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
