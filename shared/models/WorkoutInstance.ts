import { Exercise, cloneExercise } from './Exercise';
import { ExerciseGroup, cloneExerciseGroup } from './ExerciseGroup';
import { WorkoutTemplate, getAllExercisesFromTemplate } from './WorkoutTemplate';

export interface WorkoutInstance {
  id: string;
  templateId: string;
  templateName: string; // snapshot of template name at workout start
  startTime: Date;
  endTime?: Date;
  exercises?: Exercise[]; // Deprecated: kept for backward compatibility
  groups?: ExerciseGroup[]; // New: organized exercises into groups
  isActive: boolean;
  changesSummary?: WorkoutChanges;
  notes?: string;
  userId: string;
  archived?: boolean; // if true, hidden from history but kept in archive
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
  // If template has groups, clone them
  if (template.groups && template.groups.length > 0) {
    return {
      id: generateWorkoutId(),
      templateId: template.id,
      templateName: template.name,
      startTime: new Date(),
      groups: template.groups.map(cloneExerciseGroup),
      isActive: true,
      changesSummary: initializeChangeTracking(),
      userId,
    };
  }

  // Otherwise, use exercises (backward compatibility)
  const exercises = getAllExercisesFromTemplate(template);
  return {
    id: generateWorkoutId(),
    templateId: template.id,
    templateName: template.name,
    startTime: new Date(),
    exercises: exercises.map(cloneExercise),
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

// Helper to get all exercises from a workout instance (supports both old and new format)
export function getAllExercisesFromWorkout(workout: WorkoutInstance): Exercise[] {
  if (workout.groups && workout.groups.length > 0) {
    return workout.groups.flatMap(group => group.exercises);
  }
  return workout.exercises || [];
}

// Calculate total volume (weight * reps for all completed sets)
export function calculateTotalVolume(workout: WorkoutInstance): number {
  let totalVolume = 0;
  const exercises = getAllExercisesFromWorkout(workout);

  for (const exercise of exercises) {
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
  const exercises = getAllExercisesFromWorkout(workout);

  for (const exercise of exercises) {
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
