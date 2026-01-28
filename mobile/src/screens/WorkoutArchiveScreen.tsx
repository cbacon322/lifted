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
import { WorkoutTemplate } from '../../../shared/models';
import {
  subscribeToArchivedTemplates,
  unarchiveTemplate,
  deleteTemplate,
  getDevUserId,
} from '../../../shared/services/firebase';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

export default function WorkoutArchiveScreen() {
  const { goBack, navigate } = useNavigation();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WorkoutTemplate | null>(null);

  const userId = getDevUserId();

  useEffect(() => {
    const unsubscribe = subscribeToArchivedTemplates(userId, (loadedTemplates) => {
      setTemplates(loadedTemplates);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleTemplatePress = (template: WorkoutTemplate) => {
    navigate({ name: 'TemplateDetail', params: { templateId: template.id } });
  };

  const handleDeletePress = (template: WorkoutTemplate) => {
    setTemplateToDelete(template);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate(userId, templateToDelete.id);
    } catch (error) {
      console.error('Failed to delete template:', error);
    } finally {
      setDeleteModalVisible(false);
      setTemplateToDelete(null);
    }
  };

  const handleReinstateSwipe = async (template: WorkoutTemplate) => {
    try {
      await unarchiveTemplate(userId, template.id);
    } catch (error) {
      console.error('Failed to reinstate template:', error);
    }
  };

  const formatDate = (date: Date): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
        {templates.length === 0 ? (
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>NO ARCHIVED WORKOUTS</Text>
            <Text style={styles.emptySubtitle}>
              Archived workout templates will appear here.
            </Text>
          </View>
        ) : (
          templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPress={() => handleTemplatePress(template)}
              onReinstate={() => handleReinstateSwipe(template)}
              onDelete={() => handleDeletePress(template)}
              formatDate={formatDate}
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

      {/* Delete Confirmation Modal */}
      <Portal>
        <Modal
          visible={deleteModalVisible}
          onDismiss={() => setDeleteModalVisible(false)}
          contentContainerStyle={styles.confirmModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.confirmModalTitle}>DELETE WORKOUT?</Text>
          <Text style={styles.confirmModalSubtitle}>
            "{templateToDelete?.name}" will be permanently deleted. This cannot be undone.
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

// Template Card Component
function TemplateCard({
  template,
  onPress,
  onReinstate,
  onDelete,
  formatDate,
}: {
  template: WorkoutTemplate;
  onPress: () => void;
  onReinstate: () => void;
  onDelete: () => void;
  formatDate: (date: Date) => string;
}) {
  const swipeableRef = useRef<Swipeable>(null);

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
              <Text style={styles.cardTitle}>{template.name.toUpperCase()}</Text>
              {template.description && (
                <Text style={styles.cardDescription}>{template.description}</Text>
              )}
              <Text style={styles.exerciseCount}>
                {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.createdAt}>
                Created {formatDate(template.createdAt)}
              </Text>
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
  cardDescription: {
    fontFamily: typewriterFont,
    fontSize: 13,
    marginTop: 6,
    color: '#666666',
    opacity: 0.8,
  },
  exerciseCount: {
    fontFamily: typewriterFont,
    fontSize: 12,
    marginTop: 12,
    color: '#666666',
  },
  createdAt: {
    fontFamily: typewriterFont,
    fontSize: 11,
    marginTop: 4,
    color: '#666666',
    fontStyle: 'italic',
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
