export interface PromediosEncuesta {
  puntualidad: number;
  calidadTecnica: number;
  atencionStaff: number;
  satisfaccionGral: number;
  totalEncuestas: number;
}

interface Props {
  data: PromediosEncuesta;
  promediosAnteriores?: PromediosEncuesta;
}

const CRITERIOS: { key: keyof PromediosEncuesta; label: string; color: string }[] = [
  { key: 'puntualidad', label: 'Puntualidad', color: '#2563EB' },
  { key: 'calidadTecnica', label: 'Calidad Técnica', color: '#7C3AED' },
  { key: 'atencionStaff', label: 'Atención Staff', color: '#F59E0B' },
  { key: 'satisfaccionGral', label: 'Satisfacción General', color: '#16A34A' },
];

function RingProgress({ value, size = 80, strokeWidth = 6, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 5) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

export default function SatisfaccionCalidad({ data }: Props) {
  const promedios = CRITERIOS.map((c) => ({ ...c, valor: data[c.key] }));

  const globalAvg = CRITERIOS.reduce((s, c) => s + data[c.key], 0) / CRITERIOS.length;

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      border: '1px solid #E2E8F0',
      boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #F1F5F9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(30,58,138,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#1E3A8A',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>Satisfacción y Calidad</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
              Basado en {data.totalEncuestas} encuesta{data.totalEncuestas !== 1 ? 's' : ''} respondida{data.totalEncuestas !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 1rem',
          background: 'rgba(245,158,11,0.08)',
          borderRadius: '9999px',
        }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B' }}>{globalAvg.toFixed(1)}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B45309' }}>/ 5</span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        padding: '1.25rem 1.5rem 1.5rem',
      }}>
        {promedios.map((c) => {
          const pct = (c.valor / 5) * 100;
          return (
            <div key={c.key} style={{
              background: '#FAFBFC',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid #F1F5F9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
                <RingProgress value={c.valor} size={56} strokeWidth={5} color={c.color} />
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>{c.valor.toFixed(1)}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
                </div>
              </div>

              <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: c.color,
                  borderRadius: '9999px',
                  transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
