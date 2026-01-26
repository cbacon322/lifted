import { z } from 'zod';
import { Exercise, ExerciseImportSchema, createExerciseFromImport } from './Exercise';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  tags?: string[];
  userId: string; // for multi-user support
  archived?: boolean; // if true, hidden from main list but kept in history
}

// Zod schema for JSON import validation
export const WorkoutTemplateImportSchema = z.object({
  name: z.string().min(1, "Workout name is required"),
  description: z.string().optional(),
  exercises: z.array(ExerciseImportSchema).min(1, "Workout must have at least 1 exercise"),
  tags: z.array(z.string()).optional(),
});

export type WorkoutTemplateImport = z.infer<typeof WorkoutTemplateImportSchema>;

// Full import schema (can contain multiple workouts)
export const WorkoutImportFileSchema = z.object({
  workouts: z.array(WorkoutTemplateImportSchema).min(1, "File must contain at least 1 workout"),
});

export type WorkoutImportFile = z.infer<typeof WorkoutImportFileSchema>;

// Helper to create a WorkoutTemplate from import data
export function createTemplateFromImport(importData: WorkoutTemplateImport, userId: string): WorkoutTemplate {
  const now = new Date();
  return {
    id: generateTemplateId(),
    name: importData.name,
    description: importData.description,
    exercises: importData.exercises.map((exerciseData, index) =>
      createExerciseFromImport(exerciseData, index)
    ),
    createdAt: now,
    updatedAt: now,
    tags: importData.tags,
    userId,
  };
}

// Generate unique ID for templates
function generateTemplateId(): string {
  return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Export template to JSON format
export function exportTemplateToJson(template: WorkoutTemplate): WorkoutTemplateImport {
  return {
    name: template.name,
    description: template.description,
    exercises: template.exercises.map(exercise => ({
      name: exercise.name,
      type: exercise.exerciseType,
      sets: exercise.sets.map(set => ({
        reps: set.targetReps,
        weight: set.targetWeight,
        time: set.targetTime,
        distance: set.targetDistance,
      })),
      rest: exercise.restTimer,
      notes: exercise.notes,
    })),
    tags: template.tags,
  };
}

// Export multiple templates to JSON file format
export function exportTemplatesToJson(templates: WorkoutTemplate[]): WorkoutImportFile {
  return {
    workouts: templates.map(exportTemplateToJson),
  };
}
