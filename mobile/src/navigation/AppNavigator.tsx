import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';

// Screens
import TemplateListScreen from '../screens/TemplateListScreen';
import TemplateDetailScreen from '../screens/TemplateDetailScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import WorkoutComparisonScreen from '../screens/WorkoutComparisonScreen';

// Navigation types
export type RootStackParamList = {
  TemplateList: undefined;
  TemplateDetail: { templateId: string };
  ActiveWorkout: { templateId: string };
  WorkoutComparison: { workoutId: string; templateId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="TemplateList"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen
          name="TemplateList"
          component={TemplateListScreen}
          options={{ title: 'Workouts' }}
        />
        <Stack.Screen
          name="TemplateDetail"
          component={TemplateDetailScreen}
          options={{ title: 'Workout Details' }}
        />
        <Stack.Screen
          name="ActiveWorkout"
          component={ActiveWorkoutScreen}
          options={{
            title: 'Active Workout',
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="WorkoutComparison"
          component={WorkoutComparisonScreen}
          options={{
            title: 'Workout Complete',
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
