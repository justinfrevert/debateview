import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type {
  DebateContributionType,
  DebateRoom,
  DebateStats,
} from '@/lib/roomsStore';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load room');
  }
  return (await response.json()) as { room: DebateRoom };
};

const statLabels: Record<keyof DebateStats, { label: string; description: string }> = {
  claimsIdentified: {
    label: 'Claims Identified',
    description: 'Track every major assertion or argument presented.',
  },
  claimsFactChecked: {
    label: 'Claims Fact Checked',
    description: 'Flag which claims have been verified with credible sources.',
  },
  logicalFallacies: {
    label: 'Logical Fallacies',
    description: 'Call out fallacies spotted in real time.',
  },
  evidenceProvided: {
    label: 'Evidence Links',
    description: 'Count supporting studies, reports, and documents shared.',
  },
  impactHighlights: {
    label: 'Impact Highlights',
    description: 'Capture key takeaways, voter impacts, or policy implications.',
  },
};

const contributionTypes: { value: DebateContributionType; label: string; helper: string }[] = [
  { value: 'claim', label: 'Claim', helper: 'Summarize a new argument, stance, or narrative.' },
  {
    value: 'fact-check',
    label: 'Fact Check',
    helper: 'Provide verification with sources, citations, or context.',
  },
  {
    value: 'fallacy',
    label: 'Logical Fallacy',
    helper: 'Highlight reasoning errors such as strawman or false equivalence.',
  },
  {
    value: 'evidence',
    label: 'Evidence',
    helper: 'Link to data, documents, or lived experience that backs a claim.',
  },
  {
    value: 'insight',
    label: 'Insight',
    helper: 'Add judging notes, audience sentiment, or strategic observations.',
  },
];

