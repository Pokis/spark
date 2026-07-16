import { renderHook } from '@testing-library/react-native';
import { makeTheme, SparkThemeProvider, useTheme } from './theme';

describe('Spark theme', () => {
  it('builds accessible light and dark high-contrast palettes', () => {
    expect(makeTheme(false, true)).toMatchObject({
      dark: false,
      background: '#FFFFFF',
      text: '#000000',
      border: '#111827'
    });
    expect(makeTheme(true, true)).toMatchObject({
      dark: true,
      background: '#000000',
      text: '#FFFFFF',
      border: '#FFFFFF'
    });
  });

  it.each([
    ['aurora', '#6546C3'],
    ['ocean', '#247BA0'],
    ['forest', '#2F855A']
  ] as const)('uses the %s supporter accent', (supporterTheme, primary) => {
    expect(makeTheme(false, false, true, supporterTheme).primary).toBe(primary);
  });

  it('provides the configured theme to descendants', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SparkThemeProvider
        highContrast
        supporter
        supporterTheme="forest"
      >
        {children}
      </SparkThemeProvider>
    );
    const hook = await renderHook(() => useTheme(), { wrapper });
    expect(hook.result.current).toMatchObject({
      background: '#FFFFFF',
      primary: '#A92D26'
    });
  });
});
