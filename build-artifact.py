#!/usr/bin/env python3
"""
Arma la versión autocontenida para publicar como Artifact.

Diferencias con el repo, todas deliberadas:
  · una sola página, sin archivos sueltos: CSS y JS en línea;
  · los hallazgos viajan en base64 y se descodifican recién en el paso 4,
    en el mismo punto donde la otra versión hace el fetch;
  · las capturas van embebidas como data URI;
  · se ocultan las descargas, que el visor de Artifacts bloquea;
  · se cargan las dos tipografías de la especificación desde Google Fonts,
    el único origen externo que el visor admite.
"""
import base64, json, mimetypes, pathlib, re, sys

RAIZ = pathlib.Path(__file__).parent
SALIDA = RAIZ / 'artifact' / 'tableros-ux.html'

def leer(p):
    return (RAIZ / p).read_text(encoding='utf-8')

css = leer('assets/styles.css')
principios = leer('assets/principios.js')
capturas = leer('assets/capturas.js')
app = leer('assets/app.js')
datos = json.loads(leer('public/data/hallazgos-programa.json'))
datos.pop('_esquema', None)          # la documentación del formato no viaja

b64 = base64.b64encode(json.dumps(datos, ensure_ascii=False).encode('utf-8')).decode('ascii')

# Capturas embebidas
imgs = {}
carpeta = RAIZ / 'public' / 'img'
for f in sorted(carpeta.glob('*')):
    if f.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.avif'):
        continue
    tipo = mimetypes.guess_type(f.name)[0] or 'image/png'
    imgs[f.name] = 'data:%s;base64,%s' % (tipo, base64.b64encode(f.read_bytes()).decode('ascii'))

# El cuerpo sale del index, sin la cáscara del documento ni las etiquetas script
cuerpo = leer('index.html')
cuerpo = cuerpo.split('<body>', 1)[1].split('</body>', 1)[0]
cuerpo = re.sub(r'\s*<script src="[^"]+"></script>', '', cuerpo)

partes = []
partes.append('<title>Evaluación heurística a ciegas</title>')
partes.append(
    '<link rel="stylesheet" '
    'href="https://fonts.googleapis.com/css2?'
    'family=Instrument+Sans:wght@400;500;600&'
    'family=JetBrains+Mono:wght@400;500&display=swap">'
)
partes.append('<style>\n%s\n</style>' % css)
partes.append(cuerpo)
partes.append('<script>\nwindow.SIN_DESCARGA = true;\nwindow.DATOS_B64 = "%s";\nwindow.IMG = %s;\n</script>'
              % (b64, json.dumps(imgs)))
partes.append('<script>\n%s\n</script>' % principios)
partes.append('<script>\n%s\n</script>' % capturas)
partes.append('<script>\n%s\n</script>' % app)

SALIDA.parent.mkdir(exist_ok=True)
SALIDA.write_text('\n'.join(partes), encoding='utf-8')

kb = SALIDA.stat().st_size / 1024
print('%s · %.0f KB · %d capturas embebidas' % (SALIDA.relative_to(RAIZ), kb, len(imgs)))
if b64 in SALIDA.read_text(encoding='utf-8'):
    legible = json.dumps(datos, ensure_ascii=False)
    marca = legible[40:120] if len(legible) > 120 else legible
    print('anti-sesgo: texto plano del tablero en la página →',
          'sí (revisar)' if marca and marca in SALIDA.read_text(encoding='utf-8') else 'no')
