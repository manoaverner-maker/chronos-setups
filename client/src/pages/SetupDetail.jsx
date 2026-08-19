import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { getCars, getTracks, getSetup, getSetupVariants } from '../lib/api.js';
import { pageMotion } from '../lib/motion.js';
import { useCarAccent } from '../lib/useCarAccent.js';
import TrackHero from '../components/TrackHero.jsx';
import TempControls from '../components/TempControls.jsx';
import PressurePanel from '../components/PressurePanel.jsx';
import SafetySlider from '../components/SafetySlider.jsx';
import ReferenceTimes from '../components/ReferenceTimes.jsx';
import SetupSheet from '../components/SetupSheet.jsx';
import FuelCalculator from '../components/FuelCalculator.jsx';
import SetupActions from '../components/SetupActions.jsx';
import BopInfo from '../components/BopInfo.jsx';
import Tabs from '../components/Tabs.jsx';

// Ein Pill-Knopf pro Setup-Variante (Ersteller · Session; Regen-Setups blau markiert).
function VariantPicker({ variants, selected, onSelect }) {
  if (!variants || variants.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((v) => {
        const active = v.file === selected;
        const wet = v.compound === 'wet';
        return (
          <button
            key={v.file}
            onClick={() => onSelect(v.file)}
            className={`glass rounded-xl px-3 py-1.5 text-xs transition-colors
              ${active ? 'border-car/60 bg-car/15 text-ink' : 'text-muted hover:text-ink'}
              ${wet ? 'border-sky-400/40' : ''}`}
          >
            {wet && <span className="mr-1" aria-hidden>🌧</span>}
            <span className="font-medium">{v.author}</span>
            <span className="opacity-70"> · {v.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function SetupDetail() {
  const { car, track } = useParams();
  const [air, setAir] = useState(null);
  const [trk, setTrk] = useState(null);
  const [slider, setSlider] = useState(0);
  const [file, setFile] = useState(null); // null = Standard-Variante (Index-Sortierung)

  const { data: cars } = useQuery({ queryKey: ['cars'], queryFn: getCars });
  const carInfo = cars?.find((c) => c.id === car);
  useCarAccent(carInfo?.accentColor);

  const { data: tracks } = useQuery({ queryKey: ['tracks'], queryFn: getTracks });
  const trackInfo = tracks?.find((t) => t.id === track);

  const { data: variants } = useQuery({ queryKey: ['variants', car, track], queryFn: () => getSetupVariants(car, track) });

  const { data } = useQuery({
    queryKey: ['setup', car, track, air, trk, slider, file],
    queryFn: () => getSetup(car, track, { airTemp: air, trackTemp: trk, slider, file }),
    placeholderData: keepPreviousData,
  });

  // Variantenwechsel: Temperaturregler auf die Referenz der neuen Baseline zuruecksetzen.
  const selectVariant = (f) => {
    setFile(f);
    setAir(null);
    setTrk(null);
  };

  // Regler mit der Referenztemperatur der Baseline initialisieren. Nach einem
  // Variantenwechsel nur mit den Daten der NEUEN Variante (keepPreviousData zeigt
  // kurz noch die alte — deren Referenz darf nicht einrasten).
  useEffect(() => {
    const freshVariant = file == null || data?.sourceFile === file;
    if (freshVariant && data?.referenceTemp && air == null && data.referenceTemp.air != null) {
      setAir(data.referenceTemp.air);
      setTrk(data.referenceTemp.track);
    }
  }, [data, air, file]);

  const noSetup = data?.error;

  return (
    <motion.div variants={pageMotion} initial="initial" animate="animate" exit="exit" className="space-y-5">
      {/* Am Handy untereinander: Fahrzeugname und die zwei Export-Knoepfe passen
          auf 375 px nicht nebeneinander und brachen unschoen um. */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <Link to={`/${car}`} className="text-sm text-muted hover:text-ink transition-colors truncate">
          ‹ {carInfo?.displayName ?? 'Kalender'}
        </Link>
        {!noSetup && <SetupActions data={data} />}
      </div>

      <TrackHero track={trackInfo}>
        {!noSetup && (
          <div className="flex flex-col gap-2.5">
            {/* Wer das Setup gebaut hat — gehoert zum Kopf, nicht in eine Randnotiz. */}
            {data?.author && (
              <p className="text-sm">
                <span className="text-muted">Setup von </span>
                <span className="font-semibold" style={{ color: 'var(--car-accent)' }}>{data.author}</span>
                {data.variant && <span className="text-muted"> · {data.variant}</span>}
                {data.referenceTemp?.air != null && (
                  <span className="text-muted/70 text-xs">
                    {' '}· gebaut bei {data.referenceTemp.air}°/{data.referenceTemp.track}°C
                    {data.referenceTemp.estimated ? ' (ca.)' : ''}
                  </span>
                )}
              </p>
            )}
            <VariantPicker variants={variants} selected={data?.sourceFile} onSelect={selectVariant} />
          </div>
        )}
      </TrackHero>

      {noSetup ? (
        <div className="glass rounded-2xl p-6 text-warn">
          Für diese Strecke liegt noch kein transkribiertes Setup vor.
        </div>
      ) : (
        /* Drei Reiter statt sieben gestapelter Karten: zuerst das, was man am Lenkrad
           braucht; Renn-Planung und das vollstaendige Datenblatt eine Ebene tiefer. */
        <Tabs
          tabs={[
            {
              id: 'setup',
              label: 'Setup',
              hint: 'Druck & Charakter',
              content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-5">
                    <TempControls
                      air={air ?? data?.referenceTemp?.air ?? 21}
                      track={trk ?? data?.referenceTemp?.track ?? 29}
                      refTemp={data?.referenceTemp}
                      onAir={setAir}
                      onTrack={setTrk}
                    />
                    <PressurePanel pressures={data?.pressures} />
                  </div>
                  <SafetySlider adjustment={data?.adjustment} value={slider} onChange={setSlider} />
                </div>
              ),
            },
            {
              id: 'rennen',
              label: 'Rennen',
              hint: 'BoP, Zeiten, Sprit',
              content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-5">
                    <BopInfo bop={data?.bop} />
                    <ReferenceTimes
                      times={data?.referenceTimes}
                      available={data?.referenceTimesAvailable}
                      estimated={data?.referenceTimesEstimated}
                    />
                  </div>
                  <FuelCalculator
                    lapTimeStr={data?.referenceTimes?.pro ?? data?.referenceTimes?.alien}
                    lengthKm={trackInfo?.lengthKm}
                  />
                </div>
              ),
            },
            {
              id: 'datenblatt',
              label: 'Datenblatt',
              hint: 'alle Werte',
              content: <SetupSheet baseline={data?.baseline} adjustment={data?.adjustment} />,
            },
          ]}
        />
      )}
    </motion.div>
  );
}
