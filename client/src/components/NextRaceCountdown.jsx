import { useState, useEffect } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function remaining(target) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function Unit({ value, label }) {
  return (
    <div className="text-center">
      <div className="mono text-2xl sm:text-3xl font-semibold tabular-nums text-ink leading-none">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted mt-1">{label}</div>
    </div>
  );
}

// Feature: Countdown bis zum nächsten Rennen der gewählten Series (+ .ics-Download).
export default function NextRaceCountdown({ round, seriesName, schedule }) {
  const quali = schedule?.quali ?? '19:00';
  const target = round?.date ? new Date(`${round.date}T${quali}:00`) : null;
  const [t, setT] = useState(() => (target ? remaining(target) : null));

  useEffect(() => {
    if (!target) return undefined;
    setT(remaining(target));
    const id = setInterval(() => setT(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [round?.date, quali]);

  if (!round) return null;
  const d = new Date(`${round.date}T${quali}:00`);
  const dateStr = `${DAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  const downloadIcs = () => {
    const dt = `${round.date.replace(/-/g, '')}T${quali.replace(':', '')}00`;
    const endH = String((Number(quali.split(':')[0]) + 1) % 24).padStart(2, '0');
    const dtEnd = `${round.date.replace(/-/g, '')}T${endH}${quali.split(':')[1]}00`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ASPL Racing//DE', 'BEGIN:VEVENT',
      `UID:${round.trackId || round.round}-${round.date}@asplracing.com`,
      `DTSTART:${dt}`, `DTEND:${dtEnd}`,
      `SUMMARY:ASPL ${seriesName || ''} – ${round.track?.displayName ?? ''} (Quali)`.trim(),
      `LOCATION:${round.track?.fullName ?? round.track?.displayName ?? ''}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `aspl_${round.trackId || 'rennen'}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass rounded-2xl p-5 mb-6 relative overflow-hidden border-car/30">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(120deg, var(--car-accent)14, transparent 55%)' }} />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.25em] text-car">Nächstes Rennen · {seriesName}</p>
          <h3 className="display text-2xl font-bold mt-1 truncate">{round.track?.displayName}</h3>
          <p className="text-sm text-muted mt-0.5">{dateStr} · Quali {quali} Uhr</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {t ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <Unit value={t.d} label="Tage" />
              <span className="text-muted/40 text-2xl -mt-2">:</span>
              <Unit value={t.h} label="Std" />
              <span className="text-muted/40 text-2xl -mt-2">:</span>
              <Unit value={t.m} label="Min" />
              <span className="text-muted/40 text-2xl -mt-2">:</span>
              <Unit value={t.s} label="Sek" />
            </div>
          ) : (
            <span className="text-good font-medium">Findet jetzt statt 🏁</span>
          )}
          <button
            onClick={downloadIcs}
            title="Zum Kalender hinzufügen (.ics)"
            className="glass rounded-xl px-3 py-2 text-xs hover:border-car/50 transition-colors whitespace-nowrap"
          >
            + Kalender
          </button>
        </div>
      </div>
    </div>
  );
}
