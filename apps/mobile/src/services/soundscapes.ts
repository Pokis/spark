import * as FileSystem from 'expo-file-system/legacy';
import type { AppSettings } from '../data/models';

type SoundscapeKind = AppSettings['soundscapeKind'];

function write16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
}

function write32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
  bytes[offset + 3] = (value >> 24) & 0xff;
}

function ascii(bytes: Uint8Array, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
}

function base64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const value = (a << 16) | (b << 8) | c;
    output += alphabet[(value >> 18) & 63];
    output += alphabet[(value >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(value >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? alphabet[value & 63] : '=';
  }
  return output;
}

function wav(kind: SoundscapeKind): Uint8Array {
  const sampleRate = 8_000;
  const seconds = 5;
  const samples = sampleRate * seconds;
  const bytes = new Uint8Array(44 + samples * 2);
  ascii(bytes, 0, 'RIFF');
  write32(bytes, 4, bytes.length - 8);
  ascii(bytes, 8, 'WAVE');
  ascii(bytes, 12, 'fmt ');
  write32(bytes, 16, 16);
  write16(bytes, 20, 1);
  write16(bytes, 22, 1);
  write32(bytes, 24, sampleRate);
  write32(bytes, 28, sampleRate * 2);
  write16(bytes, 32, 2);
  write16(bytes, 34, 16);
  ascii(bytes, 36, 'data');
  write32(bytes, 40, samples * 2);

  let seed = kind === 'brown' ? 1459 : kind === 'pink' ? 2999 : 4073;
  let brown = 0;
  let smooth = 0;
  for (let index = 0; index < samples; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const white = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    brown = Math.max(-1, Math.min(1, brown * 0.985 + white * 0.035));
    smooth = smooth * 0.92 + white * 0.08;
    const fade = Math.min(1, index / 400, (samples - index) / 400);
    const sample =
      kind === 'brown'
        ? brown * 0.65
        : kind === 'pink'
          ? (smooth * 0.7 + white * 0.08)
          : (Math.sin((index / sampleRate) * Math.PI * 2 * 110) * 0.12 + brown * 0.18);
    const pcm = Math.round(Math.max(-1, Math.min(1, sample * fade)) * 32767);
    write16(bytes, 44 + index * 2, pcm < 0 ? pcm + 65536 : pcm);
  }
  return bytes;
}

export async function ensureSoundscape(kind: SoundscapeKind): Promise<string> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('A local soundscape folder is not available.');
  const path = `${directory}spark-${kind}-soundscape-v1.wav`;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.writeAsStringAsync(path, base64(wav(kind)), {
      encoding: FileSystem.EncodingType.Base64
    });
  }
  return path;
}
