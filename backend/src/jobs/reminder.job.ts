/**
 * @file Programa la tarea cron de recordatorios para solicitantes.
 *
 * Inicializa un barrido diario mandatorio que ejecuta
 * `procesarRecordatorios()` todos los días a las 08:00 AM hora local del
 * servidor.
 *
 * Expresión cron: `0 8 * * *`
 *
 *   ┌───────── minuto (0)
 *   │ ┌──────── hora   (8)
 *   │ │ ┌────── día del mes (*)
 *   │ │ │ ┌──── mes (*)
 *   │ │ │ │ ┌── día de la semana (*)
 *   0 8 * * *
 *
 * La expresión se lee como: "ejecutar cuando el minuto sea 0 y la hora sea 8,
 * independientemente del día del mes, mes o día de la semana" — es decir,
 * una vez al día a las 08:00.
 *
 * node-cron interpreta la hora en la zona horaria del proceso Node.js
 * (generalmente UTC en servidores cloud). Si el servidor está en UTC, las
 * 08:00 corresponden a las 02:00 AM en México (CST, UTC-6). Para que el
 * barrido ocurra a las 08:00 AM México, se debe configurar la variable de
 * entorno `TZ=America/Mexico_City` en el deployment o usar la opción
 * `{ timezone: "America/Mexico_City" }` en `cron.schedule()`.
 *
 * @module jobs/reminder
 */

import cron from "node-cron";
import { procesarRecordatorios } from "../services/reminder.service.js";

export function iniciarReminderJob(): void {
  cron.schedule("0 8 * * *", () => {
    procesarRecordatorios().catch((e) =>
      console.error("[CRON] Error ejecutando recordatorios:", e),
    );
  });

  console.log("[CRON] Recordatorios programados diariamente a las 08:00 AM (Producción)");
}
