import { test, expect } from '@playwright/test'

test.setTimeout(90_000)

test('Flujo completo: solicitud → encuesta → aprobación → proveedor → estadísticas → calendario', async ({ page }) => {
  // ─── Credenciales seed ───
  const EMAIL_USER = 'josudcb.barca@gmail.com'
  const PASSWORD_USER = 'user123'
  const EMAIL_ADMIN = '4ngel3duardofongestrada@gmail.com'
  const PASSWORD_ADMIN = 'admin123'
  const EVENTO_NOMBRE = `Prueba E2E ${Date.now()}`
  const COMENTARIO = 'Excelente servicio, muy profesionales. Todo llegó a tiempo.'
  const FECHA_EVENTO = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  // ════════════════════════════════════════════════════
  //  1. LOGIN SOLICITANTE + CREAR SOLICITUD
  // ════════════════════════════════════════════════════

  await page.goto('/login')
  await page.getByPlaceholder('usuario@umad.edu.mx').fill(EMAIL_USER)
  await page.getByPlaceholder('••••••••••').fill(PASSWORD_USER)

  const loginPromise = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'
  )
  await page.getByRole('button', { name: /Ingresar al sistema/i }).click()
  await loginPromise
  await page.waitForTimeout(1000)
  await page.getByText('Nueva Solicitud', { exact: true }).click()
  await page.waitForTimeout(1000)

  // --- Step 1: Datos Generales ---
  await page.getByPlaceholder('Ej. Dirección de Ingeniería').fill('Dirección de Tecnología')
  await page.getByPlaceholder('Nombre completo').fill('Juan Pérez')
  await page.getByPlaceholder('Ej. 222XXXXXXX').fill('2221234567')

  // Select plantel: UMAD Campus Puebla
  await page.locator('select').filter({ has: page.locator('option[value="1"]') }).selectOption('1')
  await page.waitForTimeout(500)

  // Select institución: Ingenierías
  await page.locator('select').filter({ has: page.locator('option[value="7"]') }).selectOption('7')

  // Event info
  await page.getByPlaceholder('Ej. Feria de Ciencias 2026').fill(EVENTO_NOMBRE)
  await page.locator('input[type="date"]').fill(FECHA_EVENTO)
  await page.locator('input[type="time"]').nth(0).fill('09:00')
  await page.locator('input[type="time"]').nth(1).fill('13:00')
  await page.locator('input[type="time"]').nth(2).fill('07:00')

  // Select lugar (plantel físico)
  await page.locator('select').filter({ has: page.locator('option[value="UMAD"]') }).selectOption('UMAD')

  // Material checkboxes
  await page.locator('label').filter({ hasText: 'Servicio de Fotografía' }).click()
  await page.locator('label').filter({ hasText: 'Diseño de Banners Digitales' }).click()

  // Avanzar a paso 2
  await page.locator('button:has-text("Siguiente")').click()
  await page.waitForTimeout(500)

  // --- Step 2: Datos Específicos ---
  await page.locator('input[type="radio"][name="apoyoEstacionamiento"][value="no"]').click({ force: true })
  await page.locator('input[type="radio"][name="necesitaMantenimiento"][value="no"]').click({ force: true })
  await page.locator('input[type="radio"][name="necesitaAudiovisuales"][value="no"]').click({ force: true })

  // Interceptar respuesta y enviar formulario
  const resPromise = page.waitForResponse(
    (res) => res.url().includes('/api/solicitudes') && res.request().method() === 'POST'
  )
  await page.locator('button:has-text("Registrar Solicitud")').click()
  const res = await resPromise
  const body = await res.json()
  const solicitudId = body.id
  expect(solicitudId).toBeGreaterThan(0)

  // Cerrar modal de éxito
  await page.locator('button:has-text("Cerrar Ventana")').click()
  await page.waitForTimeout(300)

  // ════════════════════════════════════════════════════
  //  2. ENCUESTA DE SATISFACCIÓN
  // ════════════════════════════════════════════════════

  await page.goto(`/evaluar/${solicitudId}`)
  await page.waitForSelector('#comentarios-evaluacion', { timeout: 10000 })

  // /evaluar/:id no pasa por AppContent → axios sin Authorization header
  // Interceptamos la llamada POST para inyectar el token manualmente
  const token = await page.evaluate(() => localStorage.getItem('token'))
  await page.route('**/api/encuestas', async (route) => {
    const headers = await route.request().allHeaders()
    headers['authorization'] = `Bearer ${token}`
    await route.continue({ headers })
  })

  const estrellas = page.locator('button[aria-label="5 estrellas — Excelente"]')
  await expect(estrellas).toHaveCount(4)
  for (let i = 0; i < 4; i++) {
    await estrellas.nth(i).click()
  }

  await page.fill('#comentarios-evaluacion', COMENTARIO)
  await page.locator('button:has-text("Enviar Evaluación")').click()
  await expect(page.getByText('¡Gracias por tu evaluación!')).toBeVisible({ timeout: 10000 })
  await page.unroute('**/api/encuestas')

  // ════════════════════════════════════════════════════
  //  3. LOGIN ADMIN + APROBAR
  // ════════════════════════════════════════════════════

  await page.goto('/login')
  await page.getByPlaceholder('usuario@umad.edu.mx').fill(EMAIL_ADMIN)
  await page.getByPlaceholder('••••••••••').fill(PASSWORD_ADMIN)

  const adminLoginPromise = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'
  )
  await page.getByRole('button', { name: /Ingresar al sistema/i }).click()
  await adminLoginPromise
  await page.waitForTimeout(1500)

  const eventoFila = page.locator('td').filter({ hasText: EVENTO_NOMBRE }).first()
  await expect(eventoFila).toBeVisible({ timeout: 10000 })
  await eventoFila.click()
  await page.waitForTimeout(500)

  await page.locator('button:has-text("Aprobar")').click()
  await page.locator('button:has-text("Si, aprobar")').click()
  await page.waitForTimeout(1000)

  // ════════════════════════════════════════════════════
  //  4. ASIGNAR PROVEEDOR
  // ════════════════════════════════════════════════════

  await page.locator('button:has-text("Ver Solicitud Completa")').click()
  await page.waitForTimeout(800)

  await page.locator('label').filter({ hasText: 'Audio y Sonido Profesional Puebla' }).click()
  await page.locator('button:has-text("Guardar Asignación")').click()
  await expect(page.getByText('Asignación guardada correctamente')).toBeVisible({ timeout: 5000 })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // ════════════════════════════════════════════════════
  //  5. ESTADÍSTICAS: VERIFICAR ENCUESTA
  // ════════════════════════════════════════════════════

  await page.getByText('Estadísticas', { exact: true }).click()
  await page.waitForTimeout(1500)

  await page.locator('button:has-text("Satisfacción y Calidad")').click()
  await page.waitForTimeout(1000)

  await expect(page.getByText(/Basado en \d+ encuestas? respondidas?/)).toBeVisible({ timeout: 10000 })
  await expect(page.getByText(COMENTARIO).first()).toBeVisible({ timeout: 5000 })

  // ════════════════════════════════════════════════════
  //  6. FILTROS
  // ════════════════════════════════════════════════════

  const plantelFilter = page.locator('select').filter({ has: page.locator('option:has-text("Todos los Planteles")') }).first()
  await plantelFilter.selectOption('UMAD Campus Puebla')
  await page.waitForTimeout(1500)
  await plantelFilter.selectOption('Todos los Planteles')
  await page.waitForTimeout(1500)

  const fechaFilter = page.locator('select').filter({ has: page.locator('option:has-text("Todo el histórico")') }).first()
  await fechaFilter.selectOption('Últimos 30 días')
  await page.waitForTimeout(1500)

  // ════════════════════════════════════════════════════
  //  7. CALENDARIO + GOOGLE CALENDAR
  // ════════════════════════════════════════════════════

  await page.getByText('Calendario', { exact: true }).click()
  await page.waitForTimeout(2000)

  const eventoCalendario = page.locator('.fc-event').filter({ hasText: EVENTO_NOMBRE }).first()
  await expect(eventoCalendario).toBeVisible({ timeout: 10000 })
  await eventoCalendario.click()
  await page.waitForTimeout(500)

  const googleBtn = page.locator('button:has-text("Abrir en Google Calendar")')
  await expect(googleBtn).toBeVisible({ timeout: 5000 })

  const popupPromise = page.waitForEvent('popup')
  await googleBtn.click()
  const popup = await popupPromise
  await popup.waitForLoadState()
  expect(popup.url()).toContain('google.com')
})
