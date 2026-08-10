// Segunda pasada de encuadre, solo cuando face-api.js no encontró
// ningún rostro humano (dibujos, anime, mascotas, objetos, paisajes) —
// ver README.md para la cadena completa: rostro humano (face-api.js) ->
// sujeto genérico (smartcrop.js, este archivo) -> centro geométrico.
//
// smartcrop.js (vendorizado en vendor/smartcrop/smartcrop.js, v2.0.5,
// MIT) NO es un modelo entrenado — es visión clásica (bordes Laplace +
// tono de piel + saturación, sin red neuronal ni modelo que descargar).
// Se eligió sobre dos alternativas de deep learning después de medir su
// peso (mismo criterio que la elección de face-api.js sobre MediaPipe):
//
//   smartcrop.js        ~17 KB de código, cero dependencias de runtime
//   coco-ssd (TFJS)      <1MB de modelo, pero necesita @tensorflow/tfjs
//                        como runtime — un SEGUNDO motor TensorFlow.js
//                        separado del que face-api.js ya trae embebido
//                        (no se comparte) — y solo reconoce sus 80
//                        clases COCO: un dibujo o un anime no son
//                        ninguna de ellas, justo el caso que motiva esto
//   U2Netp + onnxruntime  ~4.7MB de modelo + ~3-8MB de runtime WASM —
//                        mismo orden de magnitud que MediaPipe, ya
//                        descartado para face-api.js por la misma razón
//
// Es menos preciso que un modelo de saliencia entrenado — puede fallar
// con fondos de alto contraste que no son el sujeto — pero la
// comparación real es contra el centro geométrico puro (lo único que
// hay hoy sin esto), y contra eso mejora en la mayoría de los casos con
// un costo casi nulo. Nunca puede dejar un resultado peor que el centro
// geométrico: si falla, se cae ahí igual (ver detectSaliencyCenterFrac).

import { downscaleForDetection } from './faceDetect.js';

const SMARTCROP_SCRIPT_URL = 'vendor/smartcrop/smartcrop.js';
// Mismo tamaño que smartcrop.js usaría de todos modos como prescale
// interno por defecto (ver su propio código) si se le pasa un
// width/height de destino — achicar nosotros antes, sin depender de esa
// ruta condicional, es más explícito y calza con el mismo patrón de
// faceDetect.js (DETECT_INPUT_SIZE ahí también reduce antes de analizar).
const DETECT_INPUT_SIZE = 256;

// Fracción del lado menor de la imagen que se le pide a smartcrop.js
// como tamaño de "ventana de interés" a buscar. Importante: NO se le
// pasa width/height (la opción "documentada" para pedir un recorte) —
// esas opciones calculan el tamaño del recorte para que, en la relación
// de aspecto pedida, cubra el máximo posible de la imagen; si esa
// relación de aspecto coincide con la de la imagen (el caso normal para
// una foto ~cuadrada, como las que llegan ya recortadas a un slot
// circular), el recorte resultante termina siendo la imagen COMPLETA —
// cero margen para deslizar la ventana, así que smartcrop.js siempre
// "encuentra" el centro geométrico sin importar el contenido (se
// verificó este comportamiento a mano antes de fijar este valor).
// Pasando `cropWidth`/`cropHeight` directo sí se respeta tal cual — con
// una ventana más chica que la imagen en los dos ejes, la búsqueda
// tiene margen real para moverse hacia donde está el contraste.
const CROP_WINDOW_FRACTION = 0.5;

let loadPromise = null;

function loadSmartcropScript() {
  if (window.smartcrop) return Promise.resolve(window.smartcrop);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SMARTCROP_SCRIPT_URL;
    script.onload = () => resolve(window.smartcrop);
    script.onerror = () => reject(new Error('No se pudo cargar smartcrop.js'));
    document.head.appendChild(script);
  });
}

function getSmartcrop() {
  if (!loadPromise) loadPromise = loadSmartcropScript();
  return loadPromise;
}

// Mismo precalentamiento silencioso que warmUpFaceDetection() — 17KB no
// necesita esperar a que haga falta; así el fallback ya está listo la
// primera vez que face-api.js no encuentra un rostro, en vez de tener
// un frame de carga visible justo en ese momento.
export function warmUpSaliencyDetection() {
  getSmartcrop().catch(() => {});
}

// Devuelve el centro (fracción 0..1 del tamaño de la imagen) del
// recorte cuadrado que smartcrop.js considera más "interesante"
// (mayor combinación de bordes, contraste y saturación), o null si algo
// falló cargando la librería o analizando la imagen. Nunca lanza —
// mismo contrato que detectFaceCenterFrac(), para que quien llame a las
// dos no necesite tratarlas distinto.
export async function detectSaliencyCenterFrac(image) {
  try {
    const smartcrop = await getSmartcrop();
    const small = downscaleForDetection(image, DETECT_INPUT_SIZE);
    const windowSize = Math.round(Math.min(small.width, small.height) * CROP_WINDOW_FRACTION);
    const { topCrop } = await smartcrop.crop(small, { cropWidth: windowSize, cropHeight: windowSize });
    if (!topCrop) return null;

    return {
      xFrac: (topCrop.x + topCrop.width / 2) / small.width,
      yFrac: (topCrop.y + topCrop.height / 2) / small.height,
    };
  } catch (err) {
    return null;
  }
}
