# Lifted - Technical Plan

## Project Overview

**Lifted** is a cross-platform workout tracking application similar to Strong app, with a key differentiator: easy JSON import/export of workout templates. Desktop-first development with mobile (iPhone) as primary usage platform.

### Key Features
- Intuitive workout planning and execution (Workout → Exercise → Set → Rep hierarchy)
- JSON template import/export on desktop
- Real-time cloud sync via Firebase
- Historical workout data with "Previous" column during workouts
- Smart template update system after workout completion
- Rest timer functionality

---

## Tech Stack

### Mobile (Primary Platform - Workout Execution)
- **Framework**: React Native with Expo (managed workflow)
- **Target**: iPhone (iOS primary, iOS-first design approach)
- **UI Library**: React Native Paper (themed for iOS feel)
- **Local Storage**: AsyncStorage
- **Language**: TypeScript
- **Purpose**: Active workout tracking, execution, and on-the-go template management

### Desktop (Companion Platform - Data Management & Analysis)
- **Framework**: Electron with React (pure web, NO React Native Web)
- **UI Library**: Material-UI or Tailwind CSS (web-native)
- **Language**: TypeScript
- **Platform**: Windows (development environment)
- **Purpose**: Data import/export, analytics, workout planning, schedule creation

**Key Architecture Decision:** Mobile and desktop serve different purposes and use different UI libraries. Mobile is for gym use (workout execution), desktop is for home use (planning and analysis). They share all business logic and data through Firebase but have independent UI implementations.

### Shared Layer (Business Logic & Data)
- **Backend**: Firebase (free tier)
  - Firestore for database
  - Firebase Realtime Database for instant sync
  - Firebase Auth (for future multi-user support)
- **Shared Code**: 
  - TypeScript interfaces and data models
  - Firebase services (sync, queries, mutations)
  - Business logic (change tracking, validation, etc.)
  - Utilities and helpers
- **Sync Strategy**: Real-time bidirectional sync between mobile and desktop
- **Offline Support**: Local-first with queue-based sync

### Development Environment
- **OS**: Windows
- **IDE**: VS Code
- **Node Setup**: Dependencies installed in virtual environment (node_modules per project)
- **Version Control**: Git
- **CLI Tool**: Claude Code CLI extension in VS Code

---

## Data Models

### Workout Template
```typescript
interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  createdAt: timestamp;
  lastUsed?: timestamp;
  tags?: string[];
  userId: string; // for future multi-user support
}
```

### Exercise
```typescript
interface Exercise {
  id: string;
  name: string;
  exerciseType: "strength" | "cardio" | "bodyweight" | "timed";
  sets: Set[];
  notes?: string;
  restTimer?: number; // seconds between sets
  supersetWith?: string; // id of another exercise for future
  order: number; // position in workout
}
```

### Set
```typescript
interface Set {
  id: string;
  setNumber: number;
  targetReps?: number;
  targetWeight?: number;
  targetTime?: number; // for timed exercises
  actualReps?: number; // filled during workout
  actualWeight?: number;
  actualTime?: number;
  completed: boolean;
  skipped: boolean; // true if no values entered
}
```

### Workout Instance (Active/Historical Workout)
```typescript
interface WorkoutInstance {
  id: string;
  templateId: string; // reference to source template
  templateName: string; // snapshot of name
  startTime: timestamp;
  endTime?: timestamp;
  exercises: Exercise[]; // deep copy from template
  isActive: boolean;
  changesSummary?: WorkoutChanges; // tracked during workout
}
```

### Workout Changes Tracking
```typescript
interface WorkoutChanges {
  modifiedExercises: {
    exerciseId: string;
    exerciseName: string;
    changeType: "values" | "structure" | "both";
    details: {
      setsAdded?: number;
      setsRemoved?: number;
      valuesChanged?: boolean;
    };
  }[];
  deletedExercises: {
    exerciseId: string;
    exerciseName: string;
    originalSets: Set[];
  }[];
  skippedExercises: {
    exerciseId: string;
    exerciseName: string;
  }[];
  addedExercises: {
    exerciseId: string;
    exerciseName: string;
  }[];
}
```

### Previous Workout Data (for "Previous" column)
```typescript
interface PreviousWorkoutData {
  exerciseId: string;
  exerciseName: string;
  lastPerformed: timestamp;
  sets: {
    setNumber: number;
    weight?: number;
    reps?: number;
    time?: number;
  }[];
}
```

