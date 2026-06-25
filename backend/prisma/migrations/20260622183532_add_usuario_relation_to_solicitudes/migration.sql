/*
  Warnings:

  - You are about to drop the column `area_departamento` on the `solicitudes_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `horario_inicio_fin` on the `solicitudes_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `materiales_requeridos` on the `solicitudes_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `responsable_email` on the `solicitudes_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `responsable_evento` on the `solicitudes_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `responsable_whatsapp` on the `solicitudes_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `whatsapp_correo` on the `solicitudes_eventos` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "solicitudes_eventos" DROP CONSTRAINT "solicitudes_eventos_institucion_id_fkey";

-- DropForeignKey
ALTER TABLE "solicitudes_eventos" DROP CONSTRAINT "solicitudes_eventos_plantel_id_fkey";

-- AlterTable
ALTER TABLE "solicitudes_eventos" DROP COLUMN "area_departamento",
DROP COLUMN "horario_inicio_fin",
DROP COLUMN "materiales_requeridos",
DROP COLUMN "responsable_email",
DROP COLUMN "responsable_evento",
DROP COLUMN "responsable_whatsapp",
DROP COLUMN "whatsapp_correo",
ADD COLUMN     "contacto" VARCHAR(255),
ADD COLUMN     "google_event_id" VARCHAR(255),
ADD COLUMN     "hora_montaje" TIME,
ADD COLUMN     "ubicacion" VARCHAR(255),
ADD COLUMN     "usuario_id" INTEGER,
ALTER COLUMN "plantel_id" DROP NOT NULL,
ALTER COLUMN "institucion_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "solicitudes_eventos" ADD CONSTRAINT "solicitudes_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_eventos" ADD CONSTRAINT "solicitudes_eventos_plantel_id_fkey" FOREIGN KEY ("plantel_id") REFERENCES "planteles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_eventos" ADD CONSTRAINT "solicitudes_eventos_institucion_id_fkey" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
