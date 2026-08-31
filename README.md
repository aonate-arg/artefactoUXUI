# Tableros de evaluación UX · Wendy's Argentina

Aplicación web estática que presenta la evaluación heurística de un producto digital real
detrás de un flujo de evaluación a ciegas. Sin framework, sin paso de build, sin CDN.

- **Producto evaluado:** Wendy's Argentina — `wendys.com.ar`
- **Materia:** Diseño UX/UI
- **Alcance:** sitio público — home, listado de locales y entrada al flujo de pedido, en
  escritorio (1280 px) y en móvil (375 px). No se completó ninguna compra ni se cargaron datos
  personales reales.
- **URL de producción:** `<completar después del deploy en Vercel>`

---

## Qué hay acá

Dos entregables que conviven:

1. **Los tableros.** Dos documentos visuales que exponen los hallazgos con su evidencia, su
   severidad y su recomendación. Es lo que se corrige y lo que queda publicado.
   - **Tablero A — Leyes de UX:** Hick, Fitts, Jakob, Miller.
   - **Tablero B — Heurísticas de Nielsen:** las diez.
2. **El flujo de acceso.** Cuatro pasos que hay que recorrer antes de que el tablero se muestre:
   elegir principios, cargar los hallazgos propios, confirmar, y recién entonces desplegar el
   tablero con una capa de comparación encima.

Los dos tableros recorren el flujo de forma independiente: se puede terminar el de leyes y dejar
el de heurísticas para otro momento.

---

## Cómo se llegó a los hallazgos

Evaluación heurística individual sobre la interfaz pública, sin testing con usuarios. El
procedimiento fue:

1. Leer las reglas operativas de cada principio en el material de referencia. Cada regla es
   binaria y se puede comprobar mirando una pantalla o leyendo el código.
2. Recorrer el producto en un navegador real, en escritorio y en móvil de 375 px.
3. Por cada pantalla, pasar la lista de reglas operativas y anotar únicamente los
   incumplimientos que se pudieran **medir**, no solo percibir: la caja de cada control, el
   estilo de foco calculado antes y después de enfocar, el árbol de accesibilidad, y la
   transcripción literal de los textos de la interfaz.
4. Puntuar gravedad (cuánto afecta al uso) y facilidad de arreglo, de 1 a 5. La prioridad sale
   del promedio de las dos, calculado por la aplicación; no se estima a ojo.
5. Escribir la recomendación con el valor concreto cuando corresponde.

Cada hallazgo del tablero lleva, además de los ocho campos de la plantilla, un campo
**Comprobación**: la medición reproducible que lo sostiene. Cualquiera puede repetirla y
verificar que el hallazgo es cierto.

**Principios que no se pudieron verificar quedan marcados como no evaluados, y los que se
verificaron sin encontrar incumplimiento quedan declarados como cumplidos.** Ninguna de las dos
cosas se rellena con hallazgos inventados: un tablero con seis hallazgos reales vale más que uno
con veinte fabricados.

### Qué salió

| | Tablero A · Leyes | Tablero B · Heurísticas |
|---|---|---|
| Hallazgos | 3 | 9 |
| Principios con hallazgos | 3 de 4 | 7 de 10 |
| Declarados cumplidos | Ley de Hick | — |
| Fuera del alcance | — | Prevención de errores, Flexibilidad, Ayuda |

Los tres de mayor prioridad, en los dos tableros: la pantalla de pedido abre con «No hay
productos en el menú» sin decir qué hacer (4,5); ningún elemento interactivo del sitio muestra
el foco del teclado (4,5); y la home no tiene ninguna acción primaria, así que la tarea
principal del producto no tiene botón (4,0).

Las tres heurísticas fuera del alcance —prevención de errores, flexibilidad y ayuda— exigen
llegar al formulario de pago y cargar datos personales. Se dejaron marcadas como no evaluadas
en vez de completarlas con suposiciones.

> **Pendiente.** Las capturas de evidencia van en `public/img/` con los nombres que lista
> `assets/capturas.js`. Mientras falten, cada hallazgo muestra un bloque «Captura pendiente» con
> el nombre del archivo que espera, y la comprobación medida sostiene el hallazgo igual.

---

## Cómo funciona el flujo de evaluación a ciegas

**Paso 1 · Selección.** Lista de principios con casilla, nombre y una línea de descripción,
ordenada por número de principio. Controles de «seleccionar todos» y «ninguno», contador visible,
y botón primario deshabilitado mientras no haya ninguno elegido, explicando por qué.

**Paso 2 · Evaluación propia.** Por cada principio seleccionado se cargan cero, uno o varios
hallazgos con los mismos campos del tablero. Hay una opción explícita de «sin hallazgos: el
producto cumple», para no obligar a inventar problemas. La prioridad se calcula sola. Barra de
progreso sobre los principios seleccionados y navegación libre entre ellos.

**Paso 3 · Guardado y confirmación.** Resumen de lo cargado, advertencia explícita de que al
desplegar el tablero los hallazgos propios quedan bloqueados, y una confirmación que exige un
gesto deliberado —marcar una casilla dentro de un diálogo— distinto del de guardar un campo.

**Paso 4 · El tablero.** Recién acá aparece el tablero completo, con su cabecera de resumen y
todos los hallazgos. Encima se monta la comparación lado a lado, un resumen del contraste,
exportación en JSON y Markdown, y «empezar de nuevo» con confirmación previa.

### La restricción anti-sesgo

Nada del tablero es perceptible antes del paso 4. En concreto:

