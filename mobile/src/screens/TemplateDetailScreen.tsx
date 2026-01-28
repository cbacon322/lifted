import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  Portal,
  Modal,
  Divider,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '../../App';
import { useWorkoutContext } from '../context/WorkoutContext';

// Import from shared
import {
  WorkoutTemplate,
  Exercise,
  Set,
  ExerciseLibraryItem,
  createExerciseLibraryItem,
} from '../../../shared/models';
import {
  getTemplate,
  updateTemplate,
  unarchiveTemplate,
  getDevUserId,
  subscribeToExerciseLibrary,
  saveExerciseToLibrary,
} from '../../../shared/services/firebase';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

interface Props {
  templateId: string;
}

export default function TemplateDetailScreen({ templateId }: Props) {
  const { navigate, goBack } = useNavigation();
  const workoutContext = useWorkoutContext();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<WorkoutTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Workout already running modal
  const [workoutRunningModalVisible, setWorkoutRunningModalVisible] = useState(false);

  // Reinstate modal (for archived templates)
  const [reinstateModalVisible, setReinstateModalVisible] = useState(false);

  // Add exercise state
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');

  const userId = getDevUserId();

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  // Subscribe to exercise library
  useEffect(() => {
    const unsubscribe = subscribeToExerciseLibrary(userId, (exercises) => {
      setExerciseLibrary(exercises);
    });
    return () => unsubscribe();
  }, [userId]);

  const loadTemplate = async () => {
    try {
      const loaded = await getTemplate(userId, templateId);
      setTemplate(loaded);
    } catch (error) {
      console.error('Failed to load template:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    if (template) {
      setEditedTemplate(JSON.parse(JSON.stringify(template)));
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setEditedTemplate(null);
    setIsEditing(false);
  };

  const saveChanges = async () => {
    if (!editedTemplate) return;

    setSaving(true);
    try {
      await updateTemplate(userId, templateId, {
        name: editedTemplate.name,
        description: editedTemplate.description,
        exercises: editedTemplate.exercises,
      });
      setTemplate(editedTemplate);
      setIsEditing(false);
      setEditedTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateExerciseName = (exerciseIndex: number, name: string) => {
    if (!editedTemplate) return;
    const updated = { ...editedTemplate };
    updated.exercises[exerciseIndex].name = name;
    setEditedTemplate(updated);
  };

  const updateExerciseSet = (exerciseIndex: number, setIndex: number, field: 'targetReps' | 'targetWeight', value: string) => {
    if (!editedTemplate) return;
    const updated = { ...editedTemplate };
    const numValue = parseInt(value) || 0;
    updated.exercises[exerciseIndex].sets[setIndex][field] = numValue || undefined;
    setEditedTemplate(updated);
  };

  const addSet = (exerciseIndex: number) => {
    if (!editedTemplate) return;
    const updated = { ...editedTemplate };
    const exercise = updated.exercises[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: Set = {
      id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      setNumber: exercise.sets.length + 1,
      targetReps: lastSet?.targetReps,
      targetWeight: lastSet?.targetWeight,
      targetTime: lastSet?.targetTime,
      targetDistance: lastSet?.targetDistance,
      completed: false,
      skipped: false,
    };
    exercise.sets.push(newSet);
    setEditedTemplate(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    if (!editedTemplate) return;
    const updated = { ...editedTemplate };
    if (updated.exercises[exerciseIndex].sets.length > 1) {
      updated.exercises[exerciseIndex].sets.splice(setIndex, 1);
      setEditedTemplate(updated);
    }
  };

  const removeExercise = (exerciseIndex: number) => {
    if (!editedTemplate) return;
    Alert.alert(
      'Delete Exercise',
      `Remove ${editedTemplate.exercises[exerciseIndex].name} from this template?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = { ...editedTemplate };
            updated.exercises.splice(exerciseIndex, 1);
            // Update order numbers
            updated.exercises.forEach((ex, i) => { ex.order = i; });
            setEditedTemplate(updated);
          },
        },
      ]
    );
  };

  // Filter exercises for autocomplete
  const filteredExercises = exerciseLibrary.filter(ex =>
    ex.name.toLowerCase().includes(newExerciseName.toLowerCase()) &&
    !editedTemplate?.exercises.some(e => e.name.toLowerCase() === ex.name.toLowerCase())
  );

  // Check if exercise name already exists in current template
  const exerciseExistsInTemplate = (name: string): boolean => {
    if (!editedTemplate) return false;
    return editedTemplate.exercises.some(e => e.name.toLowerCase() === name.toLowerCase());
  };

  const addExerciseFromLibrary = (libraryItem: ExerciseLibraryItem) => {
    if (!editedTemplate) return;

    if (exerciseExistsInTemplate(libraryItem.name)) {
      Alert.alert('Duplicate', `${libraryItem.name} is already in this template.`);
      return;
    }

    const newExercise: Exercise = {
      id: `exercise_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: libraryItem.name,
      exerciseType: libraryItem.exerciseType,
      sets: [{
        id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        setNumber: 1,
        targetReps: 10,
        targetWeight: undefined,
        completed: false,
        skipped: false,
      }],
      notes: libraryItem.notes,
      order: editedTemplate.exercises.length,
    };

    const updated = { ...editedTemplate };
    updated.exercises.push(newExercise);
    setEditedTemplate(updated);
    setAddExerciseModalVisible(false);
    setNewExerciseName('');
  };

  const createAndAddExercise = async () => {
    if (!editedTemplate || !newExerciseName.trim()) return;

    const trimmedName = newExerciseName.trim();

    if (exerciseExistsInTemplate(trimmedName)) {
      Alert.alert('Duplicate', `${trimmedName} is already in this template.`);
      return;
    }

    // Save to exercise library
    const libraryItem = createExerciseLibraryItem(userId, trimmedName, 'strength');
    await saveExerciseToLibrary(libraryItem);

    // Add to template
    const newExercise: Exercise = {
      id: `exercise_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
      exerciseType: 'strength',
      sets: [{
        id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        setNumber: 1,
        targetReps: 10,
        targetWeight: undefined,
        completed: false,
        skipped: false,
      }],
      order: editedTemplate.exercises.length,
    };

    const updated = { ...editedTemplate };
    updated.exercises.push(newExercise);
    setEditedTemplate(updated);
    setAddExerciseModalVisible(false);
    setNewExerciseName('');
  };

  const formatSetSummary = (sets: Set[]): string => {
    if (sets.length === 0) return '—';
    const firstSet = sets[0];

    if (firstSet.targetTime) {
      const minutes = Math.floor(firstSet.targetTime / 60);
      const seconds = firstSet.targetTime % 60;
      const timeStr = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
      return `${sets.length} × ${timeStr}`;
    }
    if (firstSet.targetDistance) {
      return `${sets.length} × ${firstSet.targetDistance}m`;
    }
    if (firstSet.targetWeight && firstSet.targetReps) {
      return `${sets.length} × ${firstSet.targetReps} @ ${firstSet.targetWeight} lbs`;
    }
    if (firstSet.targetReps) {
      return `${sets.length} × ${firstSet.targetReps}`;
    }
    return `${sets.length} sets`;
  };

  const formatSetDetail = (set: Set, index: number): string => {
    const parts: string[] = [`Set ${index + 1}:`];
    if (set.targetReps) parts.push(`${set.targetReps} reps`);
    if (set.targetWeight) parts.push(`@ ${set.targetWeight} lbs`);
    if (set.targetTime) {
      const minutes = Math.floor(set.targetTime / 60);
      const seconds = set.targetTime % 60;
      parts.push(minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`);
    }
    if (set.targetDistance) parts.push(`${set.targetDistance}m`);
    return parts.join(' ');
  };

  const handleStartWorkout = () => {
    if (!template) return;

    // Check if a workout is already running
    if (workoutContext.isWorkoutRunning) {
      setWorkoutRunningModalVisible(true);
    } else {
      navigate({ name: 'ActiveWorkout', params: { templateId: template.id } });
    }
  };

  const handleFinishCurrentAndStart = () => {
    setWorkoutRunningModalVisible(false);
    // Navigate to the active workout to finish it
    // The user will go through the finish flow (skip modal, compare screen)
    // and then return to the template list
    if (workoutContext.activeTemplate) {
      navigate({ name: 'ActiveWorkout', params: { templateId: workoutContext.activeTemplate.id } });
    }
  };

  const handleReinstate = async () => {
    if (!template) return;
    try {
      await unarchiveTemplate(userId, template.id);
      setReinstateModalVisible(false);
      goBack();
    } catch (error) {
      console.error('Failed to reinstate template:', error);
      Alert.alert('Error', 'Failed to reinstate template. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>TEMPLATE NOT FOUND</Text>
        <Button
          mode="contained"
          onPress={goBack}
          buttonColor="#E53935"
          textColor="#000000"
          labelStyle={styles.buttonLabel}
        >
          GO BACK
        </Button>
      </View>
    );
  }

  const displayTemplate = isEditing ? editedTemplate : template;
  if (!displayTemplate) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={editedTemplate?.name || ''}
              onChangeText={(text) => setEditedTemplate(prev => prev ? { ...prev, name: text } : null)}
              placeholder="Workout name"
              placeholderTextColor="#666666"
              keyboardAppearance="dark"
            />
          ) : (
            <View style={styles.titleRow}>
              <Text style={styles.title}>
                {displayTemplate.name.toUpperCase()}
              </Text>
              <View style={styles.headerButtons}>
                <IconButton
                  icon="pencil"
                  size={20}
                  iconColor="#888888"
                  onPress={startEditing}
                  style={styles.editHeaderButton}
                />
                {template?.archived && (
                  <IconButton
                    icon="restore"
                    size={20}
                    iconColor="#4CAF50"
                    onPress={() => setReinstateModalVisible(true)}
                    style={styles.editHeaderButton}
                  />
                )}
              </View>
            </View>
          )}
          {isEditing ? (
            <TextInput
              style={styles.descriptionInput}
              value={editedTemplate?.description || ''}
              onChangeText={(text) => setEditedTemplate(prev => prev ? { ...prev, description: text } : null)}
              placeholder="Description (optional)"
              placeholderTextColor="#666666"
              keyboardAppearance="dark"
              multiline
            />
          ) : (
            displayTemplate.description && (
              <Text style={styles.description}>
                {displayTemplate.description}
              </Text>
            )
          )}
        </View>

        {/* Exercises - Compact List */}
        <View style={styles.exerciseList}>
          {displayTemplate.exercises.map((exercise, exerciseIndex) => (
            <View key={exercise.id}>
              {isEditing ? (
                <View style={styles.editExerciseRow}>
                  <View style={styles.exerciseNameRow}>
                    <TextInput
                      style={styles.exerciseNameInput}
                      value={exercise.name}
                      onChangeText={(text) => updateExerciseName(exerciseIndex, text)}
                      placeholderTextColor="#666666"
                      keyboardAppearance="dark"
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor="#E53935"
                      onPress={() => removeExercise(exerciseIndex)}
                      style={styles.deleteExerciseButton}
                    />
                  </View>
                  <View style={styles.editSets}>
                    {exercise.sets.map((set, setIndex) => (
                      <View key={set.id} style={styles.editSetRow}>
                        <Text style={styles.setLabel}>Set {setIndex + 1}</Text>
                        <TextInput
                          style={styles.setInput}
                          value={set.targetReps?.toString() || ''}
                          onChangeText={(text) => updateExerciseSet(exerciseIndex, setIndex, 'targetReps', text)}
                          keyboardType="numeric"
                          placeholder="reps"
                          placeholderTextColor="#666666"
                          keyboardAppearance="dark"
                        />
                        <Text style={styles.setMultiplier}> × </Text>
                        <TextInput
                          style={styles.setInput}
                          value={set.targetWeight?.toString() || ''}
                          onChangeText={(text) => updateExerciseSet(exerciseIndex, setIndex, 'targetWeight', text)}
                          keyboardType="numeric"
                          placeholder="lbs"
                          placeholderTextColor="#666666"
                          keyboardAppearance="dark"
                        />
                        <Text style={styles.setUnit}> lbs</Text>
                        {exercise.sets.length > 1 && (
                          <IconButton
                            icon="minus-circle-outline"
                            size={18}
                            iconColor="#E53935"
                            onPress={() => removeSet(exerciseIndex, setIndex)}
                            style={styles.removeSetButton}
                          />
                        )}
                      </View>
                    ))}
                    <Button
                      mode="text"
                      compact
                      onPress={() => addSet(exerciseIndex)}
                      style={styles.addSetButton}
                      textColor="#E53935"
                      labelStyle={styles.addSetLabel}
                    >
                      + ADD SET
                    </Button>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.exerciseRow}
                  onPress={() => setSelectedExercise(exercise)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {exercise.name}
                  </Text>
                  <Text style={styles.exerciseSummary}>
                    {formatSetSummary(exercise.sets)}
                  </Text>
                </TouchableOpacity>
              )}
              {exerciseIndex < displayTemplate.exercises.length - 1 && (
                <Divider style={styles.divider} />
              )}
            </View>
          ))}
        </View>

        {/* Add Exercise Button - only in edit mode */}
        {isEditing && (
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
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {isEditing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={cancelEditing}
              disabled={saving}
            >
              <IconButton
                icon="arrow-left"
                size={24}
                iconColor={saving ? '#444444' : '#888888'}
                style={{ margin: 0 }}
              />
            </TouchableOpacity>
            <Button
              mode="contained"
              onPress={saveChanges}
              style={styles.primaryButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
              loading={saving}
              disabled={saving}
            >
              SAVE
            </Button>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={goBack}
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
              style={styles.primaryButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
              onPress={handleStartWorkout}
            >
              START
            </Button>
          </View>
        )}
      </View>

      {/* Exercise Details Modal */}
      <Portal>
        <Modal
          visible={selectedExercise !== null && !isEditing}
          onDismiss={() => setSelectedExercise(null)}
          contentContainerStyle={styles.modal}
        >
          {selectedExercise && (
            <View>
              <Text style={styles.modalTitle}>
                {selectedExercise.name.toUpperCase()}
              </Text>

              {selectedExercise.notes && (
                <Text style={styles.modalNotes}>
                  {selectedExercise.notes}
                </Text>
              )}

              <View style={styles.modalSets}>
                {selectedExercise.sets.map((set, idx) => (
                  <Text key={set.id} style={styles.modalSetRow}>
                    {formatSetDetail(set, idx)}
                  </Text>
                ))}
              </View>

              {selectedExercise.restTimer && (
                <Text style={styles.modalRest}>
                  Rest: {selectedExercise.restTimer}s between sets
                </Text>
              )}

              <Button
                mode="contained"
                onPress={() => setSelectedExercise(null)}
                buttonColor="#E53935"
                textColor="#000000"
                labelStyle={styles.buttonLabel}
                style={styles.modalButton}
              >
                CLOSE
              </Button>
            </View>
          )}
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
          <Text style={styles.modalTitle}>ADD EXERCISE</Text>

          <TextInput
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

      {/* Workout Already Running Modal */}
      <Portal>
        <Modal
          visible={workoutRunningModalVisible}
          onDismiss={() => setWorkoutRunningModalVisible(false)}
          contentContainerStyle={styles.workoutRunningModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.workoutRunningTitle}>WORKOUT IN PROGRESS</Text>
          <Text style={styles.workoutRunningName}>
            {workoutContext.activeTemplate?.name.toUpperCase()}
          </Text>
          <Text style={styles.workoutRunningSubtitle}>
            You already have a workout running. Only one workout can run at a time.
          </Text>

          <View style={styles.workoutRunningButtons}>
            <Button
              mode="contained"
              onPress={handleFinishCurrentAndStart}
              style={styles.workoutRunningButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
            >
              GO TO CURRENT
            </Button>
            <Button
              mode="text"
              onPress={() => setWorkoutRunningModalVisible(false)}
              textColor="#666666"
              labelStyle={styles.workoutRunningCancelLabel}
            >
              Cancel
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Reinstate Confirmation Modal */}
      <Portal>
        <Modal
          visible={reinstateModalVisible}
          onDismiss={() => setReinstateModalVisible(false)}
          contentContainerStyle={styles.reinstateModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.reinstateModalTitle}>REINSTATE WORKOUT?</Text>
          <Text style={styles.reinstateModalSubtitle}>
            "{template?.name}" will be moved back to your Active Workouts list.
          </Text>
          <View style={styles.reinstateModalButtons}>
            <Button
              mode="outlined"
              onPress={() => setReinstateModalVisible(false)}
              style={styles.secondaryButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={handleReinstate}
              style={styles.reinstateButton}
              buttonColor="#4CAF50"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
            >
              REINSTATE
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
    fontSize: 18,
    color: '#E53935',
    marginBottom: 16,
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontFamily: typewriterFont,
    fontSize: 24,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 2,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editHeaderButton: {
    margin: 0,
  },
  titleInput: {
    fontFamily: typewriterFont,
    fontSize: 22,
    fontWeight: '700',
    color: '#E53935',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  description: {
    fontFamily: typewriterFont,
    fontSize: 14,
    marginTop: 8,
    color: '#888888',
  },
  descriptionInput: {
    fontFamily: typewriterFont,
    marginTop: 12,
    fontSize: 14,
    padding: 12,
    color: '#EF5350',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    minHeight: 60,
  },
  exerciseList: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  exerciseName: {
    fontFamily: typewriterFont,
    fontSize: 15,
    fontWeight: '600',
    color: '#EF5350',
    flex: 1,
    marginRight: 12,
  },
  exerciseSummary: {
    fontFamily: typewriterFont,
    fontSize: 13,
    color: '#888888',
  },
  divider: {
    backgroundColor: '#2A2A2A',
  },
  editExerciseRow: {
    paddingVertical: 12,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteExerciseButton: {
    margin: 0,
    marginLeft: 4,
  },
  exerciseNameInput: {
    fontFamily: typewriterFont,
    fontSize: 16,
    fontWeight: '600',
    padding: 10,
    color: '#EF5350',
    backgroundColor: '#0A0A0A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    flex: 1,
  },
  editSets: {
    marginLeft: 8,
  },
  editSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  setLabel: {
    fontFamily: typewriterFont,
    fontSize: 12,
    width: 50,
    color: '#888888',
  },
  setInput: {
    fontFamily: typewriterFont,
    width: 50,
    padding: 6,
    color: '#EF5350',
    backgroundColor: '#0A0A0A',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    textAlign: 'center',
  },
  setMultiplier: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
  },
  setUnit: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
  },
  removeSetButton: {
    margin: 0,
    marginLeft: 4,
  },
  addSetButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  addSetLabel: {
    fontFamily: typewriterFont,
    fontSize: 12,
    letterSpacing: 1,
  },
  addExerciseButton: {
    marginTop: 16,
    borderColor: '#E53935',
    borderRadius: 8,
  },
  addExerciseLabel: {
    fontFamily: typewriterFont,
    fontSize: 14,
    letterSpacing: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 28,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  buttonRow: {
    flexDirection: 'row',
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
  primaryButton: {
    flex: 4,
    borderRadius: 8,
    justifyContent: 'center',
    height: 38,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#555555',
  },
  buttonLabel: {
    fontFamily: typewriterFont,
    fontWeight: '700',
    letterSpacing: 2,
  },
  modal: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  modalTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 16,
    letterSpacing: 2,
  },
  modalNotes: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
    letterSpacing: 2,
    marginBottom: 8,
  },
  modalSets: {
    marginBottom: 16,
  },
  modalSetRow: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#EF5350',
    paddingVertical: 4,
  },
  modalRest: {
    fontFamily: typewriterFont,
    fontSize: 13,
    color: '#888888',
    marginBottom: 16,
  },
  modalButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  // Add Exercise Modal styles
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
  // Workout Running Modal styles
  workoutRunningModal: {
    marginHorizontal: 20,
    marginTop: 'auto',
    marginBottom: 'auto',
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  workoutRunningTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 12,
    letterSpacing: 2,
    textAlign: 'center',
  },
  workoutRunningSubtitle: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  workoutRunningName: {
    fontFamily: typewriterFont,
    fontSize: 16,
    fontWeight: '700',
    color: '#EF5350',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  workoutRunningButtons: {
    alignItems: 'center',
    gap: 8,
  },
  workoutRunningButton: {
    width: '100%',
    borderRadius: 8,
  },
  workoutRunningCancelLabel: {
    fontFamily: typewriterFont,
    fontSize: 14,
  },
  // Reinstate Modal styles
  reinstateModal: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  reinstateModalTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
    letterSpacing: 2,
  },
  reinstateModalSubtitle: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
  },
  reinstateModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reinstateButton: {
    flex: 1,
    borderRadius: 8,
  },
});
