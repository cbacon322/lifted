import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Platform, TextInput, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  IconButton,
  Icon,
  Menu,
  Portal,
  Modal,
  Button,
} from 'react-native-paper';
import { useNavigation } from '../../App';
import { useWorkoutContext } from '../context/WorkoutContext';

// Import from shared
import { WorkoutTemplate } from '../../../shared/models';
import {
  subscribeToTemplates,
  getDevUserId,
  updateTemplate,
  saveTemplate,
} from '../../../shared/services/firebase';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

export default function TemplateListScreen() {
  const { navigate } = useNavigation();
  const workoutContext = useWorkoutContext();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Menu state
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  // Rename modal state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [newName, setNewName] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'workouts' | 'history' | 'library' | 'settings'>('workouts');

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

  useEffect(() => {
    const unsubscribe = subscribeToTemplates(userId, (loadedTemplates) => {
      // Filter out archived templates
      const activeTemplates = loadedTemplates.filter(t => !t.archived);
      setTemplates(activeTemplates);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleRefresh = () => {
    setRefreshing(true);
  };

  const formatDate = (date: Date): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openRenameModal = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setNewName(template.name);
    setMenuVisible(null);
    setRenameModalVisible(true);
  };

  const handleRename = async () => {
    if (!selectedTemplate || !newName.trim()) return;

    try {
      await updateTemplate(userId, selectedTemplate.id, { name: newName.trim() });
      setRenameModalVisible(false);
      setSelectedTemplate(null);
      setNewName('');
    } catch (error) {
      console.error('Failed to rename template:', error);
    }
  };

  const handleDuplicate = async (template: WorkoutTemplate) => {
    setMenuVisible(null);

    // Find existing templates with similar names to determine the number
    const baseName = template.name.replace(/\s*\(\d+\)$/, ''); // Remove existing (n) suffix
    const existingNames = templates
      .map(t => t.name)
      .filter(name => name.startsWith(baseName));

    let suffix = 2;
    let newTemplateName = `${baseName} (${suffix})`;
    while (existingNames.includes(newTemplateName)) {
      suffix++;
      newTemplateName = `${baseName} (${suffix})`;
    }

    const duplicatedTemplate: WorkoutTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: newTemplateName,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: undefined,
    };

    try {
      await saveTemplate(duplicatedTemplate);
    } catch (error) {
      console.error('Failed to duplicate template:', error);
    }
  };

  const handleArchive = async (template: WorkoutTemplate) => {
    setMenuVisible(null);

    try {
      await updateTemplate(userId, template.id, { archived: true });
    } catch (error) {
      console.error('Failed to archive template:', error);
    }
  };

  const renderTemplate = ({ item }: { item: WorkoutTemplate }) => (
    <Card
      style={styles.card}
      mode="contained"
      onPress={() => navigate({ name: 'TemplateDetail', params: { templateId: item.id } })}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle}>
            {item.name.toUpperCase()}
          </Text>
          {item.description && (
            <Text style={styles.cardDescription}>
              {item.description}
            </Text>
          )}
          <Text style={styles.exerciseCount}>
            {item.exercises.length} exercise{item.exercises.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.createdAt}>
            Created {formatDate(item.createdAt)}
          </Text>
        </View>
        <Menu
          visible={menuVisible === item.id}
          onDismiss={() => setMenuVisible(null)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={20}
              iconColor="#888888"
              onPress={() => setMenuVisible(item.id)}
              style={styles.menuButton}
            />
          }
        >
          <Menu.Item
            onPress={() => openRenameModal(item)}
            title="Rename"
            titleStyle={styles.menuItemText}
            leadingIcon="pencil"
          />
          <Menu.Item
            onPress={() => handleDuplicate(item)}
            title="Duplicate"
            titleStyle={styles.menuItemText}
            leadingIcon="content-copy"
          />
          <Menu.Item
            onPress={() => handleArchive(item)}
            title="Archive"
            titleStyle={styles.menuItemText}
            leadingIcon="archive"
          />
        </Menu>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  if (templates.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>
            NO WORKOUTS YET
          </Text>
          <Text style={styles.emptySubtitle}>
            Import templates from the desktop app to get started.
          </Text>
        </View>

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
            style={[styles.tabButton, activeTab === 'workouts' && styles.tabButtonActive]}
            onPress={() => setActiveTab('workouts')}
          >
            <Icon
              source="home"
              size={30}
              color={activeTab === 'workouts' ? '#E53935' : '#888888'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => navigate({ name: 'History' }, { reset: true })}
          >
            <Icon
              source="history"
              size={30}
              color={activeTab === 'history' ? '#E53935' : '#888888'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'library' && styles.tabButtonActive]}
            onPress={() => navigate({ name: 'Library' }, { reset: true })}
          >
            <Icon
              source="bookshelf"
              size={30}
              color={activeTab === 'library' ? '#E53935' : '#888888'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
            onPress={() => setActiveTab('settings')}
          >
            <Icon
              source="cog"
              size={30}
              color={activeTab === 'settings' ? '#E53935' : '#888888'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#E53935"
            colors={['#E53935']}
          />
        }
      />

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
          style={[styles.tabButton, activeTab === 'workouts' && styles.tabButtonActive]}
          onPress={() => setActiveTab('workouts')}
        >
          <Icon
            source="home"
            size={30}
            color={activeTab === 'workouts' ? '#E53935' : '#888888'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => navigate({ name: 'History' }, { reset: true })}
        >
          <Icon
            source="history"
            size={30}
            color={activeTab === 'history' ? '#E53935' : '#888888'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'library' && styles.tabButtonActive]}
          onPress={() => navigate({ name: 'Library' }, { reset: true })}
        >
          <Icon
            source="bookshelf"
            size={30}
            color={activeTab === 'library' ? '#E53935' : '#888888'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Icon
            source="cog"
            size={30}
            color={activeTab === 'settings' ? '#E53935' : '#888888'}
          />
        </TouchableOpacity>
      </View>

      {/* Rename Modal */}
      <Portal>
        <Modal
          visible={renameModalVisible}
          onDismiss={() => {
            setRenameModalVisible(false);
            setSelectedTemplate(null);
            setNewName('');
          }}
          contentContainerStyle={styles.renameModal}
          style={styles.modalBackdrop}
        >
          <Text style={styles.modalTitle}>RENAME WORKOUT</Text>

          <TextInput
            style={styles.renameInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Workout name"
            placeholderTextColor="#666666"
            keyboardAppearance="dark"
            autoFocus
            selectTextOnFocus
          />

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => {
                setRenameModalVisible(false);
                setSelectedTemplate(null);
                setNewName('');
              }}
              style={styles.secondaryButton}
              textColor="#888888"
              labelStyle={styles.buttonLabel}
            >
              CANCEL
            </Button>
            <Button
              mode="contained"
              onPress={handleRename}
              style={styles.primaryButton}
              buttonColor="#E53935"
              textColor="#000000"
              labelStyle={styles.buttonLabel}
              disabled={!newName.trim()}
            >
              SAVE
            </Button>
          </View>
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
    padding: 24,
    backgroundColor: '#000000',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 80,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardMain: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: typewriterFont,
    fontSize: 18,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
  },
  cardDescription: {
    fontFamily: typewriterFont,
    fontSize: 13,
    marginTop: 6,
    color: '#EF5350',
    opacity: 0.8,
  },
  exerciseCount: {
    fontFamily: typewriterFont,
    fontSize: 12,
    marginTop: 12,
    color: '#888888',
  },
  createdAt: {
    fontFamily: typewriterFont,
    fontSize: 11,
    marginTop: 4,
    color: '#888888',
    fontStyle: 'italic',
  },
  menuButton: {
    margin: 0,
    marginRight: -8,
    marginTop: -8,
  },
  menuContent: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  menuItemText: {
    fontFamily: typewriterFont,
    color: '#EF5350',
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
  // Modal styles
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  renameModal: {
    marginHorizontal: 20,
    marginTop: 80,
    marginBottom: 'auto',
    padding: 20,
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
  renameInput: {
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
  // Active Workout Bar - positioned just above the tab bar
  activeWorkoutBar: {
    position: 'absolute',
    bottom: 78, // Height of tab bar (paddingTop 12 + button 38 + paddingBottom 28)
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