---

## JSON Import/Export Format

### Import Format (Simple & Flexible)
```json
{
  "workouts": [
    {
      "name": "Push Day A",
      "description": "Chest, shoulders, triceps focus",
      "exercises": [
        {
          "name": "Bench Press",
          "type": "strength",
          "sets": [
            {"reps": 5, "weight": 185},
            {"reps": 5, "weight": 185},
            {"reps": 5, "weight": 185}
          ],
          "rest": 180,
          "notes": "Barbell, competition grip"
        },
        {
          "name": "Overhead Press",
          "type": "strength",
          "sets": [
            {"reps": 8, "weight": 95},
            {"reps": 8, "weight": 95},
            {"reps": 8, "weight": 95}
          ],
          "rest": 120
        },
        {
          "name": "Incline Dumbbell Press",
          "type": "strength",
          "sets": [
            {"reps": 10, "weight": 60},
            {"reps": 10, "weight": 60},
            {"reps": 10, "weight": 60}
          ]
        }
      ],
      "tags": ["push", "strength", "upper"]
    }
  ]
}
```

### Export Format
Same as import, includes all template data for easy backup/sharing.

---

## Core Features & User Flows

### 1. Desktop: Template Import/Export

**Purpose:** Bulk data management - easier to work with JSON on desktop than mobile

**User Actions:**
1. Click "Import Templates" button
2. Either:
   - Drag and drop JSON file
   - Paste JSON into textarea
3. App validates JSON format
4. Preview templates before confirming
5. Confirm import

**Export:**
1. Select template(s) from list
2. Click "Export" button
3. Generate JSON file
4. Save to disk

**Technical Implementation:**
- JSON schema validation using Zod or similar
- Error handling with clear messages
- Duplicate detection (by template name)
- Option to overwrite or skip duplicates
- Bulk import support (multiple workouts in one JSON)

**Validation Rules:**
- Required fields: workout name, at least 1 exercise
- Exercise must have: name, at least 1 set
- Set must have: either (reps + weight) or (time)
- Weight/reps must be positive numbers

### 2. Desktop: Analytics & Statistics Dashboard

**Purpose:** Visualize progress and analyze workout data

**Features:**
- **Workout History Timeline**
  - Calendar view of all workouts
  - Filter by date range, template, exercise
  - Click to see workout details
  
- **Progress Charts**
  - Exercise progress over time (weight x reps)
  - Volume tracking (total weight lifted per workout/week/month)
  - Frequency analysis (workouts per week)
  - Personal records timeline
  
- **Exercise Analytics**
  - Most frequently performed exercises
  - Average volume per exercise
  - Strength progression curves
  - One-rep max estimates (calculated)
  
- **Template Analytics**
  - Most used templates
  - Template completion rates
  - Average workout duration per template

**Visualizations:**
- Line charts for progression
- Bar charts for volume comparison
- Calendar heatmap for frequency
- Tables for detailed breakdowns

### 3. Desktop: Workout Schedule Planning

**Purpose:** Plan out training programs and cycles

**Features:**
- **Weekly Schedule Builder**
  - Drag and drop templates to days of week
  - Repeat patterns (e.g., PPL, Upper/Lower)
  - Rest day planning
  
- **Program Creation**
  - Multi-week programs (mesocycles)
  - Progression schemes (linear, wave, block periodization)
  - Deload weeks
  - Volume progression tracking
  
- **Schedule Export**
  - Export planned schedules to JSON
  - Share programs with mobile app
  - Print-friendly views

### 4. Desktop: Template Management

**Features:**
- List view of all templates
- Search/filter by name or tags
- Preview template details
- Edit template metadata (name, description, tags)
- Delete templates (with confirmation)
- Duplicate templates for variations
- Template comparison (side-by-side view)
- Manual sync trigger (if needed)

### 4. Mobile: Start Workout from Template

**User Actions:**
1. Browse template list
2. Tap template to start
3. Workout instance created (deep copy of template)
4. Load previous workout data for each exercise

**Technical Implementation:**
```typescript
// Create workout instance
const instance = {
  ...template,
  id: generateId(),
  templateId: template.id,
  isActive: true,
  startTime: now(),
  changesSummary: initializeChangeTracking()
};

// Load previous data for each exercise
const previousData = await loadPreviousWorkoutData(template.exercises);
```

