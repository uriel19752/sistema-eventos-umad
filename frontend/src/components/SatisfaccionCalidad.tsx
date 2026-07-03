export interface PromediosEncuesta {
  puntualidad: number;
  calidadTecnica: number;
  atencionStaff: number;
  satisfaccionGral: number;
  totalEncuestas: number;
}

export interface DiagnosticoCSAT {
  nivel: string;
  mensaje: string;
  color: string;
}

export interface VariacionCSAT {
  actual: number;
  anterior: number;
  diferencia: number;
}

export interface DistribucionEstrella {
  estrellas: number;
  total: number;
}

interface Props {
  data: PromediosEncuesta;
  promediosAnteriores?: PromediosEncuesta;
  diagnostico?: DiagnosticoCSAT | null;
  variacionCSAT?: VariacionCSAT | null;
  distribucionEstrellas?: DistribucionEstrella[];
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

function DiagnosticoIcon({ nivel }: { nivel: string }) {
  if (nivel === 'Excelente') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }
  if (nivel === 'Crítico') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (nivel === 'Deficiente') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12.01" y2="16" /><line x1="12" y1="8" x2="12" y2="12" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12.01" y2="16" /><line x1="12" y1="8" x2="12" y2="12" />
    </svg>
  );
}

export default function SatisfaccionCalidad({ data, diagnostico, variacionCSAT, distribucionEstrellas }: Props) {
  const promedios = CRITERIOS.map((c) => ({ ...c, valor: data[c.key] }));

  const globalAvg = CRITERIOS.reduce((s, c) => s + data[c.key], 0) / CRITERIOS.length;

  const totalDistribucion = distribucionEstrellas?.reduce((s, d) => s + d.total, 0) ?? 0;

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
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(30,58,138,0.08)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: '#1E3A8A',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {variacionCSAT && variacionCSAT.anterior > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.35rem 0.85rem', borderRadius: '9999px',
              background: variacionCSAT.diferencia >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
              fontSize: '0.75rem', fontWeight: 600,
              color: variacionCSAT.diferencia >= 0 ? '#16A34A' : '#DC2626',
            }}>
              <span>{variacionCSAT.diferencia >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(variacionCSAT.diferencia).toFixed(2)} pts</span>
              <span style={{ opacity: 0.7 }}>vs periodo anterior</span>
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 1rem',
            background: 'rgba(245,158,11,0.08)',
            borderRadius: '9999px',
          }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B' }}>{globalAvg.toFixed(1)}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B45309' }}>/ 5</span>
          </div>
        </div>
      </div>

      {diagnostico && (
        <div style={{ padding: '0 1.5rem 1rem' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.85rem 1.1rem', borderRadius: '10px',
            background: `${diagnostico.color}08`,
            border: `1px solid ${diagnostico.color}18`,
            borderLeft: `4px solid ${diagnostico.color}`,
          }}>
            <div style={{ flexShrink: 0, marginTop: '1px' }}>
              <DiagnosticoIcon nivel={diagnostico.nivel} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: diagnostico.color, marginBottom: '0.1rem' }}>
                Diagnóstico: {diagnostico.nivel}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                {diagnostico.mensaje}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  height: '100%', width: `${pct}%`, background: c.color,
                  borderRadius: '9999px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
          );
        })}

        {variacionCSAT && (
          <div style={{
            background: '#FAFBFC', borderRadius: '12px', padding: '1rem',
            border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: variacionCSAT.diferencia >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke={variacionCSAT.diferencia >= 0 ? '#16A34A' : '#DC2626'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {variacionCSAT.diferencia >= 0
                    ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>
                    : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></>
                  }
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tendencia de Satisfacción
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  {variacionCSAT.diferencia >= 0 ? '+' : ''}{variacionCSAT.diferencia.toFixed(2)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500, lineHeight: 1.4 }}>
              {variacionCSAT.diferencia >= 0 ? '↑' : '↓'} {Math.abs(variacionCSAT.diferencia).toFixed(2)} pts respecto al periodo anterior
            </div>
          </div>
        )}
      </div>

      {distribucionEstrellas && distribucionEstrellas.length > 0 && (
        <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ paddingTop: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Distribución de Evaluaciones
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {distribucionEstrellas.map((d) => {
                const pct = totalDistribucion > 0 ? (d.total / totalDistribucion) * 100 : 0;
                const starColors = ['#DC2626', '#F97316', '#F59E0B', '#2563EB', '#16A34A'];
                const barColor = starColors[d.estrellas - 1] ?? '#CBD5E1';
                return (
                  <div key={d.estrellas} style={{
                    display: 'grid', gridTemplateColumns: '90px 1fr 48px 32px',
                    alignItems: 'center', gap: '0.65rem',
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                      {'★'.repeat(d.estrellas)}{'☆'.repeat(5 - d.estrellas)}
                    </div>
                    <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, background: barColor,
                        borderRadius: '9999px', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                        minWidth: pct > 0 ? '4px' : '0',
                      }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                      {pct.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>
                      {d.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}