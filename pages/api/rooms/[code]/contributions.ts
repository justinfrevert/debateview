import type { NextApiRequest, NextApiResponse } from 'next';
import { addContribution } from '../../../../lib/roomsStore';
import type { DebateContributionType } from '../../../../lib/roomsStore';

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

  const { contributor, type, description } = req.body ?? {};

  if (!type || typeof type !== 'string') {
    res.status(400).json({ error: 'A contribution type is required.' });
    return;
  }

  const normalizedType = type.trim().toLowerCase() as DebateContributionType;

  if (!allowedContributionTypes.includes(normalizedType)) {
    res.status(400).json({ error: 'Unsupported contribution type.' });
    return;
  }

  if (!description || typeof description !== 'string') {
    res.status(400).json({ error: 'A description is required.' });
    return;
  }

  const entry = addContribution(code, {
    contributor: typeof contributor === 'string' && contributor.trim().length > 0 ? contributor.trim() : 'Anonymous',
    type: normalizedType,
    description: description.trim(),
  });

  if (!entry) {
    res.status(404).json({ error: 'Room not found.' });
    return;
  }

  res.status(201).json({ contribution: entry });
}