### 5. Mobile: Active Workout Screen

**Layout (per exercise card):**
```
╔═══════════════════════════════════════════════════╗
║ Exercise Name                              [🗑️]   ║
╠═══════════════════════════════════════════════════╣
║ Set  Previous      kg    Reps    ✓               ║
║                                                    ║
║  1   185 kg × 5    185    5      ✓               ║
║  2   185 kg × 5    185    5      ✓               ║
║  3   185 kg × 5    [  ]  [  ]    ⭕              ║
║                                                    ║
║            + Add Set                              ║
╚═══════════════════════════════════════════════════╝
```

**Interactions:**
- **Tap set row**: Edit weight/reps
- **Tap checkmark**: Mark set complete (shows rest timer if configured)
- **Tap "Previous" value**: Auto-fill current set with previous values
- **Swipe left on exercise card**: Reveal delete button
- **Tap delete (🗑️)**: Confirm deletion → track as "deleted" in changes
- **Tap "+ Add Set"**: Add new set to exercise
- **Long press exercise**: Reorder exercises (future feature)

**Previous Column Logic:**
- Query last completed workout containing this exercise
- Display: `weight kg × reps` or `time` format
- If no previous data: show "—"
- Previous data refreshed each time workout is started

**Rest Timer:**
- Auto-starts when set marked complete (if rest time configured)
- Countdown notification/overlay
- Can skip or extend timer
- Sound/vibration on completion

**Change Tracking:**
During workout, app tracks:
- Sets added beyond template
- Sets with different values than template
- Exercises deleted (swiped)
- Exercises skipped (no values entered)

### 6. Mobile: Finish Workout Flow

**Step 1: Check for Empty Sets**
```
If any sets have no values entered:

┌─────────────────────────────────────────────────┐
│  You have exercises with no values:             │
│  • Lateral Raises (3 sets)                      │
│  • Cable Flyes (2 sets)                         │
│                                                  │
│  Would you like to:                             │
│  ┌───────────────────────────────────────────┐ │
│  │ Skip These Exercises                      │ │
│  │ (They'll stay in template)                │ │
│  └───────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────┐ │
│  │ Go Back and Complete Them                 │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Step 2: Template Update Comparison Screen**

**Header:**
```
┌─────────────────────────────────────────────────┐
│  Workout Complete! 🎉                           │
│  Compare with Template: "Push Day A"            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ CHANGES DETECTED                                 │
│ ● 2 exercises modified                           │
│ ● 1 exercise skipped                             │
│ ● 1 exercise deleted                             │
│ ● 1 set added                                    │
└─────────────────────────────────────────────────┘
```

**Exercise Comparison Cards (Collapsible):**

```
╔═══════════════════════════════════════════════════╗
║ ▼ Bench Press                      MODIFIED 📈    ║
╠═══════════════════════════════════════════════════╣
║  TEMPLATE          →    TODAY'S WORKOUT            ║
║  Set 1: 185 kg × 5    →    185 kg × 5  ✓          ║
║  Set 2: 185 kg × 5    →    185 kg × 5  ✓          ║
║  Set 3: 185 kg × 5    →    195 kg × 6  📈         ║
║                        →    195 kg × 5  ➕         ║
╚═══════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════╗
║ ▶ Overhead Press                   MODIFIED 📈    ║
╚═══════════════════════════════════════════════════╝
    (Collapsed - tap to expand)

