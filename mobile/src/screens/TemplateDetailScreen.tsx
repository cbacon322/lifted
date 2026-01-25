import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  useTheme,
  Portal,
  Modal,
  Divider,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '../../App';

// Import from shared
import { WorkoutTemplate, Exercise, Set } from '../../../shared/models';
import { getTemplate, updateTemplate, getDevUserId } from '../../../shared/services/firebase';

interface Props {
  templateId: string;
}

export default function TemplateDetailScreen({ templateId }: Props) {
  const theme = useTheme();
  const { navigate, goBack } = useNavigation();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<WorkoutTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const userId = getDevUserId();

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

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
      // Deep clone the template for editing
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
      targetReps: lastSet?.targetReps,
      targetWeight: lastSet?.targetWeight,
      targetTime: lastSet?.targetTime,
      targetDistance: lastSet?.targetDistance,
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.centered}>
        <Text variant="titleMedium">Template not found</Text>
        <Button onPress={goBack}>Go Back</Button>
      </View>
    );
  }

  const displayTemplate = isEditing ? editedTemplate : template;
  if (!displayTemplate) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          {isEditing ? (
            <TextInput
              style={[styles.titleInput, { color: theme.colors.onBackground }]}
              value={editedTemplate?.name || ''}
              onChangeText={(text) => setEditedTemplate(prev => prev ? { ...prev, name: text } : null)}
              placeholder="Workout name"
            />
          ) : (
            <Text variant="titleLarge" style={styles.title}>
              {displayTemplate.name}
            </Text>
          )}
          {isEditing ? (
            <TextInput
              style={[styles.descriptionInput, { color: theme.colors.onBackground }]}
              value={editedTemplate?.description || ''}
              onChangeText={(text) => setEditedTemplate(prev => prev ? { ...prev, description: text } : null)}
              placeholder="Description (optional)"
              multiline
            />
          ) : (
            displayTemplate.description && (
              <Text variant="bodyMedium" style={styles.description}>
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
                  <TextInput
                    style={[styles.exerciseNameInput, { color: theme.colors.onBackground }]}
                    value={exercise.name}
                    onChangeText={(text) => updateExerciseName(exerciseIndex, text)}
                  />
                  <View style={styles.editSets}>
                    {exercise.sets.map((set, setIndex) => (
                      <View key={set.id} style={styles.editSetRow}>
                        <Text variant="bodySmall" style={styles.setLabel}>Set {setIndex + 1}</Text>
                        <TextInput
                          style={styles.setInput}
                          value={set.targetReps?.toString() || ''}
                          onChangeText={(text) => updateExerciseSet(exerciseIndex, setIndex, 'targetReps', text)}
                          keyboardType="numeric"
                          placeholder="reps"
                        />
                        <Text variant="bodySmall"> × </Text>
                        <TextInput
                          style={styles.setInput}
                          value={set.targetWeight?.toString() || ''}
                          onChangeText={(text) => updateExerciseSet(exerciseIndex, setIndex, 'targetWeight', text)}
                          keyboardType="numeric"
                          placeholder="lbs"
                        />
                        <Text variant="bodySmall"> lbs</Text>
                        {exercise.sets.length > 1 && (
                          <IconButton
                            icon="minus-circle-outline"
                            size={18}
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
                    >
                      + Add Set
                    </Button>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.exerciseRow}
                  onPress={() => setSelectedExercise(exercise)}
                  activeOpacity={0.6}
                >
                  <Text variant="bodyMedium" style={styles.exerciseName} numberOfLines={1}>
                    {exercise.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.exerciseSummary}>
                    {formatSetSummary(exercise.sets)}
                  </Text>
                </TouchableOpacity>
              )}
              {exerciseIndex < displayTemplate.exercises.length - 1 && <Divider />}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.background }]}>
        {isEditing ? (
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={cancelEditing}
              style={styles.halfButton}
              contentStyle={styles.buttonContent}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={saveChanges}
              style={styles.halfButton}
              contentStyle={styles.buttonContent}
              loading={saving}
              disabled={saving}
            >
              Save
            </Button>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={startEditing}
              style={styles.halfButton}
              contentStyle={styles.buttonContent}
            >
              Edit
            </Button>
            <Button
              mode="contained"
              style={styles.halfButton}
              contentStyle={styles.buttonContent}
              onPress={() => navigate({ name: 'ActiveWorkout', params: { templateId: template.id } })}
            >
              Start
            </Button>
          </View>
        )}
      </View>

      {/* Exercise Details Modal */}
      <Portal>
        <Modal
          visible={selectedExercise !== null && !isEditing}
          onDismiss={() => setSelectedExercise(null)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedExercise && (
            <View>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {selectedExercise.name}
              </Text>

              {selectedExercise.notes && (
                <Text variant="bodyMedium" style={styles.modalNotes}>
                  {selectedExercise.notes}
                </Text>
              )}

              <View style={styles.modalSets}>
                <Text variant="labelMedium" style={styles.modalSectionTitle}>Sets</Text>
                {selectedExercise.sets.map((set, idx) => (
                  <Text key={set.id} variant="bodyMedium" style={styles.modalSetRow}>
                    {formatSetDetail(set, idx)}
                  </Text>
                ))}
              </View>

              {selectedExercise.restTimer && (
                <Text variant="bodyMedium" style={styles.modalRest}>
                  Rest: {selectedExercise.restTimer}s between sets
                </Text>
              )}

              <Button
                mode="contained-tonal"
                onPress={() => setSelectedExercise(null)}
                style={styles.modalButton}
              >
                Close
              </Button>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontWeight: '700',
  },
  titleInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  description: {
    marginTop: 4,
    opacity: 0.7,
  },
  descriptionInput: {
    marginTop: 8,
    fontSize: 14,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    minHeight: 40,
  },
  exerciseList: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  exerciseName: {
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  exerciseSummary: {
    opacity: 0.6,
  },
  editExerciseRow: {
    paddingVertical: 12,
  },
  exerciseNameInput: {
    fontSize: 16,
    fontWeight: '500',
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    marginBottom: 8,
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
    width: 50,
    opacity: 0.6,
  },
  setInput: {
    width: 50,
    padding: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    textAlign: 'center',
  },
  removeSetButton: {
    margin: 0,
    marginLeft: 4,
  },
  addSetButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
    borderRadius: 8,
  },
  buttonContent: {},
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  modalNotes: {
    opacity: 0.7,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  modalSectionTitle: {
    opacity: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalSets: {
    marginBottom: 16,
  },
  modalSetRow: {
    paddingVertical: 4,
  },
  modalRest: {
    opacity: 0.7,
    marginBottom: 16,
  },
  modalButton: {
    marginTop: 8,
  },
});
