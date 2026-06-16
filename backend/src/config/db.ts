import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:admin123@localhost:5432/sistema_eventos_umad?schema=public'
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

export default prisma
