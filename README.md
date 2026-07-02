# WorkInSite

**A modern, web-based workforce management system built for construction sites.**

Track projects, manage workers, log attendance, and handle payments — all from a single, fast, responsive dashboard.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)

---

## Overview

**WorkInSite** is a workforce management platform designed for construction sites and site supervisors who need a simple way to keep track of who's working, where, and how much they're owed. It replaces scattered spreadsheets and paper registers with a single dashboard for managing **projects/sites**, **workers**, **daily attendance**, and **payments** — with an AI-assisted layer (powered by Google's Gemini API) to help surface insights from that data.

It's built as a fast, single-page React application backed by Firebase/Firestore, so it can be deployed as a lightweight, serverless web app.

---

## Features

- **Project / Site Management** — Create and track construction projects, each acting as a container for its own workers, attendance, and payment records.
- **Worker Management** — Maintain a roster of workers assigned to each site.
- **Attendance Tracking** — Log daily attendance per worker, per project, to build an accurate record of hours/days worked.
- **Payments & Payroll** — Record and track payments made to workers, tied back to attendance data.
- **AI-Assisted Insights** — Integrates the Google Gemini API (`@google/genai`) to help interpret workforce data.
- **Fast, Modern UI** — Built with React 19, Vite, and Tailwind CSS 4 for a snappy experience, with Framer Motion for smooth transitions and Lucide icons throughout.
- **Cloud-Backed Data** — Uses Firebase/Firestore as the backend, so there's no server database to manage yourself.

> **Note:** This is an actively evolving student/internship project. Some features above reflect the current direction of the app and may still be in progress — see [Roadmap](#roadmap--known-limitations) below.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build Tool | [Vite 6](https://vitejs.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Animation | [Motion (Framer Motion)](https://motion.dev/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Backend / Database | [Firebase](https://firebase.google.com/) (Firestore) |
| Server | [Express](https://expressjs.com/) |
| AI Integration | [Google Gen AI SDK](https://www.npmjs.com/package/@google/genai) (Gemini) |
| Language | TypeScript (~99% of codebase) |

---

## Project Structure

```
WorkInSite/
├── src/                     # Application source code (components, pages, logic)
├── index.html               # Vite entry HTML
├── firestore.rules          # Firestore security rules
├── .env.example              # Environment variable template (Firebase config)
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json              # Dependencies and scripts
```

---

## Data Model (Firestore Collections)

| Collection | Purpose |
|---|---|
| `projects` | Construction sites/projects being managed |
| `workers` | Worker profiles, assigned to projects |
| `attendance` | Daily attendance records per worker per project |
| `payments` | Payment/payroll records tied to workers |

> **Security note:** The current `firestore.rules` in this repo allow open read/write access (`allow read, write: if true;`) for development convenience. **Do not deploy this to production as-is** — lock down rules with Firebase Authentication and role-based checks before going live.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (comes with Node.js)
- A [Firebase](https://console.firebase.google.com/) project with **Firestore** enabled

### 1. Clone the repository

```bash
git clone https://github.com/Ragav-K/WorkInSite.git
cd WorkInSite
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY="YOUR_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
VITE_FIREBASE_APP_ID="YOUR_APP_ID"
VITE_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
```

You can find these values under **Project Settings → General → Your apps** in the Firebase console.

### 4. Deploy Firestore rules (optional, for your own Firebase project)

```bash
firebase deploy --only firestore:rules
```

### 5. Run the development server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Starts the Vite development server on port 3000 |
| `npm run build` | Builds the app for production |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Type-checks the project with `tsc --noEmit` |
| `npm run clean` | Removes the `dist` build folder and generated server file |

---

## Roadmap / Known Limitations

- [ ] Lock down Firestore security rules with proper authentication and role-based access control
- [ ] Add user authentication (Firebase Auth) for supervisors/admins
- [ ] Expand AI-assisted features (attendance/payroll summaries, anomaly detection)
- [ ] Add automated tests
- [ ] Deployment guide (Firebase Hosting / Vercel)

Contributions and suggestions toward any of the above are welcome.

---

## Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the [MIT License](LICENSE) — feel free to use, modify, and build on it.

---

## Author

**Ragav K**
[GitHub @Ragav-K](https://github.com/Ragav-K)