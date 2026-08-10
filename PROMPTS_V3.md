# PinTori — Prompts, Ronda 3

Reemplaza el Prompt 12 en adelante de PROMPTS_V2.md. Estos vienen de
pruebas reales: impresión física con regla y uso en celular.

Orden de prioridad: 12 y 13 son bloqueantes — no sigas a los demás hasta
resolverlos y volver a probar físicamente.

---

## Prompt 12 — Bug crítico: el círculo impreso no coincide con el molde real

```
Encontré un problema serio probando físicamente: el círculo que imprime
la app es más grande que el molde real de la máquina de pines, así que
al prensar se corta parte del diseño. Esto no se detectó en las pruebas
anteriores porque solo verificamos la geometría interna (que los círculos
no se traslapan, que el margen se respeta) pero nunca confirmamos que el
tamaño absoluto impreso, medido con regla física, coincide con el molde
real.

Antes de tocar código, ayúdame a diagnosticar dónde está el error. Las
causas posibles, de más a menos probable:

1. El navegador o el sistema operativo está reescalando el PDF/imagen
   al imprimir, aunque diga "100%" — revisa si hay algún metadato de
   tamaño de página faltante o mal declarado en el PDF exportado
   (jsPDF necesita que el tamaño de página declarado coincida
   exactamente con las unidades usadas al dibujar).
2. La conversión mm→px→mm en algún punto del pipeline tiene un
   redondeo o una unidad mal aplicada (por ejemplo mezclar mm con
   pulgadas en algún cálculo).
3. El diámetro de corte calculado (finished + 14mm) para el pin de
   70mm da 85mm, pero el molde físico real de la máquina de Frank no
   es de 85mm — puede que la fórmula genérica no aplique a esta
   máquina específica.

Para (3): voy a medir el molde físico y te doy el número exacto. No
asumas el valor, espera mi medición antes de tocar SIZES.

Para (1) y (2): revisa el pipeline completo mm→px de geometry.js y el
export de jsPDF, y dime qué encontraste antes de corregir nada.
```

Cuando Claude Code te pida la medición: mide con calibrador o regla el
diámetro exacto del molde de tu máquina (no el pin terminado — el molde
metálico donde se coloca el papel) y dáselo en mm exactos.

```
El molde real mide [X]mm de diámetro. Corrige SIZES en constants.js con
este valor exacto para "Frank's machine" (o como se llame después del
Prompt 15). No uses la fórmula genérica finished+14mm para este tamaño —
usa el número medido directamente. Vuelve a correr el selftest de
geometry.js con este valor y confirma que el nuevo diámetro en píxeles
es correcto a 300 DPI.

Después de corregir, regenera una hoja de prueba y dime exactamente qué
medida en mm debería dar el círculo impreso, para que yo lo verifique
con regla antes de seguir.
```

---

## Prompt 13 — Bug crítico: layout roto en celular/tablet

```
La app no se ve completa ni centrada en celular — el dispositivo
principal de la usuaria. Esto es prioritario sobre cualquier feature
nueva.

Revisa el CSS de layout raíz (viewport meta tag, unidades de ancho,
cualquier valor fijo en px que no se adapte a pantallas chicas) y el
contenedor principal de la cuadrícula de slots. Prueba específicamente
en:
- Un viewport de celular angosto (375px de ancho)
- Un viewport de tablet (768-1024px)

Confírmame que el título, el selector de tipo/tamaño, y la cuadrícula
completa de slots quedan visibles y centrados sin scroll horizontal en
ambos casos. Muéstrame capturas o describe el layout resultante en cada
tamaño antes de seguir.
```

---

## Prompt 14 — Bug: aviso de baja resolución sale siempre, incluso cuando no aplica

```
El aviso de "esta foto puede verse borrosa" aparece en todas las fotos
que subo, incluso en fotos de alta resolución donde no debería salir.
Esto rompe la confianza en el aviso — si sale siempre, el usuario deja
de leerlo, y entonces sí falla cuando de verdad importa.

Revisa resolutionCheck.js: probablemente está comparando contra el
diámetro incorrecto (por ejemplo el diámetro en mm en vez de píxeles
a 300 DPI, o comparando contra el tamaño del contenedor en pantalla en
vez del tamaño real de exportación). Muéstrame el cálculo actual y el
cálculo correcto antes de corregir, y agrega una prueba en selftest.js
que confirme que una foto de resolución conocida-alta NO dispara el
aviso y una de resolución conocida-baja SÍ lo dispara.
```

