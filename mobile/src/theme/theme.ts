import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import { Platform } from 'react-native';

// Vintage typewriter font configuration
// Using Courier on iOS and monospace on Android for typewriter feel
const typewriterFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
});

const fontConfig = {
  displayLarge: { fontFamily: typewriterFont },
  displayMedium: { fontFamily: typewriterFont },
  displaySmall: { fontFamily: typewriterFont },
  headlineLarge: { fontFamily: typewriterFont },
  headlineMedium: { fontFamily: typewriterFont },
  headlineSmall: { fontFamily: typewriterFont },
  titleLarge: { fontFamily: typewriterFont },
  titleMedium: { fontFamily: typewriterFont },
  titleSmall: { fontFamily: typewriterFont },
  labelLarge: { fontFamily: typewriterFont },
  labelMedium: { fontFamily: typewriterFont },
  labelSmall: { fontFamily: typewriterFont },
  bodyLarge: { fontFamily: typewriterFont },
  bodyMedium: { fontFamily: typewriterFont },
  bodySmall: { fontFamily: typewriterFont },
};

// Dark mode with true blacks and red accent colors
const colors = {
  // Primary red tones
  primary: '#E53935', // Vibrant red
  primaryDark: '#B71C1C', // Deep red
  primaryLight: '#FF6659', // Light red

  // Secondary/accent
  secondary: '#D32F2F',
  tertiary: '#FF5252',

  // Status colors (keeping some for UX clarity)
  success: '#4CAF50', // Green for completed sets
  error: '#FF1744', // Bright red for errors
  warning: '#FF6D00', // Orange warning

  // True blacks and grays
  black: '#000000',
  surface: '#0A0A0A', // Near black
  surfaceElevated: '#141414', // Slightly elevated
  card: '#1A1A1A', // Card background

  // Text colors - red tinted
  textPrimary: '#E53935', // Red primary text
  textSecondary: '#EF5350', // Lighter red
  textMuted: '#888888', // Gray for muted/secondary info
  textOnDark: '#FFCDD2', // Light pink for contrast

  // Borders
  border: '#2A2A2A',
  borderLight: '#333333',
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    error: colors.error,
    surface: colors.surface,
    surfaceVariant: colors.surfaceElevated,
    background: colors.black,
    outline: colors.border,
    outlineVariant: colors.borderLight,
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    onBackground: colors.textPrimary,
    inverseSurface: colors.textOnDark,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceElevated,
      level3: colors.card,
      level4: colors.card,
      level5: colors.card,
    },
  },
  custom: {
    success: colors.success,
    warning: colors.warning,
    improved: colors.success,
    decreased: colors.warning,
    added: colors.primaryLight,
    removed: colors.error,
    card: colors.card,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    textOnDark: colors.textOnDark,
    border: colors.border,
    typewriterFont: typewriterFont,
  },
};

// Export as the main theme (dark mode only now)
export const liftedTheme = darkTheme;

// Keep lightTheme export for compatibility but point to dark
export const lightTheme = darkTheme;

export type AppTheme = typeof darkTheme;
