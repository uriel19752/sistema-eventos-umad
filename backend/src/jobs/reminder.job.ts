import cron from "node-cron";
import { procesarRecordatorios } from "../services/reminder.service.js";

export function iniciarReminderJob(): void {
  cron.schedule("*/1 * * * *", () => {
    procesarRecordatorios().catch((e) =>
      console.error("[CRON] Error ejecutando recordatorios:", e),
    );
  });

  console.log("[CRON] Recordatorios programados diariamente a las 08:00 AM");
}
