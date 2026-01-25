import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
  Text,
  Button,
  IconButton,
  TextInput,
  useTheme,
  Portal,
  Modal,
  Menu,
} from 'react-native-paper';
import { useNavigation } from '../../App';

// Import from shared
import {
  WorkoutTemplate,
  WorkoutInstance,
  Set as WorkoutSet,
  createWorkoutInstance,
  PreviousWorkoutData,
} from '../../../shared/models';
import {
  getTemplate,
  saveWorkout,
  getPreviousWorkoutData,
  getDevUserId,
} from '../../../shared/services/firebase';
import { formatPreviousSet } from '../../../shared/utils';

interface Props {
  templateId: string;
}

export default function ActiveWorkoutScreen({ templateId }: Props) {
  const theme = useTheme();
  const { navigate, goBack, setTitle } = useNavigation();

  const [workout, setWorkout] = useState<WorkoutInstance | null>(null);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [previousData, setPreviousData] = useState<Map<string, PreviousWorkoutData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);

  // Inline rest timers per set (key: `${exerciseIndex}-${setIndex}`)
  const [inlineRestTimers, setInlineRestTimers] = useState<Map<string, number>>(new Map());

  // Workout duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<Date | null>(null);

  // Exercise menu and details visibility
  const [menuVisible, setMenuVisible] = useState<number | null>(null);
  const [detailsVisible, setDetailsVisible] = useState<Set<number>>(new Set());

  const userId = getDevUserId();

  useEffect(() => {
    initializeWorkout();
  }, [templateId]);

  // Workout duration timer
  useEffect(() => {
    if (!workout) return;
    startTimeRef.current = workout.startTime;

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
        setElapsedSeconds(elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [workout]);

  // Inline rest timer countdown
  useEffect(() => {
    if (inlineRestTimers.size === 0) return;

    const interval = setInterval(() => {
      setInlineRestTimers(prev => {
        const updated = new Map(prev);
        let changed = false;
        for (const [key, value] of updated) {
          if (value > 0) {
            updated.set(key, value - 1);
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inlineRestTimers.size]);

  const initializeWorkout = async () => {
    try {
      const loadedTemplate = await getTemplate(userId, templateId);
      if (!loadedTemplate) {
        Alert.alert('Error', 'Template not found');
        goBack();
        return;
      }

      setTemplate(loadedTemplate);
      setTitle(loadedTemplate.name);
      const instance = createWorkoutInstance(loadedTemplate, userId);
      setWorkout(instance);

      const exerciseNames = loadedTemplate.exercises.map(e => e.name);
      const prevData = await getPreviousWorkoutData(userId, exerciseNames);
      setPreviousData(prevData);

      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize workout:', error);
      Alert.alert('Error', 'Failed to start workout');
      goBack();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    if (!workout) return;
    const numValue = parseFloat(value) || undefined;

    setWorkout(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const newSets = [...newExercises[exerciseIndex].sets];

      if (field === 'weight') {
        newSets[setIndex] = { ...newSets[setIndex], actualWeight: numValue };
      } else {
        newSets[setIndex] = { ...newSets[setIndex], actualReps: numValue ? Math.floor(numValue) : undefined };
      }

      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
      return { ...prev, exercises: newExercises };
    });
  };

  const toggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    if (!workout) return;

    const exercise = workout.exercises[exerciseIndex];
    const set = exercise.sets[setIndex];
    const newCompleted = !set.completed;

    setWorkout(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const newSets = [...newExercises[exerciseIndex].sets];
      newSets[setIndex] = { ...newSets[setIndex], completed: newCompleted };
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
      return { ...prev, exercises: newExercises };
    });

    // Start inline rest timer after completing a set
    if (newCompleted && exercise.restTimer) {
      const key = `${exerciseIndex}-${setIndex}`;
      setInlineRestTimers(prev => new Map(prev).set(key, exercise.restTimer!));
    }
  };

  const addSet = (exerciseIndex: number) => {
    if (!workout) return;

    setWorkout(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const exercise = newExercises[exerciseIndex];
      const lastSet = exercise.sets[exercise.sets.length - 1];

      const newSet: WorkoutSet = {
        id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        setNumber: exercise.sets.length + 1,
        targetReps: lastSet?.targetReps,
        targetWeight: lastSet?.targetWeight,
        completed: false,
        skipped: false,
      };

      newExercises[exerciseIndex] = { ...exercise, sets: [...exercise.sets, newSet] };
      return { ...prev, exercises: newExercises };
    });
  };

  const toggleDetailsVisible = (exerciseIndex: number) => {
    setDetailsVisible(prev => {
      const updated = new Set(prev);
      if (updated.has(exerciseIndex)) {
        updated.delete(exerciseIndex);
      } else {
        updated.add(exerciseIndex);
      }
      return updated;
    });
    setMenuVisible(null);
  };

  const deleteExercise = (exerciseIndex: number) => {
    if (!workout) return;
    setMenuVisible(null);

    Alert.alert(
      'Delete Exercise',
      `Remove ${workout.exercises[exerciseIndex].name} from this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setWorkout(prev => {
              if (!prev) return prev;
              const newExercises = prev.exercises.filter((_, i) => i !== exerciseIndex);
              return { ...prev, exercises: newExercises };
            });
            // Also remove from details visible
            setDetailsVisible(prev => {
              const updated = new Set(prev);
              updated.delete(exerciseIndex);
              return updated;
            });
          },
        },
      ]
    );
  };

  const fillFromPrevious = (exerciseIndex: number, setIndex: number) => {
    if (!workout) return;

    const exercise = workout.exercises[exerciseIndex];
    const prevExerciseData = previousData.get(exercise.name.toLowerCase());

    if (!prevExerciseData || !prevExerciseData.sets[setIndex]) return;

    const prevSet = prevExerciseData.sets[setIndex];

    setWorkout(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const newSets = [...newExercises[exerciseIndex].sets];
      newSets[setIndex] = {
        ...newSets[setIndex],
        actualWeight: prevSet.weight,
        actualReps: prevSet.reps,
        actualTime: prevSet.time,
      };
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
      return { ...prev, exercises: newExercises };
    });
  };

  const handleFinishWorkout = async () => {
    if (!workout || !template) return;

    const emptyExercises = workout.exercises.filter(ex =>
      ex.sets.every(s => !s.completed && s.actualReps === undefined && s.actualWeight === undefined)
    );

    if (emptyExercises.length > 0) {
      Alert.alert(
        'Empty Exercises',
        `${emptyExercises.map(e => e.name).join(', ')} have no values. Skip them?`,
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Skip & Finish', onPress: () => finishWorkout() },
        ]
      );
      return;
    }

    finishWorkout();
  };

  const finishWorkout = async () => {
    if (!workout) return;

    try {
      const finishedWorkout: WorkoutInstance = {
        ...workout,
        endTime: new Date(),
        isActive: false,
      };

      await saveWorkout(finishedWorkout);
      navigate({ name: 'WorkoutComparison', params: { workoutId: finishedWorkout.id, templateId } });
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure you want to cancel? All progress will be lost.',
      [
        { text: 'Continue Workout', style: 'cancel' },
        { text: 'Cancel Workout', style: 'destructive', onPress: goBack },
      ]
    );
  };

  if (loading || !workout) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Workout Info Header */}
      <View style={styles.workoutHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerDate}>{formatDate(workout.startTime)}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerTimer}>{formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {workout.exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseSection}>
            {/* Exercise Header */}
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseName, { color: theme.colors.primary }]}>
                {exercise.name}
              </Text>
              <Menu
                visible={menuVisible === exerciseIndex}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-horizontal"
                    size={20}
                    onPress={() => setMenuVisible(exerciseIndex)}
                    style={styles.menuButton}
                  />
                }
              >
                <Menu.Item
                  onPress={() => toggleDetailsVisible(exerciseIndex)}
                  title={detailsVisible.has(exerciseIndex) ? "Hide Details" : "Show Details"}
                  leadingIcon={detailsVisible.has(exerciseIndex) ? "eye-off" : "eye"}
                />
                <Menu.Item
                  onPress={() => deleteExercise(exerciseIndex)}
                  title="Delete Exercise"
                  leadingIcon="delete"
                />
              </Menu>
            </View>

            {/* Notes - only shown when details visible */}
            {exercise.notes && detailsVisible.has(exerciseIndex) && (
              <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
            )}

            {/* Sets Table Header */}
            <View style={styles.setsHeader}>
              <Text style={[styles.headerCell, styles.setCol]}>Set</Text>
              <Text style={[styles.headerCell, styles.prevCol]}>Previous</Text>
              <Text style={[styles.headerCell, styles.inputCol]}>lbs</Text>
              <Text style={[styles.headerCell, styles.inputCol]}>Reps</Text>
              <Text style={[styles.headerCell, styles.checkCol]}></Text>
            </View>

            {/* Sets */}
            {exercise.sets.map((set, setIndex) => {
              const prevExerciseData = previousData.get(exercise.name.toLowerCase());
              const prevSet = prevExerciseData?.sets[setIndex];
              const restKey = `${exerciseIndex}-${setIndex}`;
              const restRemaining = inlineRestTimers.get(restKey) || 0;

              return (
                <View key={set.id}>
                  <View style={[
                    styles.setRow,
                    set.completed && styles.setRowCompleted
                  ]}>
                    <Text style={[styles.cell, styles.setCol, set.completed && styles.completedText]}>
                      {setIndex + 1}
                    </Text>
                    <TouchableOpacity
                      style={styles.prevCol}
                      onPress={() => fillFromPrevious(exerciseIndex, setIndex)}
                    >
                      <Text style={[styles.cell, styles.prevText]}>
                        {prevSet ? formatPreviousSet(prevSet.weight, prevSet.reps, prevSet.time) : '—'}
                      </Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, styles.inputCol, set.completed && styles.inputCompleted]}
                      mode="outlined"
                      dense
                      keyboardType="numeric"
                      value={set.actualWeight?.toString() || ''}
                      onChangeText={(v) => updateSet(exerciseIndex, setIndex, 'weight', v)}
                      placeholder={set.targetWeight?.toString()}
                    />
                    <TextInput
                      style={[styles.input, styles.inputCol, set.completed && styles.inputCompleted]}
                      mode="outlined"
                      dense
                      keyboardType="numeric"
                      value={set.actualReps?.toString() || ''}
                      onChangeText={(v) => updateSet(exerciseIndex, setIndex, 'reps', v)}
                      placeholder={set.targetReps?.toString()}
                    />
                    <IconButton
                      icon={set.completed ? 'check-circle' : 'circle-outline'}
                      iconColor={set.completed ? '#4CAF50' : theme.colors.outline}
                      size={24}
                      style={styles.checkButton}
                      onPress={() => toggleSetComplete(exerciseIndex, setIndex)}
                    />
                  </View>

                  {/* Inline Rest Timer */}
                  {set.completed && restRemaining > 0 && (
                    <View style={styles.inlineRestTimer}>
                      <View style={styles.restTimerLine} />
                      <Text style={styles.restTimerText}>{formatTime(restRemaining)}</Text>
                      <View style={styles.restTimerLine} />
                    </View>
                  )}

                  {/* Static rest indicator for completed sets without active timer */}
                  {set.completed && restRemaining === 0 && exercise.restTimer && setIndex < exercise.sets.length - 1 && (
                    <View style={styles.inlineRestIndicator}>
                      <View style={styles.restIndicatorLine} />
                      <Text style={styles.restIndicatorText}>{formatTime(exercise.restTimer)}</Text>
                      <View style={styles.restIndicatorLine} />
                    </View>
                  )}
                </View>
              );
            })}

            {/* Add Set Button */}
            <Button
              mode="text"
              compact
              onPress={() => addSet(exerciseIndex)}
              style={styles.addSetButton}
            >
              + Add Set {exercise.restTimer ? `(${formatTime(exercise.restTimer)})` : ''}
            </Button>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <Button mode="outlined" onPress={handleCancelWorkout} style={styles.halfButton}>
          Cancel
        </Button>
        <Button mode="contained" onPress={handleFinishWorkout} style={styles.halfButton}>
          Finish
        </Button>
      </View>

      {/* Rest Timer Modal (backup) */}
      <Portal>
        <Modal visible={restTimerVisible} onDismiss={() => setRestTimerVisible(false)} contentContainerStyle={styles.restTimerModal}>
          <Text variant="headlineLarge" style={styles.modalTimerText}>
            {formatTime(restTimeRemaining)}
          </Text>
          <Text variant="bodyLarge">Rest Time</Text>
          <View style={styles.restTimerButtons}>
            <Button onPress={() => setRestTimeRemaining(prev => prev + 30)}>+30s</Button>
            <Button onPress={() => setRestTimerVisible(false)}>Skip</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Workout header
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerDate: { fontSize: 14, opacity: 0.7 },
  headerTimer: { fontSize: 16, fontWeight: '600' },

  scrollContent: { padding: 12, paddingBottom: 80 },

  // Exercise section
  exerciseSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: { fontSize: 16, fontWeight: '600' },
  menuButton: { margin: 0 },
  exerciseNotes: {
    fontSize: 13,
    color: '#FF9800',
    marginTop: 2,
    marginBottom: 4,
  },

  // Sets table
  setsHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  headerCell: { fontSize: 11, fontWeight: '600', opacity: 0.5, textTransform: 'uppercase' },
  setCol: { width: 28 },
  prevCol: { flex: 1, paddingRight: 4 },
  inputCol: { width: 52, marginHorizontal: 2 },
  checkCol: { width: 36 },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    borderRadius: 6,
    marginVertical: 1,
  },
  setRowCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  cell: { fontSize: 14 },
  completedText: { fontWeight: '600' },
  prevText: { opacity: 0.5, fontSize: 13 },
  input: { height: 32, fontSize: 13 },
  inputCompleted: { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
  checkButton: { margin: 0 },

  // Inline rest timer
  inlineRestTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  restTimerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2196F3',
  },
  restTimerText: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },

  // Static rest indicator
  inlineRestIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  restIndicatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#BDBDBD',
  },
  restIndicatorText: {
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#9E9E9E',
  },

  addSetButton: { marginTop: 4, alignSelf: 'flex-start' },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    gap: 12,
  },
  halfButton: { flex: 1, borderRadius: 8 },

  // Modal
  restTimerModal: {
    backgroundColor: 'white',
    margin: 20,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTimerText: { fontWeight: '700', marginBottom: 8 },
  restTimerButtons: { flexDirection: 'row', gap: 16, marginTop: 24 },
});
