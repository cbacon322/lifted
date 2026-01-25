import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// iOS-inspired color palette
const colors = {
  // iOS System Colors
  primary: '#007AFF', // iOS blue
  secondary: '#5856D6', // iOS purple
  tertiary: '#FF9500', // iOS orange

  // Status colors
  success: '#34C759', // iOS green
  error: '#FF3B30', // iOS red
  warning: '#FF9500', // iOS orange

  // Gray scale
  gray1: '#8E8E93',
  gray2: '#AEAEB2',
  gray3: '#C7C7CC',
  gray4: '#D1D1D6',
  gray5: '#E5E5EA',
  gray6: '#F2F2F7',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    error: colors.error,
    surface: '#FFFFFF',
    surfaceVariant: colors.gray6,
    background: colors.gray6,
    outline: colors.gray4,
    onSurface: '#000000',
    onSurfaceVariant: colors.gray1,
  },
  custom: {
    success: colors.success,
    warning: colors.warning,
    improved: colors.success,
    decreased: colors.warning,
    added: colors.primary,
    removed: colors.error,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#0A84FF', // iOS dark mode blue
    secondary: '#5E5CE6',
    tertiary: '#FF9F0A',
    error: '#FF453A',
    surface: '#1C1C1E',
    surfaceVariant: '#2C2C2E',
    background: '#000000',
    outline: '#38383A',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#8E8E93',
  },
  custom: {
    success: '#32D74B',
    warning: '#FF9F0A',
    improved: '#32D74B',
    decreased: '#FF9F0A',
    added: '#0A84FF',
    removed: '#FF453A',
  },
};

export type AppTheme = typeof lightTheme;
