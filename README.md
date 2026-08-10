# PinTori

App estática (HTML/CSS/JS, sin backend) que convierte fotos en una hoja
lista para imprimir con diseños circulares para pines. Sin cuentas, sin
subir nada a un servidor — todo corre en el navegador. Pensada para que
un niño pueda usarla solo, con un adulto que abre la pestaña y se va.

Ver `SPEC.md` para la especificación completa del producto y `DESIGN.md`
para el sistema de diseño.

---

## Encuadre automático (la pieza de AI/ML)

Cuando se agrega una foto a un slot, PinTori intenta encontrar el sujeto de
la imagen y usa esa información para elegir dónde centrar el recorte
inicial — en vez de centrar siempre en el punto medio geométrico, que casi
nunca es donde está lo importante si la foto viene de un teléfono sin
editar. Es una cadena de tres pasadas, cada una un respaldo silencioso de
la anterior:

1. **Rostro humano** — face-api.js (TinyFaceDetector). La más precisa,
   cuando aplica.
2. **Sujeto genérico** — smartcrop.js, solo si la pasada 1 no encontró
   ningún rostro (dibujos, anime, mascotas, objetos, paisajes).
3. **Centro geométrico** — si ninguna de las dos anteriores encontró nada,
   o algo falló cargando cualquiera de las dos. Es el mismo comportamiento
   que tenía la app antes de que existiera esta pieza — nunca es peor que
   eso, en el peor caso.

### Qué hace, en la práctica

1. Se agrega una foto (input `<input type="file">`, sin cámara ni upload).
2. Antes de mostrarla en el slot, la imagen se reduce a un canvas auxiliar
   pequeño (320px para face-api.js, 256px para smartcrop.js) y la
   detección corre sobre esa copia — no sobre el archivo original, que
   puede pesar varios MB.
3. Se intenta primero encontrar rostros. Si se detecta uno o más, se
   calcula el rectángulo que los envuelve a todos y se usa su punto medio.
4. Si no se detectó ningún rostro, se le pasa la misma imagen reducida a
   smartcrop.js, que busca el recorte cuadrado con más bordes/contraste/
   saturación (su forma de estimar "lo interesante" de la imagen sin un
   modelo entrenado) y se usa el centro de ese recorte.
5. El punto que haya ganado (de cualquiera de las dos pasadas) se traduce
   a un desplazamiento (`offsetXFrac`/`offsetYFrac`) que lo deja
   exactamente en el centro del círculo — que es donde siempre cae la zona
   segura, sin importar el tamaño de pin elegido. No hace falta zoom
   adicional: centrar ya garantiza que el punto quede dentro de la zona
   segura.
6. Si ninguna de las dos pasadas encuentra nada, o cualquiera de los dos
   modelos no llegó a cargar, no pasa nada especial: el offset se queda en
   `0,0` (centro geométrico).
7. El usuario puede arrastrar y hacer zoom manualmente después, en
   cualquier caso — la detección solo pone el punto de partida, nunca
   bloquea el ajuste a mano.

No hay botón para activar nada, no hay insignia "✨ AI" en la interfaz, y no
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

### Respaldo: smartcrop.js, no un segundo modelo entrenado

Cuando face-api.js no encuentra ningún rostro (dibujos, anime, mascotas,
objetos, paisajes), en vez de rendirse directo al centro geométrico hay una
segunda pasada con **smartcrop.js** — pero es visión clásica (bordes +
tono de piel + saturación), no una red entrenada. Se comparó contra dos
opciones de deep learning antes de elegir, mismo criterio de "medir, no
asumir" que la comparación de arriba:

