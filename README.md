# PinTori

App estática (HTML/CSS/JS, sin backend) que convierte fotos en una hoja
lista para imprimir con diseños circulares para pines. Sin cuentas, sin
subir nada a un servidor — todo corre en el navegador. Pensada para que
un niño pueda usarla solo, con un adulto que abre la pestaña y se va.

Ver `SPEC.md` para la especificación completa del producto y `DESIGN.md`
para el sistema de diseño.

---

## Detección de rostro (la pieza de AI/ML)

Cuando se agrega una foto a un slot, PinTori intenta detectar caras y usa
esa información para elegir dónde centrar el recorte inicial — en vez de
centrar siempre en el punto medio geométrico de la imagen, que casi nunca
es donde está la cara si la foto viene de un teléfono sin editar.

### Qué hace, en la práctica

1. Se agrega una foto (input `<input type="file">`, sin cámara ni upload).
2. Antes de mostrarla en el slot, la imagen se reduce a un canvas auxiliar
   pequeño (máx. 320px de lado) y se corre detección de rostro sobre esa
   copia — no sobre el archivo original, que puede pesar varios MB.
3. Si se detecta uno o más rostros, se calcula el rectángulo que los
   envuelve a todos y se usa su punto medio.
4. Ese punto se traduce a un desplazamiento (`offsetXFrac`/`offsetYFrac`)
   que dejaría exactamente ese punto en el centro del círculo — que es
   donde siempre cae la zona segura, sin importar el tamaño de pin
   elegido. No hace falta zoom adicional: centrar ya garantiza que el
   punto quede dentro de la zona segura.
5. Si no se detecta ningún rostro, o el modelo no llegó a cargar, no pasa
   nada especial: el offset se queda en `0,0` (centro geométrico), que es
   el mismo comportamiento que tenía la app antes de esta pieza.
6. El usuario puede arrastrar y hacer zoom manualmente después, en
   cualquier caso — la detección solo pone el punto de partida, nunca
   bloquea el ajuste a mano.

No hay botón para activarla, no hay insignia "✨ AI" en la interfaz, y no
se le explica nada al usuario. Si funciona, la foto simplemente aparece
bien encuadrada. Si no detecta nada, aparece centrada como siempre. En
ningún caso se interrumpe el flujo ni se le pide al usuario que espere.

### Modelo: face-api.js (TinyFaceDetector), no MediaPipe

El plan original consideraba MediaPipe Face Detector como primera opción
y face-api.js como respaldo. Se invirtió esa decisión después de medir
(no de asumir) el peso real de cada uno:

| | MediaPipe Tasks Vision | face-api.js |
|---|---|---|
| Runtime | ~11.2 MB (WASM genérico para toda su familia de tareas de visión — no existe un build solo-rostro) | — |
| JS + modelo | ~155 KB + ~225 KB | ~660 KB (incluye su propio motor TensorFlow.js) + ~190 KB |
| **Total diferido** | **~11.4 MB** | **~0.85 MB** |

Para el trabajo que hace falta aquí — encontrar dónde está una cara para
centrar un recorte, no reconocer quién es ni con qué expresión — la
precisión extra de MediaPipe no se nota, pero los 13x de peso sí, sobre
todo en el teléfono de quien va a usar esto realmente. La detección
corre con **TinyFaceDetector**, el modelo más liviano que ofrece
face-api.js (una CNN compacta, ~190KB de pesos cuantizados a 8 bits).

### Todo local, nada de red

- `vendor/face-api/face-api.min.js` y `vendor/face-api/models/` están
  vendorizados dentro del repo — no se cargan desde un CDN en producción.
  Cero llamadas a ningún API, cero dependencia de que un tercero siga
  sirviendo el archivo el día de mañana.
- El modelo nunca ve la foto original a resolución completa: solo la
  copia reducida a 320px que se genera localmente para la detección. La
  imagen jamás sale del dispositivo del usuario, en ningún paso.

### Carga diferida

