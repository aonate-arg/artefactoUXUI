/* ═══════════════════════════════════════════════════════════
   CATÁLOGO DE PRINCIPIOS
   Nombres, definiciones y reglas operativas tomados literalmente
   de docs/heuristicas-y-leyes-ux.pdf (partes 01 a 03).

   Este archivo NO contiene ningún dato del tablero: solo el
   material de referencia que el usuario necesita para evaluar
   por su cuenta en los pasos 1 a 3.
   ═══════════════════════════════════════════════════════════ */

window.PRINCIPIOS = [
  /* ── TABLERO A · LEYES DE UX ─────────────────────────────── */
  {
    id: 'L1', corto: 'Hick', tablero: 'leyes', num: 1, codigo: 'Ley 1',
    nombre: 'Ley de Hick',
    desc: 'El tiempo que lleva decidir crece con la cantidad de opciones que se ofrecen a la vez.',
    regla: 'Ninguna pantalla ofrece más de una acción primaria. Los procesos largos se parten en pasos con pocas decisiones cada uno, en lugar de presentarse completos. Todo campo con un valor previsible viene con un valor por defecto. En una acción irreversible o crítica, el número de opciones se reduce al mínimo.'
  },
  {
    id: 'L2', corto: 'Fitts', tablero: 'leyes', num: 2, codigo: 'Ley 2',
    nombre: 'Ley de Fitts',
    desc: 'Un objetivo se alcanza más rápido cuanto más grande es y cuanto menos desplazamiento exige.',
    regla: 'El área clicable de todo control es al menos de 44×44 px, aunque el elemento se vea más chico: se amplía con padding, no agrandando el texto. Los controles relacionados se agrupan y el más frecuente es el más grande. La acción primaria se sitúa donde el cursor o el pulgar ya están. Las acciones destructivas se separan físicamente de las frecuentes.'
  },
  {
    id: 'L3', corto: 'Jakob', tablero: 'leyes', num: 3, codigo: 'Ley 3',
    nombre: 'Ley de Jakob',
    desc: 'El usuario pasa la mayor parte de su tiempo en otros productos y espera que este funcione igual.',
    regla: 'Antes de inventar un patrón, se documenta cómo lo resuelven tres productos de referencia de la categoría. Apartarse del patrón dominante exige una razón escrita y una ganancia medible. Los elementos estructurales —posición del logo, del buscador, del carrito, del menú de cuenta— siguen la convención sin excepción.'
  },
  {
    id: 'L4', corto: 'Miller', tablero: 'leyes', num: 4, codigo: 'Ley 4',
    nombre: 'Ley de Miller',
    desc: 'La memoria inmediata retiene alrededor de siete elementos a la vez sin esfuerzo.',
    regla: 'Ningún menú de navegación principal supera las siete entradas; el objetivo son cinco. Ningún grupo de opciones sin jerarquía supera los siete elementos: a partir de ahí se subdivide en categorías. Los formularios largos se parten en secciones de no más de siete campos, con progreso visible.'
  },

  /* ── TABLERO B · HEURÍSTICAS DE NIELSEN ──────────────────── */
  {
    id: 'H01', corto: 'Estado del sistema', tablero: 'heuristicas', num: 1, codigo: 'Heurística 01',
    nombre: 'Visibilidad del estado del sistema',
    desc: 'El usuario sabe en todo momento qué está haciendo el sistema y toda acción recibe respuesta.',
    regla: 'Todo elemento interactivo tiene estados visibles de hover, focus, active y disabled. Toda acción asíncrona muestra estado de carga desde el primer momento y termina en un mensaje explícito de éxito o de error. Ningún proceso de más de un segundo queda sin indicador.'
  },
  {
    id: 'H02', corto: 'Mundo real', tablero: 'heuristicas', num: 2, codigo: 'Heurística 02',
    nombre: 'Coincidencia entre el sistema y el mundo real',
    desc: 'La interfaz habla el idioma del usuario, con sus palabras, no con la jerga del sistema.',
    regla: 'Ningún código de error, nombre de campo de base de datos ni término interno del equipo aparece en la interfaz. Cada mensaje se escribe en la segunda persona y en el vocabulario del usuario. El rojo se reserva para error o destrucción y no se usa como color decorativo.'
  },
  {
    id: 'H03', corto: 'Control y libertad', tablero: 'heuristicas', num: 3, codigo: 'Heurística 03',
    nombre: 'Control y libertad del usuario',
    desc: 'Toda función necesita una salida visible: deshacer, cancelar, volver, cerrar.',
    regla: 'Toda acción destructiva tiene o bien confirmación previa, o bien deshacer posterior — nunca ninguna de las dos, y rara vez las dos juntas. Todo modal se cierra con la tecla Esc y con un control visible. Ningún flujo de más de un paso carece de botón para volver atrás.'
  },
  {
    id: 'H04', corto: 'Consistencia', tablero: 'heuristicas', num: 4, codigo: 'Heurística 04',
    nombre: 'Consistencia y estándares',
    desc: 'Uniformidad interna del producto y respeto por las convenciones externas del sector.',
    regla: 'Un mismo concepto se llama siempre igual en toda la aplicación. Un mismo tipo de acción se ve siempre igual. Ningún elemento no clicable imita la apariencia de uno clicable, ni al revés. Los iconos se usan con su significado convencional o no se usan.'
  },
  {
    id: 'H05', corto: 'Prevención', tablero: 'heuristicas', num: 5, codigo: 'Heurística 05',
    nombre: 'Prevención de errores',
    desc: 'El buen diseño hace que el error sea imposible, no solo que sea detectable.',
    regla: 'Todo campo con un conjunto finito de valores válidos usa un control acotado, no texto libre. Toda validación ocurre en línea, al salir del campo, no al enviar el formulario. Toda acción irreversible requiere un gesto deliberado distinto del de las acciones normales.'
  },
  {
    id: 'H06', corto: 'Reconocer', tablero: 'heuristicas', num: 6, codigo: 'Heurística 06',
    nombre: 'Reconocer en lugar de recordar',
    desc: 'La interfaz carga con el peso de la memoria; el usuario no tiene que retener datos.',
    regla: 'Ninguna información necesaria para completar el paso actual está oculta detrás de una interacción. El usuario nunca tiene que recordar un dato de una pantalla anterior para usarlo en la siguiente: si hace falta, se muestra. Los iconos sin etiqueta llevan tooltip; los iconos de acción principal llevan etiqueta visible.'
  },
  {
    id: 'H07', corto: 'Flexibilidad', tablero: 'heuristicas', num: 7, codigo: 'Heurística 07',
    nombre: 'Flexibilidad y eficiencia de uso',
    desc: 'La interfaz sirve al principiante y al experto: navegación clara y aceleradores.',
    regla: 'Toda acción frecuente tiene atajo de teclado, y el atajo se muestra junto a la acción en su menú. Ningún atajo es el único camino a una función. El onboarding se puede saltear y se puede volver a ver.'
  },
  {
    id: 'H08', corto: 'Minimalismo', tablero: 'heuristicas', num: 8, codigo: 'Heurística 08',
    nombre: 'Estética y diseño minimalista',
    desc: 'La pantalla contiene solo lo esencial para la tarea en curso.',
    regla: 'Cada pantalla tiene una sola acción primaria, visualmente distinta de todas las demás. Todo elemento que no sirve a la tarea en curso se saca o se mueve a un nivel secundario. La jerarquía se construye con tamaño, peso y espacio antes que con color.'
  },
  {
    id: 'H09', corto: 'Errores', tablero: 'heuristicas', num: 9, codigo: 'Heurística 09',
    nombre: 'Ayudar a reconocer, diagnosticar y recuperarse de los errores',
    desc: 'El error se explica en el idioma del usuario y ofrece un camino de salida.',
    regla: 'Todo mensaje de error dice qué pasó, por qué y qué hacer a continuación. Los errores de formulario aparecen junto al campo afectado, no agrupados arriba. Ningún mensaje contiene un código de error como única información.'
  },
  {
    id: 'H10', corto: 'Ayuda', tablero: 'heuristicas', num: 10, codigo: 'Heurística 10',
    nombre: 'Ayuda y documentación',
    desc: 'La ayuda es encontrable, orientada a la tarea y concisa.',
    regla: 'La ayuda se busca por texto y devuelve la respuesta, no una lista de categorías. Todo campo con reglas no evidentes lleva la explicación al lado, no en una página aparte. Los procedimientos se escriben como pasos numerados, nunca como párrafo corrido.'
  }
];

window.TABLEROS = {
  leyes: {
    id: 'leyes',
    titulo: 'Leyes de UX',
    subtitulo: 'Hick, Fitts, Jakob y Miller',
    orden: 'A'
  },
  heuristicas: {
    id: 'heuristicas',
    titulo: 'Heurísticas de Nielsen',
    subtitulo: 'Las diez heurísticas de usabilidad',
    orden: 'B'
  }
};
