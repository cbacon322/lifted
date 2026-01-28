import { z } from 'zod';
import { Exercise, ExerciseImportSchema, createExerciseFromImport } from './Exercise';
import { ExerciseGroup, ExerciseGroupImportSchema, createGroupFromImport } from './ExerciseGroup';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises?: Exercise[]; // Deprecated: kept for backward compatibility
  groups?: ExerciseGroup[]; // New: organized exercises into groups
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  tags?: string[];
  userId: string; // for multi-user support
  archived?: boolean; // if true, hidden from main list but kept in history
}

// Zod schema for JSON import validation (supports both old and new formats)
export const WorkoutTemplateImportSchema = z.object({
  name: z.string().min(1, "Workout name is required"),
  description: z.string().optional(),
  exercises: z.array(ExerciseImportSchema).optional(), // Old format
  groups: z.array(ExerciseGroupImportSchema).optional(), // New format
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => (data.exercises && data.exercises.length > 0) || (data.groups && data.groups.length > 0),
  { message: "Workout must have at least 1 exercise or 1 group" }
);

export type WorkoutTemplateImport = z.infer<typeof WorkoutTemplateImportSchema>;

// Full import schema (can contain multiple workouts)
export const WorkoutImportFileSchema = z.object({
  workouts: z.array(WorkoutTemplateImportSchema).min(1, "File must contain at least 1 workout"),
});

export type WorkoutImportFile = z.infer<typeof WorkoutImportFileSchema>;

// Helper to create a WorkoutTemplate from import data
export function createTemplateFromImport(importData: WorkoutTemplateImport, userId: string): WorkoutTemplate {
  const now = new Date();

  // If groups are provided, use them
  if (importData.groups && importData.groups.length > 0) {
    return {
      id: generateTemplateId(),
      name: importData.name,
      description: importData.description,
      groups: importData.groups.map((groupData, index) =>
        createGroupFromImport(groupData, index)
      ),
      createdAt: now,
      updatedAt: now,
      tags: importData.tags,
      userId,
    };
  }

  // Otherwise, convert exercises to a default "Main Workout" group
  if (importData.exercises && importData.exercises.length > 0) {
    return {
      id: generateTemplateId(),
      name: importData.name,
      description: importData.description,
      groups: [{
        id: `group_${Date.now()}_default`,
        name: 'Main Workout',
        order: 0,
        exercises: importData.exercises.map((exerciseData, index) =>
          createExerciseFromImport(exerciseData, index)
        ),
      }],
      createdAt: now,
      updatedAt: now,
      tags: importData.tags,
      userId,
    };
  }

  // Fallback (should not happen due to schema validation)
  throw new Error('Template must have either exercises or groups');
}

// Generate unique ID for templates
function generateTemplateId(): string {
  return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Export template to JSON format
export function exportTemplateToJson(template: WorkoutTemplate): WorkoutTemplateImport {
  // If template has groups, export them
  if (template.groups && template.groups.length > 0) {
    return {
      name: template.name,
      description: template.description,
      groups: template.groups.map(group => ({
        name: group.name,
        exercises: group.exercises.map(exercise => ({
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
      })),
      tags: template.tags,
    };
  }

  // Otherwise, export exercises (backward compatibility)
  if (template.exercises && template.exercises.length > 0) {
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

  // Fallback
  return {
    name: template.name,
    description: template.description,
    groups: [],
    tags: template.tags,
  };
}

// Export multiple templates to JSON file format
export function exportTemplatesToJson(templates: WorkoutTemplate[]): WorkoutImportFile {
  return {
    workouts: templates.map(exportTemplateToJson),
  };
}

// Helper to get all exercises from a template (supports both old and new format)
export function getAllExercisesFromTemplate(template: WorkoutTemplate): Exercise[] {
  if (template.groups && template.groups.length > 0) {
    return template.groups.flatMap(group => group.exercises);
  }
  return template.exercises || [];
}

// Helper to migrate old template format to new grouped format
export function migrateTemplateToGroups(template: WorkoutTemplate): WorkoutTemplate {
  // If already has groups, return as-is
  if (template.groups && template.groups.length > 0) {
    return template;
  }

  // Convert exercises to a single "Main Workout" group
  if (template.exercises && template.exercises.length > 0) {
    return {
      ...template,
      groups: [{
        id: `group_${Date.now()}_default`,
        name: 'Main Workout',
        order: 0,
        exercises: template.exercises,
      }],
      exercises: undefined, // Remove old format
    };
  }

  // No exercises or groups - return with empty groups
  return {
    ...template,
    groups: [],
    exercises: undefined,
  };
}
