// Data structure for showing "Previous" column during workouts
export interface PreviousSetData {
  setNumber: number;
  weight?: number;
  reps?: number;
  time?: number;
}

export interface PreviousWorkoutData {
  exerciseId: string;
  exerciseName: string;
  lastPerformed: Date;
  sets: PreviousSetData[];
}

// Map of exercise name to previous data (for quick lookup during workout)
export type PreviousDataMap = Map<string, PreviousWorkoutData>;

// Format previous set for display
export function formatPreviousSet(set: PreviousSetData): string {
  if (set.time !== undefined) {
    const minutes = Math.floor(set.time / 60);
    const seconds = set.time % 60;
    return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
  }

  if (set.weight !== undefined && set.reps !== undefined) {
    return `${set.weight} kg × ${set.reps}`;
  }

  if (set.reps !== undefined) {
    return `${set.reps} reps`;
  }

  return '—';
}

// Calculate how long ago the previous workout was
export function formatTimeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}
