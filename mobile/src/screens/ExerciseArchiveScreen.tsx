import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Icon,
  Portal,
  Modal,
  Button,
  IconButton,
} from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '../../App';

// Import from shared
import { ExerciseLibraryItem, ExerciseType } from '../../../shared/models';
import {
  subscribeToArchivedExercises,
  updateExerciseInLibrary,
  deleteExerciseFromLibrary,
  getDevUserId,
} from '../../../shared/services/firebase';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

export default function ExerciseArchiveScreen() {
  const { goBack } = useNavigation();
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Exercise details modal state
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null);

  // Delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseLibraryItem | null>(null);

  const userId = getDevUserId();

  useEffect(() => {
    const unsubscribe = subscribeToArchivedExercises(userId, (loadedExercises) => {
      setExercises(loadedExercises);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleExercisePress = (exercise: ExerciseLibraryItem) => {
    setSelectedExercise(exercise);
    setDetailsModalVisible(true);
  };

  const handleReinstate = async () => {
    if (!selectedExercise) return;

    try {
      await updateExerciseInLibrary(userId, selectedExercise.id, { archived: false });
      setDetailsModalVisible(false);
      setSelectedExercise(null);
    } catch (error) {
      console.error('Failed to reinstate exercise:', error);
    }
  };

  const handleDeletePress = (exercise: ExerciseLibraryItem) => {
    setExerciseToDelete(exercise);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!exerciseToDelete) return;

    try {
      await deleteExerciseFromLibrary(userId, exerciseToDelete.id);
    } catch (error) {
      console.error('Failed to delete exercise:', error);
    } finally {
      setDeleteModalVisible(false);
      setExerciseToDelete(null);
    }
  };

  const getTypeLabel = (type: ExerciseType): string => {
    switch (type) {
      case 'strength': return 'STRENGTH';
      case 'timed': return 'TIMED';
      case 'cardio': return 'CARDIO';
      default: return type.toUpperCase();
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
            <Text style={styles.emptyTitle}>NO ARCHIVED EXERCISES</Text>
            <Text style={styles.emptySubtitle}>
              Archived exercises will appear here.
            </Text>
          </View>
        ) : (
          exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onPress={() => handleExercisePress(exercise)}
              onReinstate={() => {
                setSelectedExercise(exercise);
                handleReinstate();
              }}
              onDelete={() => handleDeletePress(exercise)}
            />
          ))
        )}
      </ScrollView>

      {/* Bottom Bar with Back Button */}
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
      </View>

      {/* Exercise Details Modal */}
      <Portal>
        <Modal
          visible={detailsModalVisible}
          onDismiss={() => setDetailsModalVisible(false)}
          contentContainerStyle={styles.detailsModal}
          style={styles.modalBackdrop}
        >
          {selectedExercise && (
            <View>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>
                  {selectedExercise.name.toUpperCase()}
                </Text>
                <IconButton
                  icon="restore"
                  size={24}
                  iconColor="#4CAF50"
                  onPress={handleReinstate}
                  style={styles.reinstateButton}
                />
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>TYPE</Text>
                <Text style={styles.detailsValue}>{getTypeLabel(selectedExercise.exerciseType)}</Text>
              </View>

              {selectedExercise.defaultSets !== undefined && (
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>DEFAULT SETS</Text>
                  <Text style={styles.detailsValue}>{selectedExercise.defaultSets}</Text>
                </View>
              )}

              {selectedExercise.defaultReps !== undefined && (
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>DEFAULT REPS</Text>
                  <Text style={styles.detailsValue}>{selectedExercise.defaultReps}</Text>
                </View>
              )}

              {selectedExercise.notes && (
                <View style={styles.detailsNotesSection}>
                  <Text style={styles.detailsLabel}>NOTES</Text>
                  <Text style={styles.detailsNotes}>{selectedExercise.notes}</Text>
                </View>
              )}

              <Button
                mode="contained"
                onPress={() => setDetailsModalVisible(false)}
                buttonColor="#E53935"
                textColor="#000000"
                labelStyle={styles.buttonLabel}
                style={styles.closeButton}
              >
                CLOSE
              </Button>
            </View>
          )}
        </Modal>
      </Portal>

      {/* Delete Confirmation Modal */}
      <Portal>
        <Modal
          visible={deleteModalVisible}
          onDismiss={() => setDeleteModalVisible(false)}
          contentContainerStyle={styles.confirmModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.confirmModalTitle}>DELETE EXERCISE?</Text>
          <Text style={styles.confirmModalSubtitle}>
            "{exerciseToDelete?.name}" will be permanently deleted. This cannot be undone.
          </Text>
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setDeleteModalVisible(false)}
              style={styles.secondaryButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={confirmDelete}
              style={styles.primaryButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
            >
              DELETE
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
  onPress,
  onReinstate,
  onDelete,
}: {
  exercise: ExerciseLibraryItem;
  onPress: () => void;
  onReinstate: () => void;
  onDelete: () => void;
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

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0.5, 1],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.reinstateAction}
        onPress={() => {
          swipeableRef.current?.close();
          onReinstate();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon source="restore" size={24} color="#FFFFFF" />
        </Animated.View>
        <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
          REINSTATE
        </Animated.Text>
      </TouchableOpacity>
    );
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
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon source="delete" size={24} color="#FFFFFF" />
        </Animated.View>
        <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
          DELETE
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card style={styles.card} mode="contained">
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle}>{exercise.name}</Text>
              <Text style={styles.cardType}>{getTypeLabel(exercise.exerciseType)}</Text>
            </View>
            <Icon source="chevron-right" size={24} color="#555555" />
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
    flexGrow: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 12,
    letterSpacing: 2,
    textAlign: 'center',
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
    color: '#888888', // Muted for archived items
    letterSpacing: 1,
  },
  cardType: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  // Swipe actions
  reinstateAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 8,
  },
  deleteAction: {
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 8,
  },
  actionText: {
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
  // Modal styles
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  // Details Modal
  detailsModal: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailsTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 2,
    flex: 1,
  },
  reinstateButton: {
    margin: -8,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  detailsLabel: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
    letterSpacing: 1,
  },
  detailsValue: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#EF5350',
  },
  detailsNotesSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  detailsNotes: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
    fontStyle: 'italic',
  },
  closeButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  // Confirm Modal
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
});
