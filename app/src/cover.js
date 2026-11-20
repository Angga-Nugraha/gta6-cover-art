// The cover renderer: draws the whole poster onto any canvas — the live
// preview, or a full-size export canvas — from one state object. Everything
// here is original vector art drawn in code: no game artwork, no game fonts.

import { layoutPanels } from './layouts.js';

/** Colour grades: a per-photo canvas filter plus a wash gradient over the cover. */
export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    filter: 'saturate(1.3) contrast(1.06) brightness(1.02)',
    wash: ['rgba(255, 94, 98, 0)', 'rgba(255, 122, 89, 0.20)', 'rgba(198, 24, 125, 0.42)'],
    sky: ['#ff9a5a', '#ff2975'],
  },
  neon: {
    name: 'Neon Nights',
    filter: 'saturate(1.5) contrast(1.1) brightness(0.98)',
    wash: ['rgba(0, 229, 255, 0.16)', 'rgba(140, 30, 255, 0.10)', 'rgba(255, 41, 117, 0.38)'],
    sky: ['#00e5ff', '#ff2975'],
  },
  golden: {
    name: 'Golden Hour',
    filter: 'saturate(1.25) contrast(1.04) brightness(1.07)',
    wash: ['rgba(255, 214, 90, 0)', 'rgba(255, 170, 60, 0.16)', 'rgba(214, 110, 20, 0.34)'],
    sky: ['#ffd319', '#ff7b00'],
  },
  noir: {
    name: 'Palm Noir',
    filter: 'saturate(0.85) contrast(1.18) brightness(0.94)',
    wash: ['rgba(0, 60, 80, 0.22)', 'rgba(0, 40, 70, 0.10)', 'rgba(10, 8, 30, 0.42)'],
    sky: ['#2de2c5', '#0b486b'],
  },
  mono: {
    name: 'Mono Vice',
    filter: 'grayscale(1) contrast(1.12) brightness(1.03)',
    wash: ['rgba(255, 255, 255, 0)', 'rgba(255, 41, 117, 0.05)', 'rgba(255, 41, 117, 0.30)'],
    sky: ['#f5f5f5', '#ff2975'],
  },
};

export const GRADE_IDS = Object.keys(GRADES);

/** Caption fill styles: a solid colour or a sunset gradient. */
export const CAPTION_COLOURS = {
  white: { name: 'White', stops: null, solid: '#ffffff' },
  sunset: { name: 'Sunset', stops: ['#ffe259', '#ffa751', '#ff2975'], solid: null },
  neon: { name: 'Neon', stops: ['#00e5ff', '#7b2fff', '#ff2975'], solid: null },
  gold: { name: 'Gold', stops: ['#fff3a3', '#ffd319', '#ff7b00'], solid: null },
};

/** Poster sizes the app exports, in pixels. */
export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

let grainTile = null;

/** Builds a small random-noise tile once, reused for the film-grain overlay. */
function makeGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/**
 * Draws one photo into one panel rectangle: cover-fit, then the panel's own
 * zoom, pan and rotation, then the grade's photo filter. With no photo yet
 * it draws a placeholder so an empty panel still looks like a poster panel.
 */