| | smartcrop.js | coco-ssd (TFJS) | U2Netp + onnxruntime-web |
|---|---|---|---|
| Qué es | Heurística clásica, sin red neuronal | Detección de objetos, 80 clases COCO | Red entrenada para saliency detection genérico |
| Modelo | Ninguno — es solo código | `lite_mobilenet_v2`: <1MB | ~4.7MB |
| Runtime | Ninguno, JS puro | `@tensorflow/tfjs` — un **segundo** motor TensorFlow.js, no comparte el que face-api.js ya trae embebido | onnxruntime-web WASM: ~3–8MB incluso en su build "mínimo" |
| **Total diferido** | **~17 KB** | **~1.5–2.3 MB** (estimado) | **~8–13 MB** |
| Cubre dibujos/anime | Sí, en general | No — solo sus 80 clases entrenadas | Sí, genérico |

U2Netp+onnxruntime cae en el mismo orden de magnitud que MediaPipe (~11.4MB),
ya descartado arriba por la misma razón. coco-ssd queda fuera de plano para
el caso que motiva esto — un dibujo o un personaje de anime no es ninguna
de sus 80 clases entrenadas. smartcrop.js es ~50x más liviano que el
propio face-api.js y no agrega ningún runtime nuevo.

La salvedad honesta: smartcrop.js no es tan preciso como un modelo de
saliencia entrenado — puede fallar con fondos de alto contraste que no son
el sujeto. Pero la comparación real no es contra face-api.js, es contra el
centro geométrico puro (lo único que había antes de esto), y contra eso
mejora en la mayoría de los casos con un costo casi nulo — y nunca puede
dejar un resultado peor que ese, porque si falla, cae ahí igual.

### Todo local, nada de red

- `vendor/face-api/face-api.min.js`, `vendor/face-api/models/` y
  `vendor/smartcrop/smartcrop.js` están vendorizados dentro del repo — no
  se cargan desde un CDN en producción. Cero llamadas a ningún API, cero
  dependencia de que un tercero siga sirviendo el archivo el día de mañana.
- Ningún modelo ve la foto original a resolución completa: solo la copia
  reducida (320px para face-api.js, 256px para smartcrop.js) que se genera
  localmente para cada detección. La imagen jamás sale del dispositivo del
  usuario, en ningún paso.

### Carga diferida

El script y el modelo de cada pasada no se tocan hasta después de que la
página ya pintó su primer frame — `js/main.js` dispara el precalentamiento
de las dos (face-api.js y smartcrop.js) con `requestIdleCallback` (con
respaldo `setTimeout` para Safari, que no implementa esa API). Así el peso
de ninguna de las dos compite con la apertura inicial de la app. Si el
usuario agrega una foto antes de que el precalentamiento termine, la
detección simplemente espera a que termine de cargar — no hay una segunda
ruta de código para ese caso.

### Dónde está el código

- `js/face/faceDetect.js` — carga diferida del script + modelo de
  face-api.js, reducción de la imagen, detección, y el punto medio de los
  rostros encontrados (o `null` si no hay ninguno o algo falló). También
  exporta `downscaleForDetection`, que reutiliza `saliencyDetect.js`.
- `js/face/saliencyDetect.js` — el respaldo de smartcrop.js: carga
  diferida, y el centro del recorte "más interesante" (o `null` si algo
  falló). Mismo contrato de retorno que `faceDetect.js`, para que
  `slotPanel.js` no necesite tratarlas distinto.
- `js/render.js` (`computeFaceCenteredOffset`) — traduce el punto medio
  ganador (de cualquiera de las dos pasadas) a un offset de recorte,
  reutilizando la misma matemática de posicionamiento de foto que usa el
  editor y la exportación de la hoja — para que este cálculo nunca pueda
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
                       conecta botones, precalienta las dos pasadas de encuadre
  editor/             grid de slots, panel por slot, drag/zoom de foto
  face/               encuadre automático: rostro + respaldo de sujeto genérico (ver arriba)
  export/              composición de la hoja a 300 DPI + export a PDF/PNG/compartir
vendor/
  face-api/           face-api.js + modelo TinyFaceDetector, vendorizados
  smartcrop/          smartcrop.js (respaldo de encuadre sin rostro), vendorizado
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
