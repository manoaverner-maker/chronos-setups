import { useState } from 'react';

// Reiter fuer die Setup-Seite. Alle Bereiche bleiben gemountet und werden nur
// aus-/eingeblendet — so gehen Eingaben (z. B. im Tank-Rechner) beim Wechseln
// nicht verloren.
export default function Tabs({ tabs }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      <div role="tablist" className="glass rounded-2xl p-1 flex gap-1">
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={`flex-1 px-3 sm:px-5 py-2 rounded-xl text-sm font-medium transition-colors
                ${selected ? 'text-ink' : 'text-muted hover:text-ink'}`}
              style={selected ? { background: 'color-mix(in srgb, var(--car-accent) 18%, transparent)' } : undefined}
            >
              {t.label}
              {t.hint && <span className="hidden sm:inline text-muted font-normal"> · {t.hint}</span>}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.id} id={`panel-${t.id}`} role="tabpanel" hidden={t.id !== active} className="mt-5">
          {t.content}
        </div>
      ))}
    </div>
  );
}
