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
| Small | 25 mm | 32 mm | 20 mm |
| Medium | 32 mm | 41 mm | 26 mm |
| Large | 58 mm | 70 mm | 48 mm |
| XL | 75 mm | 89 mm | 62 mm |
| **Frank's machine** | **70 mm** | **85 mm** | **58 mm** |

Rule of thumb if a size is added later: cut diameter ≈ finished + 14 mm,
safe zone ≈ finished − 12 mm.

### Sheets

- US Letter: 8.5 × 11 in → 2550 × 3300 px at 300 DPI
- A4: 210 × 297 mm → 2480 × 3508 px at 300 DPI

### Resolution

300 DPI, always. Never resample the sheet down before export.

### Grid

Computed dynamically from sheet size and cut diameter. Do not hardcode 2×3.
Minimum 6 mm gap between circles, minimum 8 mm page margin.
For 85 mm circles on Letter this lands on 2 columns × 3 rows = 6 pins.

---

## 4. Feature list — v1

### 4.1 The editor (central feature)

A grid of slots, one per pin that fits on the sheet. Each slot is independent.

Each slot can hold:
- A photo (JPG, PNG, WEBP, HEIC if the browser supports it)
- Text — short phrase or name, with font size, color, and font choice
- An emoji, rendered large and centered
- A solid or gradient background color

A slot may combine a photo with text laid over it.

Empty slots print as blank white circles with only the cut guide. Never block
the generate action because slots are empty.

### 4.2 Per-slot adjustment

Inside each slot the user can:
- Drag to reposition the image
- Pinch or scroll to zoom
- Rotate (optional, low priority)

**While adjusting, the fold-under ring must be visibly dimmed** — a translucent
dark overlay between the safe-zone circle and the cut circle. This is the single
most important UI decision in the app. It teaches bleed without a word of
explanation.

### 4.3 Duplicate

One control: "Fill all slots with this design." Fills every slot from the
selected one. Common case for people making a batch of identical pins.

### 4.4 Resolution warning

Before generating, check each photo. If the source image has fewer pixels than
needed to fill the cut circle at 300 DPI, mark that slot with a soft warning
("This photo may print blurry"). Warn, do not block.

### 4.5 Sheet generation

Renders an offscreen canvas at full 300 DPI resolution containing:
- White background
- Each slot's design, circular-masked, at exact cut diameter
- A thin gray dashed cut line at the cut diameter
- A faint center crosshair inside each circle, for aligning a circle cutter
- **A calibration ruler in the page margin** — a printed scale with labeled
  centimeter and inch marks, so the user can hold a physical ruler against the
  printed page and confirm the scale came out right
- A small line of text in the margin: the button size, the sheet size, and
  "Print at 100% — do not scale"

### 4.6 Export

- PDF at 300 DPI (primary — most reliable for exact scale)
- PNG at 300 DPI (fallback)

Filename should include size and date, e.g. `pintori-70mm-2026-08-09.pdf`.

### 4.7 Print guidance

On the download screen, short and plain:
- Print at 100% scale, turn off "fit to page"
- Check the printed ruler against a real ruler before cutting
- Use 120–160 gsm coated or photo paper
- Cut on the dashed line with a circle cutter if possible

### 4.8 Session persistence

Save work to browser storage so an accidental refresh does not wipe the sheet.
Nothing leaves the device.

---

## 5. The AI/ML component

Automatic face detection to center the crop.

- Model runs entirely in the browser (MediaPipe Face Detector, or face-api.js
  as fallback). No API calls.
- When a photo is added, detect faces. If one or more are found, set the initial
  crop so faces sit inside the safe zone, not just centered on the image's
  geometric middle.
- Silent by default. No extra button, no "AI" badge in the child's view.
  It should feel like the app just knows.
- The user can still drag and zoom afterward — detection sets the starting
  point, it does not lock anything.
- Load the model lazily, after first paint, so the app opens fast.

This is the piece that makes the project meaningful for an AI/ML portfolio:
real client-side inference solving a real usability problem.

---

## 6. Non-goals for v1

Do not build these, even if they seem easy:
- Filters, stickers, clipart libraries
- User accounts or cloud saving
- Social sharing
- Ordering physical pins
- Multi-page sheet management (one sheet at a time is fine for v1)

---

## 7. Technical constraints

- Static site. No backend. Deploys to Cloudflare Pages from GitHub.
- Canvas API for all image work. jsPDF for PDF export.
- Must work on a laptop and on a tablet. Touch gestures required for
  drag and zoom.
- Bundle should stay small; the face model is the only heavy asset and it
  loads lazily.
- Spanish as the default language, with an English toggle.

---

## 8. Definition of done for v1

A child can open the URL, add six photos, see each face centered without
touching anything, adjust one if they want, press one button, and get a PDF
that prints at exactly the right size on the first try.
