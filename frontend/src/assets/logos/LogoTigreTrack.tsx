import logoImagen from "./LogoTigreTrack.png";

interface LogoProps {
  institucion?: "umad" | "prepa" | "imm" | "sistema" | "todos";
  height?: number;
}

const CONFIG_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  umad: { bg: "rgba(30, 58, 138, 0.1)", text: "#1E3A8A", border: "rgba(30, 58, 138, 0.2)" },
  prepa: { bg: "rgba(220, 38, 38, 0.1)", text: "#DC2626", border: "rgba(220, 38, 38, 0.2)" },
  imm: { bg: "rgba(22, 163, 74, 0.1)", text: "#16A34A", border: "rgba(22, 163, 74, 0.2)" },
  sistema: { bg: "rgba(71, 85, 105, 0.08)", text: "#475569", border: "rgba(71, 85, 105, 0.15)" },
  todos: { bg: "rgba(71, 85, 105, 0.08)", text: "#475569", border: "rgba(71, 85, 105, 0.15)" },
};

const BADGE_TEXTO: Record<string, string> = {
  umad: "UMAD",
  prepa: "PREPA UMAD",
  imm: "IMM",
  sistema: "SISTEMA CENTRAL",
  todos: "TODOS",
};

export default function LogoTigreTrack({
  institucion = "sistema",
  height = 40,
}: LogoProps) {
  const badge = CONFIG_BADGE[institucion] ?? CONFIG_BADGE.sistema;
  const subtexto = BADGE_TEXTO[institucion] ?? BADGE_TEXTO.sistema;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.85rem",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.transform = "scale(1.05) rotate(2deg)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
      >
        <img
          src={logoImagen}
          alt="TigreTrack — Sistema de Gestión de Eventos UMAD"
          style={{
            height: `${height}px`,
            width: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 4px 10px rgba(15, 23, 42, 0.12))",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
        <span
          style={{
            fontSize: "1.25rem",
            fontWeight: 900,
            color: "#0F172A",
            letterSpacing: "-0.035em",
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          TIGRE<span style={{ color: "#2563EB", fontWeight: 800 }}>TRACK</span>
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              fontSize: "0.55rem",
              fontWeight: 700,
              color: "#94A3B8",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            PLATAFORMA
          </span>

          <span
            style={{
              fontSize: "0.58rem",
              fontWeight: 800,
              backgroundColor: badge.bg,
              color: badge.text,
              border: `1px solid ${badge.border}`,
              padding: "0.06rem 0.4rem",
              borderRadius: "100px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              transition: "all 0.3s ease",
            }}
          >
            {subtexto}
          </span>
        </div>
      </div>
    </div>
  );
}
