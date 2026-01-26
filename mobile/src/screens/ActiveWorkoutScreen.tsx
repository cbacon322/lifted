import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput as RNTextInput, Platform } from 'react-native';
import {
  Text,
  Button,
  IconButton,
  Portal,
  Modal,
  Menu,
} from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '../../App';
import { useWorkoutContext } from '../context/WorkoutContext';

// Import from shared
import {
  WorkoutTemplate,
  WorkoutInstance,
  Set as WorkoutSet,
  Exercise,
  createWorkoutInstance,
  PreviousWorkoutData,
  ExerciseLibraryItem,
  createExerciseLibraryItem,
} from '../../../shared/models';
import {
  getTemplate,
  saveWorkout,
  getPreviousWorkoutData,
  getDevUserId,
  subscribeToExerciseLibrary,
  saveExerciseToLibrary,
} from '../../../shared/services/firebase';
import { formatPreviousSet } from '../../../shared/utils';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

interface Props {
  templateId: string;
}

export default function ActiveWorkoutScreen({ templateId }: Props) {
  const { navigate, goBack, setTitle } = useNavigation();
  const workoutContext = useWorkoutContext();

  const [workout, setWorkout] = useState<WorkoutInstance | null>(null);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [previousData, setPreviousData] = useState<Map<string, PreviousWorkoutData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);

  // Inline rest timers per set (key: `${exerciseIndex}-${setIndex}`)
  const [inlineRestTimers, setInlineRestTimers] = useState<Map<string, number>>(new Map());

  // Workout duration timer - use context for persistence
  const elapsedSeconds = workoutContext.elapsedSeconds;

  // Back button modal
  const [backModalVisible, setBackModalVisible] = useState(false);

  // Exercise menu and details visibility
  const [menuVisible, setMenuVisible] = useState<number | null>(null);
  const [detailsVisible, setDetailsVisible] = useState<Set<number>>(new Set());

  // Add exercise state
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');

  const userId = getDevUserId();

  // Initialize or restore workout
  useEffect(() => {
    // Check if we're resuming an existing workout from context
    if (workoutContext.isWorkoutRunning && workoutContext.activeTemplate?.id === templateId) {
      // Restore from context
      setWorkout(workoutContext.activeWorkout);
      setTemplate(workoutContext.activeTemplate);
      setPreviousData(workoutContext.previousData);
      setTitle(workoutContext.activeTemplate?.name || 'LIFTING');
      setLoading(false);
      // Resume the timer
      workoutContext.resumeTimer();
    } else {
      // Start a new workout
      initializeWorkout();
    }
  }, [templateId]);

  // Sync workout state to context whenever it changes
  useEffect(() => {
    if (workout && template) {
      workoutContext.setActiveWorkout(workout);
      workoutContext.setActiveTemplate(template);
      workoutContext.setPreviousData(previousData);
    }
  }, [workout, template, previousData]);

  // Subscribe to exercise library
  useEffect(() => {
    const unsubscribe = subscribeToExerciseLibrary(userId, (exercises) => {
      setExerciseLibrary(exercises);
    });
    return () => unsubscribe();
  }, [userId]);

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

  const deleteSet = (exerciseIndex: number, setIndex: number) => {
    if (!workout) return;
    const exercise = workout.exercises[exerciseIndex];

    // Don't allow deleting if only one set remains
    if (exercise.sets.length <= 1) {
      Alert.alert('Cannot Delete', 'Exercise must have at least one set.');
      return;
    }

    setWorkout(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const newSets = newExercises[exerciseIndex].sets.filter((_, i) => i !== setIndex);
      // Renumber sets
      const renumberedSets = newSets.map((s, i) => ({ ...s, setNumber: i + 1 }));
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: renumberedSets };
      return { ...prev, exercises: newExercises };
    });
  };

  const completeAllSets = (exerciseIndex: number) => {
    if (!workout) return;
    const exercise = workout.exercises[exerciseIndex];
    const allCompleted = exercise.sets.every(s => s.completed);

    setWorkout(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const newSets = newExercises[exerciseIndex].sets.map(s => ({
        ...s,
        completed: !allCompleted,
      }));
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
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

  // Filter exercises for autocomplete
  const filteredExercises = exerciseLibrary.filter(ex =>
    ex.name.toLowerCase().includes(newExerciseName.toLowerCase()) &&
    !workout?.exercises.some(e => e.name.toLowerCase() === ex.name.toLowerCase())
  );

  // Check if exercise name already exists in current workout
  const exerciseExistsInWorkout = (name: string): boolean => {
    if (!workout) return false;
    return workout.exercises.some(e => e.name.toLowerCase() === name.toLowerCase());
  };

  const addExerciseFromLibrary = async (libraryItem: ExerciseLibraryItem) => {
    if (!workout) return;

    if (exerciseExistsInWorkout(libraryItem.name)) {
      Alert.alert('Duplicate', `${libraryItem.name} is already in this workout.`);
      return;
    }

    // Fetch previous data for this exercise
    const prevData = await getPreviousWorkoutData(userId, [libraryItem.name]);
    const prevExercise = prevData.get(libraryItem.name.toLowerCase());

    const newExercise: Exercise = {
      id: `exercise_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: libraryItem.name,
      exerciseType: libraryItem.exerciseType,
      sets: [{
        id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        setNumber: 1,
        targetReps: prevExercise?.sets[0]?.reps || 10,
        targetWeight: prevExercise?.sets[0]?.weight,
        completed: false,
        skipped: false,
      }],
      notes: libraryItem.notes,
      order: workout.exercises.length,
    };

    setWorkout(prev => {
      if (!prev) return prev;
      return { ...prev, exercises: [...prev.exercises, newExercise] };
    });

    // Update previous data map
    if (prevExercise) {
      setPreviousData(prev => new Map(prev).set(libraryItem.name.toLowerCase(), prevExercise));
    }

    setAddExerciseModalVisible(false);
    setNewExerciseName('');
  };

  const createAndAddExercise = async () => {
    if (!workout || !newExerciseName.trim()) return;

    const trimmedName = newExerciseName.trim();

    if (exerciseExistsInWorkout(trimmedName)) {
      Alert.alert('Duplicate', `${trimmedName} is already in this workout.`);
      return;
    }

    // Save to exercise library
    const libraryItem = createExerciseLibraryItem(userId, trimmedName, 'strength');
    await saveExerciseToLibrary(libraryItem);

    // Fetch previous data for this exercise
    const prevData = await getPreviousWorkoutData(userId, [trimmedName]);
    const prevExercise = prevData.get(trimmedName.toLowerCase());

    // Add to workout
    const newExercise: Exercise = {
      id: `exercise_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
      exerciseType: 'strength',
      sets: [{
        id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        setNumber: 1,
        targetReps: prevExercise?.sets[0]?.reps || 10,
        targetWeight: prevExercise?.sets[0]?.weight,
        completed: false,
        skipped: false,
      }],
      order: workout.exercises.length,
    };

    setWorkout(prev => {
      if (!prev) return prev;
      return { ...prev, exercises: [...prev.exercises, newExercise] };
    });

    // Update previous data map
    if (prevExercise) {
      setPreviousData(prev => new Map(prev).set(trimmedName.toLowerCase(), prevExercise));
    }

    setAddExerciseModalVisible(false);
    setNewExerciseName('');
  };

  const handleFinishWorkout = async () => {
    if (!workout || !template) return;

    const emptyExercises = workout.exercises.filter(ex =>
      ex.sets.every(s => !s.completed && s.actualReps === undefined && s.actualWeight === undefined)
    );

    if (emptyExercises.length > 0) {
      const exerciseList = emptyExercises.map(e => `• ${e.name}`).join('\n');
      Alert.alert(
        'Empty Exercises',
        `The following exercises have no values:\n\n${exerciseList}\n\nSkip them?`,
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
    setBackModalVisible(true);
  };

  const handleCancelAndDiscard = () => {
    setBackModalVisible(false);
    workoutContext.clearWorkout();
    navigate({ name: 'TemplateList' }, { reset: true });
  };

  const handleKeepRunningGoHome = () => {
    setBackModalVisible(false);
    // Workout stays in context, just navigate home
    navigate({ name: 'TemplateList' }, { reset: true });
  };

  if (loading || !workout) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>LOADING...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
              <Text style={styles.exerciseName}>
                {exercise.name.toUpperCase()}
              </Text>
              <Menu
                visible={menuVisible === exerciseIndex}
                onDismiss={() => setMenuVisible(null)}
                contentStyle={styles.menuContent}
                anchor={
                  <IconButton
                    icon="dots-horizontal"
                    size={20}
                    iconColor="#E53935"
                    onPress={() => setMenuVisible(exerciseIndex)}
                    style={styles.menuButton}
                  />
                }
              >
                <Menu.Item
                  onPress={() => toggleDetailsVisible(exerciseIndex)}
                  title={detailsVisible.has(exerciseIndex) ? "Hide Details" : "Show Details"}
                  titleStyle={styles.menuItemText}
                  leadingIcon={detailsVisible.has(exerciseIndex) ? "eye-off" : "eye"}
                />
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(null);
                    Alert.alert('Superset', 'Superset functionality coming soon!');
                  }}
                  title="Superset"
                  titleStyle={styles.menuItemText}
                  leadingIcon="link-variant"
                />
                <Menu.Item
                  onPress={() => deleteExercise(exerciseIndex)}
                  title="Delete Exercise"
                  titleStyle={styles.menuItemText}
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
              <Text style={[styles.headerCell, styles.setCol]}>SET</Text>
              <Text style={[styles.headerCell, styles.prevCol]}>PREVIOUS</Text>
              <Text style={[styles.headerCell, styles.inputCol]}>LBS</Text>
              <Text style={[styles.headerCell, styles.inputCol]}>REPS</Text>
              <TouchableOpacity
                style={styles.checkCol}
                onPress={() => completeAllSets(exerciseIndex)}
              >
                <IconButton
                  icon={exercise.sets.every(s => s.completed) ? 'check-circle' : 'check-circle-outline'}
                  iconColor={exercise.sets.every(s => s.completed) ? '#4CAF50' : '#888888'}
                  size={18}
                  style={styles.headerCheckButton}
                />
              </TouchableOpacity>
            </View>

            {/* Sets */}
            {exercise.sets.map((set, setIndex) => {
              const prevExerciseData = previousData.get(exercise.name.toLowerCase());
              const prevSet = prevExerciseData?.sets[setIndex];
              const restKey = `${exerciseIndex}-${setIndex}`;
              const restRemaining = inlineRestTimers.get(restKey) || 0;

              const renderRightActions = () => (
                <TouchableOpacity
                  style={styles.deleteSwipeAction}
                  onPress={() => deleteSet(exerciseIndex, setIndex)}
                >
                  <IconButton
                    icon="delete"
                    iconColor="#FFFFFF"
                    size={20}
                    style={{ margin: 0 }}
                  />
                </TouchableOpacity>
              );

              return (
                <View key={set.id}>
                  <Swipeable
                    renderRightActions={exercise.sets.length > 1 ? renderRightActions : undefined}
                    overshootRight={false}
                  >
                    <View style={[
                      styles.setRow,
                      set.completed && styles.setRowCompleted
                    ]}>
                      <Text style={[styles.cell, styles.setColData, set.completed && styles.completedText]}>
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
                      <RNTextInput
                        style={[styles.input, set.completed && styles.inputCompleted]}
                        keyboardType="numeric"
                        value={set.actualWeight?.toString() || ''}
                        onChangeText={(v) => updateSet(exerciseIndex, setIndex, 'weight', v)}
                        placeholder={set.targetWeight?.toString()}
                        placeholderTextColor="#666666"
                        keyboardAppearance="dark"
                      />
                      <RNTextInput
                        style={[styles.input, set.completed && styles.inputCompleted]}
                        keyboardType="numeric"
                        value={set.actualReps?.toString() || ''}
                        onChangeText={(v) => updateSet(exerciseIndex, setIndex, 'reps', v)}
                        placeholder={set.targetReps?.toString()}
                        placeholderTextColor="#666666"
                        keyboardAppearance="dark"
                      />
                      <IconButton
                        icon={set.completed ? 'check-circle' : 'circle-outline'}
                        iconColor={set.completed ? '#4CAF50' : '#B71C1C'}
                        size={24}
                        style={styles.checkButton}
                        onPress={() => toggleSetComplete(exerciseIndex, setIndex)}
                      />
                    </View>
                  </Swipeable>

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
              textColor="#E53935"
              labelStyle={styles.addSetLabel}
            >
              + ADD SET {exercise.restTimer ? `(${formatTime(exercise.restTimer)})` : ''}
            </Button>
          </View>
        ))}

        {/* Add Exercise Button */}
        <Button
          mode="outlined"
          onPress={() => setAddExerciseModalVisible(true)}
          style={styles.addExerciseButton}
          textColor="#E53935"
          labelStyle={styles.addExerciseLabel}
          icon="plus"
        >
          ADD EXERCISE
        </Button>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancelWorkout}
        >
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor="#888888"
            style={{ margin: 0 }}
          />
        </TouchableOpacity>
        <Button
          mode="contained"
          onPress={handleFinishWorkout}
          style={styles.primaryButton}
          buttonColor="#E53935"
          textColor="#000000"
          labelStyle={styles.buttonLabel}
        >
          FINISH
        </Button>
      </View>

      {/* Rest Timer Modal */}
      <Portal>
        <Modal
          visible={restTimerVisible}
          onDismiss={() => setRestTimerVisible(false)}
          contentContainerStyle={styles.restTimerModal}
        >
          <Text style={styles.modalTimerText}>
            {formatTime(restTimeRemaining)}
          </Text>
          <Text style={styles.modalRestLabel}>REST TIME</Text>
          <View style={styles.restTimerButtons}>
            <Button
              onPress={() => setRestTimeRemaining(prev => prev + 30)}
              textColor="#E53935"
              labelStyle={styles.modalButtonLabel}
            >
              +30s
            </Button>
            <Button
              onPress={() => setRestTimerVisible(false)}
              textColor="#E53935"
              labelStyle={styles.modalButtonLabel}
            >
              SKIP
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Add Exercise Modal */}
      <Portal>
        <Modal
          visible={addExerciseModalVisible}
          onDismiss={() => {
            setAddExerciseModalVisible(false);
            setNewExerciseName('');
          }}
          contentContainerStyle={styles.addExerciseModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.addExerciseTitle}>ADD EXERCISE</Text>

          <RNTextInput
            style={styles.addExerciseInput}
            value={newExerciseName}
            onChangeText={setNewExerciseName}
            placeholder="Exercise name"
            placeholderTextColor="#666666"
            keyboardAppearance="dark"
            autoFocus
          />

          {/* Suggestions from library */}
          {newExerciseName.length > 0 && filteredExercises.length > 0 && (
            <View style={styles.suggestionsList}>
              <Text style={styles.suggestionsTitle}>FROM YOUR LIBRARY:</Text>
              <ScrollView style={styles.suggestionsScroll} nestedScrollEnabled>
                {filteredExercises.slice(0, 5).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionItem}
                    onPress={() => addExerciseFromLibrary(item)}
                  >
                    <Text style={styles.suggestionText}>{item.name}</Text>
                    <Text style={styles.suggestionType}>{item.exerciseType}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.addExerciseButtons}>
            <Button
              mode="outlined"
              onPress={() => {
                setAddExerciseModalVisible(false);
                setNewExerciseName('');
              }}
              style={styles.modalHalfButton}
              textColor="#E53935"
              labelStyle={styles.buttonLabel}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={createAndAddExercise}
              style={styles.modalHalfButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
              disabled={!newExerciseName.trim()}
            >
              ADD
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Back Button Modal */}
      <Portal>
        <Modal
          visible={backModalVisible}
          onDismiss={() => setBackModalVisible(false)}
          contentContainerStyle={styles.backModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.backModalTitle}>LEAVE WORKOUT?</Text>
          <Text style={styles.backModalSubtitle}>
            Your workout is still running. What would you like to do?
          </Text>

          <View style={styles.backModalButtons}>
            <Button
              mode="outlined"
              onPress={handleCancelAndDiscard}
              style={styles.backModalButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
            >
              CANCEL WORKOUT
            </Button>
            <Button
              mode="contained"
              onPress={handleKeepRunningGoHome}
              style={styles.backModalButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
            >
              RUN IN BACKGROUND
            </Button>
            <Button
              mode="text"
              onPress={() => setBackModalVisible(false)}
              textColor="#666666"
              labelStyle={styles.backModalContinueLabel}
            >
              Continue Workout
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    fontFamily: typewriterFont,
    fontSize: 16,
    color: '#E53935',
    letterSpacing: 2,
  },

  // Workout header
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    backgroundColor: '#000000',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerDate: {
    fontFamily: typewriterFont,
    fontSize: 13,
    color: '#888888',
  },
  headerTimer: {
    fontFamily: typewriterFont,
    fontSize: 18,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
  },

  scrollContent: { padding: 12, paddingBottom: 100 },

  // Exercise section
  exerciseSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontFamily: typewriterFont,
    fontSize: 15,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
  },
  menuButton: { margin: 0 },
  menuContent: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  menuItemText: {
    fontFamily: typewriterFont,
    color: '#EF5350',
  },
  exerciseNotes: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#FF6659',
    marginTop: 4,
    marginBottom: 4,
    fontStyle: 'italic',
  },

  // Sets table
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    marginBottom: 4,
  },
  headerCell: {
    fontFamily: typewriterFont,
    fontSize: 10,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 1,
  },
  setCol: { width: 28 },
  setColData: {
    width: 28,
    textAlign: 'right',
    paddingRight: 8,
    fontFamily: typewriterFont,
  },
  prevCol: { flex: 1, paddingRight: 4 },
  inputCol: { width: 52, marginHorizontal: 2, textAlign: 'center' },
  checkCol: { width: 36, alignItems: 'center', justifyContent: 'center' },
  headerCheckButton: { margin: 0, padding: 0 },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 2,
  },
  setRowCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  deleteSwipeAction: {
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    borderRadius: 4,
    marginVertical: 2,
  },
  cell: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#EF5350',
  },
  completedText: {
    fontWeight: '700',
    color: '#4CAF50',
  },
  prevText: {
    fontFamily: typewriterFont,
    color: '#888888',
    fontSize: 12,
  },
  input: {
    fontFamily: typewriterFont,
    width: 52,
    height: 28,
    fontSize: 13,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    textAlign: 'center',
    backgroundColor: '#0A0A0A',
    color: '#EF5350',
  },
  inputCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    color: '#4CAF50',
  },
  checkButton: { margin: 0 },

  // Inline rest timer
  inlineRestTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  restTimerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E53935',
  },
  restTimerText: {
    fontFamily: typewriterFont,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
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
    backgroundColor: '#2A2A2A',
  },
  restIndicatorText: {
    fontFamily: typewriterFont,
    paddingHorizontal: 8,
    fontSize: 11,
    color: '#888888',
  },

  addSetButton: { marginTop: 8, alignSelf: 'flex-start' },
  addSetLabel: {
    fontFamily: typewriterFont,
    fontSize: 12,
    letterSpacing: 1,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 28,
    backgroundColor: '#000000',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  backButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555',
    justifyContent: 'center',
    alignItems: 'center',
    height: 38,
  },
  primaryButton: {
    flex: 4,
    borderRadius: 8,
    justifyContent: 'center',
    height: 38,
  },
  buttonLabel: {
    fontFamily: typewriterFont,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Modal
  restTimerModal: {
    backgroundColor: '#1A1A1A',
    margin: 20,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  modalTimerText: {
    fontFamily: typewriterFont,
    fontSize: 48,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 8,
    letterSpacing: 4,
  },
  modalRestLabel: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    letterSpacing: 2,
  },
  restTimerButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  modalButtonLabel: {
    fontFamily: typewriterFont,
    letterSpacing: 1,
  },

  // Add Exercise styles
  addExerciseButton: {
    marginTop: 12,
    marginBottom: 8,
    borderColor: '#E53935',
    borderRadius: 8,
  },
  addExerciseLabel: {
    fontFamily: typewriterFont,
    fontSize: 14,
    letterSpacing: 1,
  },
  addExerciseModal: {
    marginHorizontal: 20,
    marginTop: 80,
    marginBottom: 'auto',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  addExerciseTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 16,
    letterSpacing: 2,
  },
  addExerciseInput: {
    fontFamily: typewriterFont,
    fontSize: 16,
    padding: 12,
    color: '#EF5350',
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  suggestionsList: {
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontFamily: typewriterFont,
    fontSize: 11,
    color: '#888888',
    letterSpacing: 1,
    marginBottom: 8,
  },
  suggestionsScroll: {
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0A0A0A',
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  suggestionText: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#EF5350',
  },
  suggestionType: {
    fontFamily: typewriterFont,
    fontSize: 11,
    color: '#888888',
    textTransform: 'uppercase',
  },
  addExerciseButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalHalfButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#E53935',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },

  // Back modal styles
  backModal: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  backModalTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 8,
    letterSpacing: 2,
  },
  backModalSubtitle: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
  },
  backModalButtons: {
    gap: 12,
  },
  backModalButton: {
    borderRadius: 8,
    borderColor: '#555555',
  },
  backModalContinueLabel: {
    fontFamily: typewriterFont,
    fontSize: 12,
    letterSpacing: 1,
  },
});
