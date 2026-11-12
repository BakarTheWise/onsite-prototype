# OnSite – Construction Management Web Prototype

A responsive, interactive web prototype based on the supplied **OnSite Web App Developer Guide**. It demonstrates the Site Captain, Project Lead and Admin workflows using shared demo data.

## Requirements

- Node.js 18.17+ (Node.js 20 LTS recommended)
- npm
- VS Code

## Run locally

1. Extract the ZIP file.
2. Open the `onsite-prototype` folder in VS Code.
3. Open the integrated terminal (`Terminal` → `New Terminal`).
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

To create a production build:

```bash
npm run build
npm start
```

## What is included

- Role switcher for Site Captain, Project Lead and Admin.
- Site Captain: Today, Daily log, Stage update, Materials (request/receive/issue), Attendance, Report an issue, Site feed and Inbox.
- Project Lead: Review queue, review detail, approve and send-back flows, project plan and stages.
- Admin: Create plan, check draft plan, approval chain and reporting rules.
- Shared demo stages, work steps, documents, queue items and store balance.
- Responsive desktop sidebar and mobile bottom navigation / capture sheet.
- Browser-local demo persistence for stage, queue and inventory changes.

## Prototype limitations

This is deliberately a **front-end prototype**, not a production system.

- The browser `localStorage` stores demo state on this device only. It is not a secure database and is not shared across users or devices.
- Role switching is for demonstration. There is no real login or server-side authorization.
- Camera, photo evidence, GPS, geofencing, trusted timestamps, file upload, push notifications, voice recording, offline sync, import parsers and WhatsApp/SMS are placeholders or not implemented.
- Approval actions are simulated in the browser. Production must enforce separation of duties, approval-chain routing, audit events and stage gates on the server.
- The sample project, names, activity and quantities are fictional demo data.

## Architecture and future mobile direction

The UI is currently a Next.js client application. For the production build, extract domain models and workflow rules into a shared TypeScript package and expose them through authenticated API contracts. A React Native + Expo app can then reuse those domain types, validation and API client while implementing native camera, location, notifications and offline storage.

Suggested next production steps:

1. Define the PostgreSQL schema and migrations (workspaces, memberships, projects, stages, steps, documents, submissions, approvals, inventory ledger and audit events).
2. Add Supabase Auth and enforce access using server-side authorization and Row Level Security.
3. Move all approval, inventory, stage-gate and reporting-rule mutations to trusted server functions.
4. Add secure object storage and evidence capture with server-side verification.
5. Add an offline-first local database and a conflict-aware sync queue.
6. Add unit, integration and end-to-end tests.

## Project structure

```text
onsite-prototype/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── onsite-app.tsx
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Notes

The prototype uses a deliberately neutral construction-oriented visual system. Branding, exact v2 screen-design matching and production integrations can be refined when the PRD and v2 screen designs are available.
