import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getCars } from '../lib/api.js';
import { pageMotion, stagger } from '../lib/motion.js';
import { useCarAccent } from '../lib/useCarAccent.js';
import CarCard from '../components/CarCard.jsx';

export default function CarSelect() {
  useCarAccent(null); // zurueck auf Marken-Gold
  const { data: cars, isLoading, error } = useQuery({ queryKey: ['cars'], queryFn: getCars });

  return (
    <motion.div variants={pageMotion} initial="initial" animate="animate" exit="exit">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-car">Garage</p>
        <h1 className="display text-3xl sm:text-4xl lg:text-5xl font-bold mt-1">Wähle dein Fahrzeug</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Hinterlegte Baseline-Setups des Teams, kombiniert mit temperaturbasierter Druck-Berechnung
          und Referenzzeiten je Strecke.
        </p>
      </div>

      {isLoading && <p className="text-muted">lädt Fahrzeuge…</p>}
      {/* Die App braucht kein Backend mehr — ein Fehler heisst hier: die eingebackenen
          Daten liessen sich nicht laden (z. B. veralteter Cache oder falsche URL). */}
      {error && (
        <p className="text-bad">
          Fahrzeugdaten konnten nicht geladen werden. Bitte die Seite neu laden — falls das nicht
          hilft, die App über <span className="whitespace-nowrap">manoaverner-maker.github.io/chronos-setups/</span> öffnen.
        </p>
      )}

      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {cars?.map((car) => <CarCard key={car.id} car={car} />)}
      </motion.div>
    </motion.div>
  );
}
