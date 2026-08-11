# Handoff: PinTori móvil — rework nativo + fondo pastel

## Overview

PinTori es una app estática (HTML/CSS/JS sin build ni backend) que convierte fotos
en una hoja imprimible de pines circulares. Este handoff cubre dos cosas:

1. Un **rework de la estructura de navegación en móvil** (la hoja deja de ser la
   pantalla de entrada; el panel de slot deja de ser un bottom-sheet que tapa el
   círculo que se está editando).
2. Un **fondo pastel** en toda la app, reemplazando el `--color-bg` casi blanco
   (`#FBFCFE`) actual.

El repo de referencia es el propio `PinTori/` (index.html + `styles/` + `js/`).
Todo el estilo sale de `styles/tokens.css` y todos los textos de `js/i18n.js`.

## About the Design Files

`PinTori Mobile.dc.html` es una **referencia de diseño hecha en HTML** — un
prototipo que muestra la apariencia y el comportamiento buscados, no código para
copiar y pegar. La tarea es **recrear estas pantallas dentro del entorno que ya
tiene PinTori**: módulos ES vanilla, sin build step, sin framework, con el CSS
dividido en `styles/tokens.css` / `base.css` / `editor.css` / `modal.css`.

Concretamente: **no** introducir React, ni un bundler, ni dependencias nuevas. El
prototipo usa React solo porque es el entorno de la herramienta de diseño.
`ios-frame.jsx` y `android-frame.jsx` son solo marcos de teléfono para presentar
las pantallas — no forman parte del producto.

## Fidelity

**Alta fidelidad.** Colores, tipografía, tamaños y textos son finales y salen de
los archivos reales del repo. Los valores de este README mandan sobre cualquier
lectura aproximada de una captura.

## Cómo abrir el prototipo

Abrí `PinTori Mobile.dc.html` en un navegador. Tiene dos bloques:

- **Turn 2 (arriba)** — el rework propuesto. `2a` es el prototipo iOS navegable
  (tocá los círculos), `2b` la misma estructura en Android.
- **Turn 1 (abajo)** — la app web de hoy recreada a 390px, como referencia del
  punto de partida (editor, panel de slot, pantalla de descarga).

---

## Cambio 1 — Fondo pastel

Hoy el fondo es `--color-bg: #FBFCFE` (blanco roto) y las superficies son
`--color-surface: #FFFFFF`. El cambio pedido: que el fondo no quede en blanco.

### Token nuevo

En `styles/tokens.css`, agregar junto a los de superficie:

```css
--color-bg-gradient: linear-gradient(
  168deg,
  #E9F2FB 0%,    /* tinte del azul primario  #8FBCE6 */
  #F4F1FA 38%,   /* transición neutra fría */
  #FBF3E4 72%,   /* tinte del amarillo acento #FFE9A8 */
  #F1F8EA 100%   /* tinte del verde secundario #B6DDA0 */
);
--color-surface-warm: #FFFDF7;  /* barras y sheets sobre el degradé */
--color-surface-veil: rgba(255, 255, 255, 0.62); /* slot vacío */
--color-border-soft: #CBD8E6;   /* punteado del slot vacío sobre pastel */
```

Los cuatro tintes son los mismos tres pasteles de la paleta (azul / amarillo /
verde) llevados a ~12% de saturación — no son colores nuevos, son los de la
marca en clave clara. No se toca ninguno de los colores existentes.

### Dónde se aplica

| Elemento | Antes | Después |
|---|---|---|
| `body` / contenedor de pantalla | `--color-bg` | `--color-bg-gradient`, `background-attachment: fixed` |
| Barra inferior de acciones | `#FFFFFF` | `rgba(255,253,247,.92)` + `backdrop-filter: blur(12px)` |
| Panel/sheet de slot | `#FFFFFF` | `--color-surface-warm` (`#FFFDF7`) |
| Slot vacío | `#FFFFFF` + punteado `#E3E8EF` | `--color-surface-veil` + punteado `--color-border-soft` |
| Botón redondo secundario (volver) | `#FFFFFF` | `rgba(255,255,255,.75)` |
| Bordes sobre el degradé | `#E3E8EF` | `rgba(227,232,239,.8)` |
| Tarjetas de "Mis hojas" | `#FFFFFF` | tinte rotativo: `#DDEBF9` / `#FBEFD2` / `#E4F1DA`, borde `#C6DDF3` / `#F1DFB4` / `#CFE5C0` |