╔═══════════════════════════════════════════════════╗
║ ▶ Incline DB Press                 NO CHANGES ✓   ║
╚═══════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════╗
║ ▶ Lateral Raises                   SKIPPED ⏭️     ║
╚═══════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════╗
║ ▼ Tricep Pushdowns                 DELETED 🗑️     ║
╠═══════════════════════════════════════════════════╣
║  TEMPLATE          →    TODAY'S WORKOUT            ║
║  Set 1: 50 kg × 12    →    ❌ DELETED             ║
║  Set 2: 50 kg × 12    →    ❌ DELETED             ║
║  Set 3: 50 kg × 12    →    ❌ DELETED             ║
╚═══════════════════════════════════════════════════╝
```

**Visual Indicators:**
- ✓ = No change
- 📈 = Increased (weight or reps)
- 📉 = Decreased
- ➕ = Added (new set)
- ❌ = Deleted/Removed
- ⏭️ = Skipped (no values entered)

**Color Coding:**
- Green: Increases, completed sets
- Red: Removals, deletions
- Blue: Additions
- Gray: No changes, skipped
- Yellow/Orange: Decreases (for awareness)

**Collapsible Behavior:**
- **Expanded by default**: MODIFIED, DELETED exercises
- **Collapsed by default**: NO CHANGES, SKIPPED exercises
- Tap header to expand/collapse
- Badge shows change type

**Update Options:**

```
┌─────────────────────────────────────────────────┐
│  How would you like to update your template?     │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐│
│  │ 📊 Update Values Only                       ││
│  │ • Bench Press: +1 set, increased weights    ││
│  │ • Overhead Press: increased weights         ││
│  │ • Keeps: Lateral Raises, Tricep Pushdowns   ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ 🔄 Update Template and Values               ││
│  │ • Updates all values                         ││
│  │ • Adds 1 set to Bench Press                 ││
│  │ • Removes Tricep Pushdowns from template    ││
│  │ • Keeps: Lateral Raises (skipped exercises  ││
│  │   stay in template)                          ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ 💾 Save as New Template                     ││
│  │ Creates "Push Day A (Jan 19)" with today's  ││
│  │ workout, keeps original unchanged            ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ ⏭️  Keep Original Template                  ││
│  │ Discards all changes, template stays same   ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**Option Behaviors:**

1. **Update Values Only:**
   - Updates weight/reps on sets that existed in template
   - Ignores: added sets, removed sets, deleted exercises, skipped exercises
   - Template structure unchanged

2. **Update Template and Values:**
   - Updates all weight/reps values
   - Adds new sets to exercises
   - Removes deleted exercises from template
   - Keeps skipped exercises in template (unchanged)
   
3. **Save as New Template:**
   - Creates new template from workout instance
   - Auto-names: `{originalName} (Jan 19)` or prompts for name
   - Original template unchanged

4. **Keep Original Template:**
   - No changes to template
   - Workout saved to history only

**After Selection:**
```
┌─────────────────────────────────────────────────┐
│  ✅ Template Updated Successfully!              │
│                                                  │
│  [View Workout Summary]  [Start New Workout]    │
└─────────────────────────────────────────────────┘
```

### 7. Workout History

**Features:**
- Calendar view of completed workouts
- List view with filters (by template, date range, exercise)
- Tap workout to view details
- Compare workouts side-by-side
- Charts/graphs (future phase)

### 8. Mobile: JSON Import/Export (On-the-Go)

**Purpose:** Import/export templates on mobile when needed (e.g., sharing with friends, backup)

**Import:**
- Share JSON file to app (iOS share sheet)
- Paste JSON into textarea
- Validates and previews before import

**Export:**
- Select templates to export
- Generate JSON
- Share via iOS share sheet (AirDrop, Messages, Email, Files)
- Copy to clipboard option

**Note:** Desktop is preferred for bulk import/export, but mobile has capability for convenience.

---

## Firebase Schema

### Collections Structure

```
users/
  {userId}/
    profile/
      name: string
      email: string
      createdAt: timestamp
    
    templates/
      {templateId}/
        name: string
        description: string
        exercises: Exercise[]
        createdAt: timestamp
        lastUsed: timestamp
        tags: string[]
    
    workouts/
      {workoutId}/
        templateId: string
        templateName: string
        startTime: timestamp
        endTime: timestamp
        duration: number  # calculated
        exercises: Exercise[] (snapshot)
        changesSummary: WorkoutChanges
        totalVolume: number  # calculated for analytics
    
    schedules/ (future - for workout planning)
      {scheduleId}/
        name: string
        weeks: Week[]
        startDate: timestamp
        active: boolean
    
    exercises/ (global exercise database - future)
      {exerciseId}/
        name: string
        category: string
        muscleGroups: string[]
        instructions: string
```

### Sync Strategy

**Real-time Sync:**
- Templates sync instantly between desktop and mobile
- Active workout is local-only until finished
- Completed workouts sync immediately
- Desktop queries all workouts for analytics

**Conflict Resolution:**
- Last-write-wins for templates (with timestamp)
- Desktop writes take precedence for imports
- Mobile writes take precedence for workout data