export function drawPhotoPanel(ctx, rect, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const img = panel && panel.image ? panel.image : null;
  if (!img) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#3b1d5e');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(2, rect.w * 0.01);
    ctx.beginPath();
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const r = Math.min(rect.w, rect.h) * 0.12;
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `600 ${Math.max(12, rect.w * 0.045)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', cx, cy + r + Math.max(16, rect.w * 0.06));
    ctx.restore();
    return;
  }
  const zoom = panel.zoom || 1;
  const rotate = ((panel.rotate || 0) * Math.PI) / 180;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * base;
  const ph = img.naturalHeight * base;
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(rotate);
  if (panel.flip) ctx.scale(-1, 1);
  ctx.filter = grade.filter;
  ctx.drawImage(img, -pw / 2 + (panel.panX || 0) * rect.w, -ph / 2 + (panel.panY || 0) * rect.h, pw, ph);
  ctx.filter = 'none';
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.lineWidth = Math.max(2, Math.min(rect.w, rect.h) * 0.008);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/**
 * Draws the retro striped sun: a gradient disc with slats cut from its base.
 * The disc is built on its own offscreen canvas first, so cutting the slats
 * only ever erases the sun itself — the photos underneath show through the
 * gaps, exactly like a printed poster sun.
 */
export function drawRetroSun(ctx, w, h, grade) {
  const cx = w * 0.5;
  const cy = h * 0.2;
  const r = Math.min(w, h) * 0.11;
  const pad = Math.ceil(r * 0.08);
  const size = Math.ceil((r + pad) * 2);
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');
  const ocx = size / 2;
  const ocy = size / 2;
  const sun = octx.createLinearGradient(ocx, ocy - r, ocx, ocy + r);
  sun.addColorStop(0, grade.sky[0]);
  sun.addColorStop(1, grade.sky[1]);
  octx.fillStyle = sun;
  octx.beginPath();
  octx.arc(ocx, ocy, r, 0, Math.PI * 2);
  octx.fill();
  octx.globalCompositeOperation = 'destination-out';
  let y = ocy + r * 0.05;
  let thick = Math.max(2, r * 0.045);
  while (y < ocy + r) {
    octx.fillRect(ocx - r - 2, y, r * 2 + 4, thick);
    y += thick + Math.max(3, r * 0.09);
    thick *= 1.55;
  }
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.drawImage(off, cx - size / 2, cy - size / 2);
  ctx.restore();
}

/** Draws one original palm-tree silhouette: a leaning trunk, seven fronds. */
export function drawPalmSilhouette(ctx, x, y, size, lean, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.scale(size, size);
  ctx.fillStyle = `rgba(8, 4, 16, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-2, -70, 6, -128);
  ctx.quadraticCurveTo(10, -132, 12, -126);
  ctx.quadraticCurveTo(6, -64, 10, 0);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + (i / 6) * 0.84);
    const len = 62 - Math.abs(i - 3) * 7;
    ctx.beginPath();
    ctx.moveTo(8, -128);
    ctx.quadraticCurveTo(
      8 + Math.cos(a) * len * 0.55, -128 + Math.sin(a) * len * 0.55 - 14,
      8 + Math.cos(a) * len, -128 + Math.sin(a) * len + 16,
    );
    ctx.quadraticCurveTo(
      8 + Math.cos(a) * len * 0.6, -128 + Math.sin(a) * len * 0.6 + 4,
      8, -122,
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Fits the title to the cover width, shrinking it until it fits. */
function fitTitleFont(ctx, text, fontFamily, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${size}px ${fontFamily}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${fontFamily}`;
  }
  return size;
}

/**
 * Draws the bold caption lettering: a big title with outline and drop shadow,
 * a smaller letterspaced subtitle, and thin rules flanking the subtitle.
 */
export function drawCaptionLettering(ctx, w, h, caption) {
  const title = (caption.title || '').trim();
  const subtitle = (caption.subtitle || '').trim();
  if (!title && !subtitle) return;
  const margin = Math.max(10, Math.min(w, h) * 0.03);
  const atTop = caption.position === 'top';
  const family = caption.font === 'bebas' ? '"Bebas Neue", sans-serif'
    : caption.font === 'archivo' ? '"Archivo Black", sans-serif'
    : '"Anton", sans-serif';
  const maxWidth = w * 0.92;
  const baseSize = h * (caption.size || 0.11);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = '0px';
  let titleSize = 0;
  let titleY = 0;
  let subY = 0;
  if (title) {
    const shown = caption.uppercase === false ? title : title.toUpperCase();
    titleSize = fitTitleFont(ctx, shown, family, baseSize, maxWidth);
    if (typeof ctx.letterSpacing !== 'undefined') {
      ctx.letterSpacing = `${Math.round(titleSize * (caption.tracking || 0.01))}px`;
      titleSize = fitTitleFont(ctx, shown, family, titleSize, maxWidth);
    }
    titleY = atTop ? margin + titleSize : h - margin - (subtitle ? titleSize * 0.42 : titleSize * 0.12);
    subY = atTop ? titleY + titleSize * 0.48 : titleY - titleSize * 1.02;
    const colour = CAPTION_COLOURS[caption.colour] || CAPTION_COLOURS.white;
    if (colour.stops) {
      const grad = ctx.createLinearGradient(w / 2 - maxWidth / 2, 0, w / 2 + maxWidth / 2, 0);
      colour.stops.forEach((stop, i) => grad.addColorStop(i / (colour.stops.length - 1), stop));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = colour.solid;
    }
    if (caption.shadow !== false) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = titleSize * 0.16;
      ctx.shadowOffsetY = titleSize * 0.05;
    }
    if (caption.outline !== false) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = caption.outlineColour || '#12081f';
      ctx.lineWidth = Math.max(2, titleSize * 0.07);
      ctx.strokeText(shown, w / 2, titleY);
    }
    ctx.fillText(shown, w / 2, titleY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (subtitle) {
    const shownSub = caption.uppercase === false ? subtitle : subtitle.toUpperCase();
    const subSize = Math.max(12, (titleSize || baseSize) * 0.30);
    ctx.font = `${subSize}px "Bebas Neue", sans-serif`;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`;
    const y = title ? subY : (atTop ? margin + subSize : h - margin - subSize * 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = subSize * 0.2;
    ctx.fillText(shownSub, w / 2, y);
    ctx.shadowBlur = 0;
    const tw = ctx.measureText(shownSub).width;
    const ruleY = y - subSize * 0.32;
    const ruleLen = Math.min(w * 0.12, (w - tw) / 2 - margin);
    if (ruleLen > 10) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = Math.max(2, subSize * 0.08);
      ctx.beginPath();
      ctx.moveTo(w / 2 - tw / 2 - margin * 0.5 - ruleLen, ruleY);
      ctx.lineTo(w / 2 - tw / 2 - margin * 0.5, ruleY);
      ctx.moveTo(w / 2 + tw / 2 + margin * 0.5, ruleY);
      ctx.lineTo(w / 2 + tw / 2 + margin * 0.5 + ruleLen, ruleY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Washes the whole cover with the grade's sunset or neon gradient. */
export function applyColourGrade(ctx, w, h, grade, strength) {
  if (!strength) return;
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(0.55, grade.wash[1]);
  wash.addColorStop(1, grade.wash[2]);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, strength));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Draws the full poster: panels, grade, sun, palms, vignette, grain, caption. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const compare = !!state.compare;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f5f0f7';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutPanels(state.layout, w, h);
  rects.forEach((rect, i) => drawPhotoPanel(ctx, rect, state.panels[i] || {}, grade));
  if (compare) return;
  applyColourGrade(ctx, w, h, grade, state.gradeStrength == null ? 1 : state.gradeStrength);
  if (state.extras && state.extras.sun) drawRetroSun(ctx, w, h, grade);
  if (state.extras && state.extras.palms) {
    const s = Math.min(w, h) * 0.0022;
    drawPalmSilhouette(ctx, w * 0.015, h * 0.995, s, 0.10, 0.92);
    drawPalmSilhouette(ctx, w * 0.985, h * 0.995, s * 0.8, -0.12, 0.92);
  }
  if (state.extras && state.extras.vignette) {
    const vg = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(10, 4, 20, 0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.extras && state.extras.grain) {
    const tile = makeGrainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  drawCaptionLettering(ctx, w, h, state.caption);
  if (state.extras && state.extras.frame) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    ctx.strokeStyle = '#12081f';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.004);
    const inset = Math.max(3, Math.min(w, h) * 0.008) + ctx.lineWidth / 2;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.restore();
  }
}

/** Renders the same state to a fresh canvas at exact export size. */
export function renderCoverToSize(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
