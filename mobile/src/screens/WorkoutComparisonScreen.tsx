import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  List,
  RadioButton,
  ActivityIndicator,
  IconButton,
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

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

interface Props {
  workoutId: string;
  templateId: string;
}

export default function WorkoutComparisonScreen({ workoutId, templateId }: Props) {
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

      // Navigate back to template list (reset history so user can't go back)
      navigate({ name: 'TemplateList' }, { reset: true });
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
        <ActivityIndicator size="large" color="#E53935" />
        <Text style={styles.loadingText}>LOADING...</Text>
      </View>
    );
  }

  const totalChanges =
    changes.modifiedExercises.length +
    changes.deletedExercises.length +
    changes.skippedExercises.length +
    changes.addedExercises.length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.headerCard} mode="contained">
          <Card.Content>
            <Text style={styles.title}>
              WORKOUT COMPLETE!
            </Text>
            <Text style={styles.subtitle}>
              Compare with template: "{template.name.toUpperCase()}"
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard} mode="contained">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              CHANGES DETECTED
            </Text>
            {changes.modifiedExercises.length > 0 && (
              <Text style={styles.changeItem}>
                • {changes.modifiedExercises.length} exercise{changes.modifiedExercises.length !== 1 ? 's' : ''} modified
              </Text>
            )}
            {changes.skippedExercises.length > 0 && (
              <Text style={styles.changeItem}>
                • {changes.skippedExercises.length} exercise{changes.skippedExercises.length !== 1 ? 's' : ''} skipped
              </Text>
            )}
            {changes.deletedExercises.length > 0 && (
              <Text style={styles.changeItem}>
                • {changes.deletedExercises.length} exercise{changes.deletedExercises.length !== 1 ? 's' : ''} deleted
              </Text>
            )}
            {changes.addedExercises.length > 0 && (
              <Text style={styles.changeItem}>
                • {changes.addedExercises.length} exercise{changes.addedExercises.length !== 1 ? 's' : ''} added
              </Text>
            )}
            {totalChanges === 0 && (
              <Text style={styles.noChanges}>
                No changes from template
              </Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.optionsCard} mode="contained">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              HOW WOULD YOU LIKE TO UPDATE YOUR TEMPLATE?
            </Text>

            <RadioButton.Group
              value={selectedOption}
              onValueChange={(value) => setSelectedOption(value as UpdateOption)}
            >
              <List.Item
                title="Update Values Only"
                titleStyle={styles.optionTitle}
                description="Updates weights/reps, keeps template structure"
                descriptionStyle={styles.optionDescription}
                left={() => <RadioButton value="values_only" color="#E53935" uncheckedColor="#5C1C1C" />}
                onPress={() => setSelectedOption('values_only')}
                style={styles.optionItem}
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Update Template & Values"
                titleStyle={styles.optionTitle}
                description="Updates values + adds/removes sets and exercises"
                descriptionStyle={styles.optionDescription}
                left={() => <RadioButton value="template_and_values" color="#E53935" uncheckedColor="#5C1C1C" />}
                onPress={() => setSelectedOption('template_and_values')}
                style={styles.optionItem}
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Save as New Template"
                titleStyle={styles.optionTitle}
                description={`Creates "${template.name} (copy)" from today's workout`}
                descriptionStyle={styles.optionDescription}
                left={() => <RadioButton value="save_as_new" color="#E53935" uncheckedColor="#5C1C1C" />}
                onPress={() => setSelectedOption('save_as_new')}
                style={styles.optionItem}
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Keep Original Template"
                titleStyle={styles.optionTitle}
                description="No changes to template, workout saved to history"
                descriptionStyle={styles.optionDescription}
                left={() => <RadioButton value="keep_original" color="#E53935" uncheckedColor="#5C1C1C" />}
                onPress={() => setSelectedOption('keep_original')}
                style={styles.optionItem}
              />
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <Card style={styles.previewCard} mode="contained">
          <Card.Content>
            <Text style={styles.previewTitle}>
              THIS WILL:
            </Text>
            {getUpdateOptionSummary(selectedOption, changes).map((line, i) => (
              <Text key={i} style={styles.previewLine}>
                • {line}
              </Text>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.bottomBar}>
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
          onPress={handleConfirm}
          loading={saving}
          disabled={saving}
          style={styles.primaryButton}
          labelStyle={styles.buttonLabel}
          buttonColor="#E53935"
          textColor="#000000"
        >
          CONFIRM
        </Button>
      </View>
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
    fontSize: 14,
    color: '#E53935',
    marginTop: 16,
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
    borderRadius: 8,
  },
  title: {
    fontFamily: typewriterFont,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#E53935',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: typewriterFont,
    fontSize: 13,
    textAlign: 'center',
    color: '#EF5350',
    marginTop: 8,
    opacity: 0.8,
  },
  summaryCard: {
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
  },
  sectionTitle: {
    fontFamily: typewriterFont,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: '#E53935',
    letterSpacing: 1,
  },
  changeItem: {
    fontFamily: typewriterFont,
    fontSize: 13,
    color: '#EF5350',
    marginBottom: 4,
  },
  noChanges: {
    fontFamily: typewriterFont,
    fontSize: 13,
    color: '#888888',
    fontStyle: 'italic',
  },
  optionsCard: {
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
  },
  optionItem: {
    paddingVertical: 4,
  },
  optionTitle: {
    fontFamily: typewriterFont,
    fontSize: 14,
    fontWeight: '600',
    color: '#E53935',
  },
  optionDescription: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
  },
  divider: {
    backgroundColor: '#2A2A2A',
  },
  previewCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#B71C1C',
    borderRadius: 8,
  },
  previewTitle: {
    fontFamily: typewriterFont,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    color: '#E53935',
    letterSpacing: 1,
  },
  previewLine: {
    fontFamily: typewriterFont,
    fontSize: 12,
    marginBottom: 4,
    color: '#EF5350',
    opacity: 0.9,
  },
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
});
