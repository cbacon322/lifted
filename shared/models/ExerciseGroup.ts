import { z } from 'zod';
import { Exercise, ExerciseImportSchema, createExerciseFromImport } from './Exercise';

export interface ExerciseGroup {
  id: string;
  name: string;
  order: number;
  exercises: Exercise[];
}

// Zod schema for JSON import validation
export const ExerciseGroupImportSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  exercises: z.array(ExerciseImportSchema).min(1, "Group must have at least 1 exercise"),
});

export type ExerciseGroupImport = z.infer<typeof ExerciseGroupImportSchema>;

// Helper to create an ExerciseGroup from import data
export function createGroupFromImport(importData: ExerciseGroupImport, order: number): ExerciseGroup {
  return {
    id: generateGroupId(),
    name: importData.name,
    order,
    exercises: importData.exercises.map((exerciseData, index) =>
      createExerciseFromImport(exerciseData, index)
    ),
  };
}

// Generate unique ID for groups
function generateGroupId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Deep clone a group (for workout instances)
export function cloneExerciseGroup(group: ExerciseGroup): ExerciseGroup {
  return {
    ...group,
    id: generateGroupId(),
    exercises: group.exercises.map(exercise => ({
      ...exercise,
      id: `exercise_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sets: exercise.sets.map(set => ({
        ...set,
        id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        actualReps: undefined,
        actualWeight: undefined,
        actualTime: undefined,
        completed: false,
        skipped: false,
      })),
    })),
  };
}
