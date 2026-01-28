import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Animated, KeyboardAvoidingView } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Icon,
  Portal,
  Modal,
  Button,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '../../App';

// Import from shared
import { ExerciseLibraryItem, ExerciseType } from '../../../shared/models';
import {
  subscribeToActiveExercises,
  updateExerciseInLibrary,
  saveExerciseToLibrary,
  getDevUserId,
} from '../../../shared/services/firebase';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

export default function ActiveExercisesScreen() {
  const { goBack } = useNavigation();
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<ExerciseType>('strength');
  const [editDefaultSets, setEditDefaultSets] = useState('');
  const [editDefaultReps, setEditDefaultReps] = useState('');
  const [saving, setSaving] = useState(false);

  // Add modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<ExerciseType>('strength');
  const [addDefaultSets, setAddDefaultSets] = useState('');
  const [addDefaultReps, setAddDefaultReps] = useState('');

  // Archive confirmation modal state
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [exerciseToArchive, setExerciseToArchive] = useState<ExerciseLibraryItem | null>(null);

  const userId = getDevUserId();

  useEffect(() => {
    const unsubscribe = subscribeToActiveExercises(userId, (loadedExercises) => {
      setExercises(loadedExercises);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleEditPress = (exercise: ExerciseLibraryItem) => {
    setSelectedExercise(exercise);
    setEditName(exercise.name);
    setEditType(exercise.exerciseType);
    setEditDefaultSets(exercise.defaultSets?.toString() || '');
    setEditDefaultReps(exercise.defaultReps?.toString() || '');
    setEditModalVisible(true);
  };

  const handleAddPress = () => {
    setAddName('');
    setAddType('strength');
    setAddDefaultSets('3');
    setAddDefaultReps('10');
    setAddModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedExercise || !editName.trim()) return;

    setSaving(true);
    try {
      const updates: Partial<ExerciseLibraryItem> = {
        name: editName.trim(),
        exerciseType: editType,
      };

      // Only include default sets/reps if they have values
      if (editDefaultSets.trim()) {
        updates.defaultSets = parseInt(editDefaultSets, 10);
      }
      if (editDefaultReps.trim()) {
        updates.defaultReps = parseInt(editDefaultReps, 10);
      }

      await updateExerciseInLibrary(userId, selectedExercise.id, updates);
      setEditModalVisible(false);
      setSelectedExercise(null);
    } catch (error) {
      console.error('Failed to update exercise:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdd = async () => {
    if (!addName.trim()) return;

    setSaving(true);
    try {
      const newExercise: ExerciseLibraryItem = {
        id: `exercise_${Date.now()}`,
        userId,
        name: addName.trim(),
        exerciseType: addType,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Only include default sets/reps if they have values
      if (addDefaultSets.trim()) {
        newExercise.defaultSets = parseInt(addDefaultSets, 10);
      }
      if (addDefaultReps.trim()) {
        newExercise.defaultReps = parseInt(addDefaultReps, 10);
      }

      await saveExerciseToLibrary(newExercise);
      setAddModalVisible(false);
    } catch (error) {
      console.error('Failed to add exercise:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleArchivePress = (exercise: ExerciseLibraryItem) => {
    setExerciseToArchive(exercise);
    setArchiveModalVisible(true);
  };

  const confirmArchive = async () => {
    if (!exerciseToArchive) return;

    try {
      await updateExerciseInLibrary(userId, exerciseToArchive.id, { archived: true });
    } catch (error) {
      console.error('Failed to archive exercise:', error);
    } finally {
      setArchiveModalVisible(false);
      setExerciseToArchive(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {exercises.length === 0 ? (
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>NO EXERCISES YET</Text>
            <Text style={styles.emptySubtitle}>
              Create exercises from the Library page.
            </Text>
          </View>
        ) : (
          exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onEdit={() => handleEditPress(exercise)}
              onArchive={() => handleArchivePress(exercise)}
            />
          ))
        )}
      </ScrollView>

      {/* Bottom Bar with Back and Add Buttons */}
      <View style={styles.bottomBar}>
        <View style={styles.backButtonContainer}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor="#888888"
            onPress={goBack}
            style={styles.backIconButton}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Icon source="plus" size={24} color="#000000" />
          <Text style={styles.addButtonText}>ADD EXERCISE</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Exercise Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modalTop}
          style={styles.modalBackdrop}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollViewContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDIT EXERCISE</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Icon source="close" size={24} color="#E53935" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>NAME</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Exercise name"
              placeholderTextColor="#666666"
              keyboardAppearance="dark"
              autoFocus
            />

            <Text style={styles.inputLabel}>TYPE</Text>
            <SegmentedButtons
              value={editType}
              onValueChange={(value) => setEditType(value as ExerciseType)}
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

            <View style={styles.defaultsRow}>
              <View style={styles.defaultField}>
                <Text style={styles.inputLabel}>DEFAULT SETS</Text>
                <TextInput
                  style={styles.numberInput}
                  value={editDefaultSets}
                  onChangeText={setEditDefaultSets}
                  placeholder="3"
                  placeholderTextColor="#666666"
                  keyboardType="number-pad"
                  keyboardAppearance="dark"
                />
              </View>
              <View style={styles.defaultField}>
                <Text style={styles.inputLabel}>DEFAULT REPS</Text>
                <TextInput
                  style={styles.numberInput}
                  value={editDefaultReps}
                  onChangeText={setEditDefaultReps}
                  placeholder="10"
                  placeholderTextColor="#666666"
                  keyboardType="number-pad"
                  keyboardAppearance="dark"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setEditModalVisible(false)}
                style={styles.secondaryButton}
                textColor="#888888"
                labelStyle={styles.buttonLabel}
                disabled={saving}
              >
                CANCEL
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveEdit}
                style={styles.primaryButton}
                buttonColor="#E53935"
                textColor="#000000"
                labelStyle={styles.buttonLabel}
                loading={saving}
                disabled={saving || !editName.trim()}
              >
                SAVE
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Archive Confirmation Modal */}
      <Portal>
        <Modal
          visible={archiveModalVisible}
          onDismiss={() => setArchiveModalVisible(false)}
          contentContainerStyle={styles.archiveModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.archiveModalTitle}>ARCHIVE EXERCISE?</Text>
          <Text style={styles.archiveModalSubtitle}>
            "{exerciseToArchive?.name}" will be moved to the Exercise Archive. You can reinstate it later.
          </Text>
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setArchiveModalVisible(false)}
              style={styles.secondaryButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={confirmArchive}
              style={styles.primaryButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
            >
              ARCHIVE
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Add Exercise Modal */}
      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={() => setAddModalVisible(false)}
          contentContainerStyle={styles.modal}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>ADD EXERCISE</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAddModalVisible(false)}
            >
              <Icon source="close" size={24} color="#E53935" />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>NAME</Text>
          <TextInput
            style={styles.textInput}
            value={addName}
            onChangeText={setAddName}
            placeholder="Exercise name"
            placeholderTextColor="#666666"
            keyboardAppearance="dark"
            autoFocus
          />

          <Text style={styles.inputLabel}>TYPE</Text>
          <SegmentedButtons
            value={addType}
            onValueChange={(value) => setAddType(value as ExerciseType)}
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

          <View style={styles.defaultsRow}>
            <View style={styles.defaultField}>
              <Text style={styles.inputLabel}>DEFAULT SETS</Text>
              <TextInput
                style={styles.numberInput}
                value={addDefaultSets}
                onChangeText={setAddDefaultSets}
                placeholder="3"
                placeholderTextColor="#666666"
                keyboardType="number-pad"
                keyboardAppearance="dark"
              />
            </View>
            <View style={styles.defaultField}>
              <Text style={styles.inputLabel}>DEFAULT REPS</Text>
              <TextInput
                style={styles.numberInput}
                value={addDefaultReps}
                onChangeText={setAddDefaultReps}
                placeholder="10"
                placeholderTextColor="#666666"
                keyboardType="number-pad"
                keyboardAppearance="dark"
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setAddModalVisible(false)}
              style={styles.secondaryButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
              disabled={saving}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveAdd}
              style={styles.primaryButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
              loading={saving}
              disabled={saving || !addName.trim()}
            >
              SAVE
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

// Exercise Card Component
function ExerciseCard({
  exercise,
  onEdit,
  onArchive,
}: {
  exercise: ExerciseLibraryItem;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const getTypeLabel = (type: ExerciseType): string => {
    switch (type) {
      case 'strength': return 'STRENGTH';
      case 'timed': return 'TIMED';
      case 'cardio': return 'CARDIO';
      default: return type.toUpperCase();
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.archiveAction}
        onPress={() => {
          swipeableRef.current?.close();
          onArchive();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon source="archive" size={24} color="#FFFFFF" />
        </Animated.View>
        <Animated.Text style={[styles.archiveActionText, { transform: [{ scale }] }]}>
          ARCHIVE
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
        <Card style={styles.card} mode="contained">
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle}>{exercise.name}</Text>
              <Text style={styles.cardType}>{getTypeLabel(exercise.exerciseType)}</Text>
            </View>
            <IconButton
              icon="pencil"
              size={20}
              iconColor="#888888"
              onPress={onEdit}
              style={styles.editButton}
            />
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </Swipeable>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContent: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 12,
    letterSpacing: 2,
  },
  emptySubtitle: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  // Card styles
  card: {
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMain: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: typewriterFont,
    fontSize: 16,
    fontWeight: '700',
    color: '#EF5350',
    letterSpacing: 1,
  },
  cardType: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  editButton: {
    margin: 0,
  },
  // Archive action
  archiveAction: {
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 8,
  },
  archiveActionText: {
    fontFamily: typewriterFont,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 1,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    gap: 12,
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
  addButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935',
    borderRadius: 8,
    height: 38,
    gap: 8,
  },
  addButtonText: {
    fontFamily: typewriterFont,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
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
  modalTop: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  scrollViewContent: {
    padding: 16,
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
  defaultsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  defaultField: {
    flex: 1,
  },
  numberInput: {
    fontFamily: typewriterFont,
    fontSize: 16,
    padding: 12,
    color: '#EF5350',
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    textAlign: 'center',
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
  buttonLabel: {
    fontFamily: typewriterFont,
    fontWeight: '700',
    letterSpacing: 2,
  },
  // Archive modal
  archiveModal: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  archiveModalTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 8,
    letterSpacing: 2,
  },
  archiveModalSubtitle: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
  },
});
