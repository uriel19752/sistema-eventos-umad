import cron from "node-cron";
import { procesarRecordatorios } from "../services/reminder.service.js";
export function iniciarReminderJob() {
    cron.schedule("0 8 * * *", () => {
        procesarRecordatorios().catch((e) => console.error("[CRON] Error ejecutando recordatorios:", e));
    });
    console.log("[CRON] Recordatorios programados diariamente a las 08:00 AM (Producción)");
}
//# sourceMappingURL=reminder.job.js.map