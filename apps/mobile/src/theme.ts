import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type PropsWithChildren
} from 'react';
import { useColorScheme } from 'react-native';

export const palette = {
  navy950: '#070B17',
  navy900: '#0B1020',
  navy800: '#141B30',
  navy700: '#202A45',
  ink: '#172033',
  muted: '#667085',
  mist: '#F3F5FA',
  white: '#FFFFFF',
  coral: '#FF6B5F',
  coralDark: '#DB4E44',
  gold: '#FFC857',
  teal: '#20B8B2',
  purple: '#8367E8',
  blue: '#5B8DEF',
  green: '#46B77A',
  red: '#D92D20'
} as const;

export type Theme = ReturnType<typeof makeTheme>;

export function makeTheme(
  dark: boolean,
  highContrast = false,
  supporter = false,
  supporterTheme: 'aurora' | 'ocean' | 'forest' = 'aurora'
) {
  if (highContrast) {
    return {
      dark,
      background: dark ? '#000000' : '#FFFFFF',
      surface: dark ? '#000000' : '#FFFFFF',
      surfaceAlt: dark ? '#151515' : '#F2F2F2',
      border: dark ? '#FFFFFF' : '#111827',
      text: dark ? '#FFFFFF' : '#000000',
      textMuted: dark ? '#E5E7EB' : '#374151',
      primary: '#A92D26',
      primaryText: '#FFFFFF',
      success: dark ? '#63E6BE' : '#087F5B',
      warning: dark ? '#FFD166' : '#8A5A00',
      purple: dark ? '#C4B5FD' : '#5B21B6',
      tabBar: dark ? '#000000' : '#FFFFFF',
      shadow: '#000000'
    };
  }
  const supporterAccent =
    supporterTheme === 'ocean'
      ? '#247BA0'
      : supporterTheme === 'forest'
        ? '#2F855A'
        : '#6546C3';
  return {
    dark,
    background: dark ? palette.navy950 : '#F8F7FC',
    surface: dark ? palette.navy900 : palette.white,
    surfaceAlt: dark ? palette.navy800 : palette.mist,
    border: dark ? palette.navy700 : '#E5E7EF',
    text: dark ? '#F7F8FC' : palette.ink,
    textMuted: dark ? '#A8B0C4' : palette.muted,
    primary: supporter ? supporterAccent : palette.coral,
    primaryText: palette.white,
    success: palette.teal,
    warning: palette.gold,
    purple: palette.purple,
    tabBar: dark ? palette.navy900 : palette.white,
    shadow: '#000000'
  };
}

const ThemeContext = createContext<Theme | null>(null);

export function SparkThemeProvider({
  children,
  highContrast,
  supporter,
  supporterTheme
}: PropsWithChildren<{
  highContrast: boolean;
  supporter: boolean;
  supporterTheme: 'aurora' | 'ocean' | 'forest';
}>) {
  const dark = useColorScheme() === 'dark';
  const theme = useMemo(
    () => makeTheme(dark, highContrast, supporter, supporterTheme),
    [dark, highContrast, supporter, supporterTheme]
  );
  return createElement(ThemeContext.Provider, { value: theme }, children);
}

export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  const fallback = makeTheme(useColorScheme() === 'dark');
  return context ?? fallback;
}

export const habitColors = [
  palette.coral,
  palette.teal,
  palette.purple,
  palette.blue,
  palette.gold,
  palette.green
];
