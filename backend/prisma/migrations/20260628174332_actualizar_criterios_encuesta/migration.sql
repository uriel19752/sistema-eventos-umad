-- Drop old column and add 4 new criteria columns
ALTER TABLE "encuestas_satisfaccion" DROP COLUMN "calificacion";
ALTER TABLE "encuestas_satisfaccion" ADD COLUMN "puntualidad" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "encuestas_satisfaccion" ADD COLUMN "calidad_tecnica" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "encuestas_satisfaccion" ADD COLUMN "atencion_staff" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "encuestas_satisfaccion" ADD COLUMN "satisfaccion_gral" INTEGER NOT NULL DEFAULT 0;
