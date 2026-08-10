# PinTori — Sistema de diseño

Fuente de verdad visual del proyecto. Los valores concretos viven en
`styles/tokens.css`; este documento explica el porqué.

---

## 1. Paleta

Pastel: azul, verde y amarillo como base. Nada de coral/naranja ni
turquesa saturado — se descartaron en una revisión de la paleta original
porque leían como "vivos", no como suaves.

| Rol | Color | Hex | Uso |
|---|---|---|---|
| **Primario** | Azul Cielo | `#8FBCE6` | El botón de acción principal ("Generar PDF"). Un solo botón primario visible por pantalla. |
| Secundario | Verde Menta | `#B6DDA0` | Acciones secundarias, estado "slot lleno", confirmaciones suaves. |
| Acento | Amarillo Suave | `#FFE9A8` | Solo en áreas pequeñas: selección activa, badges, resaltados. Es el más luminoso de los tres — usarlo como relleno grande lo hace ver como advertencia por error. |
| Advertencia | Mostaza suave | `#D8B979` (borde/ícono) + `#FBF2DC` (fondo de chip) | Aviso de foto de baja resolución. Ver razón abajo. |

**Por qué azul es el primario:** es el primero que se pidió en la lista,
y de los tres es el que mejor sostiene la sensación de "botón de
confianza" sin subir la saturación — verde y amarillo se sienten más
correctos como estados (éxito, selección) que como la única acción que
debe dominar la pantalla.

**Por qué la advertencia no es amarilla ni naranja:** el amarillo ya está
tomado por el acento, así que reusarlo para advertencia haría que un
slot "seleccionado" y un slot "con problema" se vieran parecidos. Y
naranja/coral fue explícitamente descartado de la paleta base — meterlo
solo para advertencia hubiera sido inconsistente con esa decisión. La
solución es un mostaza/dorado: es una familia de color universalmente
asociada a "precaución" (amarillo ámbar de semáforo, cinta de
advertencia) pero deliberadamente más oscuro y menos saturado que el
amarillo de acento, para que se distingan a simple vista sin depender
solo del matiz. Nunca rojo — el SPEC pide "avisa, no bloquea", y rojo se
lee como error grave.

### Regla de contraste (no negociable)

Ninguno de los tres colores base lleva **texto blanco** encima. Son
pastel — demasiado claros para pasar el mínimo de contraste con blanco
(el azul primario da ~2.3:1 con blanco, muy por debajo del 4.5:1 que
pide WCAG AA). En vez de eso, cada color tiene su propia variante oscura
para texto/ícono, ya definida en `tokens.css`:

| Fondo | Texto/ícono | Contraste aprox. |
|---|---|---|
| `--color-primary` `#8FBCE6` | `--color-primary-text` `#23405C` | ~5.6:1 |
| `--color-secondary` `#B6DDA0` | `--color-secondary-text` `#2E4A22` | ~8.7:1 |
| `--color-accent` `#FFE9A8` | `--color-accent-text` `#5C4A12` | ~12.5:1 |
| `--color-warning-bg` `#FBF2DC` | `--color-warning-text` `#8A6522` | ~4.75:1 |

Todos pasan AA para texto normal (≥4.5:1). El chip de advertencia es el
más ajustado — si se retoca el tono más adelante, revalidar ese par
primero.

`--color-warning` (`#D8B979`) por sí solo solo alcanza ~1.9:1 contra
blanco — no se usa como color de texto, solo como borde/acento junto al
ícono, que sí usa `--color-warning-text`.

### Fuera de la paleta a propósito

El anillo de doblez (`--color-fold-overlay`, negro semitransparente) no
es pastel ni forma parte de la paleta de marca. Es la decisión de UI más
importante de la app según el SPEC — tiene que leerse como "esto se
pierde al doblar", no como un color amigable más. Ponerlo en pastel
diluiría la señal.

---

## 2. Tipografía

Una sola familia para todo: **Nunito** (o Quicksand si no carga),
redondeada, legible, sin necesidad de una segunda tipografía que infle
el bundle.

| Token | Tamaño | Uso |
|---|---|---|
| `--font-size-sm` | 14px | texto de apoyo, instrucciones cortas |
| `--font-size-base` | 16px | cuerpo |
| `--font-size-lg` | 20px | texto de botones |
| `--font-size-xl` | 28px | títulos de sección |
| `--font-size-xxl` | 40px | título principal |

---

## 3. Espaciado y radios

- Grid de 8px (`--space-1` a `--space-5`).
- Radio grande y consistente: `16px` en tarjetas/slots, píldora
  (`999px`) en botones. Sin esquinas cuadradas — la metáfora del
  producto es círculos, las esquinas duras contradicen eso.

---

## 4. Botones

- Un solo botón primario visible por pantalla a la vez, relleno
  `--color-primary`, texto `--color-primary-text`, forma píldora,
  mínimo `--touch-target-min` (56px) de alto.
- Botones secundarios: contorno, sin relleno, texto `--color-text` —
  para que nunca se confundan con la acción principal.

---

## 5. Estados de un slot

| Estado | Apariencia |
|---|---|
| Vacío | Círculo con borde punteado `--color-border`, ícono "+" centrado, fondo `--color-surface`. |
| Lleno | Foto/color rellena el círculo, línea de corte punteada tenue siempre visible. |
| En ajuste | Anillo de doblez oscurecido (`--color-fold-overlay`) entre zona segura y corte. |
| Con advertencia | Borde fino `--color-warning` + ícono en `--color-warning-text`, sin modal ni texto largo. |

---

## 6. Pantalla principal

Fondo `--color-bg`, grid de círculos con espacio generoso
(`--space-3`+ entre ellos). Sin sidebar ni barra de herramientas
permanente — las opciones de un slot aparecen solo al tocarlo. Selector
de tamaño de pin como chips redondos, no dropdown. Botón "Generar PDF"
siempre visible, nunca deshabilitado.
