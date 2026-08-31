# Registro de prompts

Cada prompt que se usó para producir este trabajo, en orden, con una línea de contexto sobre qué
se buscaba y qué se ajustó después de ver el resultado.

---

## 01 · Encuadre del entregable

> Quiero crear un artifact: una página web publicada con la herramienta Artifacts. Hazme algunas
> preguntas sobre lo que debería mostrar y luego créalo y publícalo.

**Qué se buscaba.** Abrir el trabajo pidiendo que se hicieran preguntas antes de construir, en vez
de recibir una primera versión adivinada.

**Qué salió.** Se interrumpió para adjuntar el enunciado completo, que ya traía las preguntas
contestadas de antemano.

---

## 02 · El enunciado

> desarrolla el artefacto con estas instrucciones, los detalles de cómo hacer las cosas están
> subidos en el contexto
>
> (adjunto: `prompt-tableros.md`)

**Qué se buscaba.** Pasar el enunciado entero —los dos tableros, el flujo a ciegas de cuatro
pasos, la restricción anti-sesgo, los requisitos técnicos y de diseño, el checklist de
autoevaluación— en lugar de ir dictándolo por partes.

**Qué salió.** El enunciado dejaba sin completar el bloque `[COMPLETAR]`: producto evaluado,
equipo, materia, capturas y repositorio. Y pedía explícitamente preguntar antes de asumir.

**Qué se ajustó.** Antes de escribir código se leyeron los dos PDF de referencia completos
(`heuristicas-y-leyes-ux.pdf` y `sistema-visual-spec.pdf`) y se preguntó lo que faltaba.

---

## 03 · Las cuatro preguntas del bloque `[COMPLETAR]`

> ¿Qué producto digital real evaluamos? · ¿De dónde salen las capturas de evidencia? · ¿Cómo
> querés el entregable? · ¿Qué va en la cabecera del trabajo?

**Qué se buscaba.** Cerrar lo único que faltaba para poder empezar, en una sola tanda en vez de
interrumpir cuatro veces.

**Respuestas.** Elegir el producto y auditarlo en vivo · las capturas las carga el equipo en la
carpeta · las dos entregas, Artifact publicado y repositorio para Vercel · en la cabecera va
«Diseño UX/UI».

**Qué se ajustó.** El producto quedó definido en el intercambio siguiente: **Wendy's Argentina**,
`wendys.com.ar`.

---

## 04 · Auditar el producto en vivo

**Qué se buscaba.** Ver el flujo real para documentar hallazgos con evidencia, en lugar de
escribir hallazgos genéricos.

**Qué salió, en dos tiempos.** Primero, tres caminos cerrados: la extensión del navegador no
estaba conectada; el control de pantalla del equipo solo se concede sobre navegadores en modo
lectura —se ve la pantalla, no se puede navegar—; y el acceso web directo devuelve el esqueleto,
porque es una aplicación JavaScript. Se decidió entonces **no completar el tablero con hallazgos
no verificados** y dejar el archivo de datos vacío, con la aplicación diciéndolo. Más tarde el
navegador se conectó y se pudo hacer la auditoría de verdad.

**Cómo se auditó.** No solo mirando: midiendo. Sobre el sitio corriendo se ejecutaron
comprobaciones que cualquiera puede repetir —la caja de cada elemento interactivo en escritorio
y en móvil de 375 px, el estilo de foco calculado antes y después de enfocar cada control, el
árbol de accesibilidad de los diálogos, una pulsación real de Esc, y la transcripción literal de
los textos—. Cada hallazgo del tablero lleva esa medición en un campo **Comprobación**.

**El hallazgo que no fue.** El ícono de la cuenta parecía la flecha de «cerrar sesión» usada para
iniciarla, que habría sido un incumplimiento claro de la heurística 04. Al inspeccionarlo resultó
ser `lucide-log-in`, el ícono correcto. **No se reportó.** La regla de no inventar hallazgos se
paga sobre todo con los que uno ya daba por buenos.

