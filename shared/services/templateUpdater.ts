import { WorkoutTemplate, createTemplateFromImport } from '../models/WorkoutTemplate';
import { WorkoutInstance, WorkoutChanges } from '../models/WorkoutInstance';
import { Exercise, cloneExercise } from '../models/Exercise';
import { Set } from '../models/Set';

export type UpdateOption = 'values_only' | 'template_and_values' | 'save_as_new' | 'keep_original';

// Apply updates to template based on user's choice
export function applyTemplateUpdate(
  originalTemplate: WorkoutTemplate,
  workout: WorkoutInstance,
  changes: WorkoutChanges,
  option: UpdateOption
): WorkoutTemplate | null {
  switch (option) {
    case 'values_only':
      return updateValuesOnly(originalTemplate, workout);
    case 'template_and_values':
      return updateTemplateAndValues(originalTemplate, workout, changes);
    case 'save_as_new':
      return createNewTemplate(originalTemplate, workout);
    case 'keep_original':
      return null; // No changes to template
    default:
      return null;
  }
}

// Option 1: Update Values Only
// - Updates weight/reps on sets that existed in template
// - Ignores: added sets, removed sets, deleted exercises, skipped exercises
function updateValuesOnly(
  template: WorkoutTemplate,
  workout: WorkoutInstance
): WorkoutTemplate {
  const updatedExercises = template.exercises.map(templateExercise => {
    // Find matching workout exercise
    const workoutExercise = workout.exercises.find(
      e => e.name.toLowerCase() === templateExercise.name.toLowerCase()
    );

    if (!workoutExercise) {
      // Exercise was deleted or not found - keep original
      return templateExercise;
    }

    // Update only existing sets with new values
    const updatedSets = templateExercise.sets.map((templateSet, index) => {
      const workoutSet = workoutExercise.sets[index];

      if (!workoutSet || !workoutSet.completed) {
        return templateSet; // Keep original if not completed
      }

      return {
        ...templateSet,
        targetReps: workoutSet.actualReps ?? templateSet.targetReps,
        targetWeight: workoutSet.actualWeight ?? templateSet.targetWeight,
        targetTime: workoutSet.actualTime ?? templateSet.targetTime,
      };
    });

    return {
      ...templateExercise,
      sets: updatedSets,
    };
  });

  return {
    ...template,
    exercises: updatedExercises,
    updatedAt: new Date(),
  };
}

