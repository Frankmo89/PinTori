# PinTori — Product Spec

Client-side web app that turns photos into a print-ready sheet of pinback
button designs. No accounts, no server, no uploads. Everything runs in the
browser.

---

## 1. Who it is for

Primary user: a child making pins at home with a manual button press.
Secondary user: any crafter, hobbyist, or small seller.

Design consequence: the main flow must work with no instructions, no menus,
and no reading. An adult should be able to hand the tab to a kid and walk away.

---

## 2. Core problem this solves

Every existing option is either a downloadable template (Photoshop, Canva, PDF)
or general design software. Both force the user to understand print scaling,
bleed, and safe zones. PinTori removes all of that.

The four failures we design against:

1. **Print scale** — user prints with "fit to page" and every pin comes out
   the wrong size. Silent failure; only discovered after cutting.
2. **Bleed misunderstanding** — the outer ring of the circle folds behind the
   pin. Users put faces near the edge and lose them.
3. **Cutting misalignment** — designs cut off-center, so the pin looks crooked.
4. **Wrong paper** — plain copy paper wrinkles and shows through.

Every one of these gets a designed-in solution, not a help page.

---

## 3. Physical specifications

### Button sizes (all must be supported)

| Label | Finished diameter | Print circle (cut) | Safe zone |
|---|---|---|---|
| **Default** | **85 mm** | **105 mm** | **73 mm** |
| Small | 25 mm | 32 mm | 20 mm |
| Medium | 32 mm | 41 mm | 26 mm |
| Large | 58 mm | 70 mm | 48 mm |
| XL | 75 mm | 89 mm | 62 mm |

Default is preselected on load — it's the size that maps to the button press
actually in use. Its cut diameter (105 mm) was measured directly with
calipers against the physical mold on 2026-08-10, not derived from the rule
of thumb below — that rule assumed a 14 mm bleed, but this press's real
bleed is 20 mm. If the mold is ever swapped, re-measure before touching this
row; don't reapply the formula to it.

Rule of thumb if a size is added later: cut diameter ≈ finished + 14 mm,
safe zone ≈ finished − 12 mm. (Confirmed wrong for Default — see above.)

### Sheets

- US Letter: 8.5 × 11 in → 2550 × 3300 px at 300 DPI
- A4: 210 × 297 mm → 2480 × 3508 px at 300 DPI

### Resolution

300 DPI, always. Never resample the sheet down before export.

### Grid (circle-only sheets)

When every slot on the sheet is a circle of the same size, layout stays a
uniform grid, computed dynamically from sheet size and cut diameter — do not
hardcode a column/row count. Minimum 6 mm gap between circles, minimum 6 mm
page margin. For the 105 mm Default circle on Letter or A4 this lands on
1 column × 2 rows = 2 pins per sheet — a real yield drop from the smaller
sizes, not a bug; a 105 mm circle plus margins genuinely only fits twice on
either sheet.

This uniform-grid path must keep working exactly as-is once mixed shapes are
introduced (section 4, below) — mixed-shape sheets use packing instead, but a
sheet with only one shape and one size is the common case and should never
regress to a worse layout than this grid produces today.

---

## 4. Shapes

v1 only supported circles mapped to a physical button press. v2 adds flat
shapes for other paper products (stickers, cards, labels) that don't get
pressed into a button.

### 4.1 Circle

The only shape that maps to a real physical product (the Default button
press and the other sizes in the table). Keeps everything already built
for it:

- Cut diameter + safe zone, per the size table above
- Dimmed fold-under ring between safe zone and cut edge while adjusting —
  still the single most important UI decision in the app
- Faint center crosshair, for aligning a circle cutter

### 4.2 Flat shapes

Square, rectangle, triangle, and rounded-corner square. These are **not**
pressed into anything — there's no edge that folds behind a button back — so:

- No safe zone, no dimmed fold ring. The design goes right up to the cut
  edge, because there's nothing behind that edge to lose it to.
- No center crosshair — that mark exists specifically to align a circle
  cutter, which doesn't apply to a straight cut.
- Just a dashed cut line on the shape's own outline (rectangle outline,
  triangle outline, rounded-rect outline).

### 4.3 Sizing

For every shape, the user picks a size in mm freely within a reasonable
range (roughly 15–120 mm per side/diameter), not limited to the five fixed
button sizes in the table above. Those five sizes stay exactly as they are
and stay circle-only — they're real physical button presses, not a starting
point to generalize away.

### 4.4 Grid becomes packing

