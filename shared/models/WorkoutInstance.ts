import { Exercise, cloneExercise } from './Exercise';
import { WorkoutTemplate } from './WorkoutTemplate';

export interface WorkoutInstance {
  id: string;
  templateId: string;
  templateName: string; // snapshot of template name at workout start
  startTime: Date;
  endTime?: Date;
  exercises: Exercise[]; // deep copy from template
  isActive: boolean;
  changesSummary?: WorkoutChanges;
  notes?: string;
  userId: string;
}

// Change types for tracking modifications
export type ChangeType = 'values' | 'structure' | 'both';

export interface ExerciseModification {
  exerciseId: string;
  exerciseName: string;
  changeType: ChangeType;
  details: {
    setsAdded?: number;
    setsRemoved?: number;
    valuesChanged?: boolean;
  };
}

export interface DeletedExercise {
  exerciseId: string;
  exerciseName: string;
  originalSets: { setNumber: number; targetReps?: number; targetWeight?: number; targetTime?: number }[];
}

export interface SkippedExercise {
  exerciseId: string;
  exerciseName: string;
}

export interface AddedExercise {
  exerciseId: string;
  exerciseName: string;
}

export interface WorkoutChanges {
  modifiedExercises: ExerciseModification[];
  deletedExercises: DeletedExercise[];
  skippedExercises: SkippedExercise[];
  addedExercises: AddedExercise[];
}

// Create a workout instance from a template
export function createWorkoutInstance(template: WorkoutTemplate, userId: string): WorkoutInstance {
  return {
    id: generateWorkoutId(),
    templateId: template.id,
    templateName: template.name,
    startTime: new Date(),
    exercises: template.exercises.map(cloneExercise),
    isActive: true,
    changesSummary: initializeChangeTracking(),
    userId,
  };
}

// Initialize empty change tracking
export function initializeChangeTracking(): WorkoutChanges {
  return {
    modifiedExercises: [],
    deletedExercises: [],
    skippedExercises: [],
    addedExercises: [],
  };
}

// Generate unique ID for workouts
function generateWorkoutId(): string {
  return `workout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Calculate workout duration in minutes
export function calculateDuration(workout: WorkoutInstance): number | undefined {
  if (!workout.endTime) return undefined;
  const durationMs = workout.endTime.getTime() - workout.startTime.getTime();
  return Math.round(durationMs / 60000);
}

// Calculate total volume (weight * reps for all completed sets)
export function calculateTotalVolume(workout: WorkoutInstance): number {
  let totalVolume = 0;

  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (set.completed && set.actualWeight && set.actualReps) {
        totalVolume += set.actualWeight * set.actualReps;
      }
    }
  }

  return totalVolume;
}

// Check if any exercises have empty sets (no values entered)
export function getEmptySetExercises(workout: WorkoutInstance): { exerciseName: string; emptySetCount: number }[] {
  const result: { exerciseName: string; emptySetCount: number }[] = [];

  for (const exercise of workout.exercises) {
    const emptySetCount = exercise.sets.filter(
      set => !set.completed && !set.skipped &&
             set.actualReps === undefined &&
             set.actualWeight === undefined &&
             set.actualTime === undefined
    ).length;

    if (emptySetCount > 0) {
      result.push({ exerciseName: exercise.name, emptySetCount });
    }
  }

  return result;
}
