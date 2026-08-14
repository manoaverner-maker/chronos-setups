import { motion } from 'framer-motion';

// Animierter, dezenter Motorsport-Hintergrund: zwei langsam driftende Farbverlauf-
// Blobs plus feines Raster. Fixiert hinter dem gesamten Content.
export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden grid-lines">
      <motion.div
        className="absolute -top-40 -right-32 h-[55vh] w-[55vh] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--car-accent), transparent 70%)', opacity: 0.16 }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -left-32 h-[50vh] w-[50vh] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent-2), transparent 70%)', opacity: 0.12 }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
