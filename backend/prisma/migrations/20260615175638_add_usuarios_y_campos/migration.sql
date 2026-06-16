-- CreateEnum
CREATE TYPE "rol" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "solicitudes_eventos" ADD COLUMN     "area_departamento" VARCHAR(255),
ADD COLUMN     "horario_inicio_fin" VARCHAR(100),
ADD COLUMN     "materiales_requeridos" TEXT,
ADD COLUMN     "responsable_evento" VARCHAR(255),
ADD COLUMN     "whatsapp_correo" VARCHAR(255);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "correo" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "rol" "rol" NOT NULL DEFAULT 'USER',

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");