- Los hallazgos viven en `public/data/hallazgos-programa.json` y se piden con `fetch()`
  **únicamente** al desplegar el tablero. Antes de eso no hay ni una petición.
- Al desplegar un tablero se conserva en memoria solo ese tablero: el otro se descarta en el
  mismo `.then()`, para no retener lo que todavía no se evaluó.
- En los pasos 1 a 3 no hay contadores por principio, ni badges, ni tooltips con contenido del
  tablero, ni un orden que insinúe prioridad. La lista del paso 1 va por número de principio.
- Nada del tablero queda en el DOM oculto ni en atributos `data-*`. Si no se muestra, no está
  cargado.

El inventario de capturas (`assets/capturas.js`) describe **qué pantalla** es cada archivo, nunca
qué problema tiene: el paso 2 lo necesita para adjuntar evidencia y no puede adelantar nada.

Las pruebas automáticas verifican esto: que no se pida el JSON al abrir la página, que no se pida
en el paso 2, y que se pida exactamente una vez al llegar al paso 4.

---

## Cómo correr el sitio en local

Hace falta un servidor: el `fetch()` del paso 4 no funciona abriendo el archivo con `file://`.

```bash
python3 -m http.server 8000
# después: http://localhost:8000
```

O con Node:

```bash
npx serve .
```

## Deploy en Vercel

Es un sitio estático sin configuración. Desde la raíz del repo:

```bash
vercel
```

O conectando el repositorio de GitHub en el panel de Vercel: framework «Other», sin build command
y con el directorio raíz como output. No hay dependencias ni paso de build.

---

## Estructura

```
index.html                          una sola página con las dos vistas de tablero
assets/styles.css                   sistema visual: tokens, componentes, layout
assets/principios.js                los 14 principios con su regla operativa
assets/capturas.js                  inventario neutro de las capturas disponibles
assets/app.js                       estado, flujo de 4 pasos, tablero y comparación
public/data/hallazgos-programa.json los hallazgos, separados del código
public/img/                         las capturas de evidencia
prompts_leyes_heuristicas.md        registro de los prompts usados
```

---

## Decisiones de implementación

**Sistema visual.** Los tokens son los de la especificación, literales: tema oscuro por defecto
resuelto con `light-dark()`, tres radios (6, 10, 999), bordes de 1 px, espaciado en grilla de 4,
sombras solo en tema claro, un único acento aqua y un único estilo de foco.

**Tipografía.** Las familias declaradas son `Instrument Sans` y `JetBrains Mono`, con las pilas de
respaldo de la especificación. No se cargan por CDN porque el enunciado lo prohíbe, así que en un
equipo sin esas fuentes instaladas se resuelven con la tipografía de sistema. Todos los números
van en monoespaciada con `tabular-nums`.

**Severidad.** La gravedad de 1 a 5 se traduce a la escala del sistema visual: 5 crítico, 4 alto,
3 medio, 1–2 bajo. Nunca se comunica solo con color: cada hallazgo lleva pill con texto **y**
barra lateral de 3 px. En las tarjetas de hallazgo la barra va como pseudo-elemento y no como
`box-shadow`, porque en tema oscuro `--shadow-1` vale `none` y `none` no puede sumarse a una
lista de sombras: la declaración entera se descartaría.

**Una sola ranura de mensaje por campo.** La ayuda y el error comparten renglón. Fue una
corrección después de probar el formulario: con el error en un renglón aparte, al validar al salir
del campo el mensaje desaparecía, el formulario se acortaba y el botón se movía justo cuando el
usuario iba a hacer clic.

**Excepción anotada al foco.** El panel de pasos recibe el foco por código al cambiar de paso,
para que un lector de pantalla anuncie la vista nueva. Como no es un control, no lleva anillo de
acento: el anillo se reserva para lo accionable.

**Almacenamiento.** Todo el estado va bajo una sola clave con versión, `ux-eval-v1`. Cada lectura
y escritura está dentro de `try/catch`: en una ventana de incógnito la aplicación sigue
funcionando y avisa que no va a guardar el progreso.

---

## Checklist de autoevaluación

Este trabajo evalúa usabilidad, así que su propia usabilidad es la prueba. Verificado con pruebas
automáticas sobre la aplicación corriendo (`test-flujo.js`, 42 comprobaciones):

- [x] Una sola acción primaria por vista.
- [x] El usuario siempre sabe en qué paso está y cuántos faltan.
- [x] Se puede volver atrás en todo momento hasta el paso 3.
- [x] El bloqueo del paso 3 se advierte antes de que ocurra, no después.
- [x] Todo se guarda solo; nada se pierde al recargar, ni siquiera el borrador a medio escribir.
- [x] «Empezar de nuevo» pide confirmación.
- [x] Todo elemento interactivo con `hover`, `focus-visible`, `active` y `disabled`.
- [x] Área clicable de al menos 44×44 px en todo control.
- [x] Nada necesario oculto detrás de un hover.
- [x] Ningún ícono de acción sin etiqueta de texto.
- [x] Los errores de formulario aparecen junto al campo, no agrupados arriba.
- [x] Navegable entero por teclado, con orden de foco lógico.
- [x] `prefers-reduced-motion` respetado.
- [x] Estructura de encabezados correcta, sin saltos.
- [x] La página no scrollea en horizontal a 360 px de ancho.
- [x] Ningún texto por debajo de 4.5:1 en ninguno de los dos temas.

---

Trabajo práctico de evaluación heurística. El producto evaluado es un sitio público de terceros;
este trabajo no tiene vínculo con la marca ni la representa.
