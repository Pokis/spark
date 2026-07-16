import { translate } from '.';

describe('localization catalog', () => {
  it('includes Lithuanian navigation and help copy', () => {
    expect(translate('lt', 'today')).toBe('Šiandien');
    expect(translate('lt', 'helpNow')).toBe('Padėk man dabar');
  });

  it('falls back to English for a missing localized key', () => {
    expect(translate('ja', 'notMedical')).toContain('does not diagnose');
  });
});

