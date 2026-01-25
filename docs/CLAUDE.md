# Lifted - Development Documentation

> **Last Updated:** January 24, 2026
> **Current Phase:** Phase 1 - MVP Foundation
> **Status:** Initial implementation complete - ready for testing

---

## Quick Reference

**User Requirements:** See `lifted-technical-plan.md` for all feature requirements and UX flows. IMPORTANT: If the plan has an item that is not optimized or doesn't make sense or could be done better, ask the user if the document can be edited to better the app. This includes but is not limited to changing programming languages, data structures... really anything about the app if it can be done a better way. The main goal is user functionality, not a specific code structure. If this is understood, respond one time: "I understand that I may edit the technical plan for optimizations and that I will first ask permission before doing so."

**Tech Stack:**
- Mobile: React Native + Expo + React Native Paper (iOS-themed)
- Desktop: Electron + React + Material-UI + Vite
- Shared: TypeScript models, Firebase services, business logic
- Backend: Firebase (Firestore + Auth)

**Key Architecture:**
- Mobile and desktop serve different purposes
- Mobile = Workout execution at the gym
- Desktop = Data management, analytics, planning at home
- NO shared UI components (different libraries per platform)
- Shared business logic and data layer

**Project Structure:**
```
lifted/
├── mobile/          # React Native + Expo (workout execution)
├── desktop/         # Electron + React + Vite (analytics & planning)
├── shared/          # Data models, Firebase, business logic
│   ├── models/      # TypeScript interfaces (Set, Exercise, WorkoutTemplate, etc.)
│   ├── services/    # Firebase, change tracking, template updates
│   └── utils/       # Validators, formatters, calculations
└── docs/            # Technical plan and documentation
```

**Dependencies:**
- Each platform has its own `node_modules/` (virtual environment)
- Shared code imported via relative paths from `/shared`

---

## Firebase Configuration

**Project:** lifted-app-firebase

**Config** (stored in `shared/services/firebase/firebaseConfig.ts`):
```typescript
const firebaseConfig = {
  apiKey: "AIzaSyCRLOMVGF7BU2ghpXJNTIZ7pLSrGaU31lk",
  authDomain: "lifted-app-firebase.firebaseapp.com",
  projectId: "lifted-app-firebase",
  storageBucket: "lifted-app-firebase.firebasestorage.app",
  messagingSenderId: "312913033625",
  appId: "1:312913033625:web:921b39aa8466f256577b08",
  measurementId: "G-W9WRS7N8PD"
};
```

**Enabled Services:**
- ✅ Firestore Database (test mode for development)
- ✅ Authentication (Email/Password enabled)
- ⏳ Storage (for future file uploads)

---

## Architecture Decisions

### Platform Separation
**Decision:** Mobile and desktop use different UI libraries and serve different purposes
**Reasoning:**
- React Native Web compatibility issues in Electron
- Desktop excels at data management/analytics
- Mobile excels at workout execution
- Cleaner separation = less complexity
**Alternatives considered:** React Native Web (compatibility issues), Capacitor (less native feel)

### State Management
**Decision:** Firebase real-time subscriptions + local React state
**Reasoning:**
- Firebase provides real-time sync out of the box
- `subscribeToTemplates()` keeps data in sync across devices
- Local component state for UI interactions (forms, modals)
- No additional state library needed for MVP (simpler architecture)
**Alternatives considered:**
- Redux/Zustand: Adds complexity without significant benefit for our use case
- React Query: Good for REST APIs, but Firebase has built-in real-time

### Data Layer Architecture
**Decision:** Shared Firebase services in `/shared` folder
**Reasoning:**
- Both platforms need identical data access
- Single source of truth for business logic
- Easier to maintain and test
**Implementation:** Import shared services into both mobile and desktop

### Desktop UI Library
**Decision:** Material-UI (MUI)
**Reasoning:**
- Rich component library for productivity apps
- Good for dashboards and data management
- Consistent design system
- Well-documented with TypeScript support
**Alternatives considered:** Tailwind CSS (more flexible but requires more custom components)

### Desktop Build Tool
**Decision:** Vite (instead of Webpack)
**Reasoning:**
- Faster dev server startup and HMR
- Simpler configuration
- Native ES modules support
- Better TypeScript integration
**Alternatives considered:** Webpack (slower, more complex configuration)

### Component Organization
**Decision:** Screen-based organization with colocated components
**Reasoning:**
- Each screen has its own file
- Shared components in `/components` folder
- Clear separation between navigation and UI

---

## Current Implementation Status

### Phase 1: MVP Foundation

#### Setup ✅
- [x] Initialize Expo project (mobile)
- [x] Initialize Electron + React project (desktop)
- [x] Install dependencies (separate node_modules per platform)
- [x] Set up TypeScript configurations
- [x] Configure Firebase (already done - see config above)
- [x] Create shared folder structure
- [x] Set up Git repository

#### Shared Data Layer ✅
- [x] Define TypeScript interfaces/types in /shared
- [x] Create Firebase service (shared)
- [x] Implement basic sync service (real-time subscriptions)
- [ ] Create offline queue (future - not MVP critical)

#### Mobile - Basic Functionality ✅
- [x] Template list screen
- [x] Template detail view
- [x] Start workout flow
- [x] Active workout screen (basic)
- [x] Set completion tracking
- [x] Finish workout (basic save)

