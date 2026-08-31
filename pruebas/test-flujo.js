/* Pruebas del ciclo completo, con un navegador real.
   Comprueba 42 condiciones: las tres de anti-sesgo, el flujo de los cuatro
   pasos, el autoguardado, el bloqueo del paso 3, el tablero, la exportación,
   el reinicio, el responsive a 360 px y el área táctil de 44 px.

   Cómo correrlo, desde la raíz del proyecto:

     cp pruebas/fixture.json public/data/hallazgos-programa.json   # datos de prueba
     python3 -m http.server 8899 &
     node pruebas/test-flujo.js
     git checkout public/data/hallazgos-programa.json              # restaurar

   Necesita playwright: npm i -D playwright && npx playwright install chromium
*/
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8899';
const out = [];
function ok(cond, msg) { out.push((cond ? 'PASS  ' : 'FALLA ') + msg); if (!cond) process.exitCode = 1; }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const errores = [];
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));

  // Registrar toda petición al JSON de hallazgos
  const pedidosJson = [];
  page.on('request', r => { if (r.url().includes('hallazgos-programa.json')) pedidosJson.push(r.url()); });

  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });

  // ── ANTI-SESGO: nada del tablero antes del paso 4 ──────────
  ok(pedidosJson.length === 0, 'Anti-sesgo: no se pide el JSON al abrir la página');
  let html = await page.content();
  ok(!/Título de prueba/.test(html), 'Anti-sesgo: ningún título del tablero está en el DOM en el paso 1');
  ok(!/data-hallazgo|data-gravedad/.test(html), 'Anti-sesgo: no hay atributos data-* con datos del tablero');

  // ── PASO 1 ────────────────────────────────────────────────
  ok(await page.locator('#ir-paso2').isDisabled(), 'Paso 1: el botón primario arranca deshabilitado');
  ok((await page.locator('#motivo').textContent()).includes('al menos un principio'),
     'Paso 1: se explica por qué está deshabilitado');
  ok(await page.locator('.btn--primary').count() === 1, 'Paso 1: una sola acción primaria en la vista');

  const orden = await page.locator('.check__num').allTextContents();
  ok(orden.join('|') === 'Ley 1 · |Ley 2 · |Ley 3 · |Ley 4 · ', 'Paso 1: la lista va ordenada por número de principio');

  await page.locator('#sel-todos').click();
  ok(!(await page.locator('#ir-paso2').isDisabled()), 'Paso 1: con selección, el botón se habilita');
  await page.locator('#ir-paso2').click();

  // ── PASO 2 ────────────────────────────────────────────────
  ok(await page.locator('[aria-current="step"]').textContent().then(t => t.includes('Tu evaluación')),
     'Paso 2: la barra de pasos marca dónde estoy');
  await page.locator('#f-donde').fill('Formulario de pedido');
  await page.locator('#f-que').fill('Los errores aparecen todos juntos arriba del formulario.');
  await page.locator('input[name="gravedad"][value="4"]').check();
  await page.locator('input[name="facilidad"][value="5"]').check();
  ok((await page.locator('#f-prioridad').textContent()).trim() === '4,5', 'Paso 2: la prioridad se calcula sola (4 y 5 → 4,5)');

  // validación en línea
  await page.locator('#f-recomendacion').fill('corto');
  await page.locator('#f-recomendacion').blur();
  const slot = page.locator('[data-msg="recomendacion"]');
  ok((await slot.getAttribute('class')).includes('msg--error'),
     'Paso 2: la validación avisa al salir del campo, junto al campo');
  const antes = await page.locator('#f-guardar').boundingBox();

  await page.locator('#f-recomendacion').fill('Mostrar cada error debajo de su campo, al salir del campo.');
  await page.locator('#f-que').click();   // salir del campo: el mensaje vuelve a la ayuda
  const despues = await page.locator('#f-guardar').boundingBox();
  ok(Math.abs(antes.y - despues.y) < 1,
     'Paso 2: el mensaje de error no mueve el botón (desplazamiento ' +
     Math.round(Math.abs(antes.y - despues.y)) + ' px)');
  await page.locator('#f-guardar').click();
  ok(await page.locator('.mini').first().isVisible(), 'Paso 2: el hallazgo cargado aparece en la lista');

  // ── AUTOGUARDADO: recarga a mitad de camino ───────────────
  await page.locator('#f-donde').fill('Borrador a medio escribir');
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'networkidle' });
  ok((await page.locator('#f-donde').inputValue()) === 'Borrador a medio escribir',
     'Autoguardado: el borrador a medio escribir sobrevive a la recarga');
  ok(await page.locator('.mini').first().isVisible(), 'Autoguardado: el hallazgo guardado sobrevive a la recarga');
  ok(pedidosJson.length === 0, 'Anti-sesgo: sigue sin pedirse el JSON en el paso 2');

  // limpiar el borrador y marcar "sin hallazgos" en otro principio
  await page.locator('#f-donde').fill('');
  await page.locator('[data-ir="L3"]').click();
  await page.locator('#sin-hallazgos').check();
  ok((await page.locator('.eval__nav [data-ir="L3"]').textContent()).includes('cumple'),
     'Paso 2: «sin hallazgos» queda registrado como principio evaluado');

  // ── PASO 3 ────────────────────────────────────────────────
  await page.locator('#ir-paso3').click();
  ok((await page.locator('.callout--warn').textContent()).includes('bloqueados'),
     'Paso 3: se advierte el bloqueo ANTES de que ocurra');
  ok(await page.locator('#volver-paso2').isVisible(), 'Paso 3: se puede volver atrás');

  await page.locator('#confirmar').click();
  ok(await page.locator('.modal').isVisible(), 'Paso 3: la confirmación es un gesto aparte');
  await page.locator('.modal .btn--primary').click();
  ok(await page.locator('.modal').isVisible(), 'Paso 3: sin marcar la casilla, no despliega');
  await page.locator('#acepto').check();
  await page.locator('.modal .btn--primary').click();

  // ── PASO 4 ────────────────────────────────────────────────
  await page.waitForSelector('.board', { timeout: 5000 });
  ok(pedidosJson.length === 1, 'Anti-sesgo: el JSON se pide UNA vez, y recién en el paso 4');
  ok(await page.locator('.compare').first().isVisible(), 'Paso 4: la primera vez abre en la comparación');
  ok((await page.locator('.board__masthead').textContent()).includes('Contraste'), 'Paso 4: hay resumen de contraste');

  await page.locator('[data-vista="tablero"]').click();
  await page.waitForSelector('.finding');
  ok((await page.locator('.card__label').first().textContent()).includes('Hallazgos'),
     'Tablero: la cabecera abre con el total de hallazgos');
  ok(await page.locator('.dist__row').count() === 4, 'Tablero: hay distribución por gravedad');
  ok(await page.locator('.top3__item').count() >= 1, 'Tablero: se destacan los de mayor prioridad');
  ok(await page.locator('.pill--ok').count() >= 1, 'Tablero: los principios sin hallazgos se dicen explícitamente');

  // severidad = color + forma
  const finding = page.locator('.finding').first();
  const barra = await finding.evaluate(el => {
    const b = getComputedStyle(el, '::before');
    return { w: b.width, color: b.backgroundColor };
  });
  ok(barra.w === '3px' && barra.color !== 'rgba(0, 0, 0, 0)',
     'Tablero: la severidad lleva barra lateral de color, no solo el pill (' + JSON.stringify(barra) + ')');
  ok(await finding.locator('.pill').count() === 1, 'Tablero: la severidad lleva pill con texto');

  // el otro tablero no se cargó
  const memoria = await page.evaluate(() => JSON.stringify(window.__nada || null));
  ok(!/Título de prueba tres/.test(await page.content()),
     'Anti-sesgo: el tablero de heurísticas no aparece al desplegar el de leyes');

  // ── EXPORTAR ──────────────────────────────────────────────
  await page.locator('#exportar').click();
  ok(await page.locator('#salida').isVisible(), 'Exportar: muestra el contenido en JSON');
  const json = await page.locator('#salida').inputValue();
  ok(json.includes('"prioridad"'), 'Exportar: el JSON incluye la prioridad calculada');
  await page.locator('[data-fmt="md"]').click();
  ok((await page.locator('#salida').inputValue()).includes('| Gravedad |'), 'Exportar: también en Markdown');
  await page.keyboard.press('Escape');
  ok(!(await page.locator('.modal').isVisible().catch(() => false)), 'Modal: se cierra con Esc');

  // ── EMPEZAR DE NUEVO ──────────────────────────────────────
  await page.locator('#reiniciar').click();
  ok(await page.locator('.modal').isVisible(), 'Empezar de nuevo: pide confirmación');
  await page.locator('.modal .btn--danger').click();
  await page.waitForSelector('#ir-paso2');
  ok(await page.locator('#ir-paso2').isDisabled(), 'Empezar de nuevo: vuelve al paso 1 vacío');
  const guardado = await page.evaluate(() => localStorage.getItem('ux-eval-v1'));
  ok(!/Formulario de pedido/.test(guardado || ''), 'Empezar de nuevo: borra lo cargado del almacenamiento');

  // ── RESPONSIVE 360px ──────────────────────────────────────
  await page.setViewportSize({ width: 360, height: 780 });
  await page.locator('#sel-todos').click();
  await page.locator('#ir-paso2').click();
  const scroll = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(scroll <= 0, 'Responsive: a 360 px no hay scroll horizontal (sobra ' + scroll + ' px)');

  // área táctil mínima
  const chicos = await page.evaluate(() => {
    const malos = [];
    document.querySelectorAll('button, a[href], input, select, textarea').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const objetivo = el.closest('label') || el;
      const rr = objetivo.getBoundingClientRect();
      if (rr.height < 44 && !el.closest('.sr-only')) malos.push((el.className||el.tagName) + ' ' + Math.round(rr.height));
    });
    return malos;
  });
  ok(chicos.length === 0, 'Fitts: todo control llega a 44 px de alto — ' + JSON.stringify(chicos.slice(0, 6)));

  // ── TECLADO ───────────────────────────────────────────────
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.keyboard.press('Tab');
  const foco = await page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { tag: el.tagName, outline: s.outlineWidth };
  });
  ok(!!foco.tag, 'Teclado: el foco entra en la página (' + foco.tag + ')');

  // Las capturas todavía no están en public/img: el 404 lo maneja el propio
  // onerror de la evidencia, así que no cuenta como error de la aplicación.
  const relevantes = errores.filter(e => !/favicon/i.test(e) && !/404/.test(e));
  ok(relevantes.length === 0, 'Sin errores de consola — ' + JSON.stringify(relevantes.slice(0, 3)));

  await browser.close();

  console.log(out.join('\n'));
  console.log('\n' + out.filter(l => l.startsWith('PASS')).length + ' de ' + out.length + ' comprobaciones pasan.');
})();
