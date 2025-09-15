import type { NextApiRequest, NextApiResponse } from 'next';
import { voteOnContribution } from '../../../../../../lib/roomsStore';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, contributionId } = req.query;

  if (typeof code !== 'string' || typeof contributionId !== 'string') {
    res.status(400).json({ error: 'A valid room code and contribution id are required.' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { direction } = req.body ?? {};

  if (direction !== 'up' && direction !== 'down') {
    res.status(400).json({ error: 'Vote direction must be "up" or "down".' });
    return;
  }

  const contribution = voteOnContribution(code, contributionId, direction);

  if (!contribution) {
    res.status(404).json({ error: 'Contribution not found.' });
    return;
  }

  res.status(200).json({ contribution });
}
