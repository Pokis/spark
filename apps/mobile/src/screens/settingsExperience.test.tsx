import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { defaultAppConfig } from '@spark/cloud-contracts';
import { router } from 'expo-router';
import SettingsScreen from '../../app/settings';
import { defaultEntitlement, defaultSettings } from '../data/models';
import {
  creatorTipLinkEnabled,
  openCreatorTipLink
} from '../services/creatorSupport';
import { useSpark } from '../state/SparkProvider';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true)
  }
}));

jest.mock('../state/SparkProvider', () => ({ useSpark: jest.fn() }));

jest.mock('../services/creatorSupport', () => ({
  creatorTipLinkEnabled: jest.fn(() => true),
  openCreatorTipLink: jest.fn(async () => undefined)
}));

jest.mock('../services/cloudConfig', () => ({ cloudConfigured: jest.fn(() => false) }));

jest.mock('../data/database', () => ({
  clearDatabaseSafetyCopies: jest.fn(async () => undefined),
  getDatabaseSecurityStatus: jest.fn(async () => ({
    encrypted: true,
    cipherVersion: '4',
    integrity: 'ok',
    integrityMessage: 'ok',
    expoGoPreview: false
  })),
  listDatabaseSafetyCopies: jest.fn(async () => [])
}));

jest.mock('../services/backup', () => ({
  clearRestoreSafetyCopies: jest.fn(async () => undefined),
  listRestoreSafetyCopies: jest.fn(async () => []),
  pickBackupForPreview: jest.fn(async () => null),
  restoreBackup: jest.fn(async () => null),
  shareBackup: jest.fn(async () => undefined),
  sharePortableCsv: jest.fn(async () => undefined)
}));

jest.mock('../services/api', () => ({
  deleteCloudIdentity: jest.fn(async () => undefined)
}));

jest.mock('../services/diagnostics', () => ({
  clearDiagnostics: jest.fn(async () => undefined),
  shareDiagnostics: jest.fn(async () => undefined)
}));

jest.mock('../services/notifications', () => ({
  requestNotificationPermission: jest.fn(async () => true)
}));

const mockedSpark = useSpark as jest.MockedFunction<typeof useSpark>;
const mockedCreatorTipLinkEnabled =
  creatorTipLinkEnabled as jest.MockedFunction<typeof creatorTipLinkEnabled>;
const mockedOpenCreatorTipLink =
  openCreatorTipLink as jest.MockedFunction<typeof openCreatorTipLink>;
const mockedRouter = router as jest.Mocked<typeof router>;

function spark() {
  return {
    settings: { ...defaultSettings, displayName: 'Sam' },
    entitlement: defaultEntitlement,
    remoteConfig: defaultAppConfig,
    updateSetting: jest.fn(async () => undefined),
    refresh: jest.fn(async () => undefined)
  } as any;
}

describe('Settings information architecture and optional creator support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreatorTipLinkEnabled.mockReturnValue(true);
    mockedSpark.mockReturnValue(spark());
  });

  it('starts with one optional-features entry point and reveals settings on demand', async () => {
    const view = await render(<SettingsScreen />);
    expect(view.queryByPlaceholderText('Optional')).toBeNull();
    expect(view.getByText('None enabled · habit tracking stays simple')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Choose optional features' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/features');

    await fireEvent.press(view.getByRole('button', { name: 'Expand Name & language' }));
    expect(view.getByPlaceholderText('Optional').props.value).toBe('Sam');
    expect(view.getByText(/Navigation and essential actions/)).toBeTruthy();
    expect(view.getByRole('button', { name: 'Lietuvių' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Türkçe' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Tiếng Việt' })).toBeTruthy();

    await fireEvent.press(
      view.getByRole('button', { name: 'Expand Data & privacy' })
    );
    await waitFor(() => expect(view.getByText('Encrypted local storage check passed.')).toBeTruthy());
  });

  it('keeps the fixed, non-entitlement tip link low on the page and opens it explicitly', async () => {
    const view = await render(<SettingsScreen />);
    await fireEvent.press(
      view.getByRole('button', { name: 'Support the creator with a coffee ↗' })
    );
    await waitFor(() => expect(mockedOpenCreatorTipLink).toHaveBeenCalledTimes(1));
  });

  it('omits the external tip affordance from release builds when its flag is off', async () => {
    mockedCreatorTipLinkEnabled.mockReturnValue(false);
    const view = await render(<SettingsScreen />);
    expect(view.queryByRole('button', { name: 'Support the creator with a coffee ↗' })).toBeNull();
  });
});
