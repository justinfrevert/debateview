import Head from 'next/head';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type RoomSummary = {
  code: string;
  title: string;
  watchUrl: string;
  format: string;
  createdAt: string;
  participantCount: number;
};

const formatOptions = [
  'Open Format',
  '1 vs 1',
  '1 vs 2',
  '2 vs 2',
  'Tag Team',
  'Rotating Guests',
];

export default function HomePage() {
  const router = useRouter();
  const [roomForm, setRoomForm] = useState({
    title: '',
    watchUrl: '',
    format: formatOptions[0],
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<RoomSummary | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const response = await fetch('/api/rooms');
        if (!response.ok) {
          throw new Error('Failed to load rooms');
        }
        const data = (await response.json()) as { rooms?: RoomSummary[] };
        setRooms(data.rooms ?? []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRooms(false);
      }
    }

    fetchRooms();
  }, []);

  const handleCreateRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? 'Unable to create room');
      }

      const data = (await response.json()) as { room: RoomSummary };
      setCreatedRoom(data.room);
      setRooms((previous) => [data.room, ...previous.filter((room) => room.code !== data.room.code)]);
    } catch (error) {
      setCreateError((error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length === 0) {
      return;
    }
    router.push(`/room/${code}`);
  };

  const handleUpdateForm = (field: 'title' | 'watchUrl' | 'format', value: string) => {
    setRoomForm((previous) => ({ ...previous, [field]: value }));
  };

  return (
    <>
      <Head>
        <title>DebateView • Coordinate live debate analysis</title>
      </Head>
      <main className="layout">
        <header className="hero">
          <h1>DebateView</h1>
          <p>
            Create Kahoot-style rooms that rally communities around live debates. Track claims,
            crowdsource fact-checks, and surface logical fallacies as the conversation unfolds.
          </p>
        </header>

        <section className="actions-grid">
          <article className="card">
            <h2>Create a debate room</h2>
            <p className="card-subtitle">Share the watch link and let analysts join in real-time.</p>
            <form onSubmit={handleCreateRoom} className="form">
              <label>
                Debate title
                <input
                  type="text"
                  required
                  value={roomForm.title}
                  onChange={(event) => handleUpdateForm('title', event.target.value)}
                  placeholder="e.g. Future of AI Regulation"
                />
              </label>

              <label>
                Watch URL
                <input
                  type="url"
                  required
                  value={roomForm.watchUrl}
                  onChange={(event) => handleUpdateForm('watchUrl', event.target.value)}
                  placeholder="Paste a livestream or video URL"
                />
              </label>

              <label>
                Format
                <select
                  value={roomForm.format}
                  onChange={(event) => handleUpdateForm('format', event.target.value)}
                >
                  {formatOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {createError ? <p className="form-error">{createError}</p> : null}

              <button type="submit" className="primary" disabled={isCreating}>
                {isCreating ? 'Generating room…' : 'Create room'}
              </button>
            </form>

            {createdRoom ? (
              <div className="success">
                <p>
                  Room <strong>{createdRoom.code}</strong> is ready.
                </p>
                <div className="success-actions">
                  <button className="secondary" onClick={() => router.push(`/room/${createdRoom.code}`)}>
                    Enter room
                  </button>
                  <a href={`/room/${createdRoom.code}`} className="link">
                    Share link
                  </a>
                </div>
              </div>
            ) : null}
          </article>

          <article className="card">
            <h2>Join an existing room</h2>
            <p className="card-subtitle">
              Enter the room code provided by the host to collaborate on notes and scoring.
            </p>
            <form onSubmit={handleJoinRoom} className="form">
              <label>
                Room code
                <input
                  type="text"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="e.g. 8F3KQ2"
                />
              </label>
              <button type="submit" className="primary">
                Enter room
              </button>
            </form>

            <div className="card-note">
              <p>
                Share the room code like a Kahoot PIN so fact-checkers, judges, and the audience can
                coordinate.
              </p>
            </div>
          </article>
        </section>

        <section className="feature-section">
          <h2>Structured analysis at the speed of live debate</h2>
          <div className="feature-grid">
            <div className="feature">
              <h3>Claim tracking</h3>
              <p>Log arguments in seconds and keep a running inventory of pro and con claims.</p>
            </div>
            <div className="feature">
              <h3>Collaborative fact-checking</h3>
              <p>Invite researchers to verify assertions and attach credible sources as evidence.</p>
            </div>
            <div className="feature">
              <h3>Fallacy radar</h3>
              <p>Surface strawmen, red herrings, ad hominems, and more before the debate moves on.</p>
            </div>
            <div className="feature">
              <h3>Flexible formats</h3>
              <p>
                Support classic 1v1 matchups, 1v2 pile-ons, panel showdowns, or rotating TikTok guest
                formats.
              </p>
            </div>
          </div>
        </section>

        <section className="rooms-section">
          <div className="rooms-header">
            <h2>Live & recently launched rooms</h2>
            <p>{loadingRooms ? 'Loading rooms…' : `Showing ${rooms.length} room(s).`}</p>
          </div>
          <div className="rooms-grid">
            {rooms.map((room) => (
              <Link key={room.code} href={`/room/${room.code}`} className="room-card">
                <span className="room-code">{room.code}</span>
                <h3>{room.title}</h3>
                <p className="room-meta">{room.format}</p>
                <p className="room-meta">
                  {new Date(room.createdAt).toLocaleString()} · {room.participantCount} participant(s)
                </p>
              </Link>
            ))}
            {rooms.length === 0 && !loadingRooms ? (
              <div className="room-card empty">
                <p>Rooms you create will show up here for quick access.</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