**Offline Support:**
- Queue all changes locally
- Sync when connection restored
- Show sync status indicator

**Analytics Queries (Desktop):**
Desktop will run aggregation queries on workout data:
- Total volume per workout
- Exercise frequency
- Personal records
- Progress over time
These are computed client-side from workout data, not stored separately.

---

## Development Phases

### Phase 1: MVP Foundation (Weeks 1-2)

**Setup:**
- [x] Initialize Expo project with TypeScript (mobile)
- [x] Set up Electron + React desktop app (web-native, no RN Web)
- [x] Configure Firebase project
- [x] Set up Git repository
- [x] Install dependencies in virtual environment (node_modules per project)
- [x] Create shared folder for common code

**Core Data Layer (Shared):**
- [ ] Implement data models (TypeScript interfaces in /shared)
- [ ] Set up Firebase integration (shared service)
- [ ] Create sync service (basic)
- [ ] Implement offline queue

**Mobile - Basic Functionality:**
- [ ] Template list screen
- [ ] Template detail view
- [ ] Start workout from template
- [ ] Active workout screen (basic layout)
- [ ] Set completion tracking
- [ ] Finish workout (save to history)

**Desktop - Data Management:**
- [ ] Template list/management screen
- [ ] JSON import (drag-and-drop + paste)
- [ ] JSON validation and preview
- [ ] Template export to JSON
- [ ] Save imported templates to Firebase

### Phase 2: Core Features (Weeks 3-4)

**Mobile - Enhanced Workout:**
- [ ] "Previous" column implementation
  - Query last workout with exercise
  - Display in workout screen
  - Auto-fill on tap
- [ ] Add/remove sets during workout
- [ ] Exercise deletion (swipe + track)
- [ ] Manual exercise addition during workout
- [ ] Change tracking system
- [ ] Empty set detection on finish

**Mobile - Template Update Flow:**
- [ ] Comparison screen layout
- [ ] Collapsible exercise cards
- [ ] Visual indicators (✓, 📈, 📉, ➕, ❌, ⏭️)
- [ ] Change summary header
- [ ] Four update options logic
- [ ] Template update execution
- [ ] Sync updated templates to Firebase

**Mobile - JSON Import/Export:**
- [ ] Share sheet integration for import
- [ ] Paste JSON option
- [ ] Export via share sheet
- [ ] Copy to clipboard option

**Rest Timer:**
- [ ] Timer configuration per exercise
- [ ] Auto-start on set completion
- [ ] Countdown UI overlay
- [ ] Skip/extend options
- [ ] Sound/vibration alerts
- [ ] Background timer support

**Desktop - Analytics (Basic):**
- [ ] Workout history list
- [ ] Basic statistics dashboard
- [ ] Exercise frequency charts
- [ ] Volume tracking (simple)

### Phase 3: Analytics & Planning (Weeks 5-6)

**Desktop - Advanced Analytics:**
- [ ] Progress charts (line graphs for exercise progression)
- [ ] Volume analysis (weekly/monthly breakdowns)
- [ ] Personal records tracking
- [ ] Calendar heatmap visualization
- [ ] Exercise comparison tools
- [ ] Template usage analytics

**Desktop - Workout Planning:**
- [ ] Weekly schedule builder
- [ ] Drag-and-drop template assignment
- [ ] Program creation (multi-week plans)
- [ ] Schedule export/import
- [ ] Progression scheme templates

**Sync Improvements:**
- [ ] Real-time template sync (desktop ↔ mobile)
- [ ] Conflict resolution logic
- [ ] Sync status indicators
- [ ] Offline queue management
- [ ] Retry logic for failed syncs

**UI/UX Polish:**
- [ ] Loading states
- [ ] Error handling & user feedback
- [ ] Empty states (no templates, no history)
- [ ] Settings screen (both platforms)
- [ ] Dark mode support

### Phase 4: Advanced Features (Future)

**Mobile:**
- [ ] Exercise progress charts (mobile view)
- [ ] Basic statistics on mobile
- [ ] Workout sharing
- [ ] Custom exercise creation in-app

**Desktop:**
- [ ] Advanced program builder
- [ ] Deload week automation
- [ ] Exercise database builder
- [ ] Export reports (PDF, CSV)
- [ ] Comparison tools (compare multiple workouts)

