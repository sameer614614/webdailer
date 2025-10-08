# WebDialer

A modern web-based multi-SIP dialer built with Vite, React, TypeScript, Tailwind CSS, and Firebase. Agents can authenticate, manage multiple SIP profiles, monitor registration status, and place calls directly from the browser using a JsSIP-powered softphone.

## Features

- Firebase Authentication with email/password and Google provider
- Firestore-backed SIP profile management with Telnyx-first defaults
- Real-time presence tracking with Firebase Realtime Database
- JsSIP-based WebRTC calling with status feedback and call controls
- Call history persisted to Firestore
- Profile-level activity stream for registration and call errors
- Primary profile selection that persists across sessions
- Responsive UI using Tailwind CSS with shadcn-inspired components

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- Firebase project with Authentication, Firestore, Realtime Database, and Functions enabled
- SIP infrastructure that supports WebSocket (WSS/WS) connections

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables by copying `.env.example` to `.env` and providing your Firebase project settings and optional emulator overrides:

   ```bash
   cp .env.example .env
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:5173](http://localhost:5173).

### Testing & quality checks

Run linting and type checks before you push code:

```bash
npm run lint
npm run typecheck
```

Build the production bundle to make sure the app compiles cleanly:

```bash
npm run build
```

### Local development workflow

During feature work use the dev server for a live-reload experience:

```bash
npm run dev
```

### Pushing your changes

1. Verify the checks above pass.
2. Commit your work:

   ```bash
   git add .
   git commit -m "feat: describe your change"
   ```

3. Push to your remote repository:

   ```bash
   git push origin <your-branch-name>
   ```

### Building for production

```bash
npm run build
```

## Firebase security rules

The repository ships with locked-down security policies you can deploy directly to your Firebase project:

- **Firestore** – `firebase/firestore.rules`
  - Only the authenticated owner of a document can read or write their `users/{uid}` document and the nested `sipProfiles` and `callLogs` sub-collections.
- **Realtime Database** – `firebase/database.rules.json`
  - Authenticated agents can read presence information for all users, but may only write to their own `status/{uid}` node.

Deploy the rules after updating your Firebase CLI project alias:

```bash
firebase deploy --only firestore:rules,database:rules
```

Adjust the rules if you introduce additional collections or Realtime Database paths. The dialer currently uses:

- `users/{uid}/sipProfiles` for SIP credentials and Telnyx overrides
- `users/{uid}/callLogs` for recent call summaries
- `users/{uid}/events` for registration and call error history

## SIP profile onboarding

Telnyx agents only need to supply their SIP username, password, and domain. The app automatically fills the secure WebSocket URL, transport, registrar, and default port (`wss://sip.telnyx.com:443`). Toggle the advanced overrides if you need to customise WSS, transport, registrar, or outbound proxy details for non-Telnyx providers.

Mark any profile as **Primary** so it auto-registers on login and becomes the default choice in the header selector. Profile labels must be unique; edit or delete entries directly from the dashboard list.

## Deployment

The app is optimized for static hosting platforms such as Firebase Hosting. After running `npm run build`, deploy the generated files in the `dist/` directory.

## License

MIT
