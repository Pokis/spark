jest.mock('../state/SparkProvider', () => ({
  useSpark: () => ({ settings: { language: 'en' } })
}));

import * as Localization from 'expo-localization';
import {
  coreExperienceKeys,
  hasBundledTranslation,
  isRtlLocale,
  resolveLocale,
  supportedLocales,
  translate
} from '.';

describe('localization catalog', () => {
  it('includes Lithuanian navigation and help copy', () => {
    expect(translate('lt', 'today')).toBe('Šiandien');
    expect(translate('lt', 'helpNow')).toBe('Padėk man dabar');
    expect(translate('lt', 'thoughtOrTask')).toBe('Mintis arba užduotis');
    expect(translate('lt', 'suggestedNextActions')).toBe('Siūlomi kiti veiksmai');
  });

  it('falls back to English for a missing localized key', () => {
    expect(translate('ja', 'notMedical')).toContain('does not diagnose');
  });

  it('ships every configured popular language with non-empty core labels', () => {
    expect(supportedLocales).toHaveLength(20);
    for (const item of supportedLocales) {
      if (item.code === 'system') continue;
      for (const key of coreExperienceKeys) {
        expect(hasBundledTranslation(item.code, key)).toBe(true);
        expect(translate(item.code, key).trim()).not.toBe('');
      }
    }
    expect(supportedLocales.map((item) => item.code)).toEqual(
      expect.arrayContaining(['lt', 'nl', 'tr', 'id', 'vi'])
    );
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('lt')).toBe(false);
  });

  it('normalizes system Portuguese and Chinese and falls back for unknown locales', () => {
    jest.spyOn(Localization, 'getLocales')
      .mockReturnValueOnce([{ languageTag: 'pt-PT' }] as never)
      .mockReturnValueOnce([{ languageTag: 'zh-TW' }] as never)
      .mockReturnValueOnce([{ languageTag: 'id-ID' }] as never)
      .mockReturnValueOnce([{ languageTag: 'vi-VN' }] as never)
      .mockReturnValueOnce([{ languageTag: 'sv-SE' }] as never);
    expect(resolveLocale('system')).toBe('pt-BR');
    expect(resolveLocale('system')).toBe('zh-Hans');
    expect(resolveLocale('system')).toBe('id');
    expect(resolveLocale('system')).toBe('vi');
    expect(resolveLocale('system')).toBe('en');
    expect(resolveLocale('lt')).toBe('lt');
  });
});
