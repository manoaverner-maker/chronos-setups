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

      {/* Flach statt Kaesten-in-Kaesten — zwei Werte brauchen keine eigenen Rahmen. */}
      <div className="mt-3 flex items-baseline gap-8">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted">Ballast</div>
          <div className={`mono text-2xl mt-0.5 tabular-nums ${farbe}`}>
            {ballast > 0 ? '+' : ''}{ballast}<span className="text-sm text-muted ml-1">kg</span>
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted">Restriktor</div>
          <div className={`mono text-2xl mt-0.5 tabular-nums ${restrictor > 0 ? 'text-bad' : 'text-muted'}`}>
            {restrictor}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted mt-3">
        {ballast === 0 && restrictor === 0
          ? 'Keine Zusatzlast hier.'
          : ballast > 0
            ? `${ballast} kg Mehrgewicht — kostet Rundenzeit.`
            : `${Math.abs(ballast)} kg leichter als die Referenz.`}
        {' '}Wirkt auf Zeiten, nicht auf den Druck.
      </p>
    </div>
  );
}