**Qué quedó fuera.** Prevención de errores, flexibilidad y ayuda exigen llegar al formulario de
pago y cargar datos personales. Se marcaron como no evaluadas en vez de completarlas con
suposiciones.

---

## 05 · Orden de construcción

**Qué se buscaba.** Respetar el orden del enunciado: contenido antes que interfaz, tablero antes
que flujo.

**Cómo se resolvió.**

1. Los dos PDF de referencia, completos.
2. El catálogo de los 14 principios con su regla operativa literal (`assets/principios.js`).
3. El sistema visual: bloque de tokens de la especificación, sin reinterpretar, y las recetas de
   componentes (`assets/styles.css`).
4. El tablero como informe autónomo: cabecera de resumen, tarjetas de hallazgo con evidencia,
   severidad por color más forma, recomendación.
5. Los pasos 1 a 3 por delante y la comparación encima del tablero ya construido.

---

## 06 · Verificación con pruebas automáticas

**Qué se buscaba.** No dar por bueno el checklist de autoevaluación a ojo. Se escribió
`test-flujo.js`: recorre el ciclo completo con un navegador real —seleccionar, evaluar, recargar
a mitad de camino, confirmar, desplegar, alternar vistas, exportar, empezar de nuevo— y comprueba
42 condiciones, entre ellas las tres de anti-sesgo.

**Qué encontró, y qué se corrigió.**

| Falla | Corrección |
|---|---|
| Al validar al salir del campo, el mensaje de error desaparecía, el formulario se acortaba y el botón primario se movía justo cuando el usuario iba a hacer clic. La prueba lo detectó porque el clic dejó de registrarse. | Una sola ranura de mensaje por campo: la ayuda y el error comparten renglón y la altura no cambia nunca. |
| La barra de severidad de las tarjetas no se veía: `box-shadow: inset 3px 0 0 …, var(--shadow-1)` es inválido en tema oscuro, donde `--shadow-1` vale `none`, y el navegador descarta la declaración entera. | La barra pasó a ser un pseudo-elemento de 3 px; la elevación queda en `box-shadow`. |
| El panel de pasos, que recibe el foco por código al cambiar de vista, dibujaba el anillo de acento alrededor de toda la página. | Excepción anotada: el anillo se reserva para lo accionable; el panel se enfoca sin anillo. |
| En la navegación lateral del paso 2 los principios figuraban solo como «Ley 1», «Ley 2». | Se agregó el nombre corto —«Ley 1 · Hick»— para no obligar a recordar cuál es cuál, que es justamente la heurística 06. |

**Estado final.** 42 de 42 comprobaciones pasan.

---

## 07 · Volcar los hallazgos y ajustar el tablero a lo que dicen

**Qué se buscaba.** Escribir `hallazgos-programa.json` con los doce hallazgos medidos, antes de
tocar la maqueta, y dejar que el contenido corrigiera la interfaz.

**Qué cambió el contenido.**

| Se veía así | Se cambió a |
|---|---|
| El arco de la cabecera mostraba «principios con problemas: 100 % de los evaluados». Con siete de diez principios evaluados, un tablero incompleto se leía como completo. | El arco pasó a medir el **alcance**: 7 de 10, con la leyenda «3 principios quedaron fuera del alcance». |
| Las barras de distribución por gravedad salían vacías: eran `span` en línea, y `height` no se aplica a un elemento en línea. | `display: block` en la barra y en su relleno. |
| Los hallazgos tenían los ocho campos de la plantilla y nada más. | Se agregó el campo **Comprobación**, en monoespaciada, con la medición reproducible que sostiene cada uno. |

## 08 · Lo que queda pendiente

Sacar las ocho capturas que lista `assets/capturas.js` y dejarlas en `public/img/`, y completar
la URL de producción en el README después del deploy.
