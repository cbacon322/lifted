import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  IconButton,
  TextInput,
  useTheme,
  Divider,
  Portal,
  Modal,
} from 'react-native-paper';
import { useNavigation } from '../../App';

// Import from shared
import {
  WorkoutTemplate,
  WorkoutInstance,
  Set,
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
  const { navigate, goBack } = useNavigation();

  const [workout, setWorkout] = useState<WorkoutInstance | null>(null);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [previousData, setPreviousData] = useState<Map<string, PreviousWorkoutData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);

  const userId = getDevUserId();

  useEffect(() => {
    initializeWorkout();
  }, [templateId]);

  const initializeWorkout = async () => {
    try {
      const loadedTemplate = await getTemplate(userId, templateId);
      if (!loadedTemplate) {
        Alert.alert('Error', 'Template not found');
        goBack();
        return;
      }

      setTemplate(loadedTemplate);
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

    if (newCompleted && exercise.restTimer) {
      startRestTimer(exercise.restTimer);
    }
  };

  const addSet = (exerciseIndex: number) => {
    if (!workout) return;

    setWorkout(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const exercise = newExercises[exerciseIndex];
      const lastSet = exercise.sets[exercise.sets.length - 1];

      const newSet: Set = {
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

  const deleteExercise = (exerciseIndex: number) => {
    if (!workout) return;

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
          },
        },
      ]
    );
  };

  const startRestTimer = (seconds: number) => {
    setRestTimeRemaining(seconds);
    setRestTimerVisible(true);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimerVisible && restTimeRemaining > 0) {
      interval = setInterval(() => {
        setRestTimeRemaining(prev => {
          if (prev <= 1) {
            setRestTimerVisible(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimerVisible, restTimeRemaining]);

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {workout.exercises.map((exercise, exerciseIndex) => (
          <Card key={exercise.id} style={styles.exerciseCard} mode="elevated">
            <Card.Content>
              <View style={styles.exerciseHeader}>
                <Text variant="titleMedium" style={styles.exerciseName}>
                  {exercise.name}
                </Text>
                <IconButton icon="delete-outline" size={20} onPress={() => deleteExercise(exerciseIndex)} />
              </View>

              <View style={styles.setsHeader}>
                <Text style={[styles.headerCell, styles.setCol]}>Set</Text>
                <Text style={[styles.headerCell, styles.prevCol]}>Previous</Text>
                <Text style={[styles.headerCell, styles.inputCol]}>kg</Text>
                <Text style={[styles.headerCell, styles.inputCol]}>Reps</Text>
                <Text style={[styles.headerCell, styles.checkCol]}></Text>
              </View>
              <Divider />

              {exercise.sets.map((set, setIndex) => {
                const prevExerciseData = previousData.get(exercise.name.toLowerCase());
                const prevSet = prevExerciseData?.sets[setIndex];

                return (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={[styles.cell, styles.setCol]}>{setIndex + 1}</Text>
                    <Text
                      style={[styles.cell, styles.prevCol, styles.prevText]}
                      onPress={() => fillFromPrevious(exerciseIndex, setIndex)}
                    >
                      {prevSet ? formatPreviousSet(prevSet.weight, prevSet.reps, prevSet.time) : '—'}
                    </Text>
                    <TextInput
                      style={[styles.input, styles.inputCol]}
                      mode="outlined"
                      dense
                      keyboardType="numeric"
                      value={set.actualWeight?.toString() || ''}
                      onChangeText={(v) => updateSet(exerciseIndex, setIndex, 'weight', v)}
                      placeholder={set.targetWeight?.toString()}
                    />
                    <TextInput
                      style={[styles.input, styles.inputCol]}
                      mode="outlined"
                      dense
                      keyboardType="numeric"
                      value={set.actualReps?.toString() || ''}
                      onChangeText={(v) => updateSet(exerciseIndex, setIndex, 'reps', v)}
                      placeholder={set.targetReps?.toString()}
                    />
                    <IconButton
                      icon={set.completed ? 'check-circle' : 'circle-outline'}
                      iconColor={set.completed ? theme.colors.primary : theme.colors.outline}
                      size={24}
                      style={styles.checkCol}
                      onPress={() => toggleSetComplete(exerciseIndex, setIndex)}
                    />
                  </View>
                );
              })}

              <Button mode="text" onPress={() => addSet(exerciseIndex)} style={styles.addSetButton}>
                + Add Set
              </Button>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button mode="outlined" onPress={handleCancelWorkout} style={styles.cancelButton}>Cancel</Button>
        <Button mode="contained" onPress={handleFinishWorkout} style={styles.finishButton}>Finish Workout</Button>
      </View>

      <Portal>
        <Modal visible={restTimerVisible} onDismiss={() => setRestTimerVisible(false)} contentContainerStyle={styles.restTimerModal}>
          <Text variant="headlineLarge" style={styles.restTimerText}>
            {Math.floor(restTimeRemaining / 60)}:{(restTimeRemaining % 60).toString().padStart(2, '0')}
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
  scrollContent: { padding: 16, paddingBottom: 100 },
  exerciseCard: { marginBottom: 12 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { fontWeight: '600', flex: 1 },
  setsHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginTop: 8 },
  headerCell: { fontSize: 12, fontWeight: '600', opacity: 0.6, textTransform: 'uppercase' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  cell: { fontSize: 14 },
  setCol: { width: 30 },
  prevCol: { flex: 1, paddingRight: 8 },
  prevText: { opacity: 0.6 },
  inputCol: { width: 60, marginHorizontal: 4 },
  checkCol: { width: 40, margin: 0 },
  input: { height: 36, fontSize: 14 },
  addSetButton: { marginTop: 8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, backgroundColor: 'rgba(255,255,255,0.95)', gap: 12 },
  cancelButton: { flex: 1 },
  finishButton: { flex: 2 },
  restTimerModal: { backgroundColor: 'white', margin: 20, padding: 40, borderRadius: 16, alignItems: 'center' },
  restTimerText: { fontWeight: '700', marginBottom: 8 },
  restTimerButtons: { flexDirection: 'row', gap: 16, marginTop: 24 },
});
