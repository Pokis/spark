import { useEffect, useState } from 'react';
import { defaultAppConfig, type AppConfig } from '@spark/cloud-contracts';
import { adminApi } from '../api';
import { ErrorBanner, PageHeader, Panel } from '../components/Common';

type CostedFlag =
  | 'announcementsEnabled'
  | 'supportEnabled'
  | 'purchasesEnabled'
  | 'userReviewEnabled'
  | 'manualGrantsEnabled'
  | 'promoCodesEnabled'
  | 'adminRolesEnabled';

const costedSwitches: {
  flag: CostedFlag;
  feature: string;
  title: string;
  description: string;
}[] = [
  {
    flag: 'announcementsEnabled',
    feature: 'globalAnnouncements',
    title: 'Global announcements',
    description: 'Allows enabled announcement content to appear on Today.'
  },
  {
    flag: 'supportEnabled',
    feature: 'supportInbox',
    title: 'Support inbox',
    description: 'Allows configured mobile builds and admins to use private support conversations.'
  },
  {
    flag: 'purchasesEnabled',
    feature: 'premiumPurchase',
    title: 'Purchases and restore',
    description: 'Keep off until the Play product and verification permission are ready.'
  },
  {
    flag: 'userReviewEnabled',
    feature: 'userReview',
    title: 'User and operations review',
    description: 'Enables overview counts, bounded user lookup, and audit-log review.'
  },
  {
    flag: 'manualGrantsEnabled',
    feature: 'manualGrants',
    title: 'Manual premium grants',
    description: 'Allows owners to grant or revoke premium for a known cloud identity.'
  },
  {
    flag: 'promoCodesEnabled',
    feature: 'promoCodes',
    title: 'Google Play promo inventory',
    description: 'Allows official Play codes to be imported, listed, and assigned.'
  },
  {
    flag: 'adminRolesEnabled',
    feature: 'adminRoles',
    title: 'Admin role management',
    description: 'Allows owners to add, change, or remove dashboard roles.'
  }
];

export function ConfigPage() {
  const [config, setConfig] = useState<AppConfig>(defaultAppConfig);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState('');

  async function load() {
    try {
      setConfig(await adminApi.config());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load config.');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (
      !window.confirm(
        [
          'Publish this global configuration?',
          `Announcements: ${config.defaults.announcementsEnabled ? 'enabled' : 'disabled'}`,
          `Support: ${config.defaults.supportEnabled ? 'enabled' : 'disabled'}`,
          `Purchases: ${config.defaults.purchasesEnabled ? 'enabled' : 'disabled'}`,
          `User review: ${config.defaults.userReviewEnabled ? 'enabled' : 'disabled'}`,
          `Manual grants: ${config.defaults.manualGrantsEnabled ? 'enabled' : 'disabled'}`,
          `Promo codes: ${config.defaults.promoCodesEnabled ? 'enabled' : 'disabled'}`,
          `Admin roles: ${config.defaults.adminRolesEnabled ? 'enabled' : 'disabled'}`,
          `Notification cap: ${config.defaults.maxDailyHabitNotifications}`
        ].join('\n')
      )
    ) {
      return;
    }
    setError(null);
    setSaved('');
    try {
      const { updatedAt: _updatedAt, ...input } = config;
      const result = await adminApi.saveConfig(input);
      setConfig(result);
      setSaved(`Saved ${new Date(result.updatedAt).toLocaleString()}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save config.');
    }
  }

  const announcement = config.announcements[0] ?? {
    id: 'main',
    title: '',
    body: '',
    enabled: false
  };

  function setAnnouncement(updates: Partial<typeof announcement>) {
    setConfig((current) => ({
      ...current,
      announcements: [{ ...announcement, ...updates }]
    }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Small remote adjustments"
        title="App config"
        description="Devices cache this for 24 hours and retain safe baked defaults when offline."
        action={<button onClick={() => void save()}>Save config</button>}
      />
      <ErrorBanner error={error} />
      {saved ? <div className="success-banner">{saved}</div> : null}
      <div className="two-column">
        <Panel title="Service switches">
          <div className="form-stack">
            <p className="hint">
              These switches are all off in baked defaults. The Terraform cloud-runtime master
              switch must also be on before any of them can create billable usage.
            </p>
            {costedSwitches.map((item) => (
              <label className="switch-row" key={item.flag}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <input
                  type="checkbox"
                  checked={config.defaults[item.flag]}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      defaults: {
                        ...current.defaults,
                        [item.flag]: event.target.checked
                      },
                      features: {
                        ...current.features,
                        [item.feature]: event.target.checked
                      }
                    }))
                  }
                />
              </label>
            ))}
            <label>
              Maximum daily habit notifications
              <input
                type="number"
                min="0"
                max="8"
                value={config.defaults.maxDailyHabitNotifications}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    defaults: {
                      ...current.defaults,
                      maxDailyHabitNotifications: Number(event.target.value)
                    }
                  }))
                }
              />
            </label>
            <label>
              Focus choices (minutes, comma separated)
              <input
                value={config.defaults.focusMinutes.join(', ')}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    defaults: {
                      ...current.defaults,
                      focusMinutes: event.target.value
                        .split(',')
                        .map(Number)
                        .filter((value) => Number.isInteger(value) && value > 0 && value <= 180)
                        .slice(0, 8)
                    }
                  }))
                }
              />
            </label>
          </div>
        </Panel>
        <Panel title="Optional announcement">
          <div className="form-stack">
            <label className="switch-row">
              <span>
                <strong>Show announcement</strong>
                <small>Appears near the top of Today.</small>
              </span>
              <input
                type="checkbox"
                checked={announcement.enabled && config.defaults.announcementsEnabled}
                disabled={!config.defaults.announcementsEnabled}
                onChange={(event) => setAnnouncement({ enabled: event.target.checked })}
              />
            </label>
            <label>
              Title
              <input
                maxLength={80}
                value={announcement.title}
                onChange={(event) => setAnnouncement({ title: event.target.value })}
              />
            </label>
            <label>
              Body
              <textarea
                rows={5}
                maxLength={240}
                value={announcement.body}
                onChange={(event) => setAnnouncement({ body: event.target.value })}
              />
            </label>
            <p className="hint">
              No user targeting is provided. This keeps configuration simple, predictable, and
              cheap.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
