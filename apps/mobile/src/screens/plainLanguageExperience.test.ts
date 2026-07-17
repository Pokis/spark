import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

describe('plain-language information architecture', () => {
  const userFacingSources = [
    '../../app.config.ts',
    '../../app/(tabs)/index.tsx',
    '../../app/(tabs)/journey.tsx',
    '../../app/(tabs)/focus.tsx',
    '../../app/onboarding.tsx',
    '../../app/guide.tsx',
    '../../app/weekly-reset.tsx',
    '../../app/routine/[id].tsx',
    '../../app/habit/[id]/history.tsx',
    '../../app/settings.tsx',
    '../../app/tutorials.tsx',
    '../../app/experiments.tsx',
    '../../app/help.tsx',
    '../components/HabitCard.tsx',
    '../components/MomentumCard.tsx',
    '../lib/tutorials.ts',
    '../services/widget.tsx',
    '../services/notifications.ts'
  ].map(read);

  it('keeps internal product and testing jargon out of everyday screens', () => {
    const combined = userFacingSources.join('\n');
    for (const phrase of [
      'A/B',
      'engagement experiment',
      'Personal experiments',
      'Today’s shape',
      'Cognitive load',
      'Flex pass',
      'Momentum streak'
    ]) {
      expect(combined).not.toContain(phrase);
    }
  });

  it('leads with wins and direct mechanics instead of repeated absence-focused reassurance', () => {
    const combined = userFacingSources.join('\n').toLowerCase();
    for (const phrase of [
      'nothing was lost',
      'no missed-day score',
      'nothing was marked missed',
      'no streak resets',
      'red failure calendars',
      'blank days erase nothing',
      'no speed score',
      'gentle',
      'gentle restart',
      'gentle weekly reset',
      'without punishment'
    ]) {
      expect(combined).not.toContain(phrase);
    }

    expect(combined).toContain('every completed action builds your progress');
    expect(combined).toContain('choose your next win');
    expect(combined).toContain('celebrate completed actions');
  });

  it('keeps the important Today controls clearly named and reversible', () => {
    const today = read('../../app/(tabs)/index.tsx');
    expect(today).toContain('Adjust today’s suggestions');
    expect(today).toContain('Done adjusting');
    expect(today).toContain('Suggested next actions');
    expect(today).toContain('Need fewer choices?');
  });

  it('groups learning and settings by the user’s purpose', () => {
    const tutorials = read('../lib/tutorials.ts');
    const settings = read('../../app/settings.tsx');
    expect(tutorials).toContain("title: 'Start here'");
    expect(tutorials).toContain("title: 'Daily tools'");
    expect(settings).toContain('Help & learning');
    expect(settings).toContain('Planning & extra tools');
    expect(settings).toContain('Privacy & troubleshooting');
  });
});
