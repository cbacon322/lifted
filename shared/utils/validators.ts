import { WorkoutImportFileSchema, WorkoutTemplateImportSchema } from '../models/WorkoutTemplate';

export interface ValidationResult {
  success: boolean;
  data?: unknown;
  errors?: string[];
}

// Validate JSON import file
export function validateWorkoutImport(jsonString: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString);
    const result = WorkoutImportFileSchema.safeParse(parsed);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    // Extract readable error messages
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    });

    return {
      success: false,
      errors,
    };
  } catch (e) {
    return {
      success: false,
      errors: ['Invalid JSON format'],
    };
  }
}

// Validate a single workout template
export function validateWorkoutTemplate(data: unknown): ValidationResult {
  const result = WorkoutTemplateImportSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return {
    success: false,
    errors,
  };
}

// Check for duplicate template names
export function findDuplicates(
  newNames: string[],
  existingNames: string[]
): string[] {
  const existingLower = new Set(existingNames.map(n => n.toLowerCase()));
  return newNames.filter(name => existingLower.has(name.toLowerCase()));
}

// Sanitize string input
export function sanitizeString(input: string): string {
  return input.trim().slice(0, 500); // Max length 500 chars
}

// Validate weight value
export function isValidWeight(weight: number): boolean {
  return weight >= 0 && weight <= 2000; // Max 2000 kg
}

// Validate reps value
export function isValidReps(reps: number): boolean {
  return reps > 0 && reps <= 1000 && Number.isInteger(reps);
}

// Validate time value (seconds)
export function isValidTime(time: number): boolean {
  return time > 0 && time <= 86400; // Max 24 hours
}
