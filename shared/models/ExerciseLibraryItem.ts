import { ExerciseType } from './Exercise';

// ExerciseLibraryItem represents an exercise in the user's exercise library
// This is separate from Exercise which is embedded in templates/workouts
export interface ExerciseLibraryItem {
  id: string;
  userId: string;
  name: string;
  exerciseType: ExerciseType;
  muscleGroups?: string[]; // e.g., ['chest', 'triceps']
  equipment?: string; // e.g., 'barbell', 'dumbbell', 'machine'
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to create a new exercise library item
export function createExerciseLibraryItem(
  userId: string,
  name: string,
  exerciseType: ExerciseType = 'strength',
  options?: {
    muscleGroups?: string[];
    equipment?: string;
    notes?: string;
  }
): ExerciseLibraryItem {
  const now = new Date();
  return {
    id: generateExerciseLibraryId(),
    userId,
    name,
    exerciseType,
    muscleGroups: options?.muscleGroups,
    equipment: options?.equipment,
    notes: options?.notes,
    createdAt: now,
    updatedAt: now,
  };
}

// Generate unique ID for exercise library items
function generateExerciseLibraryId(): string {
  return `exerciseLib_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
