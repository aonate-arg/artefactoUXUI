/* ═══════════════════════════════════════════════════════════
   TABLEROS DE EVALUACIÓN UX
   Flujo de evaluación a ciegas (pasos 1–3) + tablero (paso 4).

   REGLA ANTI-SESGO
   Los hallazgos precargados viven en public/data/hallazgos-programa.json
   y se piden con fetch() únicamente en desplegarTablero(). Antes de eso
   no hay nada del tablero en memoria, ni en el DOM, ni en atributos.
   Al desplegar un tablero se conserva solo ese tablero y se descarta el
   otro, para no retener lo que el usuario todavía no evaluó.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'ux-eval-v1';
  var DATA_URL = 'public/data/hallazgos-programa.json';

  /* ── Capturas disponibles para adjuntar como evidencia ────
     Inventario neutro: describe qué pantalla es, nunca qué
     problema tiene. No adelanta nada del tablero.            */
  var CAPTURAS = window.CAPTURAS || [];

  /* ═══════════════ ALMACENAMIENTO ═══════════════ */

  var storage = {
    disponible: true,
    leer: function () {
      try {
        var raw = window.localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        this.disponible = false;
        return null;
      }
    },
    escribir: function (valor) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(valor));
        return true;
      } catch (e) {
        this.disponible = false;
        avisarSinGuardado();
        return false;
      }
    },
    borrar: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* nada que hacer */ }
    }
  };

  function avisarSinGuardado() {
    var el = document.getElementById('aviso-storage');
    if (!el) return;
    el.hidden = false;
    el.textContent = 'Este navegador no está guardando el progreso (suele pasar en ' +
      'ventanas de incógnito). La evaluación funciona igual, pero si cerrás la ' +
      'pestaña vas a perder lo cargado.';
  }

  function tableroVacio() {
    return {
      paso: 1, sel: [], hal: {}, sin: {}, draft: {},
      confirmado: false, fecha: null, vista: 'tablero'
    };
  }

  function estadoInicial() {
    return {
      v: 1, tema: null, activo: 'leyes',
      t: { leyes: tableroVacio(), heuristicas: tableroVacio() }
    };
  }

  var estado = (function () {
    var guardado = storage.leer();
    if (!guardado || guardado.v !== 1 || !guardado.t) return estadoInicial();
    var base = estadoInicial();
    base.tema = guardado.tema || null;
    base.activo = guardado.activo === 'heuristicas' ? 'heuristicas' : 'leyes';
    ['leyes', 'heuristicas'].forEach(function (k) {
      var g = guardado.t[k];
      if (!g) return;
      var t = base.t[k];
      t.paso = Math.min(4, Math.max(1, g.paso || 1));
      t.sel = Array.isArray(g.sel) ? g.sel : [];
      t.hal = g.hal && typeof g.hal === 'object' ? g.hal : {};
      t.sin = g.sin && typeof g.sin === 'object' ? g.sin : {};
      t.draft = g.draft && typeof g.draft === 'object' ? g.draft : {};
      t.confirmado = !!g.confirmado;
      t.fecha = g.fecha || null;
      /* Al volver a entrar, el tablero solo es la vista por defecto. */
      t.vista = 'tablero';
    });
    return base;
  })();

  if (!storage.disponible) avisarSinGuardado();

  var guardarPendiente = null;
  function guardar(inmediato) {
    if (guardarPendiente) clearTimeout(guardarPendiente);
    if (inmediato) { storage.escribir(estado); marcarGuardado(); return; }
    guardarPendiente = setTimeout(function () {
      storage.escribir(estado); marcarGuardado();
    }, 250);
  }

  function marcarGuardado() {
    var el = document.getElementById('autosave');
    if (!el || !storage.disponible) return;
    el.textContent = 'Guardado ' + horaCorta(new Date());
  }

  /* ═══════════════ UTILIDADES ═══════════════ */

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function horaCorta(d) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function fechaLarga(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  function uid() { return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function prioridad(gravedad, facilidad) {
    return Math.round(((Number(gravedad) + Number(facilidad)) / 2) * 10) / 10;
  }
  function unDecimal(n) {
    return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
  }

  /* Gravedad 1–5 → escala de severidad del sistema visual */
  function nivel(g) {
    g = Number(g);
    if (g >= 5) return { k: 'critical', txt: 'Crítico' };
    if (g === 4) return { k: 'high', txt: 'Alto' };
    if (g === 3) return { k: 'medium', txt: 'Medio' };
    return { k: 'low', txt: 'Bajo' };
  }

  function principiosDe(tab) {
    return window.PRINCIPIOS.filter(function (p) { return p.tablero === tab; })
      .sort(function (a, b) { return a.num - b.num; });   /* por número, nunca por gravedad */
  }
  function principio(id) {
    return window.PRINCIPIOS.filter(function (p) { return p.id === id; })[0];
  }

  function t() { return estado.t[estado.activo]; }
  function metaTablero() { return window.TABLEROS[estado.activo]; }

  function evaluado(tab, pid) {
    var st = estado.t[tab];
    return !!st.sin[pid] || (st.hal[pid] && st.hal[pid].length > 0);
  }
  function cuantosEvaluados(tab) {
    var st = estado.t[tab];
    return st.sel.filter(function (pid) { return evaluado(tab, pid); }).length;
  }

  /* ═══════════════ MODAL ═══════════════ */

  var ultimoFoco = null;

  function abrirModal(opciones) {
    cerrarModal();
    ultimoFoco = document.activeElement;
    var capa = document.getElementById('capa-modal');
    var acciones = (opciones.acciones || []).map(function (a, i) {
      return '<button type="button" class="btn ' + a.clase + '" data-accion="' + i + '">' +
        esc(a.texto) + '</button>';
    }).join('');

    capa.innerHTML =
      '<div class="overlay" data-overlay>' +
        '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-tit">' +
          '<h2 id="modal-tit" style="font-size:20px;line-height:1.35;letter-spacing:-.01em">' +
            esc(opciones.titulo) + '</h2>' +
          '<div class="stack gap-3">' + (opciones.cuerpo || '') + '</div>' +
          '<div class="row" style="justify-content:flex-end;gap:var(--s-2)">' +
            '<button type="button" class="btn btn--ghost" data-cerrar>Cancelar</button>' +
            acciones +
          '</div>' +
        '</div>' +
      '</div>';

    var overlay = $('[data-overlay]', capa);
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) cerrarModal();
    });
    capa.querySelectorAll('[data-cerrar]').forEach(function (b) {
      b.addEventListener('click', cerrarModal);
    });
    (opciones.acciones || []).forEach(function (a, i) {
      var b = capa.querySelector('[data-accion="' + i + '"]');
      b.addEventListener('click', function () { a.al(capa); });
    });
    if (opciones.alAbrir) opciones.alAbrir(capa);

    document.addEventListener('keydown', teclaModal);
    var primero = capa.querySelector('input, button');
    if (primero) primero.focus();
  }

  function teclaModal(ev) { if (ev.key === 'Escape') cerrarModal(); }

  function cerrarModal() {
    var capa = document.getElementById('capa-modal');
    if (!capa.innerHTML) return;
    capa.innerHTML = '';
    document.removeEventListener('keydown', teclaModal);
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    ultimoFoco = null;
  }

  /* ═══════════════ PASOS · CABECERA ═══════════════ */

  var NOMBRES_PASO = ['Selección', 'Tu evaluación', 'Confirmación', 'Tablero'];

  function pintarPasos() {
    var st = t();
    var cont = document.getElementById('steps');
    cont.innerHTML = NOMBRES_PASO.map(function (nombre, i) {
      var n = i + 1;
      var actual = st.paso === n;
      var hecho = st.paso > n;
      return '<span class="steps__item"' +
        (actual ? ' aria-current="step"' : '') +
        (hecho ? ' data-done="true"' : '') + '>' +
        '<span class="steps__num" aria-hidden="true">' + n + '</span>' +
        esc(nombre) + '</span>' +
        (n < 4 ? '<span class="steps__sep" aria-hidden="true">→</span>' : '');
    }).join('') +
    '<span class="hint" style="margin-left:auto" id="autosave" aria-live="polite"></span>';
  }

  function pintarTabs() {
    ['leyes', 'heuristicas'].forEach(function (k) {
      var tab = document.getElementById('tab-' + k);
      tab.setAttribute('aria-selected', String(estado.activo === k));
      var st = estado.t[k];
      var etiqueta = st.confirmado ? 'Tablero desplegado'
        : st.paso === 1 ? 'Sin empezar'
        : 'Paso ' + st.paso + ' de 4';
      document.getElementById('estado-' + k).textContent = etiqueta;
    });
    document.getElementById('panel-tablero')
      .setAttribute('aria-labelledby', 'tab-' + estado.activo);
  }

  /* ═══════════════ PASO 1 · SELECCIÓN ═══════════════ */

  function pintarPaso1() {
    var st = t(), meta = metaTablero(), lista = principiosDe(estado.activo);
    var n = st.sel.length;

    var filas = lista.map(function (p) {
      var marcado = st.sel.indexOf(p.id) !== -1;
      return '<label class="check">' +
        '<input type="checkbox" data-pid="' + p.id + '"' + (marcado ? ' checked' : '') + '>' +
        '<span class="stack gap-1">' +
          '<span class="check__name"><span class="check__num">' + esc(p.codigo) + ' · </span>' +
            esc(p.nombre) + '</span>' +
          '<span class="check__desc">' + esc(p.desc) + '</span>' +
        '</span>' +
      '</label>';
    }).join('');

    return '' +
    '<div class="section">' +
      '<div class="section__head">' +
        '<p class="label">Paso 1 de 4 · Tablero ' + meta.orden + ' · ' + esc(meta.titulo) + '</p>' +
        '<h2>Elegí qué principios vas a evaluar</h2>' +
        '<p class="lead">Podés tomar todos o quedarte con un subconjunto. ' +
          'Después vas a cargar tus propios hallazgos para cada uno de los que elijas.</p>' +
      '</div>' +

      '<div class="picker">' +
        '<div class="picker__toolbar">' +
          '<div class="row">' +
            '<button type="button" class="btn btn--ghost" id="sel-todos">Seleccionar todos</button>' +
            '<button type="button" class="btn btn--ghost" id="sel-ninguno">Ninguno</button>' +
          '</div>' +
          '<p class="hint" aria-live="polite"><span class="num">' + n + '</span> de ' +
            '<span class="num">' + lista.length + '</span> seleccionados</p>' +
        '</div>' +
        filas +
      '</div>' +

      '<div class="actionbar">' +
        '<p class="hint" id="motivo">' +
          (n === 0
            ? 'Elegí al menos un principio para poder empezar.'
            : 'Vas a evaluar ' + n + (n === 1 ? ' principio.' : ' principios.')) +
        '</p>' +
        '<button type="button" class="btn btn--primary" id="ir-paso2"' +
          (n === 0 ? ' disabled' : '') + '>Empezar la evaluación</button>' +
      '</div>' +
    '</div>';
  }

  function conectarPaso1() {
    var st = t();
    document.querySelectorAll('.check input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var pid = cb.getAttribute('data-pid');
        var i = st.sel.indexOf(pid);
        if (cb.checked && i === -1) st.sel.push(pid);
        if (!cb.checked && i !== -1) st.sel.splice(i, 1);
        st.sel.sort(function (a, b) { return principio(a).num - principio(b).num; });
        guardar();
        render(true);
      });
    });
    $('#sel-todos').addEventListener('click', function () {
      st.sel = principiosDe(estado.activo).map(function (p) { return p.id; });
      guardar(); render(true);
    });
    $('#sel-ninguno').addEventListener('click', function () {
      st.sel = []; guardar(); render(true);
    });
    $('#ir-paso2').addEventListener('click', function () {
      if (!st.sel.length) return;
      st.paso = 2;
      if (!st.foco) st.foco = st.sel[0];
      guardar(true); render();
    });
  }

  /* ═══════════════ PASO 2 · EVALUACIÓN PROPIA ═══════════════ */

  function pintarPaso2() {
    var st = t(), meta = metaTablero();
    if (st.sel.indexOf(st.foco) === -1) st.foco = st.sel[0];
    var p = principio(st.foco);
    var hechos = cuantosEvaluados(estado.activo);
    var pct = st.sel.length ? Math.round((hechos / st.sel.length) * 100) : 0;

    var nav = st.sel.map(function (pid) {
      var pr = principio(pid);
      var listo = evaluado(estado.activo, pid);
      var cuantos = (st.hal[pid] || []).length;
      var marca = st.sin[pid] ? 'cumple' : (cuantos ? cuantos + (cuantos === 1 ? ' hallazgo' : ' hallazgos') : '—');
      return '<button type="button" data-ir="' + pid + '"' +
        (pid === st.foco ? ' aria-current="true"' : '') + '>' +
        '<span>' + esc(pr.codigo) + ' · ' + esc(pr.corto) + '</span>' +
        '<span class="eval__state">' + esc(listo ? marca : '—') + '</span>' +
      '</button>';
    }).join('');

    return '' +
    '<div class="section">' +
      '<div class="section__head">' +
        '<p class="label">Paso 2 de 4 · Tablero ' + meta.orden + ' · ' + esc(meta.titulo) + '</p>' +
        '<h2>Cargá tus propios hallazgos</h2>' +
        '<p class="lead">Un principio puede tener cero, uno o varios hallazgos. ' +
          'Podés moverte entre principios en cualquier orden; todo se guarda solo.</p>' +
      '</div>' +

      '<div class="progress">' +
        '<div class="row between">' +
          '<p class="hint" aria-live="polite"><span class="num">' + hechos + '</span> de ' +
            '<span class="num">' + st.sel.length + '</span> principios evaluados</p>' +
          '<p class="hint num">' + pct + '%</p>' +
        '</div>' +
        '<div class="progress__track" role="progressbar" aria-valuenow="' + hechos +
          '" aria-valuemin="0" aria-valuemax="' + st.sel.length + '" ' +
          'aria-label="Principios evaluados">' +
          '<div class="progress__fill" style="width:' + pct + '%"></div>' +
        '</div>' +
      '</div>' +

      '<div class="eval">' +
        '<nav class="eval__nav" aria-label="Principios seleccionados">' + nav + '</nav>' +
        '<div class="stack gap-6">' + bloquePrincipio(p) + '</div>' +
      '</div>' +

      '<div class="actionbar">' +
        '<button type="button" class="btn btn--ghost" id="volver-paso1">Volver a la selección</button>' +
        '<button type="button" class="btn btn--primary" id="ir-paso3">Cerrar mi evaluación</button>' +
      '</div>' +
    '</div>';
  }

  function bloquePrincipio(p) {
    var st = t();
    var sin = !!st.sin[p.id];
    var cargados = st.hal[p.id] || [];
    var d = st.draft[p.id] || {};

    var listaCargados = cargados.length
      ? '<ul class="stack gap-3">' + cargados.map(function (h, i) {
          var nv = nivel(h.gravedad);
          return '<li class="mini row--' + nv.k + '">' +
            '<div class="row between">' +
              '<span class="label">Tu hallazgo ' + (i + 1) + '</span>' +
              '<span class="pill pill--' + nv.k + '">' + nv.txt + '</span>' +
            '</div>' +
            '<p class="strong-text">' + esc(h.que) + '</p>' +
            '<p class="hint">' + esc(h.donde) + ' · gravedad <span class="num">' + h.gravedad +
              '</span> · facilidad <span class="num">' + h.facilidad +
              '</span> · prioridad <span class="num">' + unDecimal(prioridad(h.gravedad, h.facilidad)) + '</span></p>' +
            '<div class="row">' +
              '<button type="button" class="btn btn--ghost" data-editar="' + h.id + '">Editar</button>' +
              '<button type="button" class="btn btn--danger" data-borrar="' + h.id + '">Quitar</button>' +
            '</div>' +
          '</li>';
        }).join('') + '</ul>'
      : '';

    var opcionesCaptura = ['<option value="">Sin captura</option>'].concat(
      CAPTURAS.map(function (c) {
        return '<option value="' + esc(c.archivo) + '"' +
          (d.evidencia === c.archivo ? ' selected' : '') + '>' + esc(c.titulo) + '</option>';
      })).join('');

    var formulario = sin ? '' :
      '<form class="finding-form" id="form-hallazgo" novalidate>' +
        '<h4>' + (d.id ? 'Editar el hallazgo' : 'Agregar un hallazgo') + '</h4>' +

        '<div class="field">' +
          '<label for="f-donde">Dónde</label>' +
          '<input class="input" id="f-donde" name="donde" required ' +
            'placeholder="Pantalla o flujo exacto" value="' + esc(d.donde || '') + '">' +
          mensaje('donde', 'Por ejemplo: «Paso de pago, formulario de datos».') +
        '</div>' +

        '<div class="field">' +
          '<label for="f-que">Qué pasa</label>' +
          '<textarea class="textarea" id="f-que" name="que" required ' +
            'placeholder="El problema y su efecto sobre el usuario">' + esc(d.que || '') + '</textarea>' +
          mensaje('que', 'El problema concreto y su efecto sobre quien usa el producto.') +
        '</div>' +

        '<div class="form-grid form-grid--2">' +
          campoEscala('gravedad', 'Gravedad', 'Cuánto afecta al uso del producto. 1 es molesto, 5 impide terminar la tarea.', d.gravedad) +
          campoEscala('facilidad', 'Facilidad de arreglo', 'Cuán fácil es de resolver. 1 es rehacer el flujo, 5 es un cambio de CSS.', d.facilidad) +
        '</div>' +

        '<p class="hint">Prioridad: <span class="num" id="f-prioridad">' +
          (d.gravedad && d.facilidad ? unDecimal(prioridad(d.gravedad, d.facilidad)) : '—') +
          '</span> · se calcula como el promedio de las dos, no se carga a mano.</p>' +

        '<div class="field">' +
          '<label for="f-evidencia">Evidencia</label>' +
          '<select class="input" id="f-evidencia" name="evidencia">' + opcionesCaptura + '</select>' +
          '<p class="hint">Opcional: elegí la captura donde se ve el problema.</p>' +
        '</div>' +

        '<div class="field">' +
          '<label for="f-recomendacion">Recomendación</label>' +
          '<textarea class="textarea" id="f-recomendacion" name="recomendacion" required ' +
            'placeholder="Qué hacer concretamente, con el valor cuando corresponda">' +
            esc(d.recomendacion || '') + '</textarea>' +
          mensaje('recomendacion', 'Accionable: qué cambiar y con qué valor («llevar el área táctil a 44×44 px»).') +
        '</div>' +

        '<div class="row">' +
          '<button type="submit" class="btn btn--secondary" id="f-guardar">' +
            (d.id ? 'Guardar los cambios' : 'Agregar este hallazgo') + '</button>' +
          (d.id ? '<button type="button" class="btn btn--ghost" id="f-cancelar">Cancelar la edición</button>' : '') +
        '</div>' +
      '</form>';

    return '' +
      '<article class="stack gap-4">' +
        '<div class="section__head">' +
          '<p class="label">' + esc(p.codigo) + '</p>' +
          '<h3>' + esc(p.nombre) + '</h3>' +
          '<p class="principle__rule"><strong class="strong-text">Regla operativa.</strong> ' +
            esc(p.regla) + '</p>' +
        '</div>' +

        '<label class="check" style="border:1px solid var(--line);border-radius:var(--r-control)">' +
          '<input type="checkbox" id="sin-hallazgos"' + (sin ? ' checked' : '') + '>' +
          '<span class="stack gap-1">' +
            '<span class="check__name">Sin hallazgos: el producto cumple este principio</span>' +
            '<span class="check__desc">Marcalo si no encontraste evidencia de incumplimiento. ' +
              'Es una respuesta válida y vale tanto como cargar un hallazgo.</span>' +
          '</span>' +
        '</label>' +

        listaCargados +
        formulario +
      '</article>';
  }

  function campoEscala(nombre, etiqueta, ayuda, valor) {
    var opciones = [1, 2, 3, 4, 5].map(function (v) {
      return '<label class="scale__opt">' +
        '<input type="radio" name="' + nombre + '" value="' + v + '"' +
          (String(valor) === String(v) ? ' checked' : '') + '>' +
        '<span>' + v + '</span></label>';
    }).join('');
    return '<fieldset class="field" style="border:0;padding:0;margin:0">' +
      '<legend class="field__label">' + esc(etiqueta) + '</legend>' +
      '<div class="scale">' + opciones + '</div>' +
      mensaje(nombre, ayuda) +
    '</fieldset>';
  }

  /* Una sola ranura por campo: la ayuda y el error comparten renglón,
     así el error no empuja el formulario ni mueve el botón. */
  function mensaje(nombre, ayuda) {
    return '<p class="msg" data-msg="' + nombre + '" data-ayuda="' + esc(ayuda) + '">' +
      esc(ayuda) + '</p>';
  }

  function conectarPaso2() {
    var st = t();

    document.querySelectorAll('[data-ir]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.foco = b.getAttribute('data-ir');
        guardar(); render();
      });
    });

    var sinCb = $('#sin-hallazgos');
    if (sinCb) sinCb.addEventListener('change', function () {
      if (sinCb.checked) {
        if ((st.hal[st.foco] || []).length) {
          sinCb.checked = false;
          abrirModal({
            titulo: 'Ya cargaste hallazgos en este principio',
            cuerpo: '<p>Para marcar que el producto cumple, primero quitá los ' +
              'hallazgos que cargaste acá.</p>',
            acciones: []
          });
          return;
        }
        st.sin[st.foco] = true;
      } else {
        delete st.sin[st.foco];
      }
      guardar(true); render();
    });

    var form = $('#form-hallazgo');
    if (form) {
      /* Autoguardado del borrador en cada cambio */
      form.addEventListener('input', function () { volcarBorrador(form); });
      form.addEventListener('change', function () { volcarBorrador(form); });

      /* Validación en línea, al salir del campo */
      ['donde', 'que', 'recomendacion'].forEach(function (n) {
        var campo = form.elements[n];
        campo.addEventListener('blur', function () { validarCampo(form, n); });
      });

      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var errores = ['donde', 'que', 'recomendacion', 'gravedad', 'facilidad']
          .filter(function (n) { return !validarCampo(form, n); });
        if (errores.length) {
          var primero = form.querySelector('[data-msg="' + errores[0] + '"]');
          if (primero) primero.scrollIntoView({ block: 'center' });
          return;
        }
        var d = st.draft[st.foco] || {};
        var h = {
          id: d.id || uid(),
          donde: form.elements.donde.value.trim(),
          que: form.elements.que.value.trim(),
          evidencia: form.elements.evidencia.value || null,
          gravedad: Number((form.querySelector('[name="gravedad"]:checked') || {}).value),
          facilidad: Number((form.querySelector('[name="facilidad"]:checked') || {}).value),
          recomendacion: form.elements.recomendacion.value.trim()
        };
        st.hal[st.foco] = st.hal[st.foco] || [];
        var existente = st.hal[st.foco].findIndex(function (x) { return x.id === h.id; });
        if (existente >= 0) st.hal[st.foco][existente] = h;
        else st.hal[st.foco].push(h);
        delete st.sin[st.foco];
        st.draft[st.foco] = {};
        guardar(true); render();
      });

      var cancelar = $('#f-cancelar');
      if (cancelar) cancelar.addEventListener('click', function () {
        st.draft[st.foco] = {}; guardar(true); render();
      });
    }

    document.querySelectorAll('[data-editar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-editar');
        var h = (st.hal[st.foco] || []).filter(function (x) { return x.id === id; })[0];
        if (!h) return;
        st.draft[st.foco] = JSON.parse(JSON.stringify(h));
        guardar(true); render();
      });
    });

    document.querySelectorAll('[data-borrar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar');
        abrirModal({
          titulo: 'Quitar este hallazgo',
          cuerpo: '<p>Se elimina de tu evaluación. Esta acción no se puede deshacer.</p>',
          acciones: [{
            texto: 'Quitar el hallazgo', clase: 'btn--danger', al: function () {
              st.hal[st.foco] = (st.hal[st.foco] || []).filter(function (x) { return x.id !== id; });
              if (!st.hal[st.foco].length) delete st.hal[st.foco];
              cerrarModal(); guardar(true); render();
            }
          }]
        });
      });
    });

    $('#volver-paso1').addEventListener('click', function () {
      st.paso = 1; guardar(true); render();
    });
    $('#ir-paso3').addEventListener('click', function () {
      st.paso = 3; guardar(true); render();
    });
  }

  function volcarBorrador(form) {
    var st = t();
    var d = st.draft[st.foco] || {};
    var g = form.querySelector('[name="gravedad"]:checked');
    var f = form.querySelector('[name="facilidad"]:checked');
    st.draft[st.foco] = {
      id: d.id || null,
      donde: form.elements.donde.value,
      que: form.elements.que.value,
      evidencia: form.elements.evidencia.value || null,
      gravedad: g ? Number(g.value) : null,
      facilidad: f ? Number(f.value) : null,
      recomendacion: form.elements.recomendacion.value
    };
    var salida = document.getElementById('f-prioridad');
    if (salida) {
      salida.textContent = (g && f) ? unDecimal(prioridad(g.value, f.value)) : '—';
    }
    guardar();
  }

  function validarCampo(form, nombre) {
    var destino = form.querySelector('[data-msg="' + nombre + '"]');
    var campo = form.elements[nombre];
    function mal(texto) {
      destino.textContent = texto;
      destino.classList.add('msg--error');
      if (campo && campo.setAttribute) campo.setAttribute('aria-invalid', 'true');
      return false;
    }
    function bien() {
      destino.textContent = destino.getAttribute('data-ayuda') || '';
      destino.classList.remove('msg--error');
      if (campo && campo.removeAttribute) campo.removeAttribute('aria-invalid');
      return true;
    }
    if (nombre === 'gravedad' || nombre === 'facilidad') {
      return form.querySelector('[name="' + nombre + '"]:checked')
        ? bien() : mal('Elegí un valor de 1 a 5.');
    }
    var valor = campo.value.trim();
    if (!valor) return mal('Este campo es obligatorio.');
    if (nombre !== 'donde' && valor.length < 12) {
      return mal('Escribí un poco más: con menos de doce caracteres no se entiende el hallazgo.');
    }
    return bien();
  }

  /* ═══════════════ PASO 3 · CONFIRMACIÓN ═══════════════ */

  function pintarPaso3() {
    var st = t(), meta = metaTablero();
    var total = 0, sinEvaluar = [];
    var filas = st.sel.map(function (pid) {
      var p = principio(pid);
      var cargados = st.hal[pid] || [];
      total += cargados.length;
      var estadoTxt;
      if (st.sin[pid]) estadoTxt = '<span class="pill pill--ok">Cumple</span>';
      else if (cargados.length) estadoTxt = '<span class="num">' + cargados.length + '</span>';
      else { estadoTxt = '<span class="pill pill--neutral">Sin evaluar</span>'; sinEvaluar.push(p.codigo); }
      return '<tr><td>' + esc(p.codigo) + ' · ' + esc(p.nombre) + '</td>' +
        '<td class="num">' + estadoTxt + '</td></tr>';
    }).join('');

    return '' +
    '<div class="section">' +
      '<div class="section__head">' +
        '<p class="label">Paso 3 de 4 · Tablero ' + meta.orden + ' · ' + esc(meta.titulo) + '</p>' +
        '<h2>Revisá lo que cargaste antes de cerrar</h2>' +
        '<p class="lead">Esto es lo que va a quedar registrado como tu evaluación original.</p>' +
      '</div>' +

      '<div class="table-scroll">' +
        '<table class="table">' +
          '<thead><tr><th>Principio</th><th>Tus hallazgos</th></tr></thead>' +
          '<tbody>' + filas + '</tbody>' +
        '</table>' +
      '</div>' +

      '<p class="hint">Total cargado: <span class="num">' + total + '</span> ' +
        (total === 1 ? 'hallazgo' : 'hallazgos') + '.' +
        (sinEvaluar.length ? ' Quedan sin evaluar: ' + esc(sinEvaluar.join(', ')) +
          '. Podés confirmar igual, pero esos principios no van a entrar en la comparación.' : '') +
      '</p>' +

      '<div class="callout callout--warn">' +
        '<p class="callout__title">Cuando confirmes, tus hallazgos quedan bloqueados</p>' +
        '<p>Al desplegar el tablero vas a ver los hallazgos precargados. A partir de ' +
          'ese momento ya no vas a poder editar los tuyos: es la única forma de que la ' +
          'comparación signifique algo. Si querés cambiar algo, volvé ahora.</p>' +
      '</div>' +

      '<div class="actionbar">' +
        '<button type="button" class="btn btn--ghost" id="volver-paso2">Volver a editar</button>' +
        '<button type="button" class="btn btn--primary" id="confirmar">Confirmar y desplegar el tablero</button>' +
      '</div>' +
    '</div>';
  }

  function conectarPaso3() {
    var st = t();
    $('#volver-paso2').addEventListener('click', function () {
      st.paso = 2; guardar(true); render();
    });
    $('#confirmar').addEventListener('click', function () {
      abrirModal({
        titulo: 'Confirmar y desplegar el tablero',
        cuerpo:
          '<p>Vas a ver los hallazgos del tablero. Tus respuestas quedan congeladas ' +
          'como tu versión original y no se pueden editar después.</p>' +
          '<label class="check" style="border:1px solid var(--line-strong);border-radius:var(--r-control)">' +
            '<input type="checkbox" id="acepto">' +
            '<span class="check__name">Entiendo que mis hallazgos quedan bloqueados</span>' +
          '</label>' +
          '<p class="msg" id="aviso-acepto">La casilla es el gesto que confirma. ' +
            'Hasta que la marques, el tablero no se despliega.</p>',
        acciones: [{
          texto: 'Desplegar el tablero', clase: 'btn--primary', al: function (capa) {
            if (!capa.querySelector('#acepto').checked) {
              var aviso = capa.querySelector('#aviso-acepto');
              aviso.textContent = 'Marcá la casilla para poder continuar.';
              aviso.classList.add('msg--error');
              capa.querySelector('#acepto').focus();
              return;
            }
            st.confirmado = true;
            st.fecha = new Date().toISOString();
            st.paso = 4;
            st.vista = 'comparacion';   /* la primera vez, el contraste */
            st.draft = {};
            cerrarModal(); guardar(true); render();
          }
        }],
        alAbrir: function (capa) {
          capa.querySelector('#acepto').addEventListener('change', function () {
            var aviso = capa.querySelector('#aviso-acepto');
            aviso.textContent = 'Listo: al continuar, tus hallazgos quedan congelados.';
            aviso.classList.remove('msg--error');
          });
        }
      });
    });
  }

  /* ═══════════════ PASO 4 · EL TABLERO ═══════════════ */

  var TABLERO_CARGADO = { leyes: null, heuristicas: null };

  function pintarPaso4() {
    var st = t(), meta = metaTablero();
    var datos = TABLERO_CARGADO[estado.activo];

    if (!datos) {
      pedirTablero();
      return '<div class="section"><div class="empty">' +
        '<h3>Desplegando el tablero</h3>' +
        '<p>Cargando los hallazgos de la evaluación.</p>' +
        '<div class="skeleton" style="width:220px"></div>' +
      '</div></div>';
    }
    if (datos.error) {
      return '<div class="section"><div class="empty">' +
        '<h3>No se pudo cargar el tablero</h3>' +
        '<p>El archivo de hallazgos no respondió. Tu evaluación está guardada y no se perdió.</p>' +
        '<button type="button" class="btn btn--primary" id="reintentar">Reintentar</button>' +
      '</div></div>';
    }

    var soloComparacion = st.vista === 'comparacion';

    return '' +
    '<div class="section">' +
      '<div class="actionbar">' +
        '<div class="row" role="group" aria-label="Vista del tablero">' +
          '<button type="button" class="tab" data-vista="tablero"' +
            ' aria-selected="' + (!soloComparacion) + '">Tablero completo</button>' +
          '<button type="button" class="tab" data-vista="comparacion"' +
            ' aria-selected="' + soloComparacion + '">Solo comparación</button>' +
        '</div>' +
        '<div class="row">' +
          '<button type="button" class="btn btn--ghost" id="exportar">Exportar</button>' +
          '<button type="button" class="btn btn--danger" id="reiniciar">Empezar de nuevo</button>' +
        '</div>' +
      '</div>' +
      (soloComparacion ? pintarComparacion(datos) : pintarTableroInforme(datos)) +
    '</div>';
  }

  /* En la versión publicada como Artifact no hay archivos sueltos que pedir:
     el mismo JSON viaja codificado en base64 dentro de la página y se
     descodifica ACÁ, en el mismo momento en que la otra versión haría el
     fetch. No queda texto del tablero legible en el documento antes del
     paso 4, ni en el DOM ni en atributos. */
  function traerDatos() {
    if (window.DATOS_B64) {
      return new Promise(function (resolver) {
        var bin = atob(window.DATOS_B64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        resolver(JSON.parse(new TextDecoder('utf-8').decode(bytes)));
      });
    }
    return fetch(DATA_URL, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  function pedirTablero() {
    var tab = estado.activo;
    traerDatos()
      .then(function (json) {
        /* Solo se conserva el tablero que el usuario ya evaluó.
           El otro se descarta acá mismo y no queda en memoria. */
        var elegido = json.tableros[tab];
        TABLERO_CARGADO[tab] = {
          producto: json.producto,
          metodo: json.metodo,
          capturas: json.capturas || [],
          hallazgos: elegido.hallazgos || [],
          cumple: elegido.cumple || [],
          cumpleNota: elegido.cumpleNota || {}
        };
        json = null;
        render();
      })
      .catch(function () {
        TABLERO_CARGADO[tab] = { error: true };
        render();
      });
  }

  /* ── El informe ─────────────────────────────────────────── */

  function pintarTableroInforme(d) {
    var meta = metaTablero();
    var lista = principiosDe(estado.activo);

    /* Un tablero sin hallazgos y sin principios declarados como cumplidos
       significa que la evaluación todavía no se volcó al archivo de datos.
       Se dice, en lugar de rellenar con hallazgos que nadie verificó. */
    if (!d.hallazgos.length && !d.cumple.length) {
      return '<div class="board"><div class="empty">' +
        '<h3>La evaluación de este tablero todavía no está cargada</h3>' +
        '<p>El tablero se arma desde <span class="num">public/data/hallazgos-programa.json</span>. ' +
          'Mientras ese archivo no tenga los hallazgos verificados sobre el producto, ' +
          'esta vista queda vacía a propósito: no se reporta nada que no se haya podido comprobar.</p>' +
        '<p class="hint">Tu evaluación propia sí quedó guardada y se puede exportar.</p>' +
      '</div></div>';
    }
    var hallazgos = d.hallazgos.slice().sort(function (a, b) {
      return prioridad(b.gravedad, b.facilidad) - prioridad(a.gravedad, a.facilidad);
    });

    var conteo = { critical: 0, high: 0, medium: 0, low: 0 };
    hallazgos.forEach(function (h) { conteo[nivel(h.gravedad).k]++; });
    var maximo = Math.max(1, conteo.critical, conteo.high, conteo.medium, conteo.low);

    var conHallazgos = {};
    hallazgos.forEach(function (h) { conHallazgos[h.principio] = true; });
    var evaluados = lista.filter(function (p) {
      return conHallazgos[p.id] || d.cumple.indexOf(p.id) !== -1;
    });
    /* El arco mide el ALCANCE de la evaluación —cuántos principios del
       tablero se llegaron a evaluar— y no el porcentaje de incumplimiento:
       una evaluación parcial no puede parecer completa. */
    var fueraDeAlcance = lista.length - evaluados.length;
    var pctCobertura = lista.length
      ? Math.round((evaluados.length / lista.length) * 100) : 0;

    var top3 = hallazgos.slice(0, 3).map(function (h, i) {
      return '<div class="top3__item row--' + nivel(h.gravedad).k + '">' +
        '<span class="top3__rank">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="stack gap-1">' +
          '<span class="top3__title">' + esc(h.titulo) + '</span>' +
          '<span class="top3__where">' + esc(principio(h.principio).codigo) + ' · ' + esc(h.donde) + '</span>' +
        '</span>' +
        '<span class="top3__score">' + unDecimal(prioridad(h.gravedad, h.facilidad)) + '</span>' +
      '</div>';
    }).join('');

    var distribucion = [
      ['critical', 'Crítico', 'Gravedad 5'],
      ['high', 'Alto', 'Gravedad 4'],
      ['medium', 'Medio', 'Gravedad 3'],
      ['low', 'Bajo', 'Gravedad 1–2']
    ].map(function (fila) {
      var n = conteo[fila[0]];
      return '<div class="dist__row">' +
        '<span class="pill pill--' + fila[0] + '">' + fila[1] + '</span>' +
        '<span class="dist__bar"><span class="dist__fill dist__fill--' + fila[0] +
          '" style="width:' + Math.round((n / maximo) * 100) + '%"></span></span>' +
        '<span class="dist__n">' + n + '</span>' +
      '</div>';
    }).join('');

    var cumplen = d.cumple.map(function (pid) {
      var p = principio(pid);
      return '<li class="mini row--ok">' +
        '<span class="label">' + esc(p.codigo) + '</span>' +
        '<span class="strong-text">' + esc(p.nombre) + '</span>' +
        '<span class="hint">' + esc(d.cumpleNota && d.cumpleNota[pid] ? d.cumpleNota[pid] : 'Sin hallazgos.') + '</span>' +
      '</li>';
    }).join('');

    var porPrincipio = lista.map(function (p) {
      var propios = hallazgos.filter(function (h) { return h.principio === p.id; })
        .sort(function (a, b) { return prioridad(b.gravedad, b.facilidad) - prioridad(a.gravedad, a.facilidad); });
      var cuerpo;
      if (propios.length) {
        cuerpo = propios.map(tarjetaHallazgo).join('');
      } else if (d.cumple.indexOf(p.id) !== -1) {
        cuerpo = '<div class="clean row--ok">' +
          '<span class="pill pill--ok">Sin hallazgos</span>' +
          '<p>' + esc((d.cumpleNota && d.cumpleNota[p.id]) || 'El producto cumple este principio en lo evaluado.') + '</p>' +
        '</div>';
      } else {
        cuerpo = '<div class="clean">' +
          '<span class="pill pill--neutral">Sin evaluar</span>' +
          '<p>Este principio quedó fuera del alcance de esta evaluación.</p>' +
        '</div>';
      }
      return '<section class="principle">' +
        '<div class="principle__head">' +
          '<span class="principle__num">' + esc(p.codigo) + '</span>' +
          '<h3>' + esc(p.nombre) + '</h3>' +
        '</div>' +
        '<p class="principle__rule"><strong class="strong-text">Regla operativa.</strong> ' +
          esc(p.regla) + '</p>' +
        cuerpo +
      '</section>';
    }).join('');

    return '' +
    '<div class="board">' +
      '<div class="board__masthead">' +
        '<p class="label">Tablero ' + meta.orden + '</p>' +
        '<h2>' + esc(meta.titulo) + '</h2>' +
        '<p class="board__meta">' +
          '<span>Producto: <span class="strong-text">' + esc(d.producto.nombre) + '</span></span>' +
          '<span class="num">' + esc(d.producto.url) + '</span>' +
          '<span>Evaluado el ' + esc(fechaLarga(d.producto.fecha)) + '</span>' +
        '</p>' +
      '</div>' +

      '<div class="tiles">' +
        '<div class="card card--tile">' +
          '<span class="card__label">Hallazgos</span>' +
          '<span class="card__metric">' + hallazgos.length + '</span>' +
          '<span class="hint">en <span class="num">' + Object.keys(conHallazgos).length +
            '</span> de <span class="num">' + evaluados.length + '</span> principios evaluados</span>' +
        '</div>' +
        '<div class="card card--tile">' +
          '<span class="card__label">Alcance</span>' +
          '<div class="gauge">' + arco(pctCobertura) +
            '<span class="stack gap-1">' +
              '<span class="gauge__num">' + evaluados.length + '<span class="hint">/' + lista.length + '</span></span>' +
              '<span class="hint">' + (fueraDeAlcance
                ? esc(fueraDeAlcance + (fueraDeAlcance === 1
                    ? ' principio quedó fuera del alcance'
                    : ' principios quedaron fuera del alcance'))
                : 'se evaluaron todos los principios') + '</span>' +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="card card--tile">' +
          '<span class="card__label">Distribución por gravedad</span>' +
          '<div class="dist">' + distribucion + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<span class="card__label">Los tres de mayor prioridad</span>' +
        '<p class="hint">Prioridad = promedio de gravedad y facilidad de arreglo. ' +
          'Es la cola de trabajo, no el ranking de gravedad.</p>' +
        '<div class="top3">' + top3 + '</div>' +
      '</div>' +

      (cumplen ? '<div class="card">' +
        '<span class="card__label">Principios sin hallazgos</span>' +
        '<p class="hint">Se evaluaron y no se encontró evidencia de incumplimiento.</p>' +
        '<ul class="stack gap-3">' + cumplen + '</ul>' +
      '</div>' : '') +

      '<div class="findings">' + porPrincipio + '</div>' +

      '<div class="card">' +
        '<span class="card__label">Método</span>' +
        '<p>' + esc(d.metodo) + '</p>' +
      '</div>' +
    '</div>';
  }

  function arco(pct) {
    var r = 40, c = 2 * Math.PI * r, largo = c * (pct / 100);
    return '<svg class="gauge__svg" viewBox="0 0 96 96" role="img" ' +
      'aria-label="Se evaluó el ' + pct + ' por ciento de los principios del tablero">' +
      '<circle class="gauge__track" cx="48" cy="48" r="' + r + '" fill="none" stroke-width="8"/>' +
      '<circle class="gauge__value" cx="48" cy="48" r="' + r + '" fill="none" stroke-width="8" ' +
        'stroke-dasharray="' + largo + ' ' + c + '" transform="rotate(-90 48 48)">' +
        '<animate attributeName="stroke-dasharray" from="0 ' + c + '" ' +
          'to="' + largo + ' ' + c + '" dur="1100ms" fill="freeze" ' +
          'calcMode="spline" keySplines=".2 .7 .3 1" keyTimes="0;1"/>' +
      '</circle>' +
    '</svg>';
  }

  function tarjetaHallazgo(h) {
    var nv = nivel(h.gravedad);
    var pr = prioridad(h.gravedad, h.facilidad);
    var captura = h.evidencia ? buscarCaptura(h.evidencia) : null;

    var evidencia = h.evidencia
      ? '<figure class="evidence">' +
          '<img src="' + esc(rutaImagen(h.evidencia)) + '" alt="' + esc(h.alt || (captura && captura.titulo) || '') + '" ' +
            'loading="lazy" onerror="this.closest(\'figure\').innerHTML=' +
            '\'<div class=&quot;evidence__missing&quot;><span class=&quot;label&quot;>Captura pendiente</span>' +
            '<p class=&quot;hint&quot;>' + esc(h.evidencia) + '</p></div>\'">' +
          '<figcaption>' + esc(h.pie || '') + '</figcaption>' +
        '</figure>'
      : '';

    return '<article class="finding row--' + nv.k + '">' +
      '<div class="finding__top">' +
        '<span class="finding__id">' + esc(h.id) + ' · ' + esc(h.donde) + '</span>' +
        '<span class="pill pill--' + nv.k + '">' + nv.txt + '</span>' +
      '</div>' +
      '<h4 class="finding__title">' + esc(h.titulo) + '</h4>' +
      '<div class="finding__body' + (evidencia ? ' finding__body--evidence' : '') + '">' +
        '<div class="stack gap-4">' +
          '<div class="finding__block">' +
            '<span class="label">Qué pasa</span>' +
            '<p>' + esc(h.que) + '</p>' +
          '</div>' +
          '<div class="scores">' +
            '<span class="score"><span class="label">Gravedad</span>' +
              '<span class="score__val">' + h.gravedad + '<span class="hint">/5</span></span></span>' +
            '<span class="score"><span class="label">Facilidad</span>' +
              '<span class="score__val">' + h.facilidad + '<span class="hint">/5</span></span></span>' +
            '<span class="score score--priority"><span class="label">Prioridad</span>' +
              '<span class="score__val">' + unDecimal(pr) + '</span></span>' +
          '</div>' +
          (h.medicion
            ? '<div class="finding__block">' +
                '<span class="label">Comprobación</span>' +
                '<p class="medicion">' + esc(h.medicion) + '</p>' +
              '</div>'
            : '') +
          '<div class="recommend">' +
            '<span class="label">Recomendación</span>' +
            '<p>' + esc(h.recomendacion) + '</p>' +
          '</div>' +
        '</div>' +
        evidencia +
      '</div>' +
    '</article>';
  }

  /* En el repo las capturas son archivos de public/img/. En la página
     publicada viajan embebidas como data URI dentro de window.IMG. */
  function rutaImagen(archivo) {
    if (window.IMG && window.IMG[archivo]) return window.IMG[archivo];
    return 'public/img/' + archivo;
  }

  function buscarCaptura(archivo) {
    return CAPTURAS.filter(function (c) { return c.archivo === archivo; })[0] || null;
  }

  /* ── La comparación ─────────────────────────────────────── */

  function contraste(d) {
    var st = t();
    var mios = {}, suyos = {};
    st.sel.forEach(function (pid) { mios[pid] = (st.hal[pid] || []).length; });
    d.hallazgos.forEach(function (h) { suyos[h.principio] = (suyos[h.principio] || 0) + 1; });

    var coincidencias = [], soloMios = [], seMeEscaparon = [];
    st.sel.forEach(function (pid) {
      var a = mios[pid] > 0, b = (suyos[pid] || 0) > 0;
      if (a && b) coincidencias.push(pid);
      else if (a && !b) soloMios.push(pid);
      else if (!a && b) seMeEscaparon.push(pid);
    });

    var difs = coincidencias.map(function (pid) {
      var m = promedio((st.hal[pid] || []).map(function (h) { return Number(h.gravedad); }));
      var s = promedio(d.hallazgos.filter(function (h) { return h.principio === pid; })
        .map(function (h) { return Number(h.gravedad); }));
      return m - s;
    });
    return {
      coincidencias: coincidencias, soloMios: soloMios, seMeEscaparon: seMeEscaparon,
      difGravedad: difs.length ? promedio(difs) : null
    };
  }
  function promedio(a) {
    return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0;
  }

  function pintarComparacion(d) {
    var st = t(), c = contraste(d);

    if (!d.hallazgos.length && !d.cumple.length) {
      return '<div class="board"><div class="empty">' +
        '<h3>Todavía no hay con qué comparar</h3>' +
        '<p>El tablero de referencia no está cargado, así que no se puede contrastar nada. ' +
          'Tu evaluación quedó guardada y se puede exportar.</p>' +
      '</div></div>';
    }
    var signo = c.difGravedad === null ? null
      : c.difGravedad > 0.25 ? 'más alta' : c.difGravedad < -0.25 ? 'más baja' : 'muy parecida';

    var filas = st.sel.map(function (pid) {
      var p = principio(pid);
      var mios = st.hal[pid] || [];
      var suyos = d.hallazgos.filter(function (h) { return h.principio === pid; });

      var colMios = mios.length
        ? mios.map(function (h) {
            var nv = nivel(h.gravedad);
            return '<div class="mini row--' + nv.k + '">' +
              '<div class="row between"><span class="pill pill--' + nv.k + '">' + nv.txt + '</span>' +
                '<span class="hint num">prioridad ' + unDecimal(prioridad(h.gravedad, h.facilidad)) + '</span></div>' +
              '<p class="strong-text">' + esc(h.que) + '</p>' +
              '<p class="hint">' + esc(h.donde) + '</p>' +
              '<p class="hint">Tu recomendación: ' + esc(h.recomendacion) + '</p>' +
            '</div>';
          }).join('')
        : (st.sin[pid]
            ? '<div class="mini row--ok"><span class="pill pill--ok">Dijiste que cumple</span></div>'
            : '<div class="mini"><span class="pill pill--neutral">No lo evaluaste</span></div>');

      var colSuyos = suyos.length
        ? suyos.map(function (h) {
            var nv = nivel(h.gravedad);
            return '<div class="mini row--' + nv.k + '">' +
              '<div class="row between"><span class="pill pill--' + nv.k + '">' + nv.txt + '</span>' +
                '<span class="hint num">prioridad ' + unDecimal(prioridad(h.gravedad, h.facilidad)) + '</span></div>' +
              '<p class="strong-text">' + esc(h.titulo) + '</p>' +
              '<p class="hint">' + esc(h.donde) + '</p>' +
            '</div>';
          }).join('')
        : (d.cumple.indexOf(pid) !== -1
            ? '<div class="mini row--ok"><span class="pill pill--ok">Sin hallazgos</span>' +
              '<p class="hint">' + esc(d.cumpleNota[pid] || 'Se evaluó y no se encontró incumplimiento.') + '</p></div>'
            : '<div class="mini"><span class="pill pill--neutral">Fuera del alcance</span>' +
              '<p class="hint">Este principio no entró en la evaluación del tablero.</p></div>');

      return '<section class="principle">' +
        '<div class="principle__head">' +
          '<span class="principle__num">' + esc(p.codigo) + '</span>' +
          '<h3>' + esc(p.nombre) + '</h3>' +
        '</div>' +
        '<div class="compare">' +
          '<div class="compare__col compare__col--mine">' +
            '<div class="compare__head"><span class="label">Tu evaluación</span>' +
              '<span class="hint num">' + mios.length + '</span></div>' + colMios +
          '</div>' +
          '<div class="compare__col">' +
            '<div class="compare__head"><span class="label">El tablero</span>' +
              '<span class="hint num">' + suyos.length + '</span></div>' + colSuyos +
          '</div>' +
        '</div>' +
      '</section>';
    }).join('');

    return '' +
    '<div class="board">' +
      '<div class="board__masthead">' +
        '<p class="label">Contraste</p>' +
        '<h2>Tu evaluación al lado del tablero</h2>' +
        '<p class="lead">Esto describe diferencias, no te califica. Un hallazgo que viste ' +
          'solo vos no es un error tuyo: suele ser lo más valioso del ejercicio.</p>' +
      '</div>' +

      '<div class="tiles">' +
        '<div class="card card--tile"><span class="card__label">Principios en común</span>' +
          '<span class="card__metric">' + c.coincidencias.length + '</span>' +
          '<span class="hint">los dos encontraron algo</span></div>' +
        '<div class="card card--tile"><span class="card__label">Solo vos</span>' +
          '<span class="card__metric">' + c.soloMios.length + '</span>' +
          '<span class="hint">' + (c.soloMios.length ? esc(c.soloMios.join(', ')) : '—') + '</span></div>' +
        '<div class="card card--tile"><span class="card__label">Solo el tablero</span>' +
          '<span class="card__metric">' + c.seMeEscaparon.length + '</span>' +
          '<span class="hint">' + (c.seMeEscaparon.length ? esc(c.seMeEscaparon.join(', ')) : '—') + '</span></div>' +
        '<div class="card card--tile"><span class="card__label">Gravedad</span>' +
          '<span class="card__metric">' + (c.difGravedad === null ? '—' :
            (c.difGravedad > 0 ? '+' : '') + unDecimal(c.difGravedad)) + '</span>' +
          '<span class="hint">' + (signo === null
            ? 'sin principios en común para comparar'
            : 'tu gravedad promedio es ' + signo + ' que la del tablero') + '</span></div>' +
      '</div>' +

      '<div class="findings">' + filas + '</div>' +
    '</div>';
  }

  /* ── Acciones del paso 4 ────────────────────────────────── */

  function conectarPaso4() {
    var st = t();
    var reintentar = $('#reintentar');
    if (reintentar) {
      reintentar.addEventListener('click', function () {
        TABLERO_CARGADO[estado.activo] = null; render();
      });
      return;
    }
    document.querySelectorAll('[data-vista]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.vista = b.getAttribute('data-vista');
        guardar(); render();
      });
    });
    var exportar = $('#exportar');
    if (exportar) exportar.addEventListener('click', abrirExportacion);
    var reiniciar = $('#reiniciar');
    if (reiniciar) reiniciar.addEventListener('click', function () {
      abrirModal({
        titulo: 'Empezar de nuevo',
        cuerpo: '<p>Se borra tu evaluación de los dos tableros y volvés al paso 1. ' +
          'No se puede deshacer. Si querés conservarla, exportala antes.</p>',
        acciones: [{
          texto: 'Borrar y empezar de nuevo', clase: 'btn--danger', al: function () {
            storage.borrar();
            var fresco = estadoInicial();
            fresco.tema = estado.tema;
            fresco.activo = estado.activo;
            Object.keys(fresco).forEach(function (k) { estado[k] = fresco[k]; });
            TABLERO_CARGADO.leyes = null; TABLERO_CARGADO.heuristicas = null;
            cerrarModal(); guardar(true); render();
          }
        }]
      });
    });
  }

  function exportables() {
    var st = t(), d = TABLERO_CARGADO[estado.activo], c = contraste(d);
    return {
      tablero: metaTablero().titulo,
      producto: d.producto,
      fecha: st.fecha,
      miEvaluacion: st.sel.map(function (pid) {
        var p = principio(pid);
        return {
          principio: p.codigo + ' · ' + p.nombre,
          sinHallazgos: !!st.sin[pid],
          hallazgos: (st.hal[pid] || []).map(function (h) {
            return {
              donde: h.donde, que: h.que, evidencia: h.evidencia,
              gravedad: h.gravedad, facilidad: h.facilidad,
              prioridad: prioridad(h.gravedad, h.facilidad),
              recomendacion: h.recomendacion
            };
          })
        };
      }),
      comparacion: {
        principiosEnComun: c.coincidencias,
        soloVos: c.soloMios,
        soloElTablero: c.seMeEscaparon,
        diferenciaPromedioDeGravedad: c.difGravedad
      }
    };
  }

  function aMarkdown(x) {
    var l = [];
    l.push('# Mi evaluación · ' + x.tablero);
    l.push('');
    l.push('- Producto: ' + x.producto.nombre + ' (' + x.producto.url + ')');
    l.push('- Cerrada el: ' + fechaLarga(x.fecha));
    l.push('');
    l.push('## Hallazgos cargados');
    x.miEvaluacion.forEach(function (p) {
      l.push('');
      l.push('### ' + p.principio);
      if (p.sinHallazgos) { l.push('Sin hallazgos: el producto cumple.'); return; }
      if (!p.hallazgos.length) { l.push('Sin evaluar.'); return; }
      p.hallazgos.forEach(function (h, i) {
        l.push('');
        l.push('**Hallazgo ' + (i + 1) + '**');
        l.push('');
        l.push('| Campo | Contenido |');
        l.push('|---|---|');
        l.push('| Dónde | ' + h.donde + ' |');
        l.push('| Evidencia | ' + (h.evidencia || '—') + ' |');
        l.push('| Qué pasa | ' + h.que.replace(/\n/g, ' ') + ' |');
        l.push('| Gravedad | ' + h.gravedad + ' |');
        l.push('| Facilidad de arreglo | ' + h.facilidad + ' |');
        l.push('| Prioridad | ' + h.prioridad + ' |');
        l.push('| Recomendación | ' + h.recomendacion.replace(/\n/g, ' ') + ' |');
      });
    });
    l.push('');
    l.push('## Comparación con el tablero');
    l.push('');
    l.push('- Principios en común: ' + (x.comparacion.principiosEnComun.join(', ') || '—'));
    l.push('- Solo vos: ' + (x.comparacion.soloVos.join(', ') || '—'));
    l.push('- Solo el tablero: ' + (x.comparacion.soloElTablero.join(', ') || '—'));
    l.push('- Diferencia promedio de gravedad: ' +
      (x.comparacion.diferenciaPromedioDeGravedad === null ? '—'
        : x.comparacion.diferenciaPromedioDeGravedad.toFixed(2)));
    return l.join('\n');
  }

  function abrirExportacion() {
    var datos = exportables();
    var json = JSON.stringify(datos, null, 2);
    var md = aMarkdown(datos);
    var actual = 'json';

    abrirModal({
      titulo: 'Exportar tu evaluación',
      cuerpo:
        '<div class="row" role="group" aria-label="Formato">' +
          '<button type="button" class="tab" data-fmt="json" aria-selected="true">JSON</button>' +
          '<button type="button" class="tab" data-fmt="md" aria-selected="false">Markdown</button>' +
        '</div>' +
        '<label class="field__label" for="salida">Contenido</label>' +
        '<textarea class="textarea" id="salida" readonly rows="10" ' +
          'style="min-height:200px;font-family:var(--font-mono);font-size:13px">' + esc(json) + '</textarea>' +
        '<p class="hint" id="copia-estado" aria-live="polite"></p>',
      acciones: (function () {
        var copiar = { texto: 'Copiar', clase: window.SIN_DESCARGA ? 'btn--primary' : 'btn--secondary', al: function (capa) {
            var ta = capa.querySelector('#salida');
            ta.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            if (!ok && navigator.clipboard) {
              navigator.clipboard.writeText(ta.value).then(function () {
                capa.querySelector('#copia-estado').textContent = 'Copiado al portapapeles.';
              }, function () {
                capa.querySelector('#copia-estado').textContent =
                  'No se pudo copiar solo: seleccioná el texto y copialo a mano.';
              });
              return;
            }
            capa.querySelector('#copia-estado').textContent = ok
              ? 'Copiado al portapapeles.'
              : 'No se pudo copiar solo: seleccioná el texto y copialo a mano.';
          } };
        var bajar = { texto: 'Descargar archivo', clase: 'btn--primary', al: function (capa) {
            var esJson = actual === 'json';
            descargar(
              esJson ? 'mi-evaluacion-' + estado.activo + '.json' : 'mi-evaluacion-' + estado.activo + '.md',
              esJson ? json : md,
              esJson ? 'application/json' : 'text/markdown'
            );
            capa.querySelector('#copia-estado').textContent =
              'Si el navegador bloquea la descarga, usá «Copiar».';
          } };
        /* La página publicada corre en un entorno que bloquea las descargas
           que inicia la propia página: ahí se ofrece copiar y nada más, en
           vez de un botón que no haría nada. */
        return window.SIN_DESCARGA ? [copiar] : [copiar, bajar];
      })(),
      alAbrir: function (capa) {
        capa.querySelectorAll('[data-fmt]').forEach(function (b) {
          b.addEventListener('click', function () {
            actual = b.getAttribute('data-fmt');
            capa.querySelectorAll('[data-fmt]').forEach(function (o) {
              o.setAttribute('aria-selected', String(o === b));
            });
            capa.querySelector('#salida').value = actual === 'json' ? json : md;
          });
        });
      }
    });
  }

  function descargar(nombre, contenido, tipo) {
    try {
      var blob = new Blob([contenido], { type: tipo + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = nombre;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) { /* el aviso de la interfaz ya cubre este caso */ }
  }

  /* ═══════════════ RENDER ═══════════════ */

  function render(sinFoco) {
    var st = t();
    pintarTabs();
    pintarPasos();
    var destino = document.getElementById('paso');
    var html;
    if (st.paso === 1) html = pintarPaso1();
    else if (st.paso === 2) html = pintarPaso2();
    else if (st.paso === 3) html = pintarPaso3();
    else html = pintarPaso4();
    destino.innerHTML = html;

    if (st.paso === 1) conectarPaso1();
    else if (st.paso === 2) conectarPaso2();
    else if (st.paso === 3) conectarPaso3();
    else conectarPaso4();

    marcarGuardado();
    if (!sinFoco && document.body.dataset.pintado) {
      document.getElementById('panel-tablero').focus({ preventScroll: true });
    }
    document.body.dataset.pintado = '1';
  }

  /* ═══════════════ ARRANQUE ═══════════════ */

  ['leyes', 'heuristicas'].forEach(function (k) {
    document.getElementById('tab-' + k).addEventListener('click', function () {
      estado.activo = k; guardar(); render();
    });
  });

  var botonTema = document.getElementById('theme-toggle');
  var etiquetaTema = document.getElementById('theme-toggle-label');
  function aplicarTema() {
    if (estado.tema) document.documentElement.setAttribute('data-theme', estado.tema);
    var oscuro = estado.tema
      ? estado.tema === 'dark'
      : !window.matchMedia('(prefers-color-scheme: light)').matches;
    /* El botón es un icono sol/luna (ley de Jakob); el texto no se pisa,
       solo se actualiza el título y el nombre accesible — heurística 06:
       todo icono sin etiqueta visible lleva tooltip. */
    var texto = oscuro ? 'Tema claro' : 'Tema oscuro';
    botonTema.setAttribute('title', texto);
    if (etiquetaTema) etiquetaTema.textContent = texto;
    botonTema.setAttribute('aria-pressed', String(!oscuro));
  }
  botonTema.addEventListener('click', function () {
    var oscuro = estado.tema
      ? estado.tema === 'dark'
      : !window.matchMedia('(prefers-color-scheme: light)').matches;
    estado.tema = oscuro ? 'light' : 'dark';
    aplicarTema(); guardar(true);
  });
  aplicarTema();

  render(true);
})();
