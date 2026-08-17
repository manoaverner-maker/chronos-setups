import { Link, useLocation } from 'react-router-dom';
import { BRAND } from '../lib/brand.js';

// Kopfzeile mit Marken-Wortmarke und Breadcrumb.
// Der Header steht ausserhalb von <Routes>, dort liefert useParams() immer {} —
// die Breadcrumb-Teile kommen deshalb direkt aus dem Pfad (/:car/:track).
export default function Header() {
  const { pathname } = useLocation();
  const [first, second] = pathname.split('/').filter(Boolean);
  const car = first === 'standings' ? undefined : first; // /standings ist kein Fahrzeug
  const track = car ? second : undefined;
  return (
    <header className="sticky top-0 z-20 glass border-x-0 border-t-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2 group min-w-0 mr-3">
          <span className="display text-sm sm:text-lg font-bold tracking-wide leading-none truncate">
            Chronos Motorsport <span className="text-accent group-hover:text-car transition-colors">Racing Team</span>
          </span>
          <span className="hidden md:inline text-xs text-muted mono shrink-0">/ {BRAND.tagline}</span>
        </Link>
        <nav className="text-xs sm:text-sm text-muted flex items-center gap-1.5 sm:gap-2 whitespace-nowrap overflow-hidden">
          <Link to="/" className="hover:text-ink transition-colors shrink-0">Garage</Link>
          <span className="opacity-30 shrink-0">·</span>
          <Link to="/standings" className="hover:text-ink transition-colors shrink-0">Wertung</Link>
          {car && <span className="opacity-40 hidden sm:inline">›</span>}
          {car && <span className="text-ink capitalize hidden sm:inline truncate">{car.replaceAll('_', ' ')}</span>}
          {track && <span className="opacity-40 shrink-0">›</span>}
          {track && <span className="text-car capitalize truncate">{track.replaceAll('_', ' ')}</span>}
        </nav>
      </div>
    </header>
  );
}
