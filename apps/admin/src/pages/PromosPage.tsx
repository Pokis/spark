import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { ErrorBanner, PageHeader, Panel } from '../components/Common';
import type { PromoCode } from '../types';

export function PromosPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [campaign, setCampaign] = useState('');
  const [productId, setProductId] = useState('spark_premium_lifetime');
  const [rawCodes, setRawCodes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setCodes(await adminApi.promos());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load codes.');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function importCodes() {
    const values = rawCodes
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
    try {
      const result = await adminApi.importPromos({
        codes: values,
        campaign,
        productId
      });
      setMessage(`Imported ${result.imported} code(s).`);
      setRawCodes('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Import failed.');
    }
  }

  const available = codes.filter((code) => code.status === 'available').length;
  return (
    <>
      <PageHeader
        eyebrow="Google Play-managed grants"
        title="Promo codes"
        description="Import official Play Console codes. Spark does not invent a parallel public license system."
        action={<button onClick={() => void load()}>Refresh</button>}
      />
      <ErrorBanner error={error} />
      {message ? <div className="success-banner">{message}</div> : null}
      <div className="metric-grid">
        <Panel>
          <span className="metric">{available}</span>
          <span className="metric-label">available</span>
        </Panel>
        <Panel>
          <span className="metric">{codes.length - available}</span>
          <span className="metric-label">assigned</span>
        </Panel>
      </div>
      <div className="two-column">
        <Panel title="Import a Play campaign">
          <div className="form-stack">
            <label>
              Campaign name
              <input value={campaign} onChange={(event) => setCampaign(event.target.value)} />
            </label>
            <label>
              Play product ID
              <input value={productId} onChange={(event) => setProductId(event.target.value)} />
            </label>
            <label>
              Codes, one per line
              <textarea
                rows={10}
                value={rawCodes}
                onChange={(event) => setRawCodes(event.target.value)}
                spellCheck={false}
              />
            </label>
            <button
              disabled={!campaign.trim() || !productId.trim() || !rawCodes.trim()}
              onClick={() => void importCodes()}
            >
              Import codes
            </button>
            <p className="hint">
              Codes remain readable to authorized staff so they can be sent to a chosen user.
              Firestore client access is denied.
            </p>
          </div>
        </Panel>
        <Panel title="Recent inventory">
          <div className="code-list">
            {codes.slice(0, 100).map((code) => (
              <div key={code.id} className="code-row">
                <div>
                  <strong>{code.campaign}</strong>
                  <code>{code.code}</code>
                </div>
                <span className={code.status === 'available' ? 'badge premium' : 'badge'}>
                  {code.status}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
