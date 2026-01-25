import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  useTheme,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '../../App';

// Import from shared
import { WorkoutTemplate, Set } from '../../../shared/models';
import { getTemplate, getDevUserId } from '../../../shared/services/firebase';

interface Props {
  templateId: string;
}

export default function TemplateDetailScreen({ templateId }: Props) {
  const theme = useTheme();
  const { navigate, goBack } = useNavigation();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);

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

  const formatSet = (set: Set): string => {
    if (set.targetTime) {
      const minutes = Math.floor(set.targetTime / 60);
      const seconds = set.targetTime % 60;
      return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
    }
    if (set.targetWeight && set.targetReps) {
      return `${set.targetWeight} kg × ${set.targetReps}`;
    }
    if (set.targetReps) {
      return `${set.targetReps} reps`;
    }
    return '—';
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
          <Text variant="headlineMedium" style={styles.title}>
            {template.name}
          </Text>
          {template.description && (
            <Text variant="bodyMedium" style={styles.description}>
              {template.description}
            </Text>
          )}
        </View>

        {/* Exercises */}
        {template.exercises.map((exercise) => (
          <Card key={exercise.id} style={styles.exerciseCard} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.exerciseName}>
                {exercise.name}
              </Text>
              {exercise.notes && (
                <Text variant="bodySmall" style={styles.exerciseNotes}>
                  {exercise.notes}
                </Text>
              )}

              {/* Sets */}
              <View style={styles.setsContainer}>
                <View style={styles.setsHeader}>
                  <Text variant="labelSmall" style={styles.setLabel}>Set</Text>
                  <Text variant="labelSmall" style={styles.setLabel}>Target</Text>
                </View>
                <Divider style={styles.divider} />
                {exercise.sets.map((set, setIndex) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text variant="bodyMedium" style={styles.setNumber}>
                      {setIndex + 1}
                    </Text>
                    <Text variant="bodyMedium" style={styles.setTarget}>
                      {formatSet(set)}
                    </Text>
                  </View>
                ))}
              </View>

              {exercise.restTimer && (
                <Text variant="bodySmall" style={styles.restTimer}>
                  Rest: {exercise.restTimer}s
                </Text>
              )}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {/* Start Workout Button */}
      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          style={styles.startButton}
          contentStyle={styles.startButtonContent}
          onPress={() => navigate({ name: 'ActiveWorkout', params: { templateId: template.id } })}
        >
          Start Workout
        </Button>
      </View>
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
  },
  description: {
    marginTop: 4,
    opacity: 0.7,
  },
  exerciseCard: {
    marginBottom: 12,
  },
  exerciseName: {
    fontWeight: '600',
  },
  exerciseNotes: {
    marginTop: 4,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  setsContainer: {
    marginTop: 12,
  },
  setsHeader: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  setLabel: {
    flex: 1,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  divider: {
    marginVertical: 4,
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  setNumber: {
    flex: 1,
    fontWeight: '500',
  },
  setTarget: {
    flex: 1,
  },
  restTimer: {
    marginTop: 8,
    opacity: 0.6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  startButton: {
    borderRadius: 12,
  },
  startButtonContent: {
    paddingVertical: 8,
  },
});
