import type { NextApiRequest, NextApiResponse } from 'next';
import { getRoom, updateRoom } from '../../../../lib/roomsStore';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (typeof code !== 'string') {
    res.status(400).json({ error: 'A valid room code is required.' });
    return;
  }

  if (req.method === 'GET') {
    const room = getRoom(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    res.status(200).json({ room });
    return;
  }

  if (req.method === 'PUT') {
    const { title, watchUrl, format } = req.body ?? {};
    const room = updateRoom(code, {
      title: typeof title === 'string' ? title.trim() : undefined,
      watchUrl: typeof watchUrl === 'string' ? watchUrl.trim() : undefined,
      format: typeof format === 'string' ? format.trim() : undefined,
    });
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    res.status(200).json({ room });
    return;
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  res.status(405).json({ error: 'Method Not Allowed' });
}
