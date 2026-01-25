import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '../../App';

// Import from shared
import { WorkoutTemplate } from '../../../shared/models';
import { subscribeToTemplates, getDevUserId } from '../../../shared/services/firebase';

export default function TemplateListScreen() {
  const theme = useTheme();
  const { navigate } = useNavigation();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = getDevUserId();

  useEffect(() => {
    const unsubscribe = subscribeToTemplates(userId, (loadedTemplates) => {
      setTemplates(loadedTemplates);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleRefresh = () => {
    setRefreshing(true);
  };

  const renderTemplate = ({ item }: { item: WorkoutTemplate }) => (
    <Card
      style={styles.card}
      mode="elevated"
      onPress={() => navigate({ name: 'TemplateDetail', params: { templateId: item.id } })}
    >
      <Card.Content>
        <Text variant="titleMedium" style={styles.cardTitle}>
          {item.name}
        </Text>
        {item.description && (
          <Text variant="bodySmall" style={styles.cardDescription}>
            {item.description}
          </Text>
        )}
        <Text variant="bodySmall" style={styles.exerciseCount}>
          {item.exercises.length} exercise{item.exercises.length !== 1 ? 's' : ''}
        </Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} compact style={styles.tag}>
                {tag}
              </Chip>
            ))}
          </View>
        )}
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={() => navigate({ name: 'ActiveWorkout', params: { templateId: item.id } })}
        >
          Start Workout
        </Button>
      </Card.Actions>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (templates.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="titleLarge" style={styles.emptyTitle}>
          No Workouts Yet
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          Import templates from the desktop app to get started.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
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
    padding: 24,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: '600',
  },
  cardDescription: {
    marginTop: 4,
    opacity: 0.7,
  },
  exerciseCount: {
    marginTop: 8,
    opacity: 0.6,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  tag: {
    height: 24,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptySubtitle: {
    opacity: 0.7,
    textAlign: 'center',
  },
});