---

## Prompt 15 — Quitar "Frank's machine" como nombre público, dejarlo como default

```
"Frank's machine" es un nombre de desarrollo, no algo que debería ver
un usuario del producto. Cambios:

1. Renombra ese tamaño a algo genérico y claro — por ejemplo
   "Estándar · 70mm" (o el nombre que seleccionemos según lo que
   decidamos en el Prompt 12 sobre el diámetro real de corte).
2. Ese tamaño debe quedar preseleccionado por default al cargar la
   app, siempre — no depende de que el usuario lo elija.
3. Revisa que el código no tenga el string "Frank" en ningún lugar
   visible para el usuario (nombres de archivo exportado, alt text,
   etc.) — solo en comentarios internos si hace falta contexto.
```

---

## Prompt 16 — Repetir un diseño en varios slots, no solo en todos

```
Hoy "Llenar todos con este diseño" llena TODOS los slots. Falta una
opción intermedia: repetir un diseño en varios slots específicos, útil
sobre todo para stickers/etiquetas donde alguien quiere, por ejemplo,
8 copias del mismo diseño sin subir la foto 8 veces ni llenar toda la
hoja con eso.

Propón la interacción más simple posible — por ejemplo, un modo
"seleccionar slots destino" que se activa desde el panel del slot
("Repetir en...") y deja tocar los slots vacíos donde quieres que se
copie, con un botón "Listo" para confirmar. Evita cualquier cosa que
requiera menús anidados o texto largo — el criterio de siempre.

Muéstrame la interacción propuesta antes de construirla.
```

---

## Prompt 17 — Compartir la plantilla por correo

```
Agrega una forma fácil de enviar la plantilla generada por correo,
además de la descarga actual.

Usa la Web Share API (navigator.share) como método principal — en
celular esto abre el panel nativo de compartir del sistema, que ya
incluye Mail/Gmail y cualquier otra app instalada, con el PDF como
adjunto. Es el método correcto porque funciona en iOS y Android sin
que tengamos que construir nada de envío de correo nosotros mismos.

Si el navegador no soporta Web Share con archivos (revisa
navigator.canShare con la propiedad files), cae de vuelta a la
descarga actual y muestra un mensaje corto indicando que se descargó
para que lo adjunten manualmente.

No implementes envío de correo desde un backend — no hay backend, y
no debe haberlo (revisa el SPEC).
```

---

## Prompt 18 — Detección automática más fuerte, más allá de rostros

```
Quiero que la detección automática de encuadre sea el corazón de ML de
este proyecto, así que vale la pena reforzarla más allá de rostros
humanos.

Contexto: face-api.js solo detecta rostros humanos reales. Cuando la
foto no tiene un rostro humano detectable — dibujos, anime, objetos,
mascotas, paisajes — hoy cae directo a centro geométrico, lo cual a
veces corta mal el sujeto principal de la imagen (lo vi en pruebas
reales con imágenes no fotográficas).

Investiga si conviene agregar una segunda pasada, ligera, de detección
de "sujeto principal" genérico (saliency detection) para el caso en que
face-api.js no encuentra ningún rostro — antes de rendirte al centro
geométrico. Debe seguir siendo silencioso, sin botón, y debe respetar
el mismo principio de carga diferida y bundle pequeño que ya aplicamos
con face-api.js: investiga el peso real de las opciones antes de elegir
una, muéstrame la comparación, y espera mi confirmación antes de
integrarla — mismo proceso que seguiste para elegir face-api.js sobre
MediaPipe.

Si no encuentras una opción ligera que valga la pena, está bien
quedarnos con "rostro humano si existe, si no centro geométrico" —
dime tu recomendación honesta, no fuerces una librería nueva solo
porque lo pedí.
```

---

## Nota

Después del Prompt 12 (calibración), vuelve a imprimir y medir con regla
antes de tocar nada más — es la segunda vez que este paso importa y la
primera vez el problema pasó sin detectarse hasta la impresión física.
No confíes solo en las pruebas de consola para esto.
