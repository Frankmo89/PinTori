// Detección de rostro en el navegador, sin llamadas a ningún API — todo
// corre localmente con face-api.js (TinyFaceDetector) vendorizado en
// vendor/face-api/. Ver README.md para la explicación completa de esta
// pieza (es la parte de portafolio de AI/ML).
//
// Se eligió face-api.js sobre MediaPipe Tasks Vision después de medir:
// el runtime WASM de MediaPipe pesa ~11.2MB (genérico para toda su
// familia de tareas de visión, no hay build solo-rostro) contra ~0.85MB
// de face-api.js + el modelo TinyFaceDetector. Para "centrar la cara en
// la zona segura" no hace falta la precisión extra de MediaPipe.

const FACE_API_SCRIPT_URL = 'vendor/face-api/face-api.min.js';
const MODEL_URL = 'vendor/face-api/models';
const DETECT_INPUT_SIZE = 320; // múltiplo de 32 soportado por TinyFaceDetector

let loadPromise = null;

function loadFaceApiScript() {
  if (window.faceapi) return Promise.resolve(window.faceapi);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = FACE_API_SCRIPT_URL;
    script.onload = () => resolve(window.faceapi);
    script.onerror = () => reject(new Error('No se pudo cargar face-api.js'));
    document.head.appendChild(script);
  });
}

function getDetector() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const faceapi = await loadFaceApiScript();
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      return faceapi;
    })();
  }
  return loadPromise;
}

// Se llama una sola vez, después del primer render de la página, para
// que el modelo esté listo (o casi) cuando el usuario realmente agregue
// una foto. Si falla, no pasa nada — se reintenta silenciosamente la
// próxima vez que se necesite, y si vuelve a fallar ahí, se cae al
// centro geométrico sin avisar (ver detectFaceCenterFrac).
export function warmUpFaceDetection() {
  getDetector().catch(() => {});
}

// Exportada porque saliencyDetect.js (Prompt 18) la reutiliza tal cual
// — "achicar antes de analizar" es el mismo paso para las dos pasadas
// de detección, sin nada específico de rostros en la función.
export function downscaleForDetection(image, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(image, 0, 0, w, h);
  return canvas;
}

/**
 * Detect all faces. Returns null if none / error.
 *
 * Multi-face policy (documented in centerScoring.js too): the returned
 * center is the GROUP bbox midpoint (union of all boxes) so siblings stay
 * in frame. `conf` is max detection score. Individual boxes are kept in
 * `faces` (image-fraction coords) for the debug overlay.
 */
export async function detectFacesFrac(image) {
  try {
    const faceapi = await getDetector();
    const small = downscaleForDetection(image, DETECT_INPUT_SIZE);
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: DETECT_INPUT_SIZE });
    const detections = await faceapi.detectAllFaces(small, options);
    if (!detections.length) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxScore = 0;
    const faces = [];

    for (const det of detections) {
      const box = det.box;
      const score = typeof det.score === 'number' ? det.score : 0;
      maxScore = Math.max(maxScore, score);
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
      faces.push({
        xFrac: box.x / small.width,
        yFrac: box.y / small.height,
        wFrac: box.width / small.width,
        hFrac: box.height / small.height,
        score,
      });
    }

    return {
      xFrac: (minX + maxX) / 2 / small.width,
      yFrac: (minY + maxY) / 2 / small.height,
      conf: maxScore,
      faces,
    };
  } catch (err) {
    return null;
  }
}

// Back-compat wrapper: same contract as before (center or null).
export async function detectFaceCenterFrac(image) {
  const result = await detectFacesFrac(image);
  if (!result) return null;
  return { xFrac: result.xFrac, yFrac: result.yFrac };
}
