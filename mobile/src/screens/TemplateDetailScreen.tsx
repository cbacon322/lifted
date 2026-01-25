import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  useTheme,
  Portal,
  Modal,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '../../App';

// Import from shared
import { WorkoutTemplate, Exercise, Set } from '../../../shared/models';
import { getTemplate, getDevUserId } from '../../../shared/services/firebase';

interface Props {
  templateId: string;
}

export default function TemplateDetailScreen({ templateId }: Props) {
  const theme = useTheme();
  const { navigate, goBack } = useNavigation();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

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

  const formatSetSummary = (sets: Set[]): string => {
    if (sets.length === 0) return '—';

    const firstSet = sets[0];

    // Check what type of set this is
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>
            {template.name}
          </Text>
          {template.description && (
            <Text variant="bodyMedium" style={styles.description}>
              {template.description}
            </Text>
          )}
        </View>

        {/* Exercises - Compact List */}
        <View style={styles.exerciseList}>
          {template.exercises.map((exercise, index) => (
            <View key={exercise.id}>
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
              {index < template.exercises.length - 1 && <Divider />}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Start Workout Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.background }]}>
        <Button
          mode="contained"
          style={styles.startButton}
          contentStyle={styles.startButtonContent}
          onPress={() => navigate({ name: 'ActiveWorkout', params: { templateId: template.id } })}
        >
          Start Workout
        </Button>
      </View>

      {/* Exercise Details Modal */}
      <Portal>
        <Modal
          visible={selectedExercise !== null}
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
  description: {
    marginTop: 4,
    opacity: 0.7,
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  startButton: {
    borderRadius: 12,
  },
  startButtonContent: {
    paddingVertical: 8,
  },
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
