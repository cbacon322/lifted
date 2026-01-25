import { z } from 'zod';

// Set represents a single set within an exercise
export interface Set {
  id: string;
  setNumber: number;
  // Target values from template
  targetReps?: number;
  targetWeight?: number;
  targetTime?: number; // for timed exercises (seconds)
  targetDistance?: number; // for distance-based exercises (meters)
  // Actual values filled during workout
  actualReps?: number;
  actualWeight?: number;
  actualTime?: number;
  actualDistance?: number;
  // Status
  completed: boolean;
  skipped: boolean; // true if no values entered
}

// Zod schema for JSON import validation
// Flexible: allows reps, weight, time, distance in any combination (or empty for untracked exercises)
export const SetImportSchema = z.object({
  reps: z.number().positive().optional(),
  weight: z.number().nonnegative().optional(),
  time: z.number().positive().optional(), // seconds
  distance: z.number().positive().optional(), // meters
});

export type SetImport = z.infer<typeof SetImportSchema>;

// Helper to create a new Set from import data
export function createSetFromImport(importData: SetImport, setNumber: number): Set {
  return {
    id: generateSetId(),
    setNumber,
    targetReps: importData.reps,
    targetWeight: importData.weight,
    targetTime: importData.time,
    targetDistance: importData.distance,
    completed: false,
    skipped: false,
  };
}

// Helper to create an empty set
export function createEmptySet(setNumber: number): Set {
  return {
    id: generateSetId(),
    setNumber,
    completed: false,
    skipped: false,
  };
}

// Generate unique ID for sets
function generateSetId(): string {
  return `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
