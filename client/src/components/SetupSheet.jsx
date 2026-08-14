import { signed } from '../lib/format.js';

const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);

// Eine Wert-Zeile. Wenn der Slider diesen Pfad veraendert, wird Baseline -> neu gezeigt.
function Field({ label, value, unit = '', change }) {
  if (value == null && !change) value = '—';
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted">{label}</span>
      {change ? (
        <span className="tabular-nums">
          <span className="text-muted/60 line-through mr-1.5">{change.from}</span>
          <span className="font-semibold" style={{ color: 'var(--car-accent)' }}>{change.to}{unit}</span>
          <span className="ml-1.5 text-[11px] text-muted">({signed(change.delta, Number.isInteger(change.delta) ? 0 : 1)})</span>
        </span>
      ) : (
        <span className="tabular-nums font-medium">{value}{unit}</span>
      )}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">{title}</h4>
      <div className="divide-y divide-line/60">{children}</div>
    </div>
  );
}

export default function SetupSheet({ baseline, adjustment }) {
  if (!baseline) return null;
  const ch = Object.fromEntries((adjustment?.changes ?? []).map((c) => [c.path, c]));
  const b = baseline;
  const cp = b.basicSetup?.tyres?.coldPressure ?? {};
  const al = b.basicSetup?.alignment ?? {};
  const el = b.basicSetup?.electronics ?? {};
  const st = b.basicSetup?.strategy ?? {};
  const mb = b.advancedSetup?.mechanicalBalance ?? {};
  const dm = b.advancedSetup?.dampers ?? {};
  const ae = b.advancedSetup?.aeroBalance ?? {};

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="display text-lg font-semibold">Setup-Datenblatt</h3>
        <span className="text-[11px] text-muted">Baseline · Slider-Änderungen hervorgehoben</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
        <Group title="Reifen (Kaltdruck)">
          <Field label="Vorne links" value={cp.fl} unit=" psi" />
          <Field label="Vorne rechts" value={cp.fr} unit=" psi" />
          <Field label="Hinten links" value={cp.rl} unit=" psi" />
          <Field label="Hinten rechts" value={cp.rr} unit=" psi" />
          <Field label="Mischung" value={b.basicSetup?.tyres?.compound === 'dry' ? 'Trocken' : b.basicSetup?.tyres?.compound} />
        </Group>

        <Group title="Ausrichtung">
          <Field label="Sturz vorne" value={al.camber?.fl} unit="°" />
          <Field label="Sturz hinten" value={al.camber?.rl} unit="°" />
          <Field label="Spur vorne" value={al.toe?.fl} unit="°" />
          <Field label="Spur hinten" value={al.toe?.rl} unit="°" />
          <Field label="Nachlauf" value={al.caster} unit="°" />
        </Group>

        <Group title="Elektronik">
          <Field label="TC1" value={el.tc1} />
          <Field label="TC2" value={el.tc2} />
          <Field label="ABS" value={el.abs} />
          <Field label="ECU-Map" value={el.ecuMap} />
        </Group>

        <Group title="Strategie">
          <Field label="Kraftstoff" value={st.fuel} unit=" L" />
          <Field label="Reifensatz" value={st.tyreSet} />
          <Field label="Bremsbelag vorne" value={st.frontBrakePad} />
          <Field label="Bremsbelag hinten" value={st.rearBrakePad} />
        </Group>

        <Group title="Mechanik">
          <Field label="Stabilisator vorne" value={mb.arbFront} change={ch['advancedSetup.mechanicalBalance.arbFront']} />
          <Field label="Stabilisator hinten" value={mb.arbRear} change={ch['advancedSetup.mechanicalBalance.arbRear']} />
          <Field label="Bremsbalance" value={mb.brakeBias} unit="%" change={ch['advancedSetup.mechanicalBalance.brakeBias']} />
          <Field label="Bremskraft" value={mb.brakeTorque} unit="%" />
          <Field label="Lenkübersetzung" value={mb.steeringRatio} />
          <Field label="Vorspannung Diff." value={mb.preload} unit=" Nm" change={ch['advancedSetup.mechanicalBalance.preload']} />
        </Group>

        <Group title="Aerodynamik">
          <Field label="Heckflügel" value={ae.rearWing} change={ch['advancedSetup.aeroBalance.rearWing']} />
          <Field label="Bodenfreiheit vorne" value={ae.rideHeightFront} unit=" mm" />
          <Field label="Bodenfreiheit hinten" value={ae.rideHeightRear} unit=" mm" />
          <Field label="Diffusor" value={ae.diffusor} />
          <Field label="Bremsluft vorne" value={ae.brakeDuctFront} />
          <Field label="Bremsluft hinten" value={ae.brakeDuctRear} />
        </Group>

        <Group title="Dämpfer vorne">
          <Field label="Druckstufe" value={dm.front?.bumpSlow} />
          <Field label="Schnelle Druckstufe" value={dm.front?.bumpFast} />
          <Field label="Zugstufe" value={dm.front?.reboundSlow} />
          <Field label="Schnelle Zugstufe" value={dm.front?.reboundFast} />
        </Group>

        <Group title="Dämpfer hinten">
          <Field label="Druckstufe" value={dm.rear?.bumpSlow} />
          <Field label="Schnelle Druckstufe" value={dm.rear?.bumpFast} />
          <Field label="Zugstufe" value={dm.rear?.reboundSlow} />
          <Field label="Schnelle Zugstufe" value={dm.rear?.reboundFast} />
        </Group>

        <Group title="Federung">
          <Field label="Radrate vorne" value={mb.wheelRate?.front} unit=" N/m" />
          <Field label="Radrate hinten" value={mb.wheelRate?.rear} unit=" N/m" />
          <Field label="Bumpstop-Rate vorne" value={mb.bumpstopRate?.front} />
          <Field label="Bumpstop-Rate hinten" value={mb.bumpstopRate?.rear} />
          <Field label="Federweg vorne" value={mb.bumpstopRange?.front} />
          <Field label="Federweg hinten" value={mb.bumpstopRange?.rear} />
        </Group>
      </div>
    </div>
  );
}
