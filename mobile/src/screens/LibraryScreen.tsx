import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextInput, ScrollView } from 'react-native';
import {
  Text,
  Icon,
  Portal,
  Modal,
  Button,
  SegmentedButtons,
} from 'react-native-paper';
import { useNavigation } from '../../App';
import { useWorkoutContext } from '../context/WorkoutContext';

// Import from shared
import { ExerciseType, createExerciseLibraryItem } from '../../../shared/models';
import {
  saveExerciseToLibrary,
  exerciseExistsInLibrary,
  getDevUserId,
} from '../../../shared/services/firebase';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

interface LibraryButton {
  id: string;
  label: string;
  screen: 'ActiveExercises' | 'ExerciseArchive' | 'WorkoutArchive';
}

const LIBRARY_BUTTONS: LibraryButton[] = [
  { id: 'active', label: 'ACTIVE EXERCISES', screen: 'ActiveExercises' },
  { id: 'exerciseArchive', label: 'EXERCISE ARCHIVE', screen: 'ExerciseArchive' },
  { id: 'workoutArchive', label: 'WORKOUT ARCHIVE', screen: 'WorkoutArchive' },
];

export default function LibraryScreen() {
  const { navigate } = useNavigation();
  const workoutContext = useWorkoutContext();

  // New exercise modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('strength');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = getDevUserId();

  // Format elapsed time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle resume workout
  const handleResumeWorkout = () => {
    if (workoutContext.activeTemplate) {
      navigate({ name: 'ActiveWorkout', params: { templateId: workoutContext.activeTemplate.id } });
    }
  };

  const handleButtonPress = (button: LibraryButton) => {
    navigate({ name: button.screen });
  };

  const openNewExerciseModal = () => {
    setExerciseName('');
    setExerciseType('strength');
    setError(null);
    setModalVisible(true);
  };

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      setError('Exercise name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Check if exercise already exists
      const exists = await exerciseExistsInLibrary(userId, exerciseName.trim());
      if (exists) {
        setError('An exercise with this name already exists');
        setSaving(false);
        return;
      }

      // Create and save the exercise
      const newExercise = createExerciseLibraryItem(
        userId,
        exerciseName.trim(),
        exerciseType
      );
      await saveExerciseToLibrary(newExercise);

      setModalVisible(false);
      setExerciseName('');
      setExerciseType('strength');
    } catch (err) {
      console.error('Failed to save exercise:', err);
      setError('Failed to save exercise');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Library Buttons */}
        <View style={styles.buttonsContainer}>
          {LIBRARY_BUTTONS.map((button) => (
            <TouchableOpacity
              key={button.id}
              style={styles.libraryButton}
              onPress={() => handleButtonPress(button)}
              activeOpacity={0.7}
            >
              <Icon source="book-open-variant" size={24} color="#E53935" />
              <Text style={styles.libraryButtonText}>{button.label}</Text>
              <Icon source="chevron-right" size={24} color="#888888" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* New Exercise Button */}
      <View style={styles.newExerciseContainer}>
        <Button
          mode="contained"
          onPress={openNewExerciseModal}
          style={styles.newExerciseButton}
          buttonColor="#E53935"
          textColor="#000000"
          labelStyle={styles.buttonLabel}
          icon="plus"
        >
          NEW EXERCISE
        </Button>
      </View>

      {/* New Exercise Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>NEW EXERCISE</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon source="close" size={24} color="#E53935" />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>NAME</Text>
          <TextInput
            style={styles.textInput}
            value={exerciseName}
            onChangeText={setExerciseName}
            placeholder="Exercise name"
            placeholderTextColor="#666666"
            keyboardAppearance="dark"
            autoFocus
          />

          <Text style={styles.inputLabel}>TYPE</Text>
          <SegmentedButtons
            value={exerciseType}
            onValueChange={(value) => setExerciseType(value as ExerciseType)}
            buttons={[
              { value: 'strength', label: 'STRENGTH' },
              { value: 'timed', label: 'TIMED' },
              { value: 'cardio', label: 'CARDIO' },
            ]}
            style={styles.segmentedButtons}
            theme={{
              colors: {
                secondaryContainer: '#E53935',
                onSecondaryContainer: '#000000',
                onSurface: '#888888',
                outline: '#2A2A2A',
              },
            }}
          />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={styles.secondaryButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
              disabled={saving}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveExercise}
              style={styles.primaryButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
              loading={saving}
              disabled={saving || !exerciseName.trim()}
            >
              CREATE
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Active Workout Bar */}
      {workoutContext.isWorkoutRunning && (
        <TouchableOpacity style={styles.activeWorkoutBar} onPress={handleResumeWorkout}>
          <View style={styles.activeWorkoutInfo}>
            <Icon source="play-circle" size={20} color="#E53935" />
            <Text style={styles.activeWorkoutName} numberOfLines={1}>
              {workoutContext.activeTemplate?.name.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.activeWorkoutTimer}>{formatTime(workoutContext.elapsedSeconds)}</Text>
        </TouchableOpacity>
      )}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => navigate({ name: 'TemplateList' }, { reset: true })}
        >
          <Icon source="home" size={30} color="#888888" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => navigate({ name: 'History' }, { reset: true })}
        >
          <Icon source="history" size={30} color="#888888" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]}>
          <Icon source="bookshelf" size={30} color="#E53935" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton}>
          <Icon source="cog" size={30} color="#888888" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 160,
  },
  buttonsContainer: {
    padding: 16,
    gap: 12,
  },
  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    gap: 12,
  },
  libraryButtonText: {
    flex: 1,
    fontFamily: typewriterFont,
    fontSize: 16,
    fontWeight: '700',
    color: '#EF5350',
    letterSpacing: 1,
  },
  // New Exercise Button
  newExerciseContainer: {
    position: 'absolute',
    bottom: 78 + 44 + 16, // tab bar + active workout bar space + padding
    left: 16,
    right: 16,
  },
  newExerciseButton: {
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
  },
  buttonLabel: {
    fontFamily: typewriterFont,
    fontWeight: '700',
    letterSpacing: 2,
  },
  // Modal styles
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modal: {
    marginHorizontal: 16,
    marginTop: 60,
    marginBottom: 100,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  inputLabel: {
    fontFamily: typewriterFont,
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    marginBottom: 8,
    letterSpacing: 1,
  },
  textInput: {
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
  segmentedButtons: {
    marginBottom: 16,
  },
  errorText: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#E53935',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#555555',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 8,
  },
  // Tab Bar
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 28,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  tabButtonActive: {
    // Active state handled by icon color
  },
  // Active Workout Bar
  activeWorkoutBar: {
    position: 'absolute',
    bottom: 78, // Height of tab bar
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#E53935',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 44,
  },
  activeWorkoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  activeWorkoutName: {
    fontFamily: typewriterFont,
    fontSize: 14,
    fontWeight: '700',
    color: '#EF5350',
    letterSpacing: 1,
    flex: 1,
  },
  activeWorkoutTimer: {
    fontFamily: typewriterFont,
    fontSize: 16,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
  },
});
