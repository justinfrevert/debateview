import type { NextApiRequest, NextApiResponse } from 'next';
import { addParticipant } from '../../../../lib/roomsStore';

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

  const { name, side, role } = req.body ?? {};

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'A participant name is required.' });
    return;
  }

  const entry = addParticipant(code, {
    name: name.trim(),
    side: typeof side === 'string' ? side.trim() : undefined,
    role: typeof role === 'string' ? role.trim() : undefined,
  });

  if (!entry) {
    res.status(404).json({ error: 'Room not found.' });
    return;
  }

  res.status(201).json({ participant: entry });
}
