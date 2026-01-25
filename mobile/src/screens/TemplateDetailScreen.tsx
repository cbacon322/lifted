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

// Import from shared
import { WorkoutTemplate, Exercise, Set } from '../../../shared/models';
import { getTemplate, updateTemplate, getDevUserId } from '../../../shared/services/firebase';

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
            />
          ) : (
            <Text style={styles.title}>
              {displayTemplate.name.toUpperCase()}
            </Text>
          )}
          {isEditing ? (
            <TextInput
              style={styles.descriptionInput}
              value={editedTemplate?.description || ''}
              onChangeText={(text) => setEditedTemplate(prev => prev ? { ...prev, description: text } : null)}
              placeholder="Description (optional)"
              placeholderTextColor="#666666"
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
                  <TextInput
                    style={styles.exerciseNameInput}
                    value={exercise.name}
                    onChangeText={(text) => updateExerciseName(exerciseIndex, text)}
                    placeholderTextColor="#666666"
                  />
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
                        />
                        <Text style={styles.setMultiplier}> × </Text>
                        <TextInput
                          style={styles.setInput}
                          value={set.targetWeight?.toString() || ''}
                          onChangeText={(text) => updateExerciseSet(exerciseIndex, setIndex, 'targetWeight', text)}
                          keyboardType="numeric"
                          placeholder="lbs"
                          placeholderTextColor="#666666"
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
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {isEditing ? (
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={cancelEditing}
              style={styles.halfButton}
              textColor="#E53935"
              labelStyle={styles.buttonLabel}
              disabled={saving}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={saveChanges}
              style={styles.halfButton}
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
            <Button
              mode="outlined"
              onPress={startEditing}
              style={styles.halfButton}
              textColor="#E53935"
              labelStyle={styles.buttonLabel}
            >
              EDIT
            </Button>
            <Button
              mode="contained"
              style={styles.halfButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
              onPress={() => navigate({ name: 'ActiveWorkout', params: { templateId: template.id } })}
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 24,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#E53935',
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
});