function getEmbedUrl(watchUrl: string): string | null {
  try {
    const url = new URL(watchUrl);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtube.com') {
      const videoId = url.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (host === 'youtu.be') {
      const videoId = url.pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    return null;
  } catch (error) {
    return null;
  }
}

type ContributionFormState = {
  contributor: string;
  type: DebateContributionType;
  description: string;
};

type ParticipantFormState = {
  name: string;
  side: string;
  role: string;
};

export default function RoomPage() {
  const router = useRouter();
  const code = typeof router.query.code === 'string' ? router.query.code.toUpperCase() : '';

  const { data, error, mutate } = useSWR(code ? `/api/rooms/${code}` : null, fetcher, {
    refreshInterval: 4000,
  });

  const room = data?.room;
  const [watchUrl, setWatchUrl] = useState('');
  const [watchUpdateMessage, setWatchUpdateMessage] = useState<string | null>(null);
  const [watchUpdating, setWatchUpdating] = useState(false);

  const [contributionForm, setContributionForm] = useState<ContributionFormState>({
    contributor: '',
    type: 'claim',
    description: '',
  });
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);

  const [participantForm, setParticipantForm] = useState<ParticipantFormState>({
    name: '',
    side: '',
    role: '',
  });
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [isSubmittingParticipant, setIsSubmittingParticipant] = useState(false);

  useEffect(() => {
    if (room) {
      setWatchUrl(room.watchUrl);
    }
  }, [room]);

  const participantsBySide = useMemo(() => {
    if (!room) {
      return [] as { side: string; members: { name: string; role?: string }[] }[];
    }
    const grouped = new Map<string, { name: string; role?: string }[]>();
    room.participants.forEach((participant) => {
      const side = participant.side?.length ? participant.side : 'Unassigned';
      if (!grouped.has(side)) {
        grouped.set(side, []);
      }
      grouped.get(side)?.push({ name: participant.name, role: participant.role });
    });
    return Array.from(grouped.entries()).map(([side, members]) => ({ side, members }));
  }, [room]);

  const handleStatUpdate = async (key: keyof DebateStats, delta: number) => {
    if (!code) return;
    const response = await fetch(`/api/rooms/${code}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: delta }),
    });
    if (!response.ok) {
      console.error('Failed to update stats');
    }
    mutate();
  };

  const handleContributionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code) return;
    setContributionError(null);
    setIsSubmittingContribution(true);
    try {
      const response = await fetch(`/api/rooms/${code}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contributionForm),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? 'Unable to record contribution');
      }
      setContributionForm({ contributor: '', type: contributionForm.type, description: '' });
      mutate();
    } catch (submissionError) {
      setContributionError((submissionError as Error).message);
    } finally {
      setIsSubmittingContribution(false);
    }
  };

  const handleParticipantSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code) return;
    setParticipantError(null);
    setIsSubmittingParticipant(true);
    try {
      const response = await fetch(`/api/rooms/${code}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participantForm),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? 'Unable to add participant');
      }
      setParticipantForm({ name: '', side: participantForm.side, role: '' });
      mutate();
    } catch (submissionError) {
      setParticipantError((submissionError as Error).message);
    } finally {
      setIsSubmittingParticipant(false);
    }
  };

  const handleWatchUrlUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code) return;
    setWatchUpdating(true);
    setWatchUpdateMessage(null);
    try {
      const response = await fetch(`/api/rooms/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchUrl }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? 'Unable to update watch URL');
      }
      mutate();
      setWatchUpdateMessage('Watch link updated for everyone in the room.');
    } catch (updateError) {
      setWatchUpdateMessage((updateError as Error).message);
    } finally {
      setWatchUpdating(false);
    }
  };

  const embedUrl = room ? getEmbedUrl(room.watchUrl) : null;

  if (error) {
    return (
      <main className="layout">
        <section className="card">
          <h1>Room not found</h1>
          <p>Please double-check the code or create a new debate room.</p>
          <Link href="/" className="link">
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="layout">
        <section className="card">
          <h1>Loading room…</h1>
          <p>Fetching the latest debate stats and contributions.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{room.title} • DebateView room {room.code}</title>
      </Head>
      <main className="layout room-layout">
        <header className="room-header">
          <div>
            <p className="room-code">Room {room.code}</p>
            <h1>{room.title}</h1>
            <p className="room-meta">Format: {room.format}</p>
          </div>
          <div className="room-actions">
            <Link href="/" className="link">
              Create another room
            </Link>
            <button className="secondary" onClick={() => mutate()}>
              Refresh now
            </button>
          </div>
        </header>

        <section className="watch-section card">
          <div className="watch-header">
            <h2>Watch together</h2>
            <p>Keep the stream in sync by sharing one canonical link.</p>
          </div>
          <div className="watch-body">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title="Watch area"
                className="watch-embed"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <a href={room.watchUrl} className="watch-link" target="_blank" rel="noreferrer">
                Open watch link in a new tab
              </a>
            )}
          </div>
          <form className="inline-form" onSubmit={handleWatchUrlUpdate}>
            <label className="inline">
              Watch URL
              <input
                type="url"
                value={watchUrl}
                onChange={(event) => setWatchUrl(event.target.value)}
                placeholder="Paste a livestream URL"
              />
            </label>
            <button type="submit" className="primary" disabled={watchUpdating}>
              {watchUpdating ? 'Updating…' : 'Update link'}
            </button>
          </form>
          {watchUpdateMessage ? <p className="form-hint">{watchUpdateMessage}</p> : null}
        </section>

        <section className="card stats-card">
          <h2>Debate stats</h2>
          <div className="stats-grid">
            {(Object.keys(statLabels) as (keyof DebateStats)[]).map((key) => (
              <div key={key} className="stat">
                <div className="stat-value">{room.stats[key]}</div>
                <h3>{statLabels[key].label}</h3>
                <p>{statLabels[key].description}</p>
                <div className="stat-controls">
                  <button onClick={() => handleStatUpdate(key, -1)} className="secondary">
                    −1
                  </button>
                  <button onClick={() => handleStatUpdate(key, 1)} className="primary">
                    +1
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid two-columns">
          <article className="card">
            <h2>Participants</h2>
            <p className="card-subtitle">
              Capture lineups for flexible formats: 1v1, 1v2, panels, or rotating guests.
            </p>
            <div className="participant-groups">
              {participantsBySide.map((group) => (
                <div key={group.side} className="participant-group">
                  <h3>{group.side}</h3>
                  <ul>
                    {group.members.map((member, index) => (
                      <li key={`${group.side}-${index}`}>
                        <span>{member.name}</span>
                        {member.role ? <span className="tag">{member.role}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {participantsBySide.length === 0 ? <p>No participants logged yet.</p> : null}
            </div>
            <form className="form" onSubmit={handleParticipantSubmit}>
              <label>
                Name
                <input
                  type="text"
                  value={participantForm.name}
                  onChange={(event) => setParticipantForm((state) => ({ ...state, name: event.target.value }))}
                  placeholder="e.g. Jordan (Moderator)"
                  required
                />
              </label>
              <label>
                Side / Team
                <input
                  type="text"
                  value={participantForm.side}
                  onChange={(event) => setParticipantForm((state) => ({ ...state, side: event.target.value }))}
                  placeholder="Team name or stance"
                />
              </label>
              <label>
                Role
                <input
                  type="text"
                  value={participantForm.role}
                  onChange={(event) => setParticipantForm((state) => ({ ...state, role: event.target.value }))}
                  placeholder="Speaker, researcher, judge…"
                />
              </label>
              {participantError ? <p className="form-error">{participantError}</p> : null}
              <button type="submit" className="primary" disabled={isSubmittingParticipant}>
                {isSubmittingParticipant ? 'Adding…' : 'Add participant'}
              </button>
            </form>
          </article>

          <article className="card">
            <h2>Contribution log</h2>
            <p className="card-subtitle">
              Document claims, fact checks, fallacies, and insights as they surface live.
            </p>
            <form className="form" onSubmit={handleContributionSubmit}>
              <div className="form-row">
                <label>
                  Contributor
                  <input
                    type="text"
                    value={contributionForm.contributor}
                    onChange={(event) =>
                      setContributionForm((state) => ({ ...state, contributor: event.target.value }))
                    }
                    placeholder="Name or alias"
                  />
                </label>
                <label>
                  Type
                  <select
                    value={contributionForm.type}
                    onChange={(event) =>
                      setContributionForm((state) => ({ ...state, type: event.target.value as DebateContributionType }))
                    }
                  >
                    {contributionTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Notes
                <textarea
                  value={contributionForm.description}
                  onChange={(event) =>
                    setContributionForm((state) => ({ ...state, description: event.target.value }))
                  }
                  placeholder="Summarize the contribution or link to evidence"
                  rows={3}
                  required
                />
              </label>
              <p className="form-hint">
                {contributionTypes.find((option) => option.value === contributionForm.type)?.helper}
              </p>
              {contributionError ? <p className="form-error">{contributionError}</p> : null}
              <button type="submit" className="primary" disabled={isSubmittingContribution}>
                {isSubmittingContribution ? 'Logging…' : 'Record contribution'}
              </button>
            </form>
            <ul className="contribution-list">
              {room.contributions.map((entry) => (
                <li key={entry.id} className={`contribution contribution-${entry.type}`}>
                  <div className="contribution-meta">
                    <span className="tag">{entry.type}</span>
                    <span>{entry.contributor}</span>
                    <time dateTime={entry.createdAt}>
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <p>{entry.description}</p>
                </li>
              ))}
              {room.contributions.length === 0 ? <li>No contributions yet. Be the first!</li> : null}
            </ul>
          </article>
        </section>
      </main>
    </>
  );
}
