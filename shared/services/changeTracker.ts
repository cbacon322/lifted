import {
  WorkoutInstance,
  WorkoutChanges,
  ExerciseModification,
  DeletedExercise,
  SkippedExercise,
  AddedExercise,
} from '../models/WorkoutInstance';
import { Exercise } from '../models/Exercise';
import { Set as WorkoutSet } from '../models/Set';
import { WorkoutTemplate } from '../models/WorkoutTemplate';

// Compare workout instance with original template to detect all changes
export function detectChanges(
  workout: WorkoutInstance,
  originalTemplate: WorkoutTemplate
): WorkoutChanges {
  const changes: WorkoutChanges = {
    modifiedExercises: [],
    deletedExercises: [],
    skippedExercises: [],
    addedExercises: [],
  };

  const originalExerciseMap = new Map(
    originalTemplate.exercises.map(e => [e.id, e])
  );

  const workoutExerciseIds = new Set(workout.exercises.map(e => e.id));

  // Check for added exercises (not in original template)
  // Note: We use a marker in the exercise ID or a separate tracking field
  // For now, we'll track exercises that don't exist in original by name matching
  const originalNames = new Set(
    originalTemplate.exercises.map(e => e.name.toLowerCase())
  );

  for (const exercise of workout.exercises) {
    if (!originalNames.has(exercise.name.toLowerCase())) {
      // This is a newly added exercise
      changes.addedExercises.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      });
      continue;
    }

    // Find matching original exercise
    const originalExercise = originalTemplate.exercises.find(
      e => e.name.toLowerCase() === exercise.name.toLowerCase()
    );

    if (!originalExercise) continue;

    // Check if exercise was skipped (no completed sets and no values entered)
    const hasAnyValues = exercise.sets.some(
      s => s.completed || s.actualReps !== undefined || s.actualWeight !== undefined || s.actualTime !== undefined
    );

    if (!hasAnyValues) {
      changes.skippedExercises.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      });
      continue;
    }

    // Check for modifications
    const modification = detectExerciseModification(exercise, originalExercise);
    if (modification) {
      changes.modifiedExercises.push(modification);
    }
  }

  // Check for deleted exercises (in original but not in workout)
  for (const originalExercise of originalTemplate.exercises) {
    const stillExists = workout.exercises.some(
      e => e.name.toLowerCase() === originalExercise.name.toLowerCase()
    );

    if (!stillExists) {
      changes.deletedExercises.push({
        exerciseId: originalExercise.id,
        exerciseName: originalExercise.name,
        originalSets: originalExercise.sets.map(s => ({
          setNumber: s.setNumber,
          targetReps: s.targetReps,
          targetWeight: s.targetWeight,
          targetTime: s.targetTime,
        })),
      });
    }
  }

  return changes;
}

// Detect modifications between workout exercise and original template exercise
function detectExerciseModification(
  workoutExercise: Exercise,
  originalExercise: Exercise
): ExerciseModification | null {
  let valuesChanged = false;
  let structureChanged = false;
  let setsAdded = 0;
  let setsRemoved = 0;

  const originalSetCount = originalExercise.sets.length;
  const workoutSetCount = workoutExercise.sets.length;

  // Check structure changes (set count)
  if (workoutSetCount > originalSetCount) {
    setsAdded = workoutSetCount - originalSetCount;
    structureChanged = true;
  } else if (workoutSetCount < originalSetCount) {
    setsRemoved = originalSetCount - workoutSetCount;
    structureChanged = true;
  }

  // Check value changes on existing sets
  const minSetCount = Math.min(originalSetCount, workoutSetCount);
  for (let i = 0; i < minSetCount; i++) {
    const originalSet = originalExercise.sets[i];
    const workoutSet = workoutExercise.sets[i];

    if (workoutSet.completed) {
      // Compare actual values with target values
      if (
        workoutSet.actualReps !== originalSet.targetReps ||
        workoutSet.actualWeight !== originalSet.targetWeight ||
        workoutSet.actualTime !== originalSet.targetTime
      ) {
        valuesChanged = true;
      }
    }
  }

  // No changes detected
  if (!valuesChanged && !structureChanged) {
    return null;
  }

  let changeType: 'values' | 'structure' | 'both';
  if (valuesChanged && structureChanged) {
    changeType = 'both';
  } else if (structureChanged) {
    changeType = 'structure';
  } else {
    changeType = 'values';
  }

  return {
    exerciseId: workoutExercise.id,
    exerciseName: workoutExercise.name,
    changeType,
    details: {
      setsAdded: setsAdded > 0 ? setsAdded : undefined,
      setsRemoved: setsRemoved > 0 ? setsRemoved : undefined,
      valuesChanged,
    },
  };
}

// Check if set value increased compared to template
export function isSetImproved(workoutSet: WorkoutSet, templateSet: WorkoutSet): boolean {
  if (!workoutSet.completed) return false;

  // Weight increased
  if (
    workoutSet.actualWeight !== undefined &&
    templateSet.targetWeight !== undefined &&
    workoutSet.actualWeight > templateSet.targetWeight
  ) {
    return true;
  }

  // Reps increased (with same or higher weight)
  if (
    workoutSet.actualReps !== undefined &&
    templateSet.targetReps !== undefined &&
    workoutSet.actualReps > templateSet.targetReps &&
    (workoutSet.actualWeight || 0) >= (templateSet.targetWeight || 0)
  ) {
    return true;
  }

  // Time increased (for timed exercises)
  if (
    workoutSet.actualTime !== undefined &&
    templateSet.targetTime !== undefined &&
    workoutSet.actualTime > templateSet.targetTime
  ) {
    return true;
  }

  return false;
}

// Check if set value decreased
export function isSetDecreased(workoutSet: WorkoutSet, templateSet: WorkoutSet): boolean {
  if (!workoutSet.completed) return false;

  // Weight decreased
  if (
    workoutSet.actualWeight !== undefined &&
    templateSet.targetWeight !== undefined &&
    workoutSet.actualWeight < templateSet.targetWeight
  ) {
    return true;
  }

  // Reps decreased
  if (
    workoutSet.actualReps !== undefined &&
    templateSet.targetReps !== undefined &&
    workoutSet.actualReps < templateSet.targetReps
  ) {
    return true;
  }

  return false;
}

// Get change indicator for a set
export type SetChangeIndicator = 'none' | 'improved' | 'decreased' | 'added' | 'skipped';

export function getSetChangeIndicator(
  workoutSet: WorkoutSet,
  templateSet: WorkoutSet | null
): SetChangeIndicator {
  // Added set (no template counterpart)
  if (!templateSet) {
    return 'added';
  }

  // Skipped (not completed and no values)
  if (!workoutSet.completed && workoutSet.actualReps === undefined && workoutSet.actualWeight === undefined) {
    return 'skipped';
  }

  // Check for improvement or decrease
  if (isSetImproved(workoutSet, templateSet)) {
    return 'improved';
  }

  if (isSetDecreased(workoutSet, templateSet)) {
    return 'decreased';
  }

  return 'none';
}
