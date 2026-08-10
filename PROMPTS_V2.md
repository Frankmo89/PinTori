# PinTori — Prompts, Ronda 2

Úsalos en orden, después de los prompts 0-8 ya ejecutados. Antes de empezar,
dile a Claude Code que lea SPEC.md y DESIGN.md actualizados para que tenga
el contexto completo.

---

## Prompt 9 — Arreglos de UI y limpieza del panel

```
Dos ajustes al panel de edición de un slot:

1. Bug: el texto "Ningún archivo seleccionado" del input de foto se sale
   de su contenedor. Arréglalo — trúncalo o ponlo en su propia línea.

2. El panel muestra fotos, texto, tamaño, colores y emojis todo junto y
   se ve denso, no minimalista. Conviértelo en pestañas o un selector
   simple: Foto / Texto / Emoji / Color / Fondo. Solo una sección visible
   a la vez. El usuario elige qué tipo de contenido quiere para ese slot
   y solo entonces ve las opciones correspondientes.

Mantén el botón "Quitar" y "Llenar todos con este diseño" siempre visibles,
fuera de las pestañas.
```

---

## Prompt 10 — Actualizar SPEC.md antes de construir formas

```
Antes de tocar código, actualiza SPEC.md con el nuevo sistema de formas.
Esto es una fuente de verdad, así que debe quedar escrito antes de
implementar.

Agrega una sección "Formas" que distinga dos categorías:

1. Círculo — el único que mapea a un producto físico real (el pin de la
   máquina de Frank). Mantiene toda la lógica ya construida: diámetro de
   corte, zona segura, anillo de doblez atenuado, cruz de centro.

2. Formas planas (cuadrado, rectángulo, triángulo, cuadrado con esquinas
   redondeadas) — para aprovechar la hoja con otros productos de papel
   (stickers, tarjetas, etiquetas). Estas NO tienen zona de doblez ni
   anillo atenuado — es corte directo en el borde de la forma, con línea
   punteada de corte y sin más.

Para cada forma, el usuario elige tamaño (mm) libremente dentro de un
rango razonable, no solo los 5 tamaños de pin ya definidos.

Actualiza también la sección de grid: con formas mixtas en una misma hoja,
ya no es una cuadrícula uniforme — es un problema de empaquetado (bin
packing). Documenta esto como un requisito nuevo, no lo resuelvas todavía.

Muéstrame el texto actualizado antes de seguir al Prompt 11.
```

---

## Prompt 11 — Construir el sistema de formas y empaquetado

```
Implementa lo que quedó documentado en SPEC.md:

1. Extiende geometry.js para aceptar forma + tamaño en vez de solo
   tamaño de pin. Círculo sigue devolviendo diámetro de corte + zona
   segura. Las formas planas devuelven solo sus dimensiones de corte.

2. Extiende slotRenderer.js para dibujar cada forma con su máscara y
   línea de corte correspondiente. Reutiliza el mismo módulo que ya
   dibuja círculos — no dupliques lógica de canvas.

3. Construye un algoritmo de empaquetado simple para la hoja: dado un
   conjunto de slots con formas y tamaños distintos, acomódalos en la
   hoja aprovechando el espacio, respetando el margen mínimo y el gap
   entre piezas. No necesita ser óptimo — que sea razonable y estable
   (mismo input siempre da mismo layout).

4. En el picker de "tamaño de pin" (los chips redondos), agrega un
   selector de forma junto al de tamaño. Si el usuario elige una forma
   plana, muestra el rango de tamaño disponible para esa forma.

Prueba con una hoja mixta: algunos círculos de 70mm, algunos cuadrados
de 40mm, y confirma que el empaquetado no los superpone y respeta márgenes.
```

---

## Prompt 12 — Detección de rostro más robusta

```
La detección de rostro (MediaPipe) ya centra el encuadre en slots
circulares. Extiende esto:

1. Que funcione igual de bien en las formas planas nuevas — el objetivo
   es que el rostro quede centrado y completo dentro del área visible
   de cualquier forma, no solo el círculo.

2. Si detecta más de un rostro en la foto, encuadra para que ambos
   queden dentro del área visible en vez de centrar solo en el primero
   que encuentre.

3. Si el rostro detectado queda muy cerca del borde después de centrar
   (por ejemplo la foto es muy alargada), reduce el zoom automáticamente
   en vez de dejarlo cortado.

Sigue siendo silencioso: sin botón, sin indicador de "IA" visible para
el niño. Si falla la detección, cae a centro geométrico sin aviso, como
ya está.
```

---

## Prompt 13 — Vida visual: fondo pastel, sin video

```
El fondo blanco actual se ve plano. Dale vida sin pesar la app:

1. Fondo con gradiente pastel sutil combinando el azul, verde y amarillo
   de la paleta — no un color sólido plano.

2. Agrega 3-4 formas decorativas flotando de fondo (círculos, estrellas,
   confeti) en tonos pastel muy suaves, con animación CSS lenta
   (flotar/rotar despacio) — nada de JavaScript pesado, nada de video.
   Deben quedar detrás de todo el contenido, sin distraer ni afectar
   el contraste de texto.

3. Dejo espacio preparado para una ilustración de fondo generada
   (yo la voy a producir por separado): un contenedor de fondo con
   background-image opcional, para que si agrego un PNG/SVG después
   se acomode automáticamente sin tocar CSS de nuevo.

Confirma que el peso total de estos cambios sea mínimo — nada de
librerías nuevas para esto, solo CSS.
```

---

## Prompt 14 — Mejoras adicionales (sugeridas)

```
Antes de cerrar esta ronda, evalúa e implementa las que tengan sentido:

1. Vista previa de la hoja completa antes de generar el PDF — que el
   usuario vea el layout final (con el empaquetado mixto) antes de
   confirmar, no solo después de descargar.

2. Deshacer la última acción dentro de un slot (una posición atrás,
   no un historial completo) — útil si el niño arrastra o hace zoom
   por accidente.

3. Botón "sorpresa": llena todos los slots vacíos con colores y
   posiciones aleatorias de la paleta, para un niño que solo quiere
   ver algo bonito sin subir fotos.

4. Revisa que el empaquetado mixto del Prompt 11 no rompa el caso
   simple (todos los slots del mismo tamaño y forma) — debe seguir
   dando exactamente la cuadrícula uniforme de antes cuando no hay
   mezcla.

Dime cuáles de estas implementaste y cuáles descartaste, y por qué.
```

---

## Nota

Después del Prompt 11 (empaquetado), vuelve a aplicar el punto de control
del CHECKLIST: imprime una hoja de prueba, ahora con formas mixtas, y
mide con regla. El riesgo de escala incorrecta es mayor con empaquetado
que con grid fijo.
