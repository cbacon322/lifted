import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Icon,
  Portal,
  Modal,
  Button,
} from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '../../App';
import { useWorkoutContext } from '../context/WorkoutContext';

// Import from shared
import {
  WorkoutInstance,
  calculateDuration,
} from '../../../shared/models';
import {
  subscribeToWorkouts,
  deleteWorkout,
  getDevUserId,
} from '../../../shared/services/firebase';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

// Days of week for calendar
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface WeekGroup {
  weekLabel: string;
  workouts: WorkoutInstance[];
}

export default function HistoryScreen() {
  const { navigate } = useNavigation();
  const workoutContext = useWorkoutContext();
  const [workouts, setWorkouts] = useState<WorkoutInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Date modal state
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<WorkoutInstance[]>([]);

  // Delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<WorkoutInstance | null>(null);

  const userId = getDevUserId();

  useEffect(() => {
    const unsubscribe = subscribeToWorkouts(userId, (loadedWorkouts) => {
      setWorkouts(loadedWorkouts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Get workouts by date for calendar
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, WorkoutInstance[]>();
    workouts.forEach(w => {
      const date = w.startTime instanceof Date ? w.startTime : new Date(w.startTime);
      const key = date.toDateString();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(w);
    });
    return map;
  }, [workouts]);

  // Group workouts by week
  const groupedWorkouts = useMemo(() => {
    const groups: WeekGroup[] = [];
    const workoutsByWeek = new Map<string, WorkoutInstance[]>();

    workouts.forEach(workout => {
      const date = workout.startTime instanceof Date ? workout.startTime : new Date(workout.startTime);
      const weekKey = getWeekKey(date);

      if (!workoutsByWeek.has(weekKey)) {
        workoutsByWeek.set(weekKey, []);
      }
      workoutsByWeek.get(weekKey)!.push(workout);
    });

    // Sort weeks in reverse chronological order
    const sortedKeys = Array.from(workoutsByWeek.keys()).sort((a, b) => {
      const [yearA, weekA] = a.split('-').map(Number);
      const [yearB, weekB] = b.split('-').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return weekB - weekA;
    });

    sortedKeys.forEach(key => {
      const weekWorkouts = workoutsByWeek.get(key)!;
      const firstWorkout = weekWorkouts[0];
      const date = firstWorkout.startTime instanceof Date ? firstWorkout.startTime : new Date(firstWorkout.startTime);

      groups.push({
        weekLabel: getWeekLabel(date),
        workouts: weekWorkouts.sort((a, b) => {
          const dateA = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
          const dateB = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
          return dateB.getTime() - dateA.getTime();
        }),
      });
    });

    return groups;
  }, [workouts]);

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

  // Handle workout card click
  const handleWorkoutPress = (workout: WorkoutInstance) => {
    navigate({ name: 'WorkoutDetail', params: { workoutId: workout.id } });
  };

  // Handle workout delete - show confirmation modal
  const handleDeleteWorkout = (workout: WorkoutInstance) => {
    setWorkoutToDelete(workout);
    setDeleteModalVisible(true);
  };

  // Confirm delete workout
  const confirmDeleteWorkout = async () => {
    if (!workoutToDelete) return;
    try {
      await deleteWorkout(userId, workoutToDelete.id);
    } catch (error) {
      console.error('Failed to delete workout:', error);
    } finally {
      setDeleteModalVisible(false);
      setWorkoutToDelete(null);
    }
  };

  // Handle calendar date click
  const handleDatePress = (day: number) => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    const dateWorkouts = workoutsByDate.get(date.toDateString()) || [];
    if (dateWorkouts.length > 0) {
      setSelectedDate(date);
      setSelectedDateWorkouts(dateWorkouts);
      setDateModalVisible(true);
    }
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Get calendar days for selected month
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [selectedMonth]);

  // Check if a day has workouts
  const dayHasWorkout = (day: number): boolean => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    return workoutsByDate.has(date.toDateString());
  };

  // Check if day is today
  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      selectedMonth.getMonth() === today.getMonth() &&
      selectedMonth.getFullYear() === today.getFullYear()
    );
  };

  // Format month header
  const monthHeader = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Format selected date for modal
  const formatSelectedDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
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
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          {/* Month Header */}
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthArrow}>
              <Icon source="chevron-left" size={24} color="#E53935" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthHeader.toUpperCase()}</Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow}>
              <Icon source="chevron-right" size={24} color="#E53935" />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map((day, index) => (
              <Text key={index} style={styles.dayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <View key={index} style={styles.dayCell}>
                {day !== null && (
                  <TouchableOpacity
                    style={[
                      styles.dayContent,
                      dayHasWorkout(day) && styles.dayWithWorkout,
                      isToday(day) && !dayHasWorkout(day) && styles.dayToday,
                    ]}
                    onPress={() => dayHasWorkout(day) && handleDatePress(day)}
                    disabled={!dayHasWorkout(day)}
                  >
                    <Text style={[
                      styles.dayText,
                      dayHasWorkout(day) && styles.dayTextWithWorkout,
                      isToday(day) && !dayHasWorkout(day) && styles.dayTextToday,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Workout History */}
        {groupedWorkouts.length === 0 ? (
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>NO WORKOUTS YET</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first workout to see it here.
            </Text>
          </View>
        ) : (
          groupedWorkouts.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.weekGroup}>
              <Text style={styles.weekLabel}>{group.weekLabel.toUpperCase()}</Text>
              {group.workouts.map(workout => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onPress={() => handleWorkoutPress(workout)}
                  onDelete={() => handleDeleteWorkout(workout)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Date Workouts Modal */}
      <Portal>
        <Modal
          visible={dateModalVisible}
          onDismiss={() => setDateModalVisible(false)}
          contentContainerStyle={styles.dateModal}
          style={styles.modalBackdrop}
        >
          <View style={styles.dateModalHeader}>
            <Text style={styles.dateModalTitle}>
              {selectedDate ? formatSelectedDate(selectedDate).toUpperCase() : ''}
            </Text>
            <TouchableOpacity
              style={styles.dateModalCloseButton}
              onPress={() => setDateModalVisible(false)}
            >
              <Icon source="close" size={24} color="#E53935" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.dateModalScroll}>
            {selectedDateWorkouts.map(workout => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onPress={() => {
                  setDateModalVisible(false);
                  handleWorkoutPress(workout);
                }}
                compact
              />
            ))}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Delete Confirmation Modal */}
      <Portal>
        <Modal
          visible={deleteModalVisible}
          onDismiss={() => setDeleteModalVisible(false)}
          contentContainerStyle={styles.deleteModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.deleteModalTitle}>DELETE WORKOUT?</Text>
          <Text style={styles.deleteModalSubtitle}>
            Are you sure you want to delete this from history? You cannot undo this.
          </Text>
          <View style={styles.deleteModalButtons}>
            <Button
              mode="outlined"
              onPress={() => setDeleteModalVisible(false)}
              style={styles.deleteModalButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={confirmDeleteWorkout}
              style={styles.deleteModalButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
            >
              DELETE
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
        <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]}>
          <Icon source="history" size={30} color="#E53935" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton}>
          <Icon source="bookshelf" size={30} color="#888888" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton}>
          <Icon source="cog" size={30} color="#888888" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Workout Card Component
function WorkoutCard({
  workout,
  onPress,
  onDelete,
  compact = false,
}: {
  workout: WorkoutInstance;
  onPress: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const date = workout.startTime instanceof Date ? workout.startTime : new Date(workout.startTime);
  const duration = calculateDuration(workout);

  // Format date
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Format duration
  const durationStr = duration ? `${duration}m` : '-';

  // Get best set for each exercise
  const exerciseSummaries = workout.exercises.map(exercise => {
    const completedSets = exercise.sets.filter(s => s.completed);
    const setCount = completedSets.length;

    // Find best set (highest weight * reps)
    let bestSet = '';
    let bestVolume = 0;

    completedSets.forEach(set => {
      const weight = set.actualWeight || 0;
      const reps = set.actualReps || 0;
      const setVolume = weight * reps;

      if (setVolume > bestVolume) {
        bestVolume = setVolume;
        if (weight > 0 && reps > 0) {
          bestSet = `${weight} lb x ${reps}`;
        } else if (reps > 0) {
          bestSet = `${reps} reps`;
        }
      }
    });

    return {
      name: exercise.name,
      sets: setCount,
      bestSet: bestSet || '-',
    };
  }).filter(e => e.sets > 0);

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
          onDelete?.();
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon source="delete" size={24} color="#FFFFFF" />
        </Animated.View>
        <Animated.Text style={[styles.deleteActionText, { transform: [{ scale }] }]}>
          DELETE
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  const cardContent = (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card} mode="contained">
        <Card.Content>
          {/* Header with title and duration */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{workout.templateName}</Text>
            <View style={styles.cardDuration}>
              <Icon source="clock-outline" size={14} color="#888888" />
              <Text style={styles.cardDurationText}>{durationStr}</Text>
            </View>
          </View>
          <Text style={styles.cardDate}>{dateStr}</Text>

          {/* Exercise List */}
          <View style={styles.exerciseList}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseHeaderText}>Exercise</Text>
              <Text style={styles.exerciseHeaderText}>Best Set</Text>
            </View>
            {exerciseSummaries.slice(0, compact ? 4 : 6).map((exercise, index) => (
              <View key={index} style={styles.exerciseRow}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {exercise.sets} x {exercise.name}
                </Text>
                <Text style={styles.exerciseBestSet}>{exercise.bestSet}</Text>
              </View>
            ))}
            {exerciseSummaries.length > (compact ? 4 : 6) && (
              <Text style={styles.moreExercises}>
                +{exerciseSummaries.length - (compact ? 4 : 6)} more exercises
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // If no delete handler, just render the card without swipeable
  if (!onDelete) {
    return cardContent;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      {cardContent}
    </Swipeable>
  );
}

// Helper functions
function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const dayOfWeek = firstDay.getDay();
  return Math.ceil((dayOfMonth + dayOfWeek) / 7);
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-${weekNumber}`;
}

function getWeekLabel(date: Date): string {
  const weekOfMonth = getWeekOfMonth(date);
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${month} ${year}, Week ${weekOfMonth}`;
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
    paddingBottom: 140,
  },
  // Calendar styles
  calendarContainer: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthArrow: {
    padding: 4,
  },
  monthTitle: {
    fontFamily: typewriterFont,
    fontSize: 16,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 2,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#888888',
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayContent: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayWithWorkout: {
    backgroundColor: '#E53935',
  },
  dayToday: {
    borderWidth: 2,
    borderColor: '#E53935',
  },
  dayText: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
  },
  dayTextWithWorkout: {
    color: '#000000',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#E53935',
    fontWeight: '700',
  },
  // Empty state
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
  // Week groups
  weekGroup: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  weekLabel: {
    fontFamily: typewriterFont,
    fontSize: 13,
    fontWeight: '700',
    color: '#888888',
    marginBottom: 8,
    letterSpacing: 1,
  },
  // Card styles
  card: {
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
  },
  // Delete action
  deleteAction: {
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 8,
  },
  deleteActionText: {
    fontFamily: typewriterFont,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontFamily: typewriterFont,
    fontSize: 18,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
    flex: 1,
  },
  cardDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDurationText: {
    fontFamily: typewriterFont,
    fontSize: 13,
    color: '#888888',
  },
  cardDate: {
    fontFamily: typewriterFont,
    fontSize: 13,
    color: '#EF5350',
    marginTop: 4,
    opacity: 0.8,
  },
  exerciseList: {
    marginTop: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  exerciseHeaderText: {
    fontFamily: typewriterFont,
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  exerciseName: {
    fontFamily: typewriterFont,
    fontSize: 13,
    color: '#EF5350',
    flex: 1,
    marginRight: 8,
  },
  exerciseBestSet: {
    fontFamily: typewriterFont,
    fontSize: 13,
    color: '#888888',
  },
  moreExercises: {
    fontFamily: typewriterFont,
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Modals
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  // Delete Confirmation Modal
  deleteModal: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  deleteModalTitle: {
    fontFamily: typewriterFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 8,
    letterSpacing: 2,
  },
  deleteModalSubtitle: {
    fontFamily: typewriterFont,
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#555555',
  },
  buttonLabel: {
    fontFamily: typewriterFont,
    fontWeight: '700',
    letterSpacing: 2,
  },
  // Date Modal
  dateModal: {
    marginHorizontal: 16,
    marginTop: 60,
    marginBottom: 100,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateModalTitle: {
    fontFamily: typewriterFont,
    fontSize: 16,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
    flex: 1,
  },
  dateModalCloseButton: {
    padding: 4,
  },
  dateModalScroll: {
    flexGrow: 0,
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
    bottom: 78,
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
