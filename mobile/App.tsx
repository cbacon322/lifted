import React, { useState, createContext, useContext } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, Appbar } from 'react-native-paper';
import { darkTheme } from './src/theme/theme';

// Simple navigation context (no react-native-screens)
type Screen =
  | { name: 'TemplateList' }
  | { name: 'TemplateDetail'; params: { templateId: string } }
  | { name: 'ActiveWorkout'; params: { templateId: string } }
  | { name: 'WorkoutComparison'; params: { workoutId: string; templateId: string } };

interface NavigateOptions {
  reset?: boolean; // If true, clears history and sets this as the root screen
}

interface NavigationContextType {
  screen: Screen;
  navigate: (screen: Screen, options?: NavigateOptions) => void;
  goBack: () => void;
  canGoBack: boolean;
  setTitle: (title: string) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}

// Screens
import TemplateListScreen from './src/screens/TemplateListScreen';
import TemplateDetailScreen from './src/screens/TemplateDetailScreen';
import ActiveWorkoutScreen from './src/screens/ActiveWorkoutScreen';
import WorkoutComparisonScreen from './src/screens/WorkoutComparisonScreen';

// Typewriter font
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

function getTitle(screen: Screen): string {
  switch (screen.name) {
    case 'TemplateList': return 'WORKOUTS';
    case 'TemplateDetail': return 'DETAILS';
    case 'ActiveWorkout': return 'LIFTING';
    case 'WorkoutComparison': return 'COMPLETE';
  }
}

function AppContent() {
  const [history, setHistory] = useState<Screen[]>([{ name: 'TemplateList' }]);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const screen = history[history.length - 1];

  const navigate = (newScreen: Screen, options?: NavigateOptions) => {
    setCustomTitle(null);
    if (options?.reset) {
      setHistory([newScreen]);
    } else {
      setHistory(prev => [...prev, newScreen]);
    }
  };

  const goBack = () => {
    if (history.length > 1) {
      setCustomTitle(null);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const setTitle = (title: string) => {
    setCustomTitle(title.toUpperCase());
  };

  const canGoBack = history.length > 1 &&
    screen.name !== 'ActiveWorkout' &&
    screen.name !== 'WorkoutComparison';

  const renderScreen = () => {
    switch (screen.name) {
      case 'TemplateList':
        return <TemplateListScreen />;
      case 'TemplateDetail':
        return <TemplateDetailScreen templateId={screen.params.templateId} />;
      case 'ActiveWorkout':
        return <ActiveWorkoutScreen templateId={screen.params.templateId} />;
      case 'WorkoutComparison':
        return (
          <WorkoutComparisonScreen
            workoutId={screen.params.workoutId}
            templateId={screen.params.templateId}
          />
        );
    }
  };

  return (
    <NavigationContext.Provider value={{ screen, navigate, goBack, canGoBack, setTitle }}>
      <View style={styles.container}>
        <Appbar.Header mode="small" style={styles.header}>
          <Appbar.Content
            title={customTitle || getTitle(screen)}
            titleStyle={styles.headerTitle}
          />
        </Appbar.Header>
        <View style={styles.content}>
          {renderScreen()}
        </View>
      </View>
    </NavigationContext.Provider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <PaperProvider theme={darkTheme}>
          <StatusBar style="light" />
          <AppContent />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    color: '#E53935',
    fontFamily: typewriterFont,
    fontWeight: '700',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