#### Desktop - Data Management ✅
- [x] Template list/management screen
- [x] JSON validation (with Zod)
- [x] Drag-and-drop file upload
- [x] Paste JSON textarea
- [x] Template preview
- [x] Save to Firebase
- [x] Export functionality

### Phase 2: Core Features

#### Mobile - Enhanced Workout ✅
- [x] "Previous" column implementation
- [x] Add/remove sets during workout
- [x] Exercise deletion (swipe + track)
- [ ] Manual exercise addition (partial - delete only)
- [x] Change tracking system
- [x] Empty set detection
- [x] Template update comparison screen
- [x] Four update options

#### Mobile - Rest Timer ⏳
- [x] Timer configuration per exercise
- [x] Auto-start on set completion
- [x] Countdown UI
- [x] Skip/extend options
- [ ] Sound/vibration
- [ ] Background timer

#### Desktop - Basic Analytics ⏳
- [ ] Workout history list
- [ ] Basic statistics dashboard
- [ ] Exercise frequency charts
- [ ] Volume tracking

### Phase 3: Analytics & Planning ⏳
(Not started)

---

## Technical Challenges & Solutions

### Challenge: Firebase Date Handling
**Problem:** Firestore stores dates as Timestamps, but JavaScript uses Date objects
**Solution:** Created helper functions `timestampToDate()` and `dateToFirestore()` in firestoreService.ts to handle conversion
**Alternatives:** Could use a date library like dayjs, but native Date works fine for our needs

### Challenge: Shared Code Between Platforms
**Problem:** Mobile (React Native) and desktop (React) use different bundlers
**Solution:** Use relative imports from shared folder (`../../../shared`). Both platforms can resolve TypeScript files directly.
**Alternatives:**
- npm workspaces/monorepo (more complex setup)
- Publish shared as npm package (overkill for single developer)

---

## Known Issues & TODOs

### Issues
- Node version warnings: React Native 0.81 recommends Node >= 20.19.4, current is 20.17.0. Should work but may have edge cases.

### TODOs
- [x] Initial project setup
- [x] Firebase configuration
- [x] Create shared data models
- [ ] Add sound/vibration to rest timer (mobile)
- [ ] Add background timer support (mobile)
- [ ] Implement workout history on desktop
- [ ] Add manual exercise addition during workout
- [ ] Test Firebase sync between platforms

---

## Code Patterns & Conventions

### File Naming
**Decision:** PascalCase for components, camelCase for utilities
- Components: `TemplateListScreen.tsx`, `ExerciseCard.tsx`
- Utilities: `formatters.ts`, `validators.ts`
- Models: `WorkoutTemplate.ts`, `Exercise.ts`

### Component Structure
**Decision:** Functional components with hooks
- Use React hooks for state management
- Export default for screens, named exports for utilities
- Styles at bottom of file (React Native) or inline with MUI sx prop (desktop)

### Type Definitions
**Decision:** Interfaces for data models, types for unions
- Data models use `interface` (Exercise, Set, WorkoutTemplate)
- Union types use `type` (ExerciseType, UpdateOption)
- Zod schemas for runtime validation (JSON import)

### Error Handling
**Decision:** try/catch with user-friendly alerts
- Firebase operations wrapped in try/catch
- Display errors via Alert (mobile) or Snackbar (desktop)
- Console.error for debugging

---

## Dependencies Added

| Package | Purpose | Added Date |
|---------|---------|------------|
| react-native-paper | iOS-themed UI components for mobile | Jan 24, 2026 |
| @react-navigation/native | Navigation for mobile app | Jan 24, 2026 |
| @react-navigation/native-stack | Stack navigator | Jan 24, 2026 |
| firebase | Backend services | Jan 24, 2026 |
| zod | JSON schema validation | Jan 24, 2026 |
| @mui/material | Desktop UI components | Jan 24, 2026 |
| vite | Fast build tool for desktop | Jan 24, 2026 |
| recharts | Charts for analytics (desktop) | Jan 24, 2026 |

---

## Running the Apps

### Mobile (Expo)
```bash
cd mobile
npm start
# Scan QR code with Expo Go app
```

### Desktop (Electron + Vite)
```bash
cd desktop
npm run dev          # Start Vite dev server only
npm run electron:dev # Start Vite + Electron together
```

---

## Performance Optimizations

- Firebase real-time subscriptions instead of polling
- Lazy loading of previous workout data (only when starting workout)
- Component-level state to minimize re-renders

---

## Testing Strategy

**Strategy:** Manual testing for MVP, automated tests for Phase 2
**Tools:** To be decided (Jest + React Testing Library likely)

---

## Deployment Notes

### Mobile (iOS)
- Use Expo EAS Build for production builds
- Requires Apple Developer account for App Store

### Desktop (Windows)
- Use electron-builder for packaging
- Run `npm run electron:build` to create installer
- Output in `/desktop/release/`

---

## Questions for User

- None yet

---

## Change Log

### January 24, 2026 - Initial Implementation
- Created complete project structure
- Implemented all shared data models (Set, Exercise, WorkoutTemplate, WorkoutInstance)
- Created Firebase services (Firestore CRUD, Auth, real-time subscriptions)
- Built mobile app with 4 screens (TemplateList, TemplateDetail, ActiveWorkout, WorkoutComparison)
- Built desktop app with template management (import/export JSON, delete, duplicate)
- Implemented change tracking and 4 template update options
- Added basic rest timer functionality