El script y el modelo no se tocan hasta después de que la página ya
pintó su primer frame — `js/main.js` dispara el precalentamiento con
`requestIdleCallback` (con respaldo `setTimeout` para Safari, que no
implementa esa API). Así el peso del modelo nunca compite con la
apertura inicial de la app. Si el usuario agrega una foto antes de que
el precalentamiento termine, la detección simplemente espera a que
termine de cargar — no hay una segunda ruta de código para ese caso.

### Dónde está el código

- `js/face/faceDetect.js` — carga diferida del script + modelo,
  reducción de la imagen, detección, y el punto medio de los rostros
  encontrados (o `null` si no hay ninguno o algo falló).
- `js/render.js` (`computeFaceCenteredOffset`) — traduce ese punto medio
  a un offset de recorte, reutilizando la misma matemática de
  posicionamiento de foto que usa el editor y (más adelante) la
  exportación de la hoja — para que este cálculo nunca pueda
  desincronizarse del resto del sistema de recorte.

---

## Estructura del proyecto

```
index.html
styles/
  tokens.css        paleta, tipografía, espaciado, radios (ver DESIGN.md)
  base.css          layout general, botones principales, header
  editor.css         grid de slots, panel por slot, badges
  modal.css          pantalla de descarga
js/
  constants.js       tablas de tamaños de pin y hoja (SPEC sección 3)
  geometry.js         mm -> px, cálculo de cuadrícula — nada hardcodeado a 2x3
  render.js           dibuja un pin: máscara, foto/texto/emoji/color, guías de corte.
                       Es la ÚNICA función de dibujo — la usa el editor y la
                       exportación por igual, así nunca se desincronizan.
  state.js            estado del editor por slot + suscripción para persistencia
  resolutionCheck.js  aviso de foto de baja resolución (avisa, no bloquea)
  persistence.js      guarda en IndexedDB (fotos) + localStorage (resto) para
                       sobrevivir un refresh
  i18n.js             diccionario es/en + toggle de idioma
  downloadScreen.js   modal con instrucciones de impresión tras exportar
  selftest.js         pruebas rápidas de geometry.js en consola, en cada carga
  main.js             arranca todo: carga estado guardado, construye el grid,
                       conecta botones, precalienta el modelo de rostro
  editor/             grid de slots, panel por slot, drag/zoom de foto
  face/               detección de rostro (ver arriba)
  export/              composición de la hoja a 300 DPI + export a PDF/PNG
vendor/
  face-api/           face-api.js + modelo TinyFaceDetector, vendorizados
  jspdf/               jsPDF (build UMD), vendorizado
```

Todo lo de `vendor/` está vendorizado a propósito — nada se carga desde un
CDN en producción. Ver el porqué de cada elección de librería en la sección
de detección de rostro (arriba) y en `pdfExport.js`.

## Correr local

No hay build ni dependencias que instalar. Sí hace falta serví­rlo por HTTP
— **no abrir `index.html` haciendo doble clic**: los módulos ES y los
`fetch()` del modelo de rostro no funcionan bajo el protocolo `file://` por
las restricciones de CORS del navegador, sin importar el proyecto. Cualquier
servidor estático sirve, por ejemplo:

```
python3 -m http.server 8934
```

y abrir `http://localhost:8934/`.

## Desplegar en Cloudflare Pages

El proyecto es 100% estático — HTML/CSS/JS servidos tal cual, sin build ni
variables de entorno. En el dashboard de Cloudflare Pages, al conectar el
repo de GitHub:

- **Framework preset**: `None`
- **Build command**: (vacío)
- **Build output directory**: `/`

No hace falta ningún archivo de configuración adicional (`wrangler.toml`,
`_headers`, `_redirects`) — no hay rutas del lado del servidor, ni Pages
Functions, ni assets que necesiten un tipo MIME especial para funcionar.
Cada push a la rama conectada (`main`) dispara un deploy nuevo automático.

Si prefieres desplegar desde la terminal en vez del dashboard, con
[Wrangler](https://developers.cloudflare.com/workers/wrangler/) instalado:

```
npx wrangler pages deploy . --project-name=pintori
```
