-- AlterTable
ALTER TABLE "solicitudes_eventos" ADD COLUMN     "recordatorio_24_horas_enviado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordatorio_7_dias_enviado" BOOLEAN NOT NULL DEFAULT false;
