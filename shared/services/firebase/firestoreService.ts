import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebaseConfig';
import {
  WorkoutTemplate,
  WorkoutInstance,
  PreviousWorkoutData,
  PreviousSetData,
  ExerciseLibraryItem,
} from '../../models';

// Helper to convert Firestore timestamps to Date
function timestampToDate(timestamp: Timestamp | Date | undefined): Date | undefined {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// Helper to convert Date to Firestore format
function dateToFirestore(date: Date | undefined): Timestamp | undefined {
  if (!date) return undefined;
  return Timestamp.fromDate(date);
}

// Helper to remove undefined values from an object (Firebase doesn't accept undefined)
function removeUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)) as T;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof Timestamp)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// ============================================
// TEMPLATES
// ============================================

export async function getTemplates(userId: string): Promise<WorkoutTemplate[]> {
  const db = getFirestoreDb();
  const templatesRef = collection(db, 'users', userId, 'templates');
  const q = query(templatesRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: timestampToDate(data.createdAt) || new Date(),
      updatedAt: timestampToDate(data.updatedAt) || new Date(),
      lastUsed: timestampToDate(data.lastUsed),
    } as WorkoutTemplate;
  });
}

export async function getTemplate(userId: string, templateId: string): Promise<WorkoutTemplate | null> {
  const db = getFirestoreDb();
  const templateRef = doc(db, 'users', userId, 'templates', templateId);
  const snapshot = await getDoc(templateRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
    lastUsed: timestampToDate(data.lastUsed),
  } as WorkoutTemplate;
}

export async function saveTemplate(template: WorkoutTemplate): Promise<void> {
  const db = getFirestoreDb();
  const templateRef = doc(db, 'users', template.userId, 'templates', template.id);

  const data = removeUndefined({
    ...template,
    createdAt: dateToFirestore(template.createdAt),
    updatedAt: dateToFirestore(new Date()),
    lastUsed: dateToFirestore(template.lastUsed),
  });

  await setDoc(templateRef, data);
}

export async function updateTemplate(
  userId: string,
  templateId: string,
  updates: Partial<WorkoutTemplate>
): Promise<void> {
  const db = getFirestoreDb();
  const templateRef = doc(db, 'users', userId, 'templates', templateId);

  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  // Convert dates if present
  if (updates.createdAt) updateData.createdAt = dateToFirestore(updates.createdAt);
  if (updates.lastUsed) updateData.lastUsed = dateToFirestore(updates.lastUsed);

  await updateDoc(templateRef, updateData);
}

export async function deleteTemplate(userId: string, templateId: string): Promise<void> {
  const db = getFirestoreDb();
  const templateRef = doc(db, 'users', userId, 'templates', templateId);
  await deleteDoc(templateRef);
}

// Subscribe to real-time template updates
export function subscribeToTemplates(
  userId: string,
  callback: (templates: WorkoutTemplate[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  const templatesRef = collection(db, 'users', userId, 'templates');
  const q = query(templatesRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const templates = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        updatedAt: timestampToDate(data.updatedAt) || new Date(),
        lastUsed: timestampToDate(data.lastUsed),
      } as WorkoutTemplate;
    });
    callback(templates);
  });
}

// ============================================
// WORKOUTS
// ============================================

export async function getWorkouts(
  userId: string,
  limitCount: number = 50
): Promise<WorkoutInstance[]> {
  const db = getFirestoreDb();
  const workoutsRef = collection(db, 'users', userId, 'workouts');
  const q = query(workoutsRef, orderBy('startTime', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      startTime: timestampToDate(data.startTime) || new Date(),
      endTime: timestampToDate(data.endTime),
    } as WorkoutInstance;
  });
}

export async function getWorkout(userId: string, workoutId: string): Promise<WorkoutInstance | null> {
  const db = getFirestoreDb();
  const workoutRef = doc(db, 'users', userId, 'workouts', workoutId);
  const snapshot = await getDoc(workoutRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    startTime: timestampToDate(data.startTime) || new Date(),
    endTime: timestampToDate(data.endTime),
  } as WorkoutInstance;
}

export async function saveWorkout(workout: WorkoutInstance): Promise<void> {
  const db = getFirestoreDb();
  const workoutRef = doc(db, 'users', workout.userId, 'workouts', workout.id);

  const data = removeUndefined({
    ...workout,
    startTime: dateToFirestore(workout.startTime),
    endTime: dateToFirestore(workout.endTime),
  });

  await setDoc(workoutRef, data);
}

export async function updateWorkout(
  userId: string,
  workoutId: string,
  updates: Partial<WorkoutInstance>
): Promise<void> {
  const db = getFirestoreDb();
  const workoutRef = doc(db, 'users', userId, 'workouts', workoutId);

  const updateData: Record<string, unknown> = { ...updates };

  // Convert dates if present
  if (updates.startTime) updateData.startTime = dateToFirestore(updates.startTime);
  if (updates.endTime) updateData.endTime = dateToFirestore(updates.endTime);

  await updateDoc(workoutRef, updateData);
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  const db = getFirestoreDb();
  const workoutRef = doc(db, 'users', userId, 'workouts', workoutId);
  await deleteDoc(workoutRef);
}

