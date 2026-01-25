import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Platform } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '../../App';

// Import from shared
import { WorkoutTemplate } from '../../../shared/models';
import { subscribeToTemplates, getDevUserId } from '../../../shared/services/firebase';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

export default function TemplateListScreen() {
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

  const formatDate = (date: Date): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderTemplate = ({ item }: { item: WorkoutTemplate }) => (
    <Card
      style={styles.card}
      mode="contained"
      onPress={() => navigate({ name: 'TemplateDetail', params: { templateId: item.id } })}
    >
      <Card.Content>
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
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>
          NO WORKOUTS YET
        </Text>
        <Text style={styles.emptySubtitle}>
          Import templates from the desktop app to get started.
        </Text>
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
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
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
});