### Lo que NO cambia

- La foto, el color, el texto y el emoji dentro de un pin: el canvas del slot
  sigue dibujándose igual (`js/render.js`). El fondo pastel es de la app, nunca
  del pin — no debe terminar horneado en el PDF/PNG exportado.
- El anillo de doblez (`--color-fold-overlay`, `rgba(30,30,35,.45)`) sigue fuera
  de la paleta pastel a propósito: tiene que leerse como "esto se pierde".
- La regla de contraste de `DESIGN.md`: ningún pastel lleva texto blanco encima.
  El texto sigue siendo `--color-text` `#33363D` / `--color-text-muted` `#6B7078`.

---

## Cambio 2 — Estructura de navegación en móvil

Hoy, bajo 600px, todo pasa en una sola pantalla: la hoja es la pantalla de
entrada y el panel de slot es un bottom-sheet fijo (`editor.css`, media query
`max-width: 599.98px`) que ocupa hasta 85vh y tapa justamente el círculo que se
está editando — incluido el anillo de doblez, que es la decisión de UI más
importante del producto según el SPEC.

Estructura propuesta (4 pantallas + onboarding):

```
Onboarding (1ª vez)  →  Mis hojas  →  Editor de hoja  →  Editor de slot
                                          ↓
                                     Hoja lista (descarga)
```

### Pantalla: Onboarding (primera vez)

Tres pasos, uno por pantalla, saltables. Se muestra solo si no hay estado
guardado (`persistence.js`).

- Layout: `padding: 96px 32px 40px`, columna. Círculo de 220px centrado
  verticalmente con emoji de 96px, luego título, cuerpo, puntos, botón.
- Círculo: `border-radius:50%`, `box-shadow: 0 8px 28px rgba(0,0,0,.10)`,
  fondo por paso `#8FBCE6` → `#B6DDA0` → `#FFE9A8`.
- Título: 28px / 700 / `-.01em`. Cuerpo: 16px / 1.5 / `#6B7078`.
- Puntos: 10px, activo `#8FBCE6`, inactivo `#E3E8EF`, gap 8px.
- Botón: pill `#8FBCE6` sobre `#23405C`, 20px / 600, `min-height:56px`, ancho completo.
- Copy (es):
  1. **Elegí una foto** — "PinTori la encuadra sola: busca la cara o el sujeto y lo deja en el centro del círculo."
  2. **El anillo oscuro se dobla** — "Lo que queda dentro del anillo se pierde al armar el pin. Movés y hacés zoom hasta que lo importante quede adentro."
  3. **Imprimí y cortá** — "Se arma una hoja lista para imprimir. Nada sale de tu teléfono: no hay cuenta ni servidor."
- CTA: "Siguiente", "Siguiente", "Empezar".

### Pantalla: Mis hojas (entrada)

Expone lo que ya se guarda hoy en IndexedDB + localStorage, que hasta ahora era
invisible: solo se podía recuperar la última hoja al refrescar.

- `padding: 72px 20px 120px`, scroll vertical.
- `h1` "Mis hojas": 40px / 700 / `-.02em`, con dos destellos (`.sparkle`) reusando
  el SVG y la animación `sparkle-twinkle` de `base.css`.
- Bajada: "Todo se guarda solo en este teléfono." 16px `#6B7078`.
- Tarjeta por hoja: fila, `gap:16px`, `padding:16px`, `border-radius:16px`,
  fondo/borde pastel rotativo (ver tabla arriba). Contiene:
  - Preview: grid 2×2 de círculos de 26px, gap 6px, borde `1px solid #E3E8EF`.
  - Nombre 20px / 700; meta 14px `#6B7078` — formato `<Tamaño> · <n> pines · <fecha>`.
  - Chevron 8×14 `#6B7078`.
