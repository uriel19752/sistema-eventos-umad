import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import {
  Calendar,
  Clock,
  CheckSquare,
  Users,
  ChevronRight,
  Upload,
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

const generarFolio = () => `EVT-${Date.now()}`;

const MAPEO_JERARQUICO: Record<string, { id: string; nombre: string }[]> = {
  "1": [
    { id: "7", nombre: "Ingenierías" },
    { id: "8", nombre: "Arte y Humanidades" },
    { id: "9", nombre: "Negocios, Comercio y Derecho" },
    { id: "10", nombre: "Ciencias Sociales" },
    { id: "otro", nombre: "Otro" },
  ],
  "2": [
    { id: "2", nombre: "Prepa UMAD" },
    { id: "4", nombre: "IMM Secundaria" },
    { id: "5", nombre: "IMM Primaria" },
    { id: "6", nombre: "IMM Maternal" },
  ],
  "3": [
    { id: "2", nombre: "Prepa UMAD" },
    { id: "4", nombre: "IMM Secundaria" },
    { id: "5", nombre: "IMM Primaria" },
    { id: "6", nombre: "IMM Maternal" },
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
  const [institucionOtro, setInstitucionOtro] = useState("");
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);

  const [paso, setPaso] = useState(1);
  const [apoyoEstacionamiento, setApoyoEstacionamiento] = useState("");
  const [necesitaMantenimiento, setNecesitaMantenimiento] = useState("");
  const [mantenimientoItems, setMantenimientoItems] = useState<string[]>([]);
  const [cantMesas, setCantMesas] = useState(0);
  const [cantSillas, setCantSillas] = useState(0);
  const [cantPanos, setCantPanos] = useState(0);
  const [croquisFile, setCroquisFile] = useState<File | null>(null);
  const [gestionExternaItems, setGestionExternaItems] = useState<string[]>([]);
  const [necesitaAudiovisuales, setNecesitaAudiovisuales] = useState("");
  const [audiovisualItems, setAudiovisualItems] = useState<string[]>([]);
  const [audiovisualesOtrosTexto, setAudiovisualesOtrosTexto] = useState("");

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
    setInstitucionOtro("");
    const opcionesValidas = MAPEO_JERARQUICO[pId] || [];
    if (opcionesValidas.length > 0) {
      setInstitucionId(opcionesValidas[0]!.id);
    } else {
      setInstitucionId("");
    }
  };

  /**
   * Envía el formulario de nueva solicitud en un pipeline de dos pasos.
   *
   * Pipeline:
   *
   *   **Paso 1 — Estructura JSON (síncrono):**
   *   Envía `POST /api/solicitudes` con todo el cuerpo del formulario en
   *   formato JSON (datos del solicitante, evento, materiales,etc.). El
   *   backend persiste la solicitud y retorna `{ id: number }`.
   *
   *   Razón: la estructura JSON se envía primero porque la solicitud debe
   *   existir en la base de datos antes de poder asociarle un archivo
   *   binario. El ID retornado por la BD (`respuesta.data.id`) se captura
   *   inmediatamente en `nuevoId` y se usa para dos propósitos:
   *     a) Mostrar el QR code vinculado a `evaluar/${nuevoId}`.
   *     b) Construir la URL del endpoint de croquis.
   *
   *   **Paso 2 — Archivo binario (condicional):**
   *   Si el usuario seleccionó un archivo de croquis (`croquisFile` no es
   *   null), se construye un contenedor `FormData` con el campo `'croquis'`
   *   conteniendo el `File` directamente (sin serialización JSON). Este
   *   `FormData` se envía via `POST /api/solicitudes/${nuevoId}/croquis`
   *   con el header `Content-Type: multipart/form-data` forzado (Axios no
   *   lo infiere automáticamente para FormData porque el interceptor de
   *   JWT podría sobreescribirlo).
   *
   *   Separación de responsabilidades:
   *   - El endpoint JSON estándar (`/api/solicitudes`) maneja datos
   *     estructurados con `Content-Type: application/json`.
   *   - El endpoint multer (`/:id/croquis`) maneja el flujo binario con
   *     `Content-Type: multipart/form-data`.
   *   Esta separación evita tener que parsear multipart en el endpoint de
   *   creación y mantiene cada handler con una responsabilidad única.
   *
   *   Si la subida del croquis falla, la solicitud ya se creó, por lo que
   *   el error se registra en consola pero NO impide que el flujo continúe
   *   (el usuario ve la solicitud creada exitosamente).
   *
   * Validaciones previas al envío:
   *   - Fecha del evento ≥ hoy + 7 días (política de anticipación).
   *   - `horaFin` > `horaInicio`.
   *   - `horaMontaje` ≤ `horaInicio` (si se especifica).
   *
   * @param e - Evento de submit del formulario HTML.
   *
   * @returns {Promise<void>}
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fechaEvento) {
      setError("Selecciona una fecha para el evento");
      return;
    }

    const fechaSel = new Date(fechaEvento + "T12:00:00");
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
      const folio = generarFolio();

      const normalizeTime = (timeStr: string) => {
        if (!timeStr) return "";
        if (timeStr.includes("AM") || timeStr.includes("PM")) {
          const [time, modifier] = timeStr.split(" ");
          const [hoursRaw, minutes] = time.split(":");
          let hours = hoursRaw;
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
        institucionId: institucionId === "otro" ? 0 : Number(institucionId),
        institucionPersonalizada: institucionId === "otro" ? institucionOtro.trim() : undefined,
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
        datosEspecificos: {
          apoyoEstacionamiento,
          necesitaMantenimiento,
          mantenimientoItems: necesitaMantenimiento === "si" ? mantenimientoItems : [],
          cantMesas: necesitaMantenimiento === "si" ? cantMesas : 0,
          cantSillas: necesitaMantenimiento === "si" ? cantSillas : 0,
          cantPanos: necesitaMantenimiento === "si" ? cantPanos : 0,
          gestionExternaItems: necesitaMantenimiento === "si" ? gestionExternaItems : [],
          necesitaAudiovisuales,
          audiovisualItems: necesitaAudiovisuales === "si" ? audiovisualItems : [],
          audiovisualesOtrosTexto: necesitaAudiovisuales === "si" && audiovisualItems.includes("Otros") ? audiovisualesOtrosTexto : "",
        },
        generarQR: true,
      });

      const nuevoId = respuesta.data.id as number;
      setIdSolicitudCreada(nuevoId);

      if (croquisFile) {
        const formData = new FormData()
        formData.append('croquis', croquisFile)
        try {
          await axios.post(`/api/solicitudes/${nuevoId}/croquis`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (uploadErr) {
          console.error('Error al subir croquis:', uploadErr)
        }
      }

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
    setInstitucionOtro("");
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
    setPaso(1);
    setApoyoEstacionamiento("");
    setNecesitaMantenimiento("");
    setMantenimientoItems([]);
    setCantMesas(0);
    setCantSillas(0);
    setCantPanos(0);
    setCroquisFile(null);
    setGestionExternaItems([]);
    setNecesitaAudiovisuales("");
    setAudiovisualItems([]);
    setAudiovisualesOtrosTexto("");
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

  const datosGeneralesCompletos = () => {
    return !!(
      area && responsable && contacto && nombreEvento && fechaEvento && horaInicio && horaFin
    );
  };

  const toggleMantenimientoItem = (item: string) => {
    setMantenimientoItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleGestionExternaItem = (item: string) => {
    setGestionExternaItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleAudiovisualItem = (item: string) => {
    setAudiovisualItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const nuevaFecha = e.target.value;
    setFechaEvento(nuevaFecha);

    if (nuevaFecha) {
      const fechaSel = new Date(nuevaFecha + "T12:00:00");
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaMinima = new Date(hoy);
      fechaMinima.setDate(fechaMinima.getDate() + 7);
      if (fechaSel < fechaMinima) {
        setError(`La solicitud debe hacerse con mínimo 7 días de anticipación (mín: ${fechaMinima.toISOString().split("T")[0]})`);
      }
    }
  };

  const institucionesDisponibles = MAPEO_JERARQUICO[plantelId] || [];
  const qrUrl = idSolicitudCreada
    ? `${window.location.origin}/evaluar/${idSolicitudCreada}`
    : "";

  return (
    <div
      style={{
        maxWidth: "840px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.75rem",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER DE LOGOS + PROPÓSITO */}
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: '#FFFFFF',
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
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
        <div style={{ padding: "0 0.25rem" }}>
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
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "0.88rem",
              color: "#64748B",
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: "580px",
            }}
          >
            Complete todos los campos obligatorios para registrar una nueva solicitud de cobertura institucional. La información será evaluada por el área de comunicación.
          </p>
        </div>
      </header>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .section-card { animation: fadeInUp 0.4s ease forwards; }
        .section-card:nth-child(2) { animation-delay: 0.08s; }
        .section-card:nth-child(3) { animation-delay: 0.16s; }
        .section-card:nth-child(4) { animation-delay: 0.24s; }
        .section-card:nth-child(5) { animation-delay: 0.32s; }
      `}</style>

      {error && (
        <div
          style={{
            background: "#FEE2E2",
            color: "#E11D48",
            padding: "1rem 1.5rem",
            borderRadius: "12px",
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
          {/* PESTAÑAS TIPO PÍLDORA */}
          <div
            style={{
              background: "#F1F5F9",
              borderRadius: "40px",
              padding: "5px",
              display: "flex",
              gap: "4px",
              width: "fit-content",
              maxWidth: "100%",
            }}
          >
            <button
              type="button"
              disabled={paso === 1}
              onClick={() => setPaso(1)}
              style={{
                flex: 1,
                padding: "0.7rem 2rem",
                borderRadius: "40px",
                border: "none",
                background: paso === 1 ? "#1E3A8A" : "transparent",
                color: paso === 1 ? "#FFFFFF" : "#64748B",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              Datos Generales
            </button>
            <button
              type="button"
              disabled={!datosGeneralesCompletos()}
              onClick={() => datosGeneralesCompletos() && setPaso(2)}
              style={{
                flex: 1,
                padding: "0.7rem 2rem",
                borderRadius: "40px",
                border: "none",
                background: paso === 2 ? "#1E3A8A" : "transparent",
                color: paso === 2 ? "#FFFFFF" : datosGeneralesCompletos() ? "#334155" : "#94A3B8",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: datosGeneralesCompletos() ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                opacity: datosGeneralesCompletos() ? 1 : 0.5,
              }}
            >
              Datos Específicos
            </button>
          </div>

          {/* PASO 1: DATOS GENERALES */}
          {paso === 1 && (
            <>
          {/* SECCIÓN 1: DATOS DEL SOLICITANTE */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={iconWrapperStyle}>
                <Users size={18} color="#1E3A8A" />
              </div>
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
                  placeholder="Ej. 222XXXXXXX"
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1.25rem",
                paddingTop: "0.5rem",
                borderTop: "1px dashed #E2E8F0",
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  {institucionesDisponibles.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </option>
                  ))}
                </select>
                {institucionId === "otro" && (
                  <input
                    type="text"
                    value={institucionOtro}
                    onChange={(e) => setInstitucionOtro(e.target.value)}
                    placeholder="Especifica la institución u organización"
                    className="tt-input"
                    style={{ ...inputStyle, marginTop: "0.5rem" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INFORMACIÓN DEL EVENTO */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={iconWrapperStyle}>
                <Calendar size={18} color="#1E3A8A" />
              </div>
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                    onChange={handleFechaChange}
                    min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    required
                    className="tigretrack-input"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
                  placeholder="Describa brevemente el desarrollo de las actividades..."
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3 */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={iconWrapperStyle}>
                <Clock size={18} color="#1E3A8A" />
              </div>
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
                onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
                placeholder="Ej. Destacar el liderazgo tecnológico de los alumnos..."
              />
            </div>
          </div>

          {/* SECCIÓN 4 (REDEFINIBLE PARA NUEVOS CAMPOS DEL CLIENTE) */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={iconWrapperStyle}>
                <CheckSquare size={18} color="#1E3A8A" />
              </div>
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
                onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; e.currentTarget.style.background = '#FFFFFF'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFC'; }}
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

          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setPaso(2)}
              style={{
                padding: "0.75rem 2.5rem",
                background: "#1E3A8A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(30, 58, 138, 0.3)",
                transition: "all 0.2s ease",
                letterSpacing: "0.02em",
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#162d6e"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#1E3A8A"}
            >
              Siguiente <ChevronRight size={18} />
            </button>
          </div>
            </>
          )}

          {/* PASO 2: DATOS ESPECÍFICOS */}
          {paso === 2 && (
            <>
          {/* SECCIÓN SEGURIDAD */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={iconWrapperStyle}>
                <Users size={18} color="#1E3A8A" />
              </div>
              <h2 style={sectionTitleStyle}>Seguridad</h2>
            </div>
            <label style={labelStyle}>
              Apoyo para el acceso y estacionamiento para invitados especiales
            </label>
            <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem" }}>
              {["si", "no"].map((v) => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
                  <input
                    type="radio"
                    name="apoyoEstacionamiento"
                    value={v}
                    checked={apoyoEstacionamiento === v}
                    onChange={(e) => setApoyoEstacionamiento(e.target.value)}
                    style={{ width: "18px", height: "18px", accentColor: "#1E3A8A", cursor: "pointer" }}
                  />
                  {v === "si" ? "Sí" : "No"}
                </label>
              ))}
            </div>
          </div>

          {/* SECCIÓN MANTENIMIENTO */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={iconWrapperStyle}>
                <CheckSquare size={18} color="#1E3A8A" />
              </div>
              <h2 style={sectionTitleStyle}>Mantenimiento</h2>
            </div>
            <label style={labelStyle}>
              ¿Necesitarás apoyo y/o equipo del área de mantenimiento?
            </label>
            <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem" }}>
              {["si", "no"].map((v) => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
                  <input
                    type="radio"
                    name="necesitaMantenimiento"
                    value={v}
                    checked={necesitaMantenimiento === v}
                    onChange={(e) => setNecesitaMantenimiento(e.target.value)}
                    style={{ width: "18px", height: "18px", accentColor: "#1E3A8A", cursor: "pointer" }}
                  />
                  {v === "si" ? "Sí" : "No"}
                </label>
              ))}
            </div>

            {necesitaMantenimiento === "si" && (
              <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label style={labelStyle}>Equipo necesario</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.75rem", marginTop: "0.5rem" }}>
                    {["Pódium", "Mesas", "Sillas", "Paños", "Mesa para proyector", "Extensión", "Otro"].map((item) => (
                      <div key={item}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem", color: "#334155" }}>
                          <input
                            type="checkbox"
                            checked={mantenimientoItems.includes(item)}
                            onChange={() => toggleMantenimientoItem(item)}
                            style={{ width: "16px", height: "16px", accentColor: "#1E3A8A", cursor: "pointer" }}
                          />
                          {item}
                        </label>
                        {(item === "Mesas" || item === "Sillas" || item === "Paños") && mantenimientoItems.includes(item) && (
                          <input
                            type="number"
                            min={0}
                            placeholder="Cant."
                            value={
                              item === "Mesas" ? cantMesas :
                              item === "Sillas" ? cantSillas :
                              cantPanos
                            }
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (item === "Mesas") setCantMesas(val);
                              else if (item === "Sillas") setCantSillas(val);
                              else setCantPanos(val);
                            }}
                            style={{ ...inputStyle, marginTop: "0.3rem", width: "80px", padding: "0.35rem 0.5rem", fontSize: "0.8rem" }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Croquis de acomodo</label>
                  <div
                    style={{
                      marginTop: "0.5rem",
                      border: "2px dashed #CBD5E1",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "#F8FAFC",
                      transition: "border-color 0.2s",
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && file.size <= 10 * 1024 * 1024) setCroquisFile(file);
                    }}
                    onClick={() => document.getElementById("croquis-input")?.click()}
                  >
                    <Upload size={28} color="#94A3B8" style={{ marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748B", fontWeight: 500 }}>
                      {croquisFile ? croquisFile.name : "Arrastra o haz clic para subir el croquis (máx. 10 MB)"}
                    </p>
                    <input
                      id="croquis-input"
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            alert("El archivo excede el tamaño máximo de 10 MB");
                            return;
                          }
                          setCroquisFile(file);
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Mobiliario de Gestión Externa</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem", marginTop: "0.5rem" }}>
                    {["Sillones sala de maestros", "Sillones CIC", "Mamparas", "Letras logo UMAD"].map((item) => (
                      <label key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem", color: "#334155" }}>
                        <input
                          type="checkbox"
                          checked={gestionExternaItems.includes(item)}
                          onChange={() => toggleGestionExternaItem(item)}
                          style={{ width: "16px", height: "16px", accentColor: "#1E3A8A", cursor: "pointer" }}
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN AUDIOVISUALES */}
          <div className="section-card" style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={iconWrapperStyle}>
                <Clock size={18} color="#1E3A8A" />
              </div>
              <h2 style={sectionTitleStyle}>Audiovisuales</h2>
            </div>
            <label style={labelStyle}>
              ¿Necesitarás apoyo y/o equipo del área de medios audiovisuales?
            </label>
            <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem" }}>
              {["si", "no"].map((v) => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
                  <input
                    type="radio"
                    name="necesitaAudiovisuales"
                    value={v}
                    checked={necesitaAudiovisuales === v}
                    onChange={(e) => setNecesitaAudiovisuales(e.target.value)}
                    style={{ width: "18px", height: "18px", accentColor: "#1E3A8A", cursor: "pointer" }}
                  />
                  {v === "si" ? "Sí" : "No"}
                </label>
              ))}
            </div>

            {necesitaAudiovisuales === "si" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.75rem", marginTop: "1.25rem" }}>
                  {["Sonido", "Audio para computadora", "Micrófono", "Pantalla", "Otros"].map((item) => (
                    <label key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem", color: "#334155" }}>
                      <input
                        type="checkbox"
                        checked={audiovisualItems.includes(item)}
                        onChange={() => toggleAudiovisualItem(item)}
                        style={{ width: "16px", height: "16px", accentColor: "#1E3A8A", cursor: "pointer" }}
                      />
                      {item}
                    </label>
                  ))}
                </div>
                {audiovisualItems.includes("Otros") && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem" }}>
                      Especifique el apoyo o equipo requerido:
                    </label>
                    <input
                      type="text"
                      style={{ width: "100%", maxWidth: "450px", padding: "0.5rem 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "0.85rem", outline: "none", transition: "border-color 0.2s" }}
                      placeholder="Ej. Proyector extra, cable HDMI de 10m..."
                      value={audiovisualesOtrosTexto}
                      onChange={(e) => setAudiovisualesOtrosTexto(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem 2rem",
                background: loading ? "#94A3B8" : "#1E3A8A",
                color: COLORS.white,
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 12px rgba(30, 58, 138, 0.3)",
                transition: "all 0.2s ease",
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#162d6e"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#1E3A8A"; }}
            >
              {loading
                ? "Procesando Registro..."
                : "Registrar Solicitud"}
            </button>
          </div>
            </>
          )}
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
  background: '#FFFFFF',
  padding: "2rem",
  borderRadius: "16px",
  border: "1px solid #E2E8F0",
  boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  boxSizing: "border-box",
};
const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  marginBottom: "1.5rem",
  paddingBottom: "1rem",
  borderBottom: "1px solid #F1F5F9",
};
const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.05rem",
  fontWeight: 800,
  color: "#0F172A",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  marginBottom: "4px",
  fontSize: "0.8rem",
  color: "#374151",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  borderRadius: "8px",
  border: "1.5px solid #E2E8F0",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#0F172A",
  backgroundColor: "#F8FAFC",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
  outline: "none",
};
const iconWrapperStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  background: "rgba(30,58,138,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
