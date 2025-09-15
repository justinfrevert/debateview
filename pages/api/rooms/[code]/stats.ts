import type { NextApiRequest, NextApiResponse } from 'next';
import { incrementStats } from '../../../../lib/roomsStore';

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

  const updates = req.body ?? {};
  const stats = incrementStats(code, updates);
  if (!stats) {
    res.status(404).json({ error: 'Room not found.' });
    return;
  }

  res.status(200).json({ stats });
}
