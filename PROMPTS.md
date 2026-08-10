# PinTori — Prompts para Claude Code

Úsalos en orden. Sube `SPEC.md` a la carpeta del proyecto antes de empezar.

---

## Prompt 0 — Arranque

```
Lee SPEC.md en la raíz del proyecto. Es la fuente de verdad de este producto.

Vamos a construir PinTori: una app estática (HTML/CSS/JS, sin backend) que
convierte fotos en una hoja lista para imprimir con diseños circulares para
pines. Se despliega en Cloudflare Pages.

Antes de escribir código, dame tu plan: qué archivos vas a crear, cómo vas a
estructurar el estado de la app, y qué decisiones técnicas tomarías distinto
a lo que dice el spec y por qué. No escribas código todavía.
```

---

## Prompt 1 — Referencias visuales (Mobbin)

```
Usa el MCP de Mobbin para buscar referencias de interfaz.

Busca estos patrones:
- Apps de subir y editar foto con recorte (photo crop / image editor)
- Herramientas creativas simples para niños
- Flujos de "sube, edita, descarga" en una sola pantalla
- Editores con una cuadrícula de slots editables

Lo que busco: interfaces cálidas, limpias, con botones grandes y jerarquía
clara. Nada de dashboards, nada de barras de herramientas densas.

Muéstrame 4 o 5 referencias, dime qué le tomarías a cada una, y propón una
dirección visual para PinTori: paleta de color, tipografía, radios de esquina,
y cómo se sentiría la pantalla principal. Todavía sin código.
```

---

## Prompt 2 — Dirección de diseño

```
Con base en esas referencias, define el sistema de diseño de PinTori:

- Paleta: color primario, secundario, fondo, texto, estados de advertencia
- Tipografía: familia, escala de tamaños, pesos
- Espaciado y radios
- Estilo de botones (el principal debe ser grande, obvio, imposible de perder)
- Cómo se ve un slot vacío vs uno lleno vs uno con advertencia

Escríbelo como tokens CSS en un archivo styles/tokens.css.
Guarda también la dirección en DESIGN.md para que no se pierda.
```

---

## Prompt 3 — Esqueleto y motor de render

```
Construye la base:

1. index.html, styles/, js/ con módulos separados
2. Un módulo geometry.js que calcule, a partir de tamaño de pin y de hoja:
   diámetro de corte en px a 300 DPI, diámetro de zona segura, y la cuadrícula
   (columnas, filas, márgenes, separación). Nada hardcodeado a 2x3.
3. Un módulo render.js que dibuje un pin individual en canvas: máscara circular,
   línea punteada de corte, cruz de centro tenue.

Los tamaños de pin y hoja vienen de las tablas del SPEC.
Escribe pruebas rápidas en consola que confirmen que 85 mm a 300 DPI da ~1004 px
y que en Carta caben 2x3.
```

---

## Prompt 4 — El editor de slots

```
Construye el editor, que es la pieza central:

- Cuadrícula de slots, uno por pin que quepa en la hoja
- Cada slot acepta: foto, texto, emoji, o color de fondo
- Dentro de cada slot: arrastrar para mover, rueda o pellizco para zoom
- Mientras se ajusta, el anillo que se dobla (entre zona segura y corte) se
  muestra atenuado con una capa oscura translúcida. Esto es obligatorio y es
  la decisión de UI más importante de la app.
- Botón "Llenar todos con este diseño"
- Slots vacíos son válidos: nunca bloquean el botón de generar

Debe funcionar con mouse y con touch.
```

---

## Prompt 5 — Detección de rostro (la parte de ML)

```
Agrega detección de rostro en el navegador, sin llamadas a ningún API.

- Usa MediaPipe Face Detector; si da problemas, face-api.js
- Al agregar una foto, detecta rostros y coloca el encuadre inicial de modo
  que los rostros queden dentro de la zona segura, no solo centrados en el
  centro geométrico
- Silencioso: sin botón, sin insignia de "AI" en la vista del usuario
- Carga el modelo de forma diferida, después del primer render
- Si no detecta nada, cae al centro geométrico sin avisar
- El usuario puede seguir ajustando a mano después

Documenta en README.md cómo funciona esta parte, porque es la pieza que va
a mi portafolio de AI/ML.
```

---

## Prompt 6 — Generación de hoja y exportación

```
Construye la generación de la hoja final:

- Canvas fuera de pantalla a resolución completa 300 DPI
- Pega cada slot con su máscara circular, línea de corte punteada y cruz central
- En el margen: una regla de calibración impresa con marcas en centímetros y
  pulgadas, etiquetadas, para verificar la escala contra una regla real
- En el margen: una línea de texto con tamaño de pin, tamaño de hoja, y
  "Imprime al 100% — no escalar"
- Exporta a PDF con jsPDF a 300 DPI, y a PNG como respaldo
- Nombre de archivo: pintori-{tamaño}-{fecha}.pdf

Verifica que el PDF resultante mida exactamente lo que debe medir.
```

---

## Prompt 7 — Avisos y pulido

```
Cierra los detalles que evitan frustración:

- Aviso de resolución baja por slot, antes de generar. Avisa, no bloquea.
- Pantalla de descarga con las instrucciones de impresión del SPEC, cortas
- Guardar el trabajo en almacenamiento del navegador para sobrevivir un refresh
- Español por defecto, con toggle a inglés
- Revisa accesibilidad: contraste, tamaño de objetivos táctiles, navegación
  por teclado
```

---

## Prompt 8 — Despliegue

```
Prepara el despliegue en Cloudflare Pages:

- Verifica que el build sea estático y no requiera servidor
- Configura el archivo de build si hace falta
- Escribe en README.md: cómo correr local, cómo desplegar, y la estructura
  del proyecto
- Prepara .gitignore
- Dame los comandos de git para el primer commit y push
```

---

## Prompt de rescate

Si algo se enreda:

```
Detente. Vuelve a leer SPEC.md. Dime qué está fallando, qué asumiste que no
estaba en el spec, y cuál es la ruta más corta para volver a un estado que
funcione. No agregues funciones nuevas hasta que esto esté resuelto.
```
