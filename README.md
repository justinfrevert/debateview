# DebateView

DebateView helps communities run structured second-screen coverage during live debates. Hosts can
spin up a Kahoot-style room code, drop in a watch link (YouTube, TikTok, Twitch, etc.), and invite
spectators to track claims, surface fact checks, and flag logical fallacies in real time. The app is
built with Next.js and stores data in memory for quick experiments or workshops.

## Features

- **Room creation and discovery** – Generate a shareable code for each debate room. A demo room is
  seeded on first launch so you can see how things work immediately.
- **Watch link coordination** – Share the canonical livestream link with everyone in the room and
  optionally embed YouTube streams.
- **Flexible participant lineups** – Log 1v1, 1v2, panel, or rotating guest formats with roles and
  teams.
- **Live stat tracking** – Increment counters for claims identified, fact checks completed, logical
  fallacies spotted, evidence links, and impact highlights.
- **Contribution timeline** – Capture structured notes for claims, fact checks, fallacies, evidence,
  or insights with contributor attribution.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser. Create a new room or join
   the demo room that appears in the lobby list.

## Tech stack

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)

> **Note:** For simplicity the in-memory room store resets whenever the server restarts. Persist to a
> database (Redis, PostgreSQL, etc.) before using this in production.
