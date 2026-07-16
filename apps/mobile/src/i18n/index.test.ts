jest.mock('../state/SparkProvider', () => ({
  useSpark: () => ({ settings: { language: 'en' } })
}));

import * as Localization from 'expo-localization';
import { resolveLocale, supportedLocales, translate } from '.';

describe('localization catalog', () => {
  it('includes Lithuanian navigation and help copy', () => {
    expect(translate('lt', 'today')).toBe('Šiandien');
    expect(translate('lt', 'helpNow')).toBe('Padėk man dabar');
  });

  it('falls back to English for a missing localized key', () => {
    expect(translate('ja', 'notMedical')).toContain('does not diagnose');
  });

  it('ships every configured popular language with non-empty core labels', () => {
    expect(supportedLocales).toHaveLength(16);
    for (const item of supportedLocales) {
      if (item.code === 'system') continue;
      expect(translate(item.code, 'today').trim()).not.toBe('');
      expect(translate(item.code, 'settings').trim()).not.toBe('');
      expect(translate(item.code, 'helpNow').trim()).not.toBe('');
    }
  });

  it('normalizes system Portuguese and Chinese and falls back for unknown locales', () => {
    jest.spyOn(Localization, 'getLocales')
      .mockReturnValueOnce([{ languageTag: 'pt-PT' }] as never)
      .mockReturnValueOnce([{ languageTag: 'zh-TW' }] as never)
      .mockReturnValueOnce([{ languageTag: 'sv-SE' }] as never);
    expect(resolveLocale('system')).toBe('pt-BR');
    expect(resolveLocale('system')).toBe('zh-Hans');
    expect(resolveLocale('system')).toBe('en');
    expect(resolveLocale('lt')).toBe('lt');
  });
});
