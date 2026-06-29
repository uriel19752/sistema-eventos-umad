import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  CheckSquare,
  Layers,
  Users,
} from "lucide-react";
import umadLogo from "../assets/logos/umad_logo.png";
import prepaUmadLogo from "../assets/logos/prepa_umad_logo.png";
import immLogo from "../assets/logos/imm_logo.png";
import { COLORS } from "../theme/colors";

interface MaterialesForm {
  fotografias: boolean;
  notaWeb: boolean;
  banners: boolean;
  otro: string;
}

// Mapeo jerárquico estricto basado en tu seed.ts
const MAPEO_JERARQUICO: Record<string, { id: string; nombre: string }[]> = {
  "1": [{ id: "1", nombre: "UMAD" }],
  "2": [
    { id: "2", nombre: "Prepa UMAD" },
    { id: "3", nombre: "IMM" },
  ],
  "3": [
    { id: "2", nombre: "Prepa UMAD" },
    { id: "3", nombre: "IMM" },
  ],
};

export default function NuevaSolicitud() {
  const [nombreEvento, setNombreEvento] = useState("");
  const [plantelId, setPlantelId] = useState("1");
  const [institucionId, setInstitucionId] = useState("1");
  const [fechaEvento, setFechaEvento] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [horaMontaje, setHoraMontaje] = useState("");
  const [responsable, setResponsable] = useState("");
  const [area, setArea] = useState("");
  const [contacto, setContacto] = useState("");
  const [lugar, setLugar] = useState("UMAD");
  const [ubicacion, setUbicacion] = useState("");
  const [publico, setPublico] = useState("");
  const [autoridades, setAutoridades] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const [materiales, setMateriales] = useState<MaterialesForm>({
    fotografias: false,
    notaWeb: false,
    banners: false,
    otro: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [idSolicitudCreada, setIdSolicitudCreada] = useState<number | null>(
    null,
  );
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        await axios.get("/api/catalogos");
      } catch {
        setError("Error al cargar catálogos");
      } finally {
        setCargandoCatalogos(false);
      }
    }
    cargarCatalogos();
  }, []);

  const manejarCambioPlantel = (pId: string) => {
    setPlantelId(pId);
    const opcionesValidas = MAPEO_JERARQUICO[pId] || [];
    if (opcionesValidas.length > 0) {
      setInstitucionId(opcionesValidas[0].id);
    } else {
      setInstitucionId("");
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fechaEvento) {
      setError("Selecciona una fecha para el evento");
      return;
    }

    const fechaSel = new Date(fechaEvento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaMinima = new Date(hoy);
    fechaMinima.setDate(fechaMinima.getDate() + 7);

    if (fechaSel < fechaMinima) {
      setError(
        `La solicitud debe enviarse con mínimo 7 días de anticipación (mín: ${fechaMinima.toISOString().split("T")[0]})`,
      );
      return;
    }

    if (horaFin <= horaInicio) {
      alert("La hora de finalización debe ser posterior a la hora de inicio.");
      return;
    }

    if (horaMontaje && horaMontaje > horaInicio) {
      alert(
        "La hora de montaje debe ser anterior o igual a la hora de inicio.",
      );
      return;
    }

    setLoading(true);
    try {
      const folio = `EVT-${Date.now()}`;

      const normalizeTime = (timeStr: string) => {
        if (!timeStr) return "";
        if (timeStr.includes("AM") || timeStr.includes("PM")) {
          const [time, modifier] = timeStr.split(" ");
          let [hours, minutes] = time.split(":");
          if (hours === "12") hours = "00";
          if (modifier === "PM") {
            hours = (parseInt(hours, 10) + 12).toString();
          }
          return `${hours.padStart(2, "0")}:${minutes}`;
        }
        return timeStr;
      };

      const respuesta = await axios.post("/api/solicitudes", {
        folio,
        nombreEvento,
        plantelId: Number(plantelId),
        institucionId: Number(institucionId),
        fechaEvento,
        horaInicio: normalizeTime(horaInicio),
        horaFin: normalizeTime(horaFin),
        horaMontaje: normalizeTime(horaMontaje),
        responsableNombre: responsable,
        area,
        contacto,
        lugar,
        lugarSeleccionado: lugar,
        ubicacion,
        publico,
        autoridades,
        descripcion,
        objetivo,
        materiales,
        generarQR: true, // <- REQUERIMIENTO 1: Siempre obligatorio en backend
      });

      setIdSolicitudCreada(respuesta.data.id);
      resetForm();
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Error al enviar")
        : "Error de conexión";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setNombreEvento("");
    setPlantelId("1");
    setInstitucionId("1");
    setFechaEvento("");
    setHoraInicio("");
    setHoraFin("");
    setHoraMontaje("");
    setResponsable("");
    setArea("");
    setContacto("");
    setLugar("UMAD");
    setUbicacion("");
    setPublico("");
    setAutoridades("");
    setDescripcion("");
    setObjetivo("");
    setMateriales({
      fotografias: false,
      notaWeb: false,
      banners: false,
      otro: "",
    });
  }

  function descargarQR() {
    setTimeout(() => {
      const canvas = qrRef.current?.querySelector("canvas");
      if (!canvas) return;
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-encuesta-${idSolicitudCreada}.png`;
      a.click();
    }, 100);
  }

  const institucionesDisponibles = MAPEO_JERARQUICO[plantelId] || [];
  const qrUrl = idSolicitudCreada
    ? `${window.location.origin}/evaluar/${idSolicitudCreada}`
    : "";

  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "2rem auto",
        padding: "2.5rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)",
        backgroundImage:
          "linear-gradient(to right, rgba(37, 99, 235, 0.015) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.015) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        borderRadius: "24px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .section-card { animation: fadeInUp 0.4s ease forwards; }
        .section-card:nth-child(2) { animation-delay: 0.08s; }
        .section-card:nth-child(3) { animation-delay: 0.16s; }
        .section-card:nth-child(4) { animation-delay: 0.24s; }
        .section-card:nth-child(5) { animation-delay: 0.32s; }
        .tigretrack-input:focus { outline: none; border-color: #2563EB !important; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12) !important; }
      `}</style>

      {/* HEADER DE LOGOS */}
      <header
        style={{
          marginBottom: "2.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: COLORS.surface,
            borderRadius: "16px",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.04)",
            padding: "0.6rem 2rem",
            justifyContent: "space-between",
          }}
        >
          {[
            { src: umadLogo, alt: "UMAD" },
            { src: prepaUmadLogo, alt: "Prepa UMAD" },
            { src: immLogo, alt: "IMM" },
          ].map((logo, idx) => (
            <div
              key={logo.alt}
              style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                justifyContent: "center",
              }}
            >
              {idx > 0 && (
                <div
                  style={{
                    width: "1px",
                    height: "32px",
                    background: "#E2E8F0",
                    marginRight: "2rem",
                  }}
                />
              )}
              <div
                style={{
                  width: "110px",
                  height: "50px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              color: "#E11D48",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: "0.25rem",
            }}
          >
            Portal de Coberturas Institucionales
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.85rem",
              fontWeight: 900,
              color: "#0F172A",
              letterSpacing: "-0.03em",
            }}
          >
            Nueva Solicitud de Cobertura
          </h1>
        </div>
      </header>

      {error && (
        <div
          style={{
            background: "#FEE2E2",
            color: "#E11D48",
            padding: "1rem 1.5rem",
            borderRadius: "12px",
            marginBottom: "2rem",
            border: "1px solid rgba(225, 29, 72, 0.15)",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {cargandoCatalogos ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem",
            color: COLORS.textSecondary,
            fontWeight: 600,
          }}
        >
          Cargando ecosistema de formularios...
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
        >
          {/* SECCIÓN 1: DATOS DEL SOLICITANTE */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <Users size={18} color="#1E3A8A" />
              <h2 style={sectionTitleStyle}>
                1. Datos del Solicitante
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <label style={labelStyle}>
                  Área / Departamento Solicitante
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  required
                  className="tigretrack-input"
                  style={inputStyle}
                  placeholder="Ej. Dirección de Ingeniería"
                />
              </div>
              <div>
                <label style={labelStyle}>Responsable del Evento</label>
                <input
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  required
                  className="tigretrack-input"
                  style={inputStyle}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp / Correo de Contacto</label>
                <input
                  type="text"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  required
                  className="tigretrack-input"
                  style={inputStyle}
                  placeholder="Ej. 222XXXXXXX"
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1.25rem",
                pt: "0.5rem",
                borderTop: "1px dashed #E2E8F0",
                paddingTop: "1.25rem",
              }}
            >
              <div>
                <label style={labelStyle}>
                  Plantel de Adscripción
                </label>
                <select
                  value={plantelId}
                  onChange={(e) => manejarCambioPlantel(e.target.value)}
                  required
                  className="tigretrack-input"
                  style={inputStyle}
                >
                  <option value="1">UMAD Campus Puebla</option>
                  <option value="2">IMM Campus Centro</option>
                  <option value="3">IMM Campus Zavaleta</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  Institución Organizadora
                </label>
                <select
                  value={institucionId}
                  onChange={(e) => setInstitucionId(e.target.value)}
                  required
                  className="tigretrack-input"
                  style={inputStyle}
                >
                  {institucionesDisponibles.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INFORMACIÓN DEL EVENTO */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <Calendar size={18} color="#1E3A8A" />
              <h2 style={sectionTitleStyle}>
                2. Información del Evento
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div>
                <label style={labelStyle}>Nombre Oficial del Evento</label>
                <input
                  type="text"
                  value={nombreEvento}
                  onChange={(e) => setNombreEvento(e.target.value)}
                  required
                  className="tigretrack-input"
                  style={inputStyle}
                  placeholder="Ej. Feria de Ciencias 2026"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label style={labelStyle}>Fecha del Evento</label>
                  <input
                    type="date"
                    value={fechaEvento}
                    onChange={(e) => setFechaEvento(e.target.value)}
                    required
                    className="tigretrack-input"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Hora Inicio</label>
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      required
                      className="tigretrack-input"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Hora Término</label>
                    <input
                      type="time"
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                      required
                      className="tigretrack-input"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Hora de Requerimiento del Espacio (Montaje / Pruebas)
                </label>
                <input
                  type="time"
                  value={horaMontaje}
                  onChange={(e) => setHoraMontaje(e.target.value)}
                  required
                  className="tigretrack-input"
                  style={inputStyle}
                />
              </div>

              {/* REQUERIMIENTO 2: RENAME A "PLANTEL" E "INSTALACIONES DE LA UMAD" */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Plantel
                  </label>
                  <select
                    value={lugar}
                    onChange={(e) => setLugar(e.target.value)}
                    required
                    className="tigretrack-input"
                    style={inputStyle}
                  >
                    <option value="UMAD">Instalaciones de la UMAD</option>
                    <option value="IMM Centro">Instalaciones IMM Centro</option>
                    <option value="IMM Zavaleta">
                      Instalaciones IMM Zavaleta
                    </option>
                    <option value="Lugar Externo">
                      Lugar Externo fuera de Campus
                    </option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>
                    Ubicación Específica / Aula / Auditorio
                  </label>
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Ej. Gimnasio Enrique C. Rebsamen, Aula Magna"
                    className="tigretrack-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label style={labelStyle}>Público Objetivo</label>
                  <input
                    type="text"
                    value={publico}
                    onChange={(e) => setPublico(e.target.value)}
                    placeholder="Ej. Alumnos de bachillerato, padres de familia"
                    className="tigretrack-input"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Autoridades Asistentes / Invitados de Honor
                  </label>
                  <input
                    type="text"
                    value={autoridades}
                    onChange={(e) => setAutoridades(e.target.value)}
                    placeholder="Ej. Rectoría, Directores de área"
                    className="tigretrack-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Descripción General del Programa
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  className="tigretrack-input"
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Describa brevemente el desarrollo de las actividades..."
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3 */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <Clock size={18} color="#1E3A8A" />
              <h2 style={sectionTitleStyle}>3. Objetivo de Comunicación</h2>
            </div>
            <div>
              <label style={labelStyle}>
                ¿Qué hito clave desea destacar en la cobertura?
              </label>
              <textarea
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                rows={2}
                className="tigretrack-input"
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Ej. Destacar el liderazgo tecnológico de los alumnos..."
              />
            </div>
          </div>

          {/* SECCIÓN 4 (REDEFINIBLE PARA NUEVOS CAMPOS DEL CLIENTE) */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <CheckSquare size={18} color="#1E3A8A" />
              <h2 style={sectionTitleStyle}>4. Material Requerido</h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              {[
                { id: "fotografias", label: "Servicio de Fotografía" },
                { id: "notaWeb", label: "Nota Informativa Web" },
                { id: "banners", label: "Diseño de Banners Digitales" },
              ].map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(
                      materiales[item.id as keyof typeof materiales],
                    )}
                    onChange={(e) =>
                      setMateriales({
                        ...materiales,
                        [item.id]: e.target.checked,
                      })
                    }
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#1E3A8A",
                      cursor: "pointer",
                    }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  fontSize: "0.92rem",
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!materiales.otro}
                  onChange={(e) =>
                    setMateriales({
                      ...materiales,
                      otro: e.target.checked ? " " : "",
                    })
                  }
                  style={{
                    width: "18px",
                    height: "18px",
                    accentColor: "#1E3A8A",
                    cursor: "pointer",
                  }}
                />
                Otro Requerimiento:
              </label>
              <input
                type="text"
                value={materiales.otro}
                onChange={(e) =>
                  setMateriales({ ...materiales, otro: e.target.value })
                }
                placeholder="Especificar..."
                className="tigretrack-input"
                style={{ ...inputStyle, flex: 1, minWidth: "200px" }}
              />
            </div>
            {/* NOTA: LOS CAMPOS EXTRA QUE MANDE TU CLIENTE SE INYECTARÁN DIRECTAMENTE EN ESTA TARJETA */}
          </div>

          {/* BANNER DE REGLAS DE NEGOCIO */}
          <div
            className="section-card"
            style={{
              ...sectionCardStyle,
              background: "rgba(226, 232, 240, 0.4)",
              border: "none",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label style={labelStyle}>Fecha de Emisión Automática</label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString()}
                  readOnly
                  style={{
                    ...inputStyle,
                    background: "#E2E8F0",
                    cursor: "not-allowed",
                    fontWeight: 600,
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Firma Digital Electrónica</label>
                <input
                  type="text"
                  value={responsable || "Esperando nombre del responsable..."}
                  readOnly
                  style={{
                    ...inputStyle,
                    background: "#E2E8F0",
                    cursor: "not-allowed",
                    fontStyle: "italic",
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>
            <div
              style={{
                background: "#FFF1F2",
                color: "#E11D48",
                padding: "1rem 1.5rem",
                borderRadius: "12px",
                borderLeft: "5px solid #E11D48",
                fontSize: "0.88rem",
                fontWeight: 700,
              }}
            >
              ⚠️ Normativa de Control: La encuesta de satisfacción se activará
              por omisión en el código QR del evento de forma obligatoria. El
              envío requiere 7 días naturales de anticipación.
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "1rem 3.5rem",
                background: loading ? "#94A3B8" : "#1E3A8A",
                color: COLORS.white,
                border: "none",
                borderRadius: "12px",
                fontSize: "1.05rem",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 10px 20px -5px rgba(30, 58, 138, 0.3)",
                transition: "all 0.2s ease",
                letterSpacing: "0.02em",
              }}
            >
              {loading
                ? "Procesando Registro..."
                : "Registrar Solicitud en TigreTrack"}
            </button>
          </div>
        </form>
      )}

      {/* MODAL DE RESPUESTA QR AUTOMÁTICA */}
      {idSolicitudCreada && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            backdropFilter: "blur(5px)",
          }}
          onClick={() => setIdSolicitudCreada(null)}
        >
          <div
            style={{
              background: COLORS.surface,
              borderRadius: "20px",
              padding: "2.5rem",
              textAlign: "center",
              maxWidth: "380px",
              width: "90%",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#DCFCE7",
                color: "#16A34A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                margin: "0 auto 1.25rem",
                fontWeight: "bold",
              }}
            >
              ✓
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: "#1E3A8A",
                fontSize: "1.35rem",
                fontWeight: 800,
              }}
            >
              Solicitud Exitosa
            </h3>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: COLORS.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}
            >
              La cobertura ha sido agendada. La encuesta de satisfacción por QR
              se ha generado automáticamente.
            </p>

            <div
              style={{
                background: "#F8FAFC",
                padding: "1.25rem",
                borderRadius: "14px",
                border: "1px solid #E2E8F0",
                marginBottom: "1.5rem",
              }}
            >
              <div
                ref={qrRef}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "1rem",
                  background: "#FFFFFF",
                  padding: "0.5rem",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  width: "fit-content",
                  margin: "0 auto 1rem",
                }}
              >
                <QRCodeCanvas value={qrUrl} size={160} />
              </div>
              <button
                onClick={descargarQR}
                style={{
                  background: "#1E3A8A",
                  color: COLORS.white,
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.55rem 1.2rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                📥 Descargar Imagen QR
              </button>
            </div>
            <button
              onClick={() => setIdSolicitudCreada(null)}
              style={{
                background: "#F1F5F9",
                color: COLORS.textPrimary,
                border: "none",
                borderRadius: "8px",
                padding: "0.6rem 1.2rem",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const sectionCardStyle: React.CSSProperties = {
  background: COLORS.surface,
  padding: "2rem",
  borderRadius: "20px",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  boxShadow: "0 15px 35px -10px rgba(15, 23, 42, 0.04)",
  boxSizing: "border-box",
};
const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  marginBottom: "1.5rem",
  borderBottom: "1px solid #F1F5F9",
  paddingBottom: "0.75rem",
};
const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.05rem",
  fontWeight: 800,
  color: "#0F172A",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  marginBottom: "0.45rem",
  fontSize: "0.82rem",
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  borderRadius: "10px",
  border: "1px solid #CBD5E1",
  fontSize: "0.9rem",
  fontWeight: 500,
  color: "#0F172A",
  backgroundColor: "#FFFFFF",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "all 0.2s ease",
};
