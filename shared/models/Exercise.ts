import { z } from 'zod';
import { Set, SetImportSchema, createSetFromImport } from './Set';

export type ExerciseType = 'strength' | 'cardio' | 'bodyweight' | 'timed';

export interface Exercise {
  id: string;
  name: string;
  exerciseType: ExerciseType;
  sets: Set[];
  notes?: string;
  restTimer?: number; // seconds between sets
  supersetWith?: string; // id of another exercise (future feature)
  order: number; // position in workout
}

// Zod schema for JSON import validation
export const ExerciseImportSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  type: z.enum(['strength', 'cardio', 'bodyweight', 'timed']).default('strength'),
  sets: z.array(SetImportSchema).min(1, "Exercise must have at least 1 set"),
  rest: z.number().positive().optional(),
  notes: z.string().optional(),
});

export type ExerciseImport = z.infer<typeof ExerciseImportSchema>;

// Helper to create an Exercise from import data
export function createExerciseFromImport(importData: ExerciseImport, order: number): Exercise {
  return {
    id: generateExerciseId(),
    name: importData.name,
    exerciseType: importData.type,
    sets: importData.sets.map((setData, index) => createSetFromImport(setData, index + 1)),
    notes: importData.notes,
    restTimer: importData.rest,
    order,
  };
}

// Helper to create an empty exercise
export function createEmptyExercise(name: string, order: number): Exercise {
  return {
    id: generateExerciseId(),
    name,
    exerciseType: 'strength',
    sets: [],
    order,
  };
}

// Generate unique ID for exercises
function generateExerciseId(): string {
  return `exercise_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Deep clone an exercise (for workout instances)
export function cloneExercise(exercise: Exercise): Exercise {
  return {
    ...exercise,
    id: generateExerciseId(),
    sets: exercise.sets.map(set => ({
      ...set,
      id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      actualReps: undefined,
      actualWeight: undefined,
      actualTime: undefined,
      completed: false,
      skipped: false,
    })),
  };
}
