import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { getCars, getTracks, getSetup } from '../lib/api.js';
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

export default function SetupDetail() {
  const { car, track } = useParams();
  const [air, setAir] = useState(null);
  const [trk, setTrk] = useState(null);
  const [slider, setSlider] = useState(0);

  const { data: cars } = useQuery({ queryKey: ['cars'], queryFn: getCars });
  const carInfo = cars?.find((c) => c.id === car);
  useCarAccent(carInfo?.accentColor);

  const { data: tracks } = useQuery({ queryKey: ['tracks'], queryFn: getTracks });
  const trackInfo = tracks?.find((t) => t.id === track);

  const { data } = useQuery({
    queryKey: ['setup', car, track, air, trk, slider],
    queryFn: () => getSetup(car, track, { airTemp: air, trackTemp: trk, slider }),
    placeholderData: keepPreviousData,
  });

  // Regler einmalig mit der Referenztemperatur der Baseline initialisieren.
  useEffect(() => {
    if (data?.referenceTemp && air == null && data.referenceTemp.air != null) {
      setAir(data.referenceTemp.air);
      setTrk(data.referenceTemp.track);
    }
  }, [data, air]);

  const noSetup = data?.error;

  return (
    <motion.div variants={pageMotion} initial="initial" animate="animate" exit="exit" className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link to={`/${car}`} className="text-sm text-muted hover:text-ink transition-colors">
          ‹ {carInfo?.displayName ?? 'Kalender'}
        </Link>
        {!noSetup && <SetupActions data={data} />}
      </div>

      <TrackHero track={trackInfo} />

      {noSetup ? (
        <div className="glass rounded-2xl p-6 text-warn">
          Für diese Strecke liegt noch kein transkribiertes Setup vor.
        </div>
      ) : (
        <>
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
            <div className="space-y-5">
              <SafetySlider adjustment={data?.adjustment} value={slider} onChange={setSlider} />
              <ReferenceTimes
                times={data?.referenceTimes}
                available={data?.referenceTimesAvailable}
                estimated={data?.referenceTimesEstimated}
              />
              <FuelCalculator
                lapTimeStr={data?.referenceTimes?.pro ?? data?.referenceTimes?.alien}
                lengthKm={trackInfo?.lengthKm}
              />
            </div>
          </div>

          <SetupSheet baseline={data?.baseline} adjustment={data?.adjustment} />
        </>
      )}
    </motion.div>
  );
}