The moment a sheet mixes shapes and/or sizes, "grid" stops being the right
model — it's a 2D bin-packing problem: given a set of slots with different
shapes and sizes, place them on the sheet maximizing use of space while
respecting the minimum page margin and minimum gap between pieces.

This is a **documented requirement, not a solved one** — the packing
algorithm itself is built in a later implementation pass. It does not need
to be optimal, but it does need to be stable: the same input (same set of
shapes/sizes in the same order) must always produce the same layout, so a
user who regenerates doesn't get a surprise.

---

## 5. Feature list — v1/v2

### 5.1 The editor (central feature)

A grid of slots, one per pin that fits on the sheet. Each slot is independent.

Each slot can hold:
- A photo (JPG, PNG, WEBP, HEIC if the browser supports it)
- Text — short phrase or name, with font size, color, and font choice
- An emoji, rendered large and centered
- A solid or gradient background color

A slot may combine a photo with text laid over it.

Empty slots print as blank shapes with only the cut guide. Never block the
generate action because slots are empty.

### 5.2 Per-slot adjustment

Inside each slot the user can:
- Drag to reposition the image
- Pinch or scroll to zoom
- Rotate (optional, low priority)

**While adjusting a circle slot, the fold-under ring must be visibly
dimmed** — a translucent dark overlay between the safe-zone circle and the
cut circle. Flat shapes have no equivalent overlay (see 4.2).

### 5.3 Duplicate

One control: "Fill all slots with this design." Fills every slot from the
selected one. Common case for people making a batch of identical pins.

### 5.4 Resolution warning

Before generating, check each photo. If the source image has fewer pixels
than needed to fill the slot at 300 DPI, mark that slot with a soft warning
("This photo may print blurry"). Warn, do not block.

### 5.5 Sheet generation

Renders an offscreen canvas at full 300 DPI resolution containing:
- White background
- Each slot's design, masked to its shape, at exact cut size
- A thin gray dashed cut line on the shape's outline
- A faint center crosshair inside each **circle** slot only (see 4.2)
- **A calibration ruler in the page margin** — a printed scale with labeled
  centimeter and inch marks, so the user can hold a physical ruler against the
  printed page and confirm the scale came out right
- A small line of text in the margin: the button size, the sheet size, and
  "Print at 100% — do not scale"

### 5.6 Export

- PDF at 300 DPI (primary — most reliable for exact scale)
- PNG at 300 DPI (fallback)

Filename should include size and date, e.g. `pintori-85mm-2026-08-10.pdf`.

### 5.7 Print guidance

On the download screen, short and plain:
- Print at 100% scale, turn off "fit to page"
- Check the printed ruler against a real ruler before cutting
- Use 120–160 gsm coated or photo paper
- Cut on the dashed line with a circle cutter if possible

### 5.8 Session persistence

Save work to browser storage so an accidental refresh does not wipe the sheet.
Nothing leaves the device.

---

## 6. The AI/ML component

Automatic face detection to center the crop.

- Model runs entirely in the browser (face-api.js — see README.md for why
  this was chosen over MediaPipe). No API calls.
- When a photo is added, detect faces. If one or more are found, set the
  initial crop so faces sit inside the visible area of the slot's shape —
  the safe zone for circles, the shape's own bounds for flat shapes — not
  just centered on the image's geometric middle.
- Silent by default. No extra button, no "AI" badge in the child's view.
  It should feel like the app just knows.
- The user can still drag and zoom afterward — detection sets the starting
  point, it does not lock anything.
- Load the model lazily, after first paint, so the app opens fast.

This is the piece that makes the project meaningful for an AI/ML portfolio:
real client-side inference solving a real usability problem.

---

## 7. Non-goals for v1/v2

Do not build these, even if they seem easy:
- Filters, stickers, clipart libraries
- User accounts or cloud saving
- Social sharing
- Ordering physical pins
- Multi-page sheet management (one sheet at a time is fine)

---

## 8. Technical constraints

- Static site. No backend. Deploys to Cloudflare Pages from GitHub.
- Canvas API for all image work. jsPDF for PDF export.
- Must work on a laptop and on a tablet. Touch gestures required for
  drag and zoom.
- Bundle should stay small; the face model is the only heavy asset and it
  loads lazily.
- Spanish as the default language, with an English toggle.

---

## 9. Definition of done

A child can open the URL, add six photos, see each face centered without
touching anything, adjust one if they want, press one button, and get a PDF
that prints at exactly the right size on the first try — whether the sheet
is all circles or a mix of circles and flat shapes.