**Exercise Database:**
- [ ] Text instructions for proper form
- [ ] Custom exercise creation
- [ ] Muscle group tagging
- [ ] Exercise categories

**Both Platforms:**
- [ ] Multi-user support with authentication
- [ ] Social features (optional, future consideration)

---

## Project Structure

```
lifted/
├── mobile/                      # React Native + Expo
│   ├── src/
│   │   ├── components/          # Reusable UI components (RN Paper)
│   │   │   ├── ExerciseCard.tsx
│   │   │   ├── SetRow.tsx
│   │   │   ├── RestTimer.tsx
│   │   │   └── ...
│   │   ├── screens/             # Screen components
│   │   │   ├── TemplateListScreen.tsx
│   │   │   ├── ActiveWorkoutScreen.tsx
│   │   │   ├── ComparisonScreen.tsx
│   │   │   ├── WorkoutHistoryScreen.tsx
│   │   │   └── ...
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useWorkout.ts
│   │   │   ├── useTemplates.ts
│   │   │   └── ...
│   │   ├── navigation/          # React Navigation
│   │   │   └── AppNavigator.tsx
│   │   ├── theme/               # iOS-themed Paper config
│   │   │   └── theme.ts
│   │   └── App.tsx              # Entry point
│   ├── node_modules/            # Mobile dependencies (virtual env)
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── desktop/                     # Electron + React (web-native)
│   ├── src/
│   │   ├── components/          # Web UI components (Material-UI/Tailwind)
│   │   │   ├── TemplateList.tsx
│   │   │   ├── ImportDialog.tsx
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   ├── ChartComponents/
│   │   │   └── ...
│   │   ├── screens/
│   │   │   ├── MainScreen.tsx
│   │   │   ├── TemplateManagerScreen.tsx
│   │   │   ├── AnalyticsScreen.tsx
│   │   │   ├── PlanningScreen.tsx
│   │   │   └── ...
│   │   ├── utils/
│   │   │   ├── jsonValidator.ts
│   │   │   ├── fileHandler.ts
│   │   │   └── chartHelpers.ts
│   │   ├── electron/            # Electron-specific
│   │   │   ├── main.ts          # Electron main process
│   │   │   └── preload.ts       # Preload script
│   │   └── App.tsx
│   ├── node_modules/            # Desktop dependencies (virtual env)
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                      # Shared code between platforms
│   ├── models/                  # TypeScript interfaces
│   │   ├── WorkoutTemplate.ts
│   │   ├── Exercise.ts
│   │   ├── Set.ts
│   │   ├── WorkoutInstance.ts
│   │   └── ...
│   ├── services/                # Business logic
│   │   ├── firebase/
│   │   │   ├── firebaseConfig.ts
│   │   │   ├── firestoreService.ts
│   │   │   └── authService.ts
│   │   ├── syncService.ts
│   │   ├── changeTracker.ts
│   │   ├── previousWorkoutService.ts
│   │   └── ...
│   ├── utils/                   # Helper functions
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   ├── calculations.ts
│   │   └── ...
│   └── types/                   # Shared TypeScript types
│
├── docs/                        # Documentation
│   ├── lifted-technical-plan.md
│   └── claude.md
│
├── .gitignore
├── README.md
└── package.json                 # Root package.json (optional monorepo setup)
```

---

## Getting Started Commands

### Initial Setup
```bash
# Create project directory
mkdir lifted
cd lifted

# Initialize Git
git init

# Create folder structure
mkdir mobile desktop shared docs

# Initialize mobile app (React Native + Expo)
cd mobile
npx create-expo-app . --template expo-template-blank-typescript

# Install mobile dependencies (creates virtual env in mobile/node_modules)
npm install react-native-paper react-native-vector-icons
npm install react-native-safe-area-context
npm install firebase
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-gesture-handler
npm install @react-native-async-storage/async-storage
npm install --save-dev @types/react @types/react-native

# Initialize desktop app (Electron + React)
cd ../desktop
npm init -y

# Install desktop dependencies (creates virtual env in desktop/node_modules)
npm install electron electron-builder
npm install react react-dom
npm install @mui/material @emotion/react @emotion/styled
# OR: npm install tailwindcss (if using Tailwind instead of MUI)
npm install firebase
npm install recharts  # For charts/analytics
npm install --save-dev @types/react @types/react-dom
npm install --save-dev typescript webpack webpack-cli webpack-dev-server
npm install --save-dev html-webpack-plugin ts-loader

# Set up shared folder
cd ../shared
npm init -y
npm install --save-dev typescript

# Initial commit
cd ..
git add .
git commit -m "Initial project structure with mobile, desktop, and shared folders"
```

