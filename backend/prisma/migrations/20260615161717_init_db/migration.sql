-- CreateEnum
CREATE TYPE "prioridad" AS ENUM ('Alta', 'Media', 'Baja');

-- CreateEnum
CREATE TYPE "estado" AS ENUM ('Pendiente', 'Aprobado', 'Completada', 'Cancelada');

-- CreateEnum
CREATE TYPE "tipo_material" AS ENUM ('Fotografia', 'Nota_Web', 'Banner', 'Otro');

-- CreateTable
CREATE TABLE "planteles" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,

    CONSTRAINT "planteles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instituciones" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,

    CONSTRAINT "instituciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "especialidad" VARCHAR(255),
    "email" VARCHAR(255),
    "telefono" VARCHAR(50),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_eventos" (
    "id" SERIAL NOT NULL,
    "folio" VARCHAR(50) NOT NULL,
    "nombre_evento" VARCHAR(255) NOT NULL,
    "descripcion" TEXT,
    "objetivo_cobertura" TEXT,
    "publico_objetivo" TEXT,
    "autoridades_asistentes" TEXT,
    "plantel_id" INTEGER NOT NULL,
    "institucion_id" INTEGER NOT NULL,
    "lugar_especifico" VARCHAR(255),
    "fecha_evento" DATE NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "fecha_solicitud" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsable_nombre" VARCHAR(255) NOT NULL,
    "responsable_whatsapp" VARCHAR(20),
    "responsable_email" VARCHAR(255),
    "departamento_solicitante" VARCHAR(255),
    "observaciones" TEXT,
    "prioridad" "prioridad" NOT NULL DEFAULT 'Media',
    "estado" "estado" NOT NULL DEFAULT 'Pendiente',

    CONSTRAINT "solicitudes_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales_solicitados" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "tipo_material" "tipo_material" NOT NULL,
    "descripcion_otro" TEXT,

    CONSTRAINT "materiales_solicitados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_proveedores" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "proveedor_id" INTEGER NOT NULL,

    CONSTRAINT "asignacion_proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encuestas_satisfaccion" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentarios" TEXT,
    "fecha_respuesta" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encuestas_satisfaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_cancelaciones" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "estado_anterior" "estado" NOT NULL,
    "fecha_cancelacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "tardia" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "auditoria_cancelaciones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "solicitudes_eventos" ADD CONSTRAINT "solicitudes_eventos_plantel_id_fkey" FOREIGN KEY ("plantel_id") REFERENCES "planteles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_eventos" ADD CONSTRAINT "solicitudes_eventos_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiales_solicitados" ADD CONSTRAINT "materiales_solicitados_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_proveedores" ADD CONSTRAINT "asignacion_proveedores_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_proveedores" ADD CONSTRAINT "asignacion_proveedores_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encuestas_satisfaccion" ADD CONSTRAINT "encuestas_satisfaccion_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_cancelaciones" ADD CONSTRAINT "auditoria_cancelaciones_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
