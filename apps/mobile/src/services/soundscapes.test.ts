import * as FileSystem from 'expo-file-system/legacy';
import { ensureSoundscape } from './soundscapes';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'cache/',
  EncodingType: { Base64: 'base64' },
  getInfoAsync: jest.fn(),
  writeAsStringAsync: jest.fn(async () => undefined)
}));

describe('offline soundscapes', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['brown', 'pink', 'soft'] as const)(
    'generates a valid local WAV once for %s noise',
    async (kind) => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
      await expect(ensureSoundscape(kind)).resolves.toBe(
        `cache/spark-${kind}-soundscape-v1.wav`
      );
      const [, encoded, options] = (FileSystem.writeAsStringAsync as jest.Mock)
        .mock.calls[0];
      const bytes = Buffer.from(encoded, 'base64');
      expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString('ascii')).toBe('WAVE');
      expect(bytes.length).toBe(80_044);
      expect(options).toEqual({ encoding: 'base64' });
    }
  );

  it('reuses the cached file without regenerating audio', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    await expect(ensureSoundscape('brown')).resolves.toContain('brown');
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });
});
