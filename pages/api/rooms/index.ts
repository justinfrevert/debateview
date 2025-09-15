import type { NextApiRequest, NextApiResponse } from 'next';
import { createRoom, listRooms, seedDemoRoom } from '../../../lib/roomsStore';

seedDemoRoom();

type RoomSummary = {
  code: string;
  title: string;
  watchUrl: string;
  format: string;
  createdAt: string;
  participantCount: number;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ room?: RoomSummary; rooms?: RoomSummary[]; error?: string }>,
) {
  if (req.method === 'GET') {
    const rooms = listRooms().map((room) => ({
      code: room.code,
      title: room.title,
      watchUrl: room.watchUrl,
      format: room.format,
      createdAt: room.createdAt,
      participantCount: room.participants.length,
    }));
    res.status(200).json({ rooms });
    return;
  }

  if (req.method === 'POST') {
    const { title, watchUrl, format } = req.body ?? {};

    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'A debate title is required.' });
      return;
    }

    if (!watchUrl || typeof watchUrl !== 'string') {
      res.status(400).json({ error: 'A watch URL is required.' });
      return;
    }

    const room = createRoom({
      title: title.trim(),
      watchUrl: watchUrl.trim(),
      format: typeof format === 'string' && format.trim().length > 0 ? format.trim() : 'Open Format',
    });

    res.status(201).json({
      room: {
        code: room.code,
        title: room.title,
        watchUrl: room.watchUrl,
        format: room.format,
        createdAt: room.createdAt,
        participantCount: room.participants.length,
      },
    });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method Not Allowed' });
}
