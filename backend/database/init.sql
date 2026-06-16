-- ============================================================================
-- SISTEMA DE GESTIÓN Y COBERTURA DE EVENTOS (MKT UMAD/IMM)
-- Script de inicialización de base de datos PostgreSQL 16+
-- ============================================================================

-- ============================================================================
-- 1. TIPOS ENUM
-- ============================================================================

CREATE TYPE prioridad AS ENUM ('Alta', 'Media', 'Baja');

CREATE TYPE estado AS ENUM ('Pendiente', 'Aprobado', 'Completada', 'Cancelada');

CREATE TYPE tipo_material AS ENUM ('Fotografía', 'Nota Web', 'Banner', 'Otro');

-- ============================================================================
-- 2. TABLAS
-- ============================================================================

-- 2.1 Catálogo de planteles (centros educativos)
CREATE TABLE planteles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
);

-- 2.2 Catálogo de instituciones
CREATE TABLE instituciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
);

-- 2.3 Catálogo de proveedores
CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255),
    email VARCHAR(255),
    telefono VARCHAR(50),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2.4 Solicitudes de eventos (tabla central del sistema)
CREATE TABLE solicitudes_eventos (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(50) NOT NULL,
    nombre_evento VARCHAR(255) NOT NULL,
    descripcion TEXT,
    objetivo_cobertura TEXT,
    publico_objetivo TEXT,
    autoridades_asistentes TEXT,
    plantel_id INTEGER NOT NULL REFERENCES planteles(id),
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    lugar_especifico VARCHAR(255),
    fecha_evento DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responsable_nombre VARCHAR(255) NOT NULL,
    responsable_whatsapp VARCHAR(20),
    responsable_email VARCHAR(255),
    departamento_solicitante VARCHAR(255),
    observaciones TEXT,
    prioridad prioridad NOT NULL DEFAULT 'Media',
    estado estado NOT NULL DEFAULT 'Pendiente',

    CONSTRAINT chk_anticipacion CHECK (
        fecha_evento >= (fecha_solicitud::date + 7)
    )
);

-- 2.5 Materiales solicitados para cada evento
CREATE TABLE materiales_solicitados (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes_eventos(id) ON DELETE CASCADE,
    tipo_material tipo_material NOT NULL,
    descripcion_otro TEXT
);

-- 2.6 Asignación de proveedores a eventos
CREATE TABLE asignacion_proveedores (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes_eventos(id) ON DELETE CASCADE,
    proveedor_id INTEGER NOT NULL REFERENCES proveedores(id)
);

-- 2.7 Encuestas de satisfacción posteriores al evento
CREATE TABLE encuestas_satisfaccion (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes_eventos(id) ON DELETE CASCADE,
    calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
    comentarios TEXT,
    fecha_respuesta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.8 Auditoría de cancelaciones
CREATE TABLE auditoria_cancelaciones (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes_eventos(id) ON DELETE CASCADE,
    estado_anterior estado NOT NULL,
    fecha_cancelacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT,
    tardia BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================================
-- 3. FUNCIÓN Y TRIGGER PARA AUDITORÍA DE CANCELACIONES
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_auditar_cancelacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_fecha_hora_evento TIMESTAMP;
    v_diferencia INTERVAL;
BEGIN
    -- Solo disparar cuando el estado cambie a 'Cancelada'
    IF NEW.estado = 'Cancelada' AND (OLD.estado IS DISTINCT FROM 'Cancelada') THEN
        -- Calcular la fecha/hora combinada del evento
        v_fecha_hora_evento := NEW.fecha_evento + NEW.hora_inicio;

        -- La cancelación se considera tardía si faltan menos de 48 horas
        v_diferencia := v_fecha_hora_evento - CURRENT_TIMESTAMP;

        INSERT INTO auditoria_cancelaciones (
            solicitud_id,
            estado_anterior,
            motivo,
            tardia
        ) VALUES (
            NEW.id,
            OLD.estado,
            NEW.observaciones,
            v_diferencia < INTERVAL '48 hours'
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auditar_cancelacion
    BEFORE UPDATE ON solicitudes_eventos
    FOR EACH ROW
    EXECUTE FUNCTION fn_auditar_cancelacion();
