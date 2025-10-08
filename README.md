# WebDialer

A modern web-based multi-SIP dialer built with Vite, React, TypeScript, Tailwind CSS, and Firebase. Agents can authenticate, manage multiple SIP profiles, monitor registration status, and place calls directly from the browser using a JsSIP-powered softphone.

## Features

- Firebase Authentication with email/password and Google provider
- Firestore-backed SIP profile management with validation
- Real-time presence tracking with Firebase Realtime Database
- JsSIP-based WebRTC calling with status feedback and call controls
- Call history persisted to Firestore
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

Adjust the rules if you introduce additional collections or Realtime Database paths.

## Deployment

The app is optimized for static hosting platforms such as Firebase Hosting. After running `npm run build`, deploy the generated files in the `dist/` directory.

## License

MIT
