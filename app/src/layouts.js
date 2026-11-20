// Panel layouts for the cover: every layout is a set of rectangles inside the
// cover, separated by a white gutter, in the multi-panel poster style.
// Coordinates are fractions of the cover size until layoutPanels resolves them.

export const LAYOUTS = {
  'solo': { name: 'Solo', panels: 1, hint: 'One photo, full bleed' },
  'duo-split': { name: 'Duo · Split', panels: 2, hint: 'Two photos side by side' },
  'duo-stack': { name: 'Duo · Stack', panels: 2, hint: 'Two photos, one above the other' },
  'trio-hero': { name: 'Trio · Hero', panels: 3, hint: 'One big photo, two small beside it' },
  'trio-strip': { name: 'Trio · Strip', panels: 3, hint: 'Three vertical strips' },
  'quad-grid': { name: 'Quad · Grid', panels: 4, hint: 'Four photos in a grid' },
  'quad-strip': { name: 'Quad · Strip', panels: 4, hint: 'Four vertical strips' },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

/** Splits a rectangle into `n` equal columns with gutter `g` between them. */
function splitColumns(x, y, w, h, n, g) {
  const cw = (w - g * (n - 1)) / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: x + i * (cw + g), y, w: cw, h });
  return out;
}

/** Splits a rectangle into `n` equal rows with gutter `g` between them. */
function splitRows(x, y, w, h, n, g) {
  const rh = (h - g * (n - 1)) / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x, y: y + i * (rh + g), w, h: rh });
  return out;
}

/**
 * Resolves a layout id to concrete panel rectangles for a cover of `w` by `h`
 * pixels. `margin` is the outer inset, `gutter` the gap between panels.
 */
export function layoutPanels(layoutId, w, h) {
  const gutter = Math.max(4, Math.round(Math.min(w, h) * 0.014));
  const margin = Math.max(8, Math.round(Math.min(w, h) * 0.022));
  const x = margin;
  const y = margin;
  const cw = w - margin * 2;
  const ch = h - margin * 2;
  switch (layoutId) {
    case 'duo-split':
      return splitColumns(x, y, cw, ch, 2, gutter);
    case 'duo-stack':
      return splitRows(x, y, cw, ch, 2, gutter);
    case 'trio-hero': {
      const heroW = cw * 0.6;
      const side = splitRows(x + heroW + gutter, y, cw - heroW - gutter, ch, 2, gutter);
      return [{ x, y, w: heroW, h: ch }, ...side];
    }
    case 'trio-strip':
      return splitColumns(x, y, cw, ch, 3, gutter);
    case 'quad-grid': {
      const rows = splitRows(x, y, cw, ch, 2, gutter);
      return [
        ...splitColumns(rows[0].x, rows[0].y, rows[0].w, rows[0].h, 2, gutter),
        ...splitColumns(rows[1].x, rows[1].y, rows[1].w, rows[1].h, 2, gutter),
      ];
    }
    case 'quad-strip':
      return splitColumns(x, y, cw, ch, 4, gutter);
    case 'solo':
    default:
      return [{ x, y, w: cw, h: ch }];
  }
}

/** Finds which panel rectangle contains point (px, py), or -1. */
export function hitPanel(rects, px, py) {
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
