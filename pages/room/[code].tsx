import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { LOGICAL_FALLACY_OPTIONS } from '@/lib/roomsStore';
import type {
  DebateContributionType,
  DebateRoom,
  DebateStats,
  FactCheckVerdict,
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

const contributionTypes: {
  value: DebateContributionType;
  label: string;
  helper: string;
  requiresParticipant: boolean;
  notesLabel: string;
}[] = [
  {
    value: 'claim',
    label: 'Claim',
    helper: 'Summarize a new argument, stance, or narrative.',
    requiresParticipant: true,
    notesLabel: 'Claim summary',
  },
  {
    value: 'fact-check',
    label: 'Fact Check',
    helper: 'Provide verification with sources, citations, or context.',
    requiresParticipant: true,
    notesLabel: 'Notes or evidence links (optional)',
  },
  {
    value: 'fallacy',
    label: 'Logical Fallacy',
    helper: 'Highlight reasoning errors such as strawman or false equivalence.',
    requiresParticipant: true,
    notesLabel: 'Notes or corrective guidance (optional)',
  },
  {
    value: 'evidence',
    label: 'Evidence',
    helper: 'Link to data, documents, or lived experience that backs a claim.',
    requiresParticipant: false,
    notesLabel: 'Evidence details or link',
  },
  {
    value: 'insight',
    label: 'Insight',
    helper: 'Add judging notes, audience sentiment, or strategic observations.',
    requiresParticipant: false,
    notesLabel: 'Insight or observation',
  },
];

const contributionLabelMap = contributionTypes.reduce(
  (lookup, option) => ({ ...lookup, [option.value]: option.label }),
  {} as Record<DebateContributionType, string>,
);

const verdictLabels: Record<FactCheckVerdict, string> = {
  true: 'True',
  false: 'False',
  unverifiable: 'Unverifiable',
};

function requiresParticipant(type: DebateContributionType): boolean {
  return contributionTypes.find((option) => option.value === type)?.requiresParticipant ?? false;
}

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
  type: DebateContributionType;
  participantId: string;
  contributorName: string;
  description: string;
  statement: string;
  verdict: FactCheckVerdict;
  fallacyType: string;
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
    type: 'claim',
    participantId: '',
    contributorName: '',
    description: '',
    statement: '',
    verdict: 'true',
    fallacyType: LOGICAL_FALLACY_OPTIONS[0],
  });
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votingContributionId, setVotingContributionId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!room) {
      return;
    }
    setContributionForm((state) => {
      if (!requiresParticipant(state.type)) {
        return state;
      }
      if (room.participants.length === 0) {
        return { ...state, participantId: '' };
      }
      if (room.participants.some((participant) => participant.id === state.participantId)) {
        return state;
      }
      return { ...state, participantId: room.participants[0]?.id ?? '' };
    });
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

  const handleContributionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code) return;
    setContributionError(null);
    setVoteError(null);
    const requiresAttribution = requiresParticipant(contributionForm.type);
    const participantOptions = room?.participants ?? [];

    if (requiresAttribution && participantOptions.length === 0) {
      setContributionError('Add participants before logging claims, fact checks, or fallacies.');
      return;
    }

    if (requiresAttribution && !contributionForm.participantId) {
      setContributionError('Select a participant to attribute this entry.');
      return;
    }

    const trimmedDescription = contributionForm.description.trim();
    const trimmedStatement = contributionForm.statement.trim();

    if (
      (contributionForm.type === 'fact-check' || contributionForm.type === 'fallacy') &&
      trimmedStatement.length === 0
    ) {
      setContributionError('Please paraphrase or quote the relevant statement.');
      return;
    }

    setIsSubmittingContribution(true);
    try {
      const payload: Record<string, unknown> = {
        type: contributionForm.type,
        description: trimmedDescription,
      };

      if (requiresAttribution) {
        payload.participantId = contributionForm.participantId;
      } else if (contributionForm.contributorName.trim().length > 0) {
        payload.contributorName = contributionForm.contributorName.trim();
      }

      if (contributionForm.type === 'fact-check') {
        payload.statement = trimmedStatement;
        payload.verdict = contributionForm.verdict;
      }

      if (contributionForm.type === 'fallacy') {
        payload.statement = trimmedStatement;
        payload.fallacyType = contributionForm.fallacyType;
      }

      const response = await fetch(`/api/rooms/${code}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? 'Unable to record contribution');
      }
      setContributionForm((state) => ({
        ...state,
        description: '',
        statement: '',
      }));
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

  const handleContributionVote = async (contributionId: string, direction: 'up' | 'down') => {
    if (!code) return;
    setVoteError(null);
    setVotingContributionId(contributionId);
    try {
      const response = await fetch(`/api/rooms/${code}/contributions/${contributionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? 'Unable to record vote');
      }
      await mutate();
    } catch (submissionError) {
      setVoteError((submissionError as Error).message);
    } finally {
      setVotingContributionId(null);
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
  const selectedContributionMeta =
    contributionTypes.find((option) => option.value === contributionForm.type) ?? contributionTypes[0];
  const needsParticipant = requiresParticipant(contributionForm.type);
  const lacksParticipantOptions = needsParticipant && (room?.participants.length ?? 0) === 0;
  const notesPlaceholder =
    contributionForm.type === 'fact-check'
      ? 'Add context or cite sources backing your verification'
      : contributionForm.type === 'fallacy'
      ? 'Explain the impact or provide corrective guidance'
      : 'Summarize the contribution or link to evidence';
  const statementPlaceholder =
    contributionForm.type === 'fact-check'
      ? 'Paraphrase or quote the claim under review'
      : 'Paraphrase or quote the fallacious statement';

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
          <p className="card-subtitle">
            Totals update automatically as complete contributions are logged.
          </p>
          <div className="stats-grid">
            {(Object.keys(statLabels) as (keyof DebateStats)[]).map((key) => (
              <div key={key} className="stat">
                <div className="stat-value">{room.stats[key]}</div>
                <h3>{statLabels[key].label}</h3>
                <p>{statLabels[key].description}</p>
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
                {needsParticipant ? (
                  <label>
                    Speaker
                    <select
                      value={contributionForm.participantId}
                      onChange={(event) =>
                        setContributionForm((state) => ({ ...state, participantId: event.target.value }))
                      }
                      disabled={lacksParticipantOptions}
                      required
                    >
                      {lacksParticipantOptions ? (
                        <option value="">No participants yet</option>
                      ) : (
                        room.participants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.name}
                            {participant.role ? ` • ${participant.role}` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                ) : (
                  <label>
                    Contributor
                    <input
                      type="text"
                      value={contributionForm.contributorName}
                      onChange={(event) =>
                        setContributionForm((state) => ({ ...state, contributorName: event.target.value }))
                      }
                      placeholder="Name or alias"
                    />
                  </label>
                )}
                <label>
                  Type
                  <select
                    value={contributionForm.type}
                    onChange={(event) => {
                      const nextType = event.target.value as DebateContributionType;
                      setContributionForm((state) => {
                        if (state.type === nextType) {
                          return state;
                        }
                        const next: ContributionFormState = {
                          ...state,
                          type: nextType,
                        };
                        if (requiresParticipant(nextType)) {
                          if (room.participants.length > 0) {
                            if (!room.participants.some((participant) => participant.id === state.participantId)) {
                              next.participantId = room.participants[0]?.id ?? '';
                            }
                          } else {
                            next.participantId = '';
                          }
                        }
                        if (nextType === 'fact-check') {
                          next.verdict = state.verdict;
                        }
                        if (nextType === 'fallacy' && !LOGICAL_FALLACY_OPTIONS.includes(state.fallacyType)) {
                          next.fallacyType = LOGICAL_FALLACY_OPTIONS[0];
                        }
                        next.statement = '';
                        return next;
                      });
                    }}
                  >
                    {contributionTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {needsParticipant && lacksParticipantOptions ? (
                <p className="form-hint warning">
                  Add participants before logging claims, fact checks, or fallacies.
                </p>
              ) : null}
              {(contributionForm.type === 'fact-check' || contributionForm.type === 'fallacy') && (
                <label>
                  {contributionForm.type === 'fact-check'
                    ? 'Claim or statement under review'
                    : 'Statement containing the fallacy'}
                  <textarea
                    value={contributionForm.statement}
                    onChange={(event) =>
                      setContributionForm((state) => ({ ...state, statement: event.target.value }))
                    }
                    placeholder={statementPlaceholder}
                    rows={2}
                    required
                  />
                </label>
              )}
              {contributionForm.type === 'fact-check' ? (
                <label>
                  Verdict
                  <select
                    value={contributionForm.verdict}
                    onChange={(event) =>
                      setContributionForm((state) => ({
                        ...state,
                        verdict: event.target.value as FactCheckVerdict,
                      }))
                    }
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                    <option value="unverifiable">Unverifiable</option>
                  </select>
                </label>
              ) : null}
              {contributionForm.type === 'fallacy' ? (
                <label>
                  Logical fallacy
                  <select
                    value={contributionForm.fallacyType}
                    onChange={(event) =>
                      setContributionForm((state) => ({ ...state, fallacyType: event.target.value }))
                    }
                  >
                    {LOGICAL_FALLACY_OPTIONS.map((fallacy) => (
                      <option key={fallacy} value={fallacy}>
                        {fallacy}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                {selectedContributionMeta.notesLabel}
                <textarea
                  value={contributionForm.description}
                  onChange={(event) =>
                    setContributionForm((state) => ({ ...state, description: event.target.value }))
                  }
                  placeholder={notesPlaceholder}
                  rows={3}
                  required={!(contributionForm.type === 'fact-check' || contributionForm.type === 'fallacy')}
                />
              </label>
              <p className="form-hint">{selectedContributionMeta.helper}</p>
              {contributionError ? <p className="form-error">{contributionError}</p> : null}
              <button
                type="submit"
                className="primary"
                disabled={isSubmittingContribution || lacksParticipantOptions}
              >
                {isSubmittingContribution ? 'Logging…' : 'Record contribution'}
              </button>
            </form>
            {voteError ? <p className="form-error">{voteError}</p> : null}
            <ul className="contribution-list">
              {room.contributions.map((entry) => {
                const typeLabel = contributionLabelMap[entry.type] ?? entry.type;
                const showVerdict = entry.type === 'fact-check' && entry.verdict;
                const showFallacy = entry.type === 'fallacy' && entry.fallacyType;
                const isVoteable = entry.type === 'fact-check' || entry.type === 'fallacy';
                const isVoting = votingContributionId === entry.id;
                return (
                  <li key={entry.id} className={`contribution contribution-${entry.type}`}>
                    <div className="contribution-meta">
                      <span className="tag">{typeLabel}</span>
                      <span>{entry.contributor}</span>
                      <time dateTime={entry.createdAt}>
                        {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    {entry.statement ? <p className="contribution-statement">“{entry.statement}”</p> : null}
                    {showVerdict || showFallacy ? (
                      <div className="contribution-highlights">
                        {showVerdict && entry.verdict ? (
                          <span className={`contribution-badge verdict-${entry.verdict}`}>
                            Verdict: {verdictLabels[entry.verdict]}
                          </span>
                        ) : null}
                        {showFallacy ? <span className="contribution-badge">{entry.fallacyType}</span> : null}
                      </div>
                    ) : null}
                    {entry.description ? <p className="contribution-notes">{entry.description}</p> : null}
                    {isVoteable ? (
                      <div className="contribution-votes">
                        <button
                          type="button"
                          className="vote-button upvote"
                          onClick={() => handleContributionVote(entry.id, 'up')}
                          disabled={isVoting}
                          aria-label={`Upvote ${typeLabel} from ${entry.contributor}`}
                        >
                          ▲ {entry.upvotes}
                        </button>
                        <button
                          type="button"
                          className="vote-button downvote"
                          onClick={() => handleContributionVote(entry.id, 'down')}
                          disabled={isVoting}
                          aria-label={`Downvote ${typeLabel} from ${entry.contributor}`}
                        >
                          ▼ {entry.downvotes}
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
              {room.contributions.length === 0 ? <li>No contributions yet. Be the first!</li> : null}
            </ul>
          </article>
        </section>
      </main>
    </>
  );
}