// Option 2: Update Template and Values
// - Updates all weight/reps values
// - Adds new sets to exercises
// - Removes deleted exercises from template
// - Keeps skipped exercises unchanged
function updateTemplateAndValues(
  template: WorkoutTemplate,
  workout: WorkoutInstance,
  changes: WorkoutChanges
): WorkoutTemplate {
  // Get names of deleted exercises to exclude
  const deletedNames = new Set(
    changes.deletedExercises.map(e => e.exerciseName.toLowerCase())
  );

  // Get names of skipped exercises to keep unchanged
  const skippedNames = new Set(
    changes.skippedExercises.map(e => e.exerciseName.toLowerCase())
  );

  // Process existing exercises (excluding deleted)
  const updatedExercises: Exercise[] = [];

  for (const templateExercise of template.exercises) {
    const lowerName = templateExercise.name.toLowerCase();

    // Skip deleted exercises
    if (deletedNames.has(lowerName)) {
      continue;
    }

    // Keep skipped exercises unchanged
    if (skippedNames.has(lowerName)) {
      updatedExercises.push(templateExercise);
      continue;
    }

    // Find matching workout exercise
    const workoutExercise = workout.exercises.find(
      e => e.name.toLowerCase() === lowerName
    );

    if (!workoutExercise) {
      updatedExercises.push(templateExercise);
      continue;
    }

    // Create updated exercise with all sets from workout
    const updatedSets: Set[] = workoutExercise.sets.map((workoutSet, index) => ({
      id: workoutSet.id,
      setNumber: index + 1,
      targetReps: workoutSet.completed ? workoutSet.actualReps : workoutSet.targetReps,
      targetWeight: workoutSet.completed ? workoutSet.actualWeight : workoutSet.targetWeight,
      targetTime: workoutSet.completed ? workoutSet.actualTime : workoutSet.targetTime,
      completed: false,
      skipped: false,
    }));

    updatedExercises.push({
      ...templateExercise,
      sets: updatedSets,
      restTimer: workoutExercise.restTimer,
    });
  }

  // Add newly added exercises (that don't exist in template)
  for (const added of changes.addedExercises) {
    const workoutExercise = workout.exercises.find(e => e.id === added.exerciseId);
    if (workoutExercise) {
      // Create template exercise from workout exercise
      const newTemplateExercise: Exercise = {
        ...workoutExercise,
        id: `exercise_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        order: updatedExercises.length,
        sets: workoutExercise.sets.map((s, index) => ({
          id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          setNumber: index + 1,
          targetReps: s.actualReps,
          targetWeight: s.actualWeight,
          targetTime: s.actualTime,
          completed: false,
          skipped: false,
        })),
      };
      updatedExercises.push(newTemplateExercise);
    }
  }

  return {
    ...template,
    exercises: updatedExercises,
    updatedAt: new Date(),
  };
}

// Option 3: Save as New Template
// - Creates new template from workout instance
function createNewTemplate(
  originalTemplate: WorkoutTemplate,
  workout: WorkoutInstance
): WorkoutTemplate {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: `${originalTemplate.name} (${dateStr})`,
    description: originalTemplate.description,
    exercises: workout.exercises.map((exercise, index) => ({
      ...exercise,
      id: `exercise_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      order: index,
      sets: exercise.sets.map((set, setIndex) => ({
        id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        setNumber: setIndex + 1,
        targetReps: set.completed ? set.actualReps : set.targetReps,
        targetWeight: set.completed ? set.actualWeight : set.targetWeight,
        targetTime: set.completed ? set.actualTime : set.targetTime,
        completed: false,
        skipped: false,
      })),
    })),
    createdAt: now,
    updatedAt: now,
    tags: originalTemplate.tags,
    userId: originalTemplate.userId,
  };
}

// Generate summary text for each option
export function getUpdateOptionSummary(
  option: UpdateOption,
  changes: WorkoutChanges
): string[] {
  const summary: string[] = [];

  switch (option) {
    case 'values_only':
      if (changes.modifiedExercises.length > 0) {
        for (const mod of changes.modifiedExercises) {
          if (mod.details.valuesChanged) {
            const parts: string[] = [];
            if (mod.details.setsAdded) parts.push(`+${mod.details.setsAdded} set${mod.details.setsAdded > 1 ? 's' : ''}`);
            parts.push('updated weights');
            summary.push(`${mod.exerciseName}: ${parts.join(', ')}`);
          }
        }
      }
      if (changes.deletedExercises.length > 0) {
        summary.push(`Keeps: ${changes.deletedExercises.map(e => e.exerciseName).join(', ')}`);
      }
      if (changes.skippedExercises.length > 0) {
        summary.push(`Keeps: ${changes.skippedExercises.map(e => e.exerciseName).join(', ')}`);
      }
      break;

    case 'template_and_values':
      summary.push('Updates all values');
      if (changes.modifiedExercises.some(m => m.details.setsAdded)) {
        const added = changes.modifiedExercises.filter(m => m.details.setsAdded);
        for (const mod of added) {
          summary.push(`Adds ${mod.details.setsAdded} set${mod.details.setsAdded! > 1 ? 's' : ''} to ${mod.exerciseName}`);
        }
      }
      if (changes.deletedExercises.length > 0) {
        summary.push(`Removes: ${changes.deletedExercises.map(e => e.exerciseName).join(', ')}`);
      }
      if (changes.skippedExercises.length > 0) {
        summary.push(`Keeps: ${changes.skippedExercises.map(e => e.exerciseName).join(', ')} (skipped)`);
      }
      break;

    case 'save_as_new':
      summary.push("Creates new template with today's workout");
      summary.push('Original template unchanged');
      break;

    case 'keep_original':
      summary.push('No changes to template');
      summary.push('Workout saved to history only');
      break;
  }

  return summary;
}