// ============================================
// PREVIOUS WORKOUT DATA
// ============================================

// Get previous workout data for exercises by name
export async function getPreviousWorkoutData(
  userId: string,
  exerciseNames: string[]
): Promise<Map<string, PreviousWorkoutData>> {
  const db = getFirestoreDb();
  const previousDataMap = new Map<string, PreviousWorkoutData>();

  // Get recent workouts
  const workoutsRef = collection(db, 'users', userId, 'workouts');
  const q = query(
    workoutsRef,
    where('isActive', '==', false),
    orderBy('startTime', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);

  // Search through workouts to find most recent data for each exercise
  for (const exerciseName of exerciseNames) {
    for (const workoutDoc of snapshot.docs) {
      const workout = workoutDoc.data() as WorkoutInstance;
      const exercise = workout.exercises.find(
        e => e.name.toLowerCase() === exerciseName.toLowerCase()
      );

      if (exercise && exercise.sets.some(s => s.completed)) {
        const completedSets: PreviousSetData[] = exercise.sets
          .filter(s => s.completed)
          .map(s => ({
            setNumber: s.setNumber,
            weight: s.actualWeight,
            reps: s.actualReps,
            time: s.actualTime,
          }));

        if (completedSets.length > 0) {
          previousDataMap.set(exerciseName.toLowerCase(), {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            lastPerformed: timestampToDate((workout as any).startTime) || new Date(),
            sets: completedSets,
          });
          break; // Found most recent, move to next exercise
        }
      }
    }
  }

  return previousDataMap;
}

// Subscribe to real-time workout updates
export function subscribeToWorkouts(
  userId: string,
  callback: (workouts: WorkoutInstance[]) => void,
  limitCount: number = 100
): Unsubscribe {
  const db = getFirestoreDb();
  const workoutsRef = collection(db, 'users', userId, 'workouts');
  const q = query(
    workoutsRef,
    where('isActive', '==', false),
    orderBy('startTime', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const workouts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        startTime: timestampToDate(data.startTime) || new Date(),
        endTime: timestampToDate(data.endTime),
      } as WorkoutInstance;
    });
    callback(workouts);
  });
}

// Get workouts by template
export async function getWorkoutsByTemplate(
  userId: string,
  templateId: string,
  limitCount: number = 10
): Promise<WorkoutInstance[]> {
  const db = getFirestoreDb();
  const workoutsRef = collection(db, 'users', userId, 'workouts');
  const q = query(
    workoutsRef,
    where('templateId', '==', templateId),
    where('isActive', '==', false),
    orderBy('startTime', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      startTime: timestampToDate(data.startTime) || new Date(),
      endTime: timestampToDate(data.endTime),
    } as WorkoutInstance;
  });
}

// ============================================
// EXERCISE LIBRARY
// ============================================

export async function getExerciseLibrary(userId: string): Promise<ExerciseLibraryItem[]> {
  const db = getFirestoreDb();
  const exercisesRef = collection(db, 'users', userId, 'exercises');
  const q = query(exercisesRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: timestampToDate(data.createdAt) || new Date(),
      updatedAt: timestampToDate(data.updatedAt) || new Date(),
    } as ExerciseLibraryItem;
  });
}

export async function saveExerciseToLibrary(exercise: ExerciseLibraryItem): Promise<void> {
  const db = getFirestoreDb();
  const exerciseRef = doc(db, 'users', exercise.userId, 'exercises', exercise.id);

  const data = removeUndefined({
    ...exercise,
    createdAt: dateToFirestore(exercise.createdAt),
    updatedAt: dateToFirestore(new Date()),
  });

  await setDoc(exerciseRef, data);
}

export async function deleteExerciseFromLibrary(userId: string, exerciseId: string): Promise<void> {
  const db = getFirestoreDb();
  const exerciseRef = doc(db, 'users', userId, 'exercises', exerciseId);
  await deleteDoc(exerciseRef);
}

// Subscribe to real-time exercise library updates
export function subscribeToExerciseLibrary(
  userId: string,
  callback: (exercises: ExerciseLibraryItem[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  const exercisesRef = collection(db, 'users', userId, 'exercises');
  const q = query(exercisesRef, orderBy('name', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const exercises = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        updatedAt: timestampToDate(data.updatedAt) || new Date(),
      } as ExerciseLibraryItem;
    });
    callback(exercises);
  });
}

// Check if an exercise name already exists in the library (case-insensitive)
export async function exerciseExistsInLibrary(userId: string, name: string): Promise<boolean> {
  const exercises = await getExerciseLibrary(userId);
  return exercises.some(e => e.name.toLowerCase() === name.toLowerCase());
}