- Barra fija inferior: `padding:16px 20px 34px` sobre
  `linear-gradient(to top,#FBF3E4 62%,transparent)`, botón pill "Nueva hoja"
  (`#8FBCE6` / `#23405C`, 56px, ancho completo).

### Pantalla: Editor de hoja

- Header (`padding:60px 20px 10px`): botón redondo de volver 44px, título de hoja
  20px/700, meta 14px `#6B7078` (`<Tamaño> · <n> de 6 · Carta`).
- Chips de tamaño: fila horizontal **scrollable**, `gap:8px`, `padding:8px 20px 12px`,
  `overflow-x:auto; overflow-y:hidden` y barra de scroll oculta
  (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`). Chip:
  `min-height:44px`, `padding:8px 16px`, `border-radius:999px`, 14px/600.
  Activo `#8FBCE6` / borde `#8FBCE6` / texto `#23405C`; inactivo `#FFFFFF` /
  borde `#E3E8EF` / texto `#33363D`. Labels y datos de `constants.js`:
  Default (cut 70mm, safe 60), Small (32/20), Medium (41/26), Large (70/48), XL (89/62).
- Grid de slots: `display:flex; flex-wrap:wrap; gap:20px; justify-content:center`,
  `padding:4px 20px 150px`. Slot de **150px** en el frame de 402px (dos por fila).
  En producción el tamaño sigue saliendo de `cutMm × EDITOR_PX_PER_MM` (2) — 140px
  para Default; los 150px del mock son ese mismo cálculo con el px/mm subido para
  aprovechar el ancho del teléfono. Si se toca, tocar `EDITOR_PX_PER_MM`, nunca
  hardcodear el px.
  - Cada slot: círculo, `box-shadow: 0 1px 4px rgba(0,0,0,.12)`, y línea de corte
    punteada siempre visible: `inset:7px`, `1.5px dashed` a 22–25% de opacidad del
    color de texto correspondiente (blanco sobre foto).
  - Vacío: `rgba(255,255,255,.62)`, punteado `1.5px dashed #CBD8E6`, "+" 34px `#6B7078`.
  - Con advertencia de baja resolución: badge 28px arriba a la derecha, fondo
    `#FBF2DC`, borde `1.5px solid #D8B979`, "!" 14px/700 `#8A6522`.
- Barra fija inferior: `padding:14px 20px 34px`, fondo `rgba(255,253,247,.92)` +
  `backdrop-filter: blur(12px)`, borde superior `rgba(227,232,239,.8)`.
  Botón "Generar PDF" (pill primario, `flex:1`, 56px) + botón redondo de 56px con
  ícono de descarga (Lucide `download`, stroke 2.75) para PNG/compartir.

### Pantalla: Editor de slot (reemplaza al bottom-sheet)

El cambio clave: el círculo se ve **entero y grande** mientras se ajusta.

- Header: "Cancelar" (texto `#6B7078`, 16px) a la izquierda, "Listo" (pill
  `#8FBCE6`/`#23405C`, 16px/700) a la derecha, ambos `min-height:44px`.
- Preview: círculo de **250px** centrado. Tres capas superpuestas, en este orden:
  1. La foto/color/texto/emoji (el mismo canvas de `render.js`).
  2. El anillo de doblez: `background: rgba(30,30,35,.45)` con
     `mask-image: radial-gradient(circle, transparent 0 <safe%>, black <safe%> 100%)`,
     donde `<safe%> = round(safeZoneMm / cutMm × 100)` — 86% en Default.
     Visible solo cuando el slot tiene foto (`opacity` 0→1, `transition:100ms ease`).
     **Sigue siendo una capa CSS aparte, nunca dentro del canvas**, para que sea
     estructuralmente imposible que termine en el PDF exportado.
  3. La línea de corte punteada (`inset:11px`).
- Ayuda bajo el círculo, 14px `#6B7078`, máx. 280px:
  "Arrastrá la foto y usá el zoom. Lo que queda bajo el anillo oscuro se dobla hacia atrás."
- Sheet de controles: `background:#FFFDF7`, `border-radius:16px 16px 0 0`,
  `padding:16px 20px 34px`, `gap:16px`. Contiene:
  - Tabs pill (`min-height:40px`, 14px/600): Foto · Texto · Emoji · Fondo.
    Activa `#8FBCE6`/`#23405C`; inactiva fondo `#FBFCFE`, borde `#E3E8EF`, texto `#6B7078`.
    (La tab "Tipo" de `slotPanel.js` se mantiene, pero en móvil conviene moverla a
    una pantalla propia — decisión abierta, ver "Preguntas abiertas".)
  - **Foto**: botón pill "Foto" (el `<input type=file>` sigue oculto y enfocable,
    como hoy), slider de zoom (`accent-color:#8FBCE6`, alto 44px, rango 100–220,
    default 115 = `DEFAULT_PHOTO_SCALE` 1.15) y, si aplica, el chip de advertencia
    "Esta foto puede salir borrosa al imprimir" (`#FBF2DC` / borde `#D8B979` /
    texto `#8A6522`, radio 8px).
  - **Texto**: input (`border:1px solid #E3E8EF`, radio 8px, 16px, placeholder
    "Nombre...") + tres botones redondos de 44px S / M / L
    (`fontSizeFrac` 0.12 / 0.16 / 0.22, default M).
  - **Emoji**: 8 botones redondos de 44px — 😀 🎉 🐶 🌈 ⭐ ❤️ 🎈 🦄. Activo:
    `2px solid #23405C` sobre `#FBFCFE`.
  - **Fondo**: 4 swatches redondos de 44px — `#8FBCE6` `#B6DDA0` `#FFE9A8` `#F4C7D8`.
    Activo: `box-shadow: 0 0 0 3px #FFFFFF, 0 0 0 5px #23405C`.
  - Acciones al pie, apiladas, pill outline 44px: "Repetir en..." y "Quitar".
    ("Llenar todos con este diseño" se conserva pero baja de jerarquía.)

### Pantalla: Hoja lista (post-export)

Reemplaza al modal de `downloadScreen.js` por una pantalla completa en móvil.

- `padding:88px 24px 34px`. Círculo de 132px `#B6DDA0` con check Lucide 56px
  `#2E4A22`, stroke 2.75.
- Título "¡Tu hoja está lista!" 28px/700 centrado.
- Lista `<ul>` con los cuatro tips **textuales de `i18n.js`, sin reescribir**:
  - Imprime a escala 100% — desactiva "ajustar a la página"
  - Verifica la regla impresa contra una regla real antes de cortar
  - Usa papel couché o fotográfico de 120–160 gsm
  - Corta sobre la línea punteada, con cortador circular si tienes uno
- Botón primario "Compartir por correo" + link subrayado "Cerrar" (`#6B7078`, 56px).
- Si Web Share con archivos no está disponible, mantener el chip de fallback
  (`shareFallback` en `i18n.js`) arriba de la lista, con el estilo de advertencia.

---

## Interactions & Behavior

- **Navegación**: push/pop de pantalla completa. Mis hojas → Editor (adelante),
  Editor → Slot (adelante), "Listo"/"Cancelar" vuelven. Sin animaciones nuevas
  más allá de la transición de plataforma; el proyecto no tiene librería de animación.
- **Tocar un slot** abre el editor de slot con la tab correspondiente a su
  contenido (vacío → Foto; color → Fondo; resto → su tipo).
- **Anillo de doblez**: aparece con `opacity` 100ms al entrar al editor de slot con
  foto. Fuera de esa pantalla no se dibuja.
- **Arrastre y zoom** siguen operando sobre `offsetXFrac`/`offsetYFrac` y la escala,
  con `touch-action:none` en el contenedor del círculo, igual que hoy.
- **Encuadre automático** (face-api → smartcrop → centro geométrico) no cambia:
  sigue sin UI, sin badge y sin bloquear el flujo.
- **Chips de tamaño**: cambiar el tamaño recalcula la cuadrícula; el scroll
  horizontal no debe mostrar barra de scroll nativa.
- **Foco de teclado**: mantener los `:focus-visible` de 3px que ya usa el proyecto
  (`--color-primary-text` como color de outline).
- **`prefers-reduced-motion`**: los destellos del título quedan estáticos a 0.8 de
  opacidad, como en `base.css`.

## State Management

Sin librería. Extender el `state.js` actual:

- `screen`: `'onb' | 'sheets' | 'editor' | 'slot' | 'done'` (más `onbStep: 0..2`).
- `sheets[]`: nuevo — id, nombre, tamaño, fecha, slots. Hoy solo persiste una hoja;
  esto requiere pasar IndexedDB de "la hoja" a "las hojas" (ver `persistence.js`).
- `activeSheetId`, `activeSlotIndex`, `activeTab`, `zoom`.
- Por slot, lo que ya existe: `kind` (empty/photo/text/emoji/color), `value`,
  `offsetXFrac`, `offsetYFrac`, `scale`, `lowRes`.
- La persistencia sigue siendo IndexedDB (fotos) + localStorage (resto), y sigue
  sobreviviendo un refresh.

## Design Tokens

Existentes (`styles/tokens.css`) — no tocar:

```
--color-bg #FBFCFE   --color-surface #FFFFFF   --color-text #33363D
--color-text-muted #6B7078   --color-border #E3E8EF
--color-primary #8FBCE6   --color-primary-hover #7BAEDC   --color-primary-text #23405C
--color-secondary #B6DDA0   --color-secondary-hover #A3D189   --color-secondary-text #2E4A22
--color-accent #FFE9A8   --color-accent-text #5C4A12
--color-warning #D8B979   --color-warning-bg #FBF2DC   --color-warning-text #8A6522
--color-fold-overlay rgba(30,30,35,.45)
--font-family 'Nunito','Quicksand',system-ui,sans-serif
14 / 16 / 20 / 28 / 40 / 56px   400 / 600 / 700
--space-1..5 8/16/24/32/48   --radius-card 16px   --radius-pill 999px
--touch-target-min 56px
```

Nuevos (este handoff): `--color-bg-gradient`, `--color-surface-warm #FFFDF7`,
`--color-surface-veil rgba(255,255,255,.62)`, `--color-border-soft #CBD8E6`, y los
tres pares de tinte de tarjeta (`#DDEBF9`/`#C6DDF3`, `#FBEFD2`/`#F1DFB4`,
`#E4F1DA`/`#CFE5C0`).

## Assets

- Ninguno nuevo. Los destellos son el mismo SVG inline de `index.html`.
- Íconos: Lucide (`chevron-left`, `chevron-right`, `download`, `check`) a stroke 2.75,
  dibujados inline como SVG — no agregar una dependencia de íconos.
- Las fotos de los mocks son degradados de relleno (`linear-gradient(140deg,#8FBCE6,#B6DDA0 55%,#FFE9A8)`),
  no imágenes reales: son marcadores de posición.

## Files

- `PinTori Mobile.dc.html` — el prototipo (Turn 2 = propuesta, Turn 1 = estado actual).
- `ios-frame.jsx`, `android-frame.jsx` — marcos de teléfono para la presentación. No son producto.
- Archivos del repo que hay que tocar: `styles/tokens.css`, `styles/base.css`,
  `styles/editor.css`, `styles/modal.css`, `js/state.js`, `js/persistence.js`,
  `js/editor/slotGrid.js`, `js/editor/slotPanel.js`, `js/downloadScreen.js`, `index.html`.

## Preguntas abiertas (decidir antes de implementar)

1. "Mis hojas" implica múltiples hojas persistidas; hoy `persistence.js` guarda una.
   ¿Se migra el esquema o se muestra una sola hoja + historial de exportaciones?
2. La tab "Tipo" (pin / sticker / etiqueta, `typeSelector.js`) no entra cómoda en el
   sheet de 4 tabs. ¿Pantalla propia o queda como quinta tab con scroll?
3. Este rework es solo para <600px. Arriba de 600px la app sigue como está hoy,
   salvo el fondo pastel, que sí aplica en todos los anchos.
