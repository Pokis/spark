import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AppSnapshot } from '../data/models';
import { exportSnapshot, importSnapshot } from '../data/database';

export async function shareBackup(): Promise<void> {
  const snapshot = await exportSnapshot();
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('A temporary folder is not available.');
  const path = `${directory}spark-backup-${new Date().toISOString().slice(0, 10)}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(snapshot, null, 2), {
    encoding: FileSystem.EncodingType.UTF8
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Save your encrypted-device Spark backup'
  });
}

export async function pickAndRestoreBackup(): Promise<void> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false
  });
  if (result.canceled) return;
  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8
  });
  const snapshot = JSON.parse(raw) as AppSnapshot;
  if (
    snapshot.schemaVersion !== 1 ||
    !Array.isArray(snapshot.habits) ||
    !Array.isArray(snapshot.completions)
  ) {
    throw new Error('That file is not a valid Spark backup.');
  }
  await importSnapshot(snapshot);
}
