import { WorkoutInstance } from '../models/WorkoutInstance';
import { Exercise } from '../models/Exercise';
import { Set } from '../models/Set';

// Calculate total volume for a workout
export function calculateWorkoutVolume(workout: WorkoutInstance): number {
  let total = 0;

  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (set.completed && set.actualWeight && set.actualReps) {
        total += set.actualWeight * set.actualReps;
      }
    }
  }

  return total;
}

// Calculate total volume for an exercise
export function calculateExerciseVolume(exercise: Exercise): number {
  let total = 0;

  for (const set of exercise.sets) {
    if (set.completed && set.actualWeight && set.actualReps) {
      total += set.actualWeight * set.actualReps;
    }
  }

  return total;
}

// Calculate estimated 1RM using Epley formula
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;

  // Epley formula: 1RM = weight × (1 + reps/30)
  return Math.round(weight * (1 + reps / 30));
}

// Get best set from an exercise (highest 1RM)
export function getBestSet(exercise: Exercise): Set | null {
  let bestSet: Set | null = null;
  let bestOneRM = 0;

  for (const set of exercise.sets) {
    if (set.completed && set.actualWeight && set.actualReps) {
      const oneRM = calculateOneRepMax(set.actualWeight, set.actualReps);
      if (oneRM > bestOneRM) {
        bestOneRM = oneRM;
        bestSet = set;
      }
    }
  }

  return bestSet;
}

// Calculate workout completion percentage
export function calculateCompletionPercentage(workout: WorkoutInstance): number {
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  if (totalSets === 0) return 0;

  const completedSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
    0
  );

  return Math.round((completedSets / totalSets) * 100);
}

// Calculate total sets completed
export function countCompletedSets(workout: WorkoutInstance): number {
  return workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
    0
  );
}

// Calculate total exercises completed (at least one set done)
export function countCompletedExercises(workout: WorkoutInstance): number {
  return workout.exercises.filter(
    ex => ex.sets.some(s => s.completed)
  ).length;
}

// Calculate average weight per set for an exercise
export function calculateAverageWeight(exercise: Exercise): number {
  const completedSets = exercise.sets.filter(s => s.completed && s.actualWeight);
  if (completedSets.length === 0) return 0;

  const totalWeight = completedSets.reduce((sum, s) => sum + (s.actualWeight || 0), 0);
  return Math.round(totalWeight / completedSets.length);
}

// Calculate average reps per set for an exercise
export function calculateAverageReps(exercise: Exercise): number {
  const completedSets = exercise.sets.filter(s => s.completed && s.actualReps);
  if (completedSets.length === 0) return 0;

  const totalReps = completedSets.reduce((sum, s) => sum + (s.actualReps || 0), 0);
  return Math.round(totalReps / completedSets.length);
}

// Calculate progress percentage between two values
export function calculateProgress(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Calculate weekly volume from multiple workouts
export function calculateWeeklyVolume(workouts: WorkoutInstance[]): number {
  return workouts.reduce((sum, workout) => sum + calculateWorkoutVolume(workout), 0);
}

// Get personal record for an exercise from workout history
export interface PersonalRecord {
  weight: number;
  reps: number;
  oneRM: number;
  date: Date;
  workoutId: string;
}

export function getPersonalRecord(
  exerciseName: string,
  workouts: WorkoutInstance[]
): PersonalRecord | null {
  let bestRecord: PersonalRecord | null = null;
  let bestOneRM = 0;

  for (const workout of workouts) {
    const exercise = workout.exercises.find(
      e => e.name.toLowerCase() === exerciseName.toLowerCase()
    );

    if (!exercise) continue;

    for (const set of exercise.sets) {
      if (set.completed && set.actualWeight && set.actualReps) {
        const oneRM = calculateOneRepMax(set.actualWeight, set.actualReps);
        if (oneRM > bestOneRM) {
          bestOneRM = oneRM;
          bestRecord = {
            weight: set.actualWeight,
            reps: set.actualReps,
            oneRM,
            date: workout.startTime,
            workoutId: workout.id,
          };
        }
      }
    }
  }

  return bestRecord;
}
