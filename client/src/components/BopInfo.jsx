// LFM-BoP für dieses Auto auf dieser Strecke. Reine Information: Ballast/Restrictor
// beeinflussen Rundenzeiten, fliessen aber bewusst NICHT in die Reifendruck-Rechnung
// ein — dafuer gibt es keine belastbaren Daten (das Modell rechnet ueber Temperatur).
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export default function BopInfo({ bop }) {
  if (!bop) return null;
  const { ballast = 0, restrictor = 0, version, activeSince } = bop;
  const seit = fmtDate(activeSince);
  // Ballast bremst (rot), Abzug hilft (gruen) — 0 bleibt neutral.
  const farbe = ballast > 0 ? 'text-bad' : ballast < 0 ? 'text-good' : 'text-ink';

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="display text-lg font-semibold">LFM BoP</h3>
        <span className="text-[11px] text-muted">
          {version != null && `v${version}`}{seit && ` · seit ${seit}`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="glass rounded-xl p-3 border-line">
          <div className="text-[11px] uppercase tracking-wider text-muted">Ballast</div>
          <div className={`mono text-xl mt-0.5 tabular-nums ${farbe}`}>
            {ballast > 0 ? '+' : ''}{ballast} kg
          </div>
        </div>
        <div className="glass rounded-xl p-3 border-line">
          <div className="text-[11px] uppercase tracking-wider text-muted">Restriktor</div>
          <div className={`mono text-xl mt-0.5 tabular-nums ${restrictor > 0 ? 'text-bad' : 'text-ink'}`}>
            {restrictor}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted mt-3 leading-relaxed">
        {ballast === 0 && restrictor === 0
          ? 'Keine Zusatzlast auf dieser Strecke.'
          : ballast > 0
            ? `${ballast} kg Zusatzgewicht kosten Rundenzeit — Bremspunkte etwas früher, Reifen bauen schneller ab.`
            : `${Math.abs(ballast)} kg weniger als die Referenz — das Auto ist hier begünstigt.`}
        {' '}Beeinflusst die Rundenzeiten, nicht die Druckberechnung.
      </p>
    </div>
  );
}