### Running the Apps

**Mobile (Expo):**
```bash
cd mobile
npm start
# Scan QR code with Expo Go app on iPhone
```

**Desktop (Electron):**
```bash
cd desktop
npm run dev
```

### Firebase Configuration

The Firebase configuration is stored in `shared/services/firebase/firebaseConfig.ts`:

```typescript
// shared/services/firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCRLOMVGF7BU2ghpXJNTIZ7pLSrGaU31lk",
  authDomain: "lifted-app-firebase.firebaseapp.com",
  projectId: "lifted-app-firebase",
  storageBucket: "lifted-app-firebase.firebasestorage.app",
  messagingSenderId: "312913033625",
  appId: "1:312913033625:web:921b39aa8466f256577b08",
  measurementId: "G-W9WRS7N8PD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
```

**Security Note:** For production, move these values to environment variables. For development, this is fine.

### iOS Theme Configuration for React Native Paper
```typescript
// mobile/src/theme/theme.ts
import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007AFF', // iOS blue
    secondary: '#5856D6', // iOS purple
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
  },
};
```

---

## Testing Strategy

### Unit Tests
- Data model validation
- JSON import/export logic
- Change tracking algorithms
- Previous workout queries

### Integration Tests
- Firebase sync operations
- Template CRUD operations
- Workout flow (start → complete → save)
- Offline queue processing

### Manual Testing Checklist
- [ ] Import JSON templates (desktop)
- [ ] Export templates (desktop)
- [ ] Sync between desktop and mobile
- [ ] Start workout from template
- [ ] Complete sets and see "Previous" data
- [ ] Add/remove sets during workout
- [ ] Delete exercise during workout
- [ ] Skip exercises (leave empty)
- [ ] Complete workout and see comparison
- [ ] Try all 4 update options
- [ ] Verify template updated correctly
- [ ] Check workout history
- [ ] Test offline mode
- [ ] Test rest timer

---

## Security Considerations

### Firebase Security Rules (Initial)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Data Validation
- Validate all JSON imports before processing
- Sanitize user inputs
- Enforce data type constraints
- Limit array sizes (max sets, exercises)

### Authentication (Future)
- Email/password for MVP
- Google Sign-In option
- Biometric auth on mobile
- Secure token storage

---

## Performance Optimization

### Mobile
- Lazy load workout history
- Virtualized lists for long workout histories
- Debounce sync operations
- Cache previous workout data
- Optimize re-renders with React.memo

### Desktop
- Pagination for large template lists
- Stream large JSON files
- Background sync
- Efficient JSON parsing

### Firebase
- Index frequently queried fields
- Use subcollections for large datasets
- Batch writes where possible
- Implement pagination for history

---

## Known Limitations & Trade-offs

1. **No custom template builder on desktop (MVP)**
   - Reason: Keep MVP focused, JSON is powerful and flexible
   - Future: Add visual builder

2. **Single user focus initially**
   - Reason: Simplify auth and sync logic
   - Future: Multi-user with proper auth

3. **Basic exercise database**
   - Reason: User provides their own exercises via JSON
   - Future: Build comprehensive exercise library

4. **Limited analytics in MVP**
   - Reason: Focus on core workout flow first
   - Future: Rich analytics and progress tracking

5. **No workout plans/programs**
   - Reason: Complexity, focus on single workout execution
   - Future: Multi-week programs

---

## Success Metrics

### MVP Goals
- [ ] Successfully import/export JSON templates
- [ ] Complete a workout with all features working
- [ ] Template updates working as designed
- [ ] Sync working between desktop and mobile
- [ ] Previous workout data displaying correctly
- [ ] Rest timer functional
- [ ] No data loss during sync
- [ ] App feels responsive and intuitive

### User Experience Goals
- Start workout in < 3 taps
- Complete a set in < 2 taps
- Finish workout in < 5 taps
- Template comparison clear and understandable
- Previous data immediately visible
- Minimal friction in workflow

---

**END OF TECHNICAL PLAN**

This document should be updated as the project evolves and serves as the source of truth for project requirements and architecture.
