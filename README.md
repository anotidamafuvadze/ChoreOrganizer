# Chore, I’ll Do It!

Chore, I’ll Do It! is a collaborative web application that helps households assign, track, and complete chores fairly. Users can create or join a household, set chore preferences, receive automated weekly chore assignments, track completion over time, and view a leaderboard and fairness score.

This project was built as a full-stack group term project using a React + Vite frontend and an Express + Firebase backend, with an emphasis on usability, persistence, and fairness in chore assignment.

---

## Features

### User Onboarding & Accounts
- Create or join a household via invite code
- Multi-step onboarding flow (chores, preferences, mascot)
- Returning users skip onboarding automatically

### Authentication
- Email/password authentication
- Google OAuth via Firebase
- Persistent sessions using cookies

### Household & Chore Management
- View roommates and household details
- Stage pending chore templates and promote them into active chores
- Manual chore reassignment

### Automated Chore Assignment
- Simple round-robin assignment option
- Optimization-based assignment using a weighted matching approach
- Assignments account for user preferences, recent chore history, and fairness over time
- Small randomized weighting is used to avoid repetitive or deterministic weekly assignments

### Chore Lifecycle
- Toggle chore completion
- Transactional Firestore updates for consistency
- Weekly and monthly calendar views
- Visual indicators for overdue chores

### Fairness & Leaderboard
- Per-user point tracking
- Gini-coefficient–based fairness score to quantify equity across the household

---

## Tech Stack

### Frontend
- React 19 + Vite
- TypeScript / JavaScript
- Tailwind CSS
- Motion (animations)
- Radix UI primitives

### Backend
- Node.js + Express (TypeScript)
- Firebase Admin SDK (Firestore)
- dotenv for configuration

### Storage
- Firestore collections for users, households, chores, and assignments

### Development & Testing
- nodemon + ts-node
- Jest (backend, partial)

---

## Architecture Overview

### Frontend
- Single-page application
- `App.tsx` manages routing, session restoration, and screen orchestration
- Onboarding implemented as a modular, multi-step flow

### State Management
- Lightweight `UserContext` for session and household state
- `localStorage` used for convenience persistence

### Backend API
- Centralized route registration in `server.ts`
- Route groups include:
  - `/api/household/*` — household data, templates, assignments
  - `/api/chores/*` — chore lifecycle and calendar aggregation
  - `/api/user/*`, `/api/session` — authentication and session persistence

### Consistency & Persistence
- Firestore transactions ensure atomic updates when chores are completed or reassigned
- Chore assignments are generated server-side before being persisted to the database



