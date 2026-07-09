import './types/express.js'
import express from 'express'
import dotenv from 'dotenv'
import prisma from './config/db.js'
import solicitudRoutes from './routes/solicitud.routes.js'
import materialRoutes from './routes/material.routes.js'
import encuestaRoutes from './routes/encuesta.routes.js'
import estadisticasRoutes from './routes/estadisticas.routes.js'
import catalogoRoutes from './routes/catalogo.routes.js'
import authRoutes from './routes/auth.routes.js'
import auditoriaRoutes from './routes/auditoria.routes.js'
import calendarioRoutes from './routes/calendario.routes.js'
import notificacionRoutes from './routes/notificacion.routes.js'
import reportesRoutes from './routes/reportes.routes.js'
import proveedorRoutes from './routes/proveedor.routes.js'
import { iniciarReminderJob } from './jobs/reminder.job.js'
import { iniciarRecordatorioProveedoresJob } from './cron/proveedorReminder.cron.js'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Servidor MKT UMAD/IMM activo' })
})

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: true })
  } catch {
    res.status(503).json({ status: 'error', db: false })
  }
})

app.use('/api/solicitudes', solicitudRoutes)
app.use('/api/materiales', materialRoutes)
app.use('/api/encuestas', encuestaRoutes)
app.use('/api/estadisticas', estadisticasRoutes)
app.use('/api/catalogos', catalogoRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/calendario', calendarioRoutes)
app.use('/api/notificaciones', notificacionRoutes)
app.use('/api/auditorias', auditoriaRoutes)
app.use('/api/reportes', reportesRoutes)
app.use('/api/proveedores', proveedorRoutes)

iniciarReminderJob()
iniciarRecordatorioProveedoresJob()

app.listen(PORT, async () => {
  try {
    await prisma.$connect()
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
    console.log('Conexión a PostgreSQL exitosa mediante Prisma')
  } catch (err) {
    console.error('Error al conectar con PostgreSQL:', err)
    process.exit(1)
  }
})

export default app
