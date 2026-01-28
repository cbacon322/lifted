import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput as RNTextInput, Animated } from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  Icon,
  IconButton,
  Portal,
  Modal,
} from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '../../App';

// Import from shared
import {
  WorkoutInstance,
  calculateDuration,
} from '../../../shared/models';
import {
  getWorkout,
  saveWorkout,
  deleteWorkout,
  getDevUserId,
} from '../../../shared/services/firebase';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

interface Props {
  workoutId: string;
}

export default function WorkoutDetailScreen({ workoutId }: Props) {
  const { goBack, setTitle } = useNavigation();
  const [workout, setWorkout] = useState<WorkoutInstance | null>(null);
  const [editedWorkout, setEditedWorkout] = useState<WorkoutInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [deleteWorkoutModalVisible, setDeleteWorkoutModalVisible] = useState(false);
  const [deleteExerciseModalVisible, setDeleteExerciseModalVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<number | null>(null);
  const [saveChangesModalVisible, setSaveChangesModalVisible] = useState(false);

  const userId = getDevUserId();

  useEffect(() => {
    setTitle('HISTORY');
    loadWorkout();
  }, [workoutId]);

  // Deep clone workout while preserving Date objects
  const cloneWorkout = (w: WorkoutInstance): WorkoutInstance => {
    const cloned = JSON.parse(JSON.stringify(w));
    // Restore Date objects
    cloned.startTime = new Date(cloned.startTime);
    if (cloned.endTime) {
      cloned.endTime = new Date(cloned.endTime);
    }
    return cloned;
  };

  const loadWorkout = async () => {
    try {
      const loadedWorkout = await getWorkout(userId, workoutId);
      if (loadedWorkout) {
        setWorkout(loadedWorkout);
        setEditedWorkout(cloneWorkout(loadedWorkout));
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load workout:', error);
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (workout) {
      setEditedWorkout(cloneWorkout(workout));
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Show save changes modal
    setSaveChangesModalVisible(true);
  };

  const handleSaveAndExit = async () => {
    setSaveChangesModalVisible(false);
    await handleSave();
  };

  const handleDiscardChanges = () => {
    setSaveChangesModalVisible(false);
    if (workout) {
      setEditedWorkout(cloneWorkout(workout));
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedWorkout) return;

    setSaving(true);
    try {
      await saveWorkout(editedWorkout);
      setWorkout(editedWorkout);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save workout:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetWeight = (exerciseIndex: number, setIndex: number, value: string) => {
    if (!editedWorkout) return;

    const numValue = value === '' ? undefined : parseFloat(value);
    const updated = { ...editedWorkout };
    updated.exercises = [...updated.exercises];
    updated.exercises[exerciseIndex] = { ...updated.exercises[exerciseIndex] };
    updated.exercises[exerciseIndex].sets = [...updated.exercises[exerciseIndex].sets];
    updated.exercises[exerciseIndex].sets[setIndex] = {
      ...updated.exercises[exerciseIndex].sets[setIndex],
      actualWeight: numValue,
    };
    setEditedWorkout(updated);
  };

  const updateSetReps = (exerciseIndex: number, setIndex: number, value: string) => {
    if (!editedWorkout) return;

    const numValue = value === '' ? undefined : parseInt(value, 10);
    const updated = { ...editedWorkout };
    updated.exercises = [...updated.exercises];
    updated.exercises[exerciseIndex] = { ...updated.exercises[exerciseIndex] };
    updated.exercises[exerciseIndex].sets = [...updated.exercises[exerciseIndex].sets];
    updated.exercises[exerciseIndex].sets[setIndex] = {
      ...updated.exercises[exerciseIndex].sets[setIndex],
      actualReps: numValue,
    };
    setEditedWorkout(updated);
  };

  const deleteExercise = (exerciseIndex: number) => {
    setExerciseToDelete(exerciseIndex);
    setDeleteExerciseModalVisible(true);
  };

  const confirmDeleteExercise = () => {
    if (exerciseToDelete === null || !editedWorkout) return;

    const updated = { ...editedWorkout };
    updated.exercises = updated.exercises.filter((_, idx) => idx !== exerciseToDelete);
    setEditedWorkout(updated);
    setDeleteExerciseModalVisible(false);
    setExerciseToDelete(null);
  };

  const handleDeleteWorkout = () => {
    setDeleteWorkoutModalVisible(true);
  };

  const confirmDeleteWorkout = async () => {
    try {
      await deleteWorkout(userId, workoutId);
      setDeleteWorkoutModalVisible(false);
      goBack();
    } catch (error) {
      console.error('Failed to delete workout:', error);
    }
  };

  // Render delete action for swipeable
  const renderDeleteAction = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    onDelete: () => void
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={onDelete}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon source="delete" size={24} color="#FFFFFF" />
        </Animated.View>
        <Animated.Text style={[styles.deleteActionText, { transform: [{ scale }] }]}>
          DELETE
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  // Format duration
  const formatDuration = (minutes: number | undefined): string => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>WORKOUT NOT FOUND</Text>
      </View>
    );
  }

  const displayWorkout = isEditing ? editedWorkout! : workout;
  const startDate = displayWorkout.startTime instanceof Date ? displayWorkout.startTime : new Date(displayWorkout.startTime);
  const endDate = displayWorkout.endTime ? (displayWorkout.endTime instanceof Date ? displayWorkout.endTime : new Date(displayWorkout.endTime)) : null;
  const duration = calculateDuration(displayWorkout);

  // Format date
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Format start time
  const startTimeStr = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Format end time
  const endTimeStr = endDate ? endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) : '-';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Workout Info Header */}
        <View style={styles.workoutHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text style={styles.workoutName}>{displayWorkout.templateName}</Text>
              <Text style={styles.workoutDate}>{dateStr}</Text>
              <Text style={styles.workoutTime}>{startTimeStr} → {endTimeStr}</Text>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.stat}>
                <Icon source="clock-outline" size={18} color="#E53935" />
                <Text style={styles.statValue}>{formatDuration(duration)}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerActionButton} onPress={handleDeleteWorkout}>
                  <Icon source="delete" size={20} color="#888888" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Exercises */}
        {displayWorkout.exercises.map((exercise, exerciseIndex) => {
          const completedSets = exercise.sets.filter(s => s.completed).length;
          const totalSets = exercise.sets.length;

          const exerciseCard = (
            <View style={styles.exerciseCard}>
              {/* Exercise Header */}
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.setCount}>
                  {completedSets}/{totalSets} sets
                </Text>
              </View>

              {/* Exercise Details */}
              {exercise.notes && (
                <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
              )}

              {/* Sets Table */}
              <View style={styles.setsContainer}>
                {/* Table Header */}
                <View style={styles.setRow}>
                  <Text style={[styles.setCell, styles.setHeader, styles.setNumberCell]}>SET</Text>
                  <Text style={[styles.setCell, styles.setHeader]}>WEIGHT</Text>
                  <Text style={[styles.setCell, styles.setHeader]}>REPS</Text>
                  <Text style={[styles.setCell, styles.setHeader, styles.statusCell]}>STATUS</Text>
                </View>

                {/* Set Rows */}
                {exercise.sets.map((set, setIndex) => {
                  const isCompleted = set.completed;
                  const isSkipped = set.skipped;
                  const weight = set.actualWeight ?? set.targetWeight ?? '';
                  const reps = set.actualReps ?? set.targetReps ?? '';

                  let status = '';
                  let statusColor = '#888888';
                  if (isCompleted) {
                    status = 'DONE';
                    statusColor = '#4CAF50';
                  } else if (isSkipped) {
                    status = 'SKIP';
                    statusColor = '#FF9800';
                  } else {
                    status = '-';
                  }

                  return (
                    <View
                      key={set.id}
                      style={[
                        styles.setRow,
                        !isCompleted && !isSkipped && styles.setRowIncomplete,
                      ]}
                    >
                      <Text style={[styles.setCell, styles.setNumberCell]}>{set.setNumber}</Text>
                      {isEditing ? (
                        <View style={styles.editCell}>
                          <RNTextInput
                            style={styles.editInput}
                            value={weight !== '' ? String(weight) : ''}
                            onChangeText={(v) => updateSetWeight(exerciseIndex, setIndex, v)}
                            keyboardType="numeric"
                            keyboardAppearance="dark"
                            placeholder="-"
                            placeholderTextColor="#555555"
                          />
                          <Text style={styles.editUnit}>lb</Text>
                        </View>
                      ) : (
                        <Text style={styles.setCell}>
                          {weight !== '' ? `${weight} lb` : '-'}
                        </Text>
                      )}
                      {isEditing ? (
                        <View style={styles.editCell}>
                          <RNTextInput
                            style={styles.editInput}
                            value={reps !== '' ? String(reps) : ''}
                            onChangeText={(v) => updateSetReps(exerciseIndex, setIndex, v)}
                            keyboardType="numeric"
                            keyboardAppearance="dark"
                            placeholder="-"
                            placeholderTextColor="#555555"
                          />
                        </View>
                      ) : (
                        <Text style={styles.setCell}>{reps !== '' ? reps : '-'}</Text>
                      )}
                      <Text style={[styles.setCell, styles.statusCell, { color: statusColor }]}>
                        {status}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );

          // Wrap in Swipeable only when editing
          if (isEditing) {
            return (
              <View key={exercise.id} style={styles.swipeableWrapper}>
                <Swipeable
                  renderRightActions={(progress, dragX) =>
                    renderDeleteAction(progress, dragX, () => deleteExercise(exerciseIndex))
                  }
                  rightThreshold={40}
                  overshootRight={false}
                >
                  {exerciseCard}
                </Swipeable>
              </View>
            );
          }

          return <View key={exercise.id} style={styles.exerciseWrapper}>{exerciseCard}</View>;
        })}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {isEditing ? (
          <>
            <View style={styles.backButtonContainer}>
              <IconButton
                icon="arrow-left"
                size={24}
                iconColor={saving ? '#444444' : '#888888'}
                onPress={handleCancel}
                disabled={saving}
                style={styles.backIconButton}
              />
            </View>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.primaryButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
              loading={saving}
              disabled={saving}
            >
              SAVE
            </Button>
          </>
        ) : (
          <>
            <View style={styles.backButtonContainer}>
              <IconButton
                icon="arrow-left"
                size={24}
                iconColor="#888888"
                onPress={goBack}
                style={styles.backIconButton}
              />
            </View>
            <Button
              mode="contained"
              onPress={handleEdit}
              style={styles.primaryButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
              icon="pencil"
            >
              EDIT
            </Button>
          </>
        )}
      </View>

      {/* Delete Workout Confirmation Modal */}
      <Portal>
        <Modal
          visible={deleteWorkoutModalVisible}
          onDismiss={() => setDeleteWorkoutModalVisible(false)}
          contentContainerStyle={styles.confirmModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.confirmModalTitle}>DELETE WORKOUT?</Text>
          <Text style={styles.confirmModalSubtitle}>
            Are you sure you want to delete this from history? You cannot undo this.
          </Text>
          <View style={styles.confirmModalButtons}>
            <Button
              mode="outlined"
              onPress={() => setDeleteWorkoutModalVisible(false)}
              style={styles.confirmModalButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={confirmDeleteWorkout}
              style={styles.confirmModalButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
            >
              DELETE
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Delete Exercise Confirmation Modal */}
      <Portal>
        <Modal
          visible={deleteExerciseModalVisible}
          onDismiss={() => setDeleteExerciseModalVisible(false)}
          contentContainerStyle={styles.confirmModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.confirmModalTitle}>DELETE EXERCISE?</Text>
          <Text style={styles.confirmModalSubtitle}>
            Are you sure you want to delete this exercise? You cannot undo this.
          </Text>
          <View style={styles.confirmModalButtons}>
            <Button
              mode="outlined"
              onPress={() => setDeleteExerciseModalVisible(false)}
              style={styles.confirmModalButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={confirmDeleteExercise}
              style={styles.confirmModalButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
            >
              DELETE
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Save Changes Confirmation Modal */}
      <Portal>
        <Modal
          visible={saveChangesModalVisible}
          onDismiss={() => setSaveChangesModalVisible(false)}
          contentContainerStyle={styles.confirmModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.confirmModalTitle}>SAVE CHANGES?</Text>
          <Text style={styles.confirmModalSubtitle}>
            Do you want to save your changes before exiting?
          </Text>
          <View style={styles.confirmModalButtons}>
            <Button
              mode="outlined"
              onPress={handleDiscardChanges}
              style={styles.confirmModalButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
            >
              NO
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveAndExit}
              style={styles.confirmModalButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
            >
              YES
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
  errorText: {
    fontFamily: typewriterFont,
    fontSize: 16,
    color: '#E53935',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Header
  workoutHeader: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
  },
  workoutName: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
  },
  workoutDate: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#EF5350',
    marginTop: 4,
    opacity: 0.9,
  },
  workoutTime: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  headerStats: {
    alignItems: 'flex-end',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontFamily: typewriterFont,
    fontSize: 18,
    fontWeight: '700',
    color: '#E53935',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  headerActionButton: {
    padding: 4,
  },
  // Exercise wrapper (for non-edit mode)
  exerciseWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  // Swipeable wrapper
  swipeableWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  // Delete action
  deleteAction: {
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 8,
  },
  deleteActionText: {
    fontFamily: typewriterFont,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 1,
  },
  // Exercise Card
  exerciseCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontFamily: typewriterFont,
    fontSize: 16,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
    flex: 1,
  },
  setCount: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
  },
  exerciseNotes: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  // Sets Table
  setsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: 8,
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    alignItems: 'center',
  },
  setRowIncomplete: {
    opacity: 0.5,
  },
  setCell: {
    flex: 1,
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#EF5350',
    textAlign: 'center',
  },
  setHeader: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '700',
  },
  setNumberCell: {
    flex: 0.5,
  },
  statusCell: {
    flex: 0.8,
  },
  // Edit mode
  editCell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editInput: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#EF5350',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E53935',
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 40,
  },
  editUnit: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
    marginLeft: 4,
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 28,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    gap: 12,
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
  backButtonContainer: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555',
    justifyContent: 'center',
    alignItems: 'center',
    height: 38,
  },
  backIconButton: {
    margin: 0,
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
  // Confirmation Modals
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  confirmModal: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  confirmModalTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 8,
    letterSpacing: 2,
  },
  confirmModalSubtitle: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#555555',
  },
});
