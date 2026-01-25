import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  Divider,
  List,
  RadioButton,
} from 'react-native-paper';
import { useNavigation } from '../../App';

// Import from shared
import {
  WorkoutTemplate,
  WorkoutInstance,
  WorkoutChanges,
} from '../../../shared/models';
import {
  getTemplate,
  getWorkout,
  saveTemplate,
  getDevUserId,
} from '../../../shared/services/firebase';
import { detectChanges } from '../../../shared/services/changeTracker';
import {
  applyTemplateUpdate,
  UpdateOption,
  getUpdateOptionSummary,
} from '../../../shared/services/templateUpdater';

interface Props {
  workoutId: string;
  templateId: string;
}

export default function WorkoutComparisonScreen({ workoutId, templateId }: Props) {
  const theme = useTheme();
  const { navigate, goBack } = useNavigation();

  const [workout, setWorkout] = useState<WorkoutInstance | null>(null);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [changes, setChanges] = useState<WorkoutChanges | null>(null);
  const [selectedOption, setSelectedOption] = useState<UpdateOption>('keep_original');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userId = getDevUserId();

  useEffect(() => {
    loadData();
  }, [workoutId, templateId]);

  const loadData = async () => {
    try {
      const [loadedWorkout, loadedTemplate] = await Promise.all([
        getWorkout(userId, workoutId),
        getTemplate(userId, templateId),
      ]);

      if (!loadedWorkout || !loadedTemplate) {
        Alert.alert('Error', 'Could not load workout data');
        goBack();
        return;
      }

      setWorkout(loadedWorkout);
      setTemplate(loadedTemplate);

      const detectedChanges = detectChanges(loadedWorkout, loadedTemplate);
      setChanges(detectedChanges);

      const hasChanges =
        detectedChanges.modifiedExercises.length > 0 ||
        detectedChanges.deletedExercises.length > 0 ||
        detectedChanges.addedExercises.length > 0;

      if (hasChanges) {
        setSelectedOption('values_only');
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load workout data');
      goBack();
    }
  };

  const handleConfirm = async () => {
    if (!workout || !template || !changes) return;

    setSaving(true);

    try {
      const updatedTemplate = applyTemplateUpdate(template, workout, changes, selectedOption);

      if (updatedTemplate) {
        await saveTemplate(updatedTemplate);
      }

      // Navigate back to template list (reset history)
      navigate({ name: 'TemplateList' });
    } catch (error) {
      console.error('Failed to update template:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !workout || !template || !changes) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const totalChanges =
    changes.modifiedExercises.length +
    changes.deletedExercises.length +
    changes.skippedExercises.length +
    changes.addedExercises.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Workout Complete!
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Compare with template: "{template.name}"
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Changes Detected
            </Text>
            {changes.modifiedExercises.length > 0 && (
              <Text variant="bodyMedium">
                • {changes.modifiedExercises.length} exercise{changes.modifiedExercises.length !== 1 ? 's' : ''} modified
              </Text>
            )}
            {changes.skippedExercises.length > 0 && (
              <Text variant="bodyMedium">
                • {changes.skippedExercises.length} exercise{changes.skippedExercises.length !== 1 ? 's' : ''} skipped
              </Text>
            )}
            {changes.deletedExercises.length > 0 && (
              <Text variant="bodyMedium">
                • {changes.deletedExercises.length} exercise{changes.deletedExercises.length !== 1 ? 's' : ''} deleted
              </Text>
            )}
            {changes.addedExercises.length > 0 && (
              <Text variant="bodyMedium">
                • {changes.addedExercises.length} exercise{changes.addedExercises.length !== 1 ? 's' : ''} added
              </Text>
            )}
            {totalChanges === 0 && (
              <Text variant="bodyMedium" style={styles.noChanges}>
                No changes from template
              </Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.optionsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              How would you like to update your template?
            </Text>

            <RadioButton.Group
              value={selectedOption}
              onValueChange={(value) => setSelectedOption(value as UpdateOption)}
            >
              <List.Item
                title="Update Values Only"
                description="Updates weights/reps, keeps template structure"
                left={() => <RadioButton value="values_only" />}
                onPress={() => setSelectedOption('values_only')}
                style={styles.optionItem}
              />
              <Divider />
              <List.Item
                title="Update Template & Values"
                description="Updates values + adds/removes sets and exercises"
                left={() => <RadioButton value="template_and_values" />}
                onPress={() => setSelectedOption('template_and_values')}
                style={styles.optionItem}
              />
              <Divider />
              <List.Item
                title="Save as New Template"
                description={`Creates "${template.name} (copy)" from today's workout`}
                left={() => <RadioButton value="save_as_new" />}
                onPress={() => setSelectedOption('save_as_new')}
                style={styles.optionItem}
              />
              <Divider />
              <List.Item
                title="Keep Original Template"
                description="No changes to template, workout saved to history"
                left={() => <RadioButton value="keep_original" />}
                onPress={() => setSelectedOption('keep_original')}
                style={styles.optionItem}
              />
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <Card style={styles.previewCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.previewTitle}>
              This will:
            </Text>
            {getUpdateOptionSummary(selectedOption, changes).map((line, i) => (
              <Text key={i} variant="bodySmall" style={styles.previewLine}>
                • {line}
              </Text>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={saving}
          disabled={saving}
          style={styles.confirmButton}
          contentStyle={styles.confirmButtonContent}
        >
          Confirm
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  headerCard: { marginBottom: 12 },
  title: { fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', opacity: 0.7, marginTop: 4 },
  summaryCard: { marginBottom: 12 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  noChanges: { opacity: 0.6, fontStyle: 'italic' },
  optionsCard: { marginBottom: 12 },
  optionItem: { paddingVertical: 4 },
  previewCard: { backgroundColor: '#F5F5F5' },
  previewTitle: { fontWeight: '600', marginBottom: 8 },
  previewLine: { marginBottom: 4, opacity: 0.8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(255,255,255,0.95)' },
  confirmButton: { borderRadius: 12 },
  confirmButtonContent: { paddingVertical: 8 },
});
