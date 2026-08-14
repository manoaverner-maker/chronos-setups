import { useState } from 'react';
import { buildSetupExport, buildSetupText, downloadJSON, copyText } from '../lib/exportSetup.js';

// Feature 3a: Export des berechneten Setups als JSON + "Werte kopieren".
export default function SetupActions({ data }) {
  const [copied, setCopied] = useState(false);
  if (!data || data.error) return null;

  const onExport = () => {
    const obj = buildSetupExport(data);
    const name = `aspl_${data.car}_${data.track}_${obj.conditions.character ?? 'setup'}`
      .replace(/\s+/g, '-').toLowerCase();
    downloadJSON(obj, `${name}.json`);
  };
  const onCopy = async () => {
    if (await copyText(buildSetupText(data))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const btn = 'glass rounded-xl px-3.5 py-2 text-sm hover:border-car/50 transition-colors active:scale-[0.98]';
  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={onExport} className={btn}>↓ JSON exportieren</button>
      <button onClick={onCopy} className={btn}>{copied ? 'Kopiert ✓' : '⧉ Werte kopieren'}</button>
    </div>
  );
}
