// Wires the editor: photos in, layout and caption controls, live preview,
// one-click PNG export. A `?shot=` query sets up a fixed scene instead
// (see shots.js) so screenshots reproduce the same poster every time.

import { drawCover, renderCoverToSize, GRADES, GRADE_IDS, CAPTION_COLOURS, EXPORT_SIZES } from './cover.js';
import { LAYOUTS, LAYOUT_IDS, layoutPanels, hitPanel } from './layouts.js';
import { shotScene, markShotReady } from './shots.js';

const SAMPLES = [
  { file: 'neon-portrait.jpg', name: 'Neon Portrait' },
  { file: 'convertible-dusk.jpg', name: 'Convertible Dusk' },
  { file: 'pier.jpg', name: 'Pier' },
  { file: 'boulevard.jpg', name: 'Boulevard' },
];

const CAPTIONS = [
  ['Sunset Heist', 'Ocean Drive'],
  ['Neon Nights', 'Vice After Dark'],
  ['Boulevard Queen', 'Golden Hour'],
  ['Ocean Drive', 'Sunset Strip'],
  ['Midnight Run', 'Palm City'],
];

const canvas = document.getElementById('preview');
const status = document.getElementById('status');

/** The whole poster: photos, panels, caption, grade and poster extras. */
const state = {
  size: '1080x1080',
  layout: 'trio-hero',
  grade: 'sunset',
  gradeStrength: 1,
  caption: {
    title: 'Sunset Heist',
    subtitle: 'Ocean Drive',
    font: 'anton',
    size: 0.11,
    colour: 'sunset',
    outline: true,
    outlineColour: '#12081f',
    shadow: true,
    position: 'bottom',
    tracking: 0.01,
    uppercase: true,
  },
  extras: { sun: true, palms: true, grain: true, vignette: true, frame: true },
  panels: [],
  selected: 0,
  compare: false,
};

/** The photo library: samples plus anything the user uploads. */
const library = [];

function defaultPanel(photoIndex) {
  return { photo: photoIndex, image: null, zoom: 1, panX: 0, panY: 0, rotate: 0, flip: false };
}

/** Keeps the panel list the length the current layout needs, keeping edits. */
function syncPanelsToLayout() {
  const need = LAYOUTS[state.layout].panels;
  while (state.panels.length < need) {
    const next = defaultPanel(state.panels.length % Math.max(1, library.length));
    next.image = library[next.photo] ? library[next.photo].image : null;
    state.panels.push(next);
  }
  state.panels.length = need;
  if (state.selected >= need) state.selected = 0;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Renders the live preview at a backing size that fits the stage. */
function renderPreview() {
  const size = EXPORT_SIZES.find((s) => s.id === state.size) || EXPORT_SIZES[0];
  const coverMode = document.body.classList.contains('shot-cover');
  const cap = coverMode ? 1280 : 760;
  const scale = Math.min(cap / size.w, cap / size.h, 1);
  const pw = Math.max(2, Math.round(size.w * scale));
  const ph = Math.max(2, Math.round(size.h * scale));
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  drawCover(canvas, state);
}

function refreshPanelControls() {
  const panel = state.panels[state.selected] || defaultPanel(0);
  const photoSelect = document.getElementById('panel-photo');
  photoSelect.value = String(panel.photo ?? 0);
  document.getElementById('panel-zoom').value = panel.zoom;
  document.getElementById('panel-rotate').value = panel.rotate;
  document.getElementById('panel-panx').value = panel.panX;
  document.getElementById('panel-pany').value = panel.panY;
  document.getElementById('panel-flip').checked = !!panel.flip;
  document.getElementById('panel-label').textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
  document.querySelectorAll('#library .thumb').forEach((thumb, i) => {
    thumb.classList.toggle('in-use', state.panels.some((p) => p.photo === i));
  });
}

function refreshAll() {
  document.querySelectorAll('[data-layout]').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layout);
  });
  document.querySelectorAll('[data-size]').forEach((button) => {
    button.classList.toggle('active', button.dataset.size === state.size);
  });
  document.querySelectorAll('[data-grade]').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.grade);
  });
  document.querySelectorAll('[data-colour]').forEach((button) => {
    button.classList.toggle('active', button.dataset.colour === state.caption.colour);
  });
  document.querySelectorAll('[data-font]').forEach((button) => {
    button.classList.toggle('active', button.dataset.font === state.caption.font);
  });
  document.getElementById('grade-strength').value = state.gradeStrength;
  document.getElementById('caption-size').value = state.caption.size;
  document.getElementById('caption-tracking').value = state.caption.tracking;
  refreshPanelControls();
  renderPreview();
}

/** Rebuilds the photo library strip after uploads. */
function rebuildLibrary() {
  const strip = document.getElementById('library');
  strip.innerHTML = '';
  library.forEach((entry, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = `${entry.name} — click to put it in the selected panel`;
    const img = document.createElement('img');
    img.src = entry.thumb;
    img.alt = entry.name;
    button.appendChild(img);
    button.appendChild(Object.assign(document.createElement('span'), { textContent: entry.name }));
    button.addEventListener('click', () => {
      assignPhotoToSelected(i);
    });
    strip.appendChild(button);
  });
  const select = document.getElementById('panel-photo');
  select.innerHTML = '';
  library.forEach((entry, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = entry.name;
    select.appendChild(option);
  });
  refreshPanelControls();
}

/** Puts library photo `i` into the selected panel and re-renders. */
function assignPhotoToSelected(i) {
  const panel = state.panels[state.selected];
  if (!panel || !library[i]) return;
  panel.photo = i;
  panel.image = library[i].image;
  refreshAll();
}

/** Adds uploaded files to the library and fills the selected panel. */
async function addUploads(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const url = URL.createObjectURL(file);
      const image = await loadImage(url);
      library.push({ name: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Upload', image, thumb: url });
    } catch (error) {
      status.textContent = `Could not read ${file.name}.`;
    }
  }
  if (library.length) {
    assignPhotoToSelected(library.length - 1);
    rebuildLibrary();
  }
}

/** Downloads the current poster as a PNG at the named export size. */
export async function exportCover(sizeId) {
  const size = EXPORT_SIZES.find((s) => s.id === sizeId) || EXPORT_SIZES[0];
  await document.fonts.ready;
  const offscreen = renderCoverToSize(state, size.w, size.h);
  const blob = await new Promise((resolve) => offscreen.toBlob(resolve, 'image/png'));
  if (!blob) {
    status.textContent = 'Export failed — the browser could not make a PNG.';
    return null;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sunset-cover-${size.id}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  status.textContent = `Saved sunset-cover-${size.id}.png (${size.w} × ${size.h}).`;
  return blob;
}

/** Picks a random layout, grade and photo assignment for a fresh poster. */
function shufflePoster() {
  state.layout = LAYOUT_IDS[Math.floor(Math.random() * LAYOUT_IDS.length)];
  state.grade = GRADE_IDS[Math.floor(Math.random() * GRADE_IDS.length)];
  const caption = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
  state.caption.title = caption[0];
  state.caption.subtitle = caption[1];
  document.getElementById('caption-title').value = caption[0];
  document.getElementById('caption-subtitle').value = caption[1];
  syncPanelsToLayout();
  state.panels.forEach((panel) => {
    panel.photo = Math.floor(Math.random() * library.length);
    panel.image = library[panel.photo].image;
    panel.zoom = 1;
    panel.panX = 0;
    panel.panY = 0;
    panel.rotate = 0;
  });
  refreshAll();
  status.textContent = 'Shuffled — a fresh poster, same photos.';
}

/** Restores the starting poster. */
function resetPoster() {
  state.layout = 'trio-hero';
  state.grade = 'sunset';
  state.gradeStrength = 1;
  state.size = '1080x1080';
  state.caption.title = 'Sunset Heist';
  state.caption.subtitle = 'Ocean Drive';
  state.caption.font = 'anton';
  state.caption.size = 0.11;
  state.caption.colour = 'sunset';
  state.caption.position = 'bottom';
  state.caption.uppercase = true;
  state.extras = { sun: true, palms: true, grain: true, vignette: true, frame: true };
  document.getElementById('caption-title').value = state.caption.title;
  document.getElementById('caption-subtitle').value = state.caption.subtitle;
  document.getElementById('caption-font').value = 'anton';
  document.getElementById('caption-position').value = 'bottom';
  document.getElementById('caption-outline').checked = true;
  document.getElementById('caption-shadow').checked = true;
  document.getElementById('caption-uppercase').checked = true;
  for (const key of Object.keys(state.extras)) {
    const box = document.getElementById(`extra-${key}`);
    if (box) box.checked = state.extras[key];
  }
  syncPanelsToLayout();
  state.panels.forEach((panel, i) => {
    panel.photo = i % library.length;
    panel.image = library[panel.photo].image;
    panel.zoom = 1;
    panel.panX = 0;
    panel.panY = 0;
    panel.rotate = 0;
    panel.flip = false;
  });
  refreshAll();
  status.textContent = 'Reset to the starting poster.';
}

function wireControls() {
  document.querySelectorAll('[data-layout]').forEach((button) => {
    button.addEventListener('click', () => {
      state.layout = button.dataset.layout;
      syncPanelsToLayout();
      refreshAll();
    });
  });
  document.querySelectorAll('[data-size]').forEach((button) => {
    button.addEventListener('click', () => {
      state.size = button.dataset.size;
      refreshAll();
    });
  });
  document.querySelectorAll('[data-grade]').forEach((button) => {
    button.addEventListener('click', () => {
      state.grade = button.dataset.grade;
      refreshAll();
    });
  });
  document.querySelectorAll('[data-colour]').forEach((button) => {
    button.addEventListener('click', () => {
      state.caption.colour = button.dataset.colour;
      refreshAll();
    });
  });
  document.querySelectorAll('[data-font]').forEach((button) => {
    button.addEventListener('click', () => {
      state.caption.font = button.dataset.font;
      document.getElementById('caption-font').value = button.dataset.font;
      refreshAll();
    });
  });
  document.getElementById('photo-upload').addEventListener('change', (event) => {
    addUploads(event.target.files);
    event.target.value = '';
  });
  document.getElementById('panel-photo').addEventListener('change', (event) => {
    assignPhotoToSelected(Number(event.target.value));
  });
  document.getElementById('panel-zoom').addEventListener('input', (event) => {
    state.panels[state.selected].zoom = Number(event.target.value);
    renderPreview();
  });
  document.getElementById('panel-rotate').addEventListener('input', (event) => {
    state.panels[state.selected].rotate = Number(event.target.value);
    renderPreview();
  });
  document.getElementById('panel-panx').addEventListener('input', (event) => {
    state.panels[state.selected].panX = Number(event.target.value);
    renderPreview();
  });
  document.getElementById('panel-pany').addEventListener('input', (event) => {
    state.panels[state.selected].panY = Number(event.target.value);
    renderPreview();
  });
  document.getElementById('panel-flip').addEventListener('change', (event) => {
    state.panels[state.selected].flip = event.target.checked;
    renderPreview();
  });
  document.getElementById('fill-all').addEventListener('click', () => {
    const photo = state.panels[state.selected].photo;
    state.panels.forEach((panel) => {
      panel.photo = photo;
      panel.image = library[photo].image;
    });
    refreshAll();
    status.textContent = 'Every panel now shows the same photo.';
  });
  document.getElementById('caption-title').addEventListener('input', (event) => {
    state.caption.title = event.target.value;
    renderPreview();
  });
  document.getElementById('caption-subtitle').addEventListener('input', (event) => {
    state.caption.subtitle = event.target.value;
    renderPreview();
  });
  document.getElementById('caption-font').addEventListener('change', (event) => {
    state.caption.font = event.target.value;
    refreshAll();
  });
  document.getElementById('caption-position').addEventListener('change', (event) => {
    state.caption.position = event.target.value;
    renderPreview();
  });
  document.getElementById('caption-size').addEventListener('input', (event) => {
    state.caption.size = Number(event.target.value);
    renderPreview();
  });
  document.getElementById('caption-tracking').addEventListener('input', (event) => {
    state.caption.tracking = Number(event.target.value);
    renderPreview();
  });
  document.getElementById('caption-outline').addEventListener('change', (event) => {
    state.caption.outline = event.target.checked;
    renderPreview();
  });
  document.getElementById('caption-shadow').addEventListener('change', (event) => {
    state.caption.shadow = event.target.checked;
    renderPreview();
  });
  document.getElementById('caption-uppercase').addEventListener('change', (event) => {
    state.caption.uppercase = event.target.checked;
    renderPreview();
  });
  document.getElementById('grade-strength').addEventListener('input', (event) => {
    state.gradeStrength = Number(event.target.value);
    renderPreview();
  });
  for (const key of ['sun', 'palms', 'grain', 'vignette', 'frame']) {
    document.getElementById(`extra-${key}`).addEventListener('change', (event) => {
      state.extras[key] = event.target.checked;
      renderPreview();
    });
  }
  document.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => exportCover(button.dataset.export));
  });
  document.getElementById('export-all').addEventListener('click', async () => {
    for (const size of EXPORT_SIZES) await exportCover(size.id);
    status.textContent = 'Saved all three sizes.';
  });
  document.getElementById('shuffle').addEventListener('click', shufflePoster);
  document.getElementById('reset').addEventListener('click', resetPoster);
  const compare = document.getElementById('compare');
  compare.addEventListener('pointerdown', () => {
    state.compare = true;
    renderPreview();
  });
  ['pointerup', 'pointerleave'].forEach((name) => compare.addEventListener(name, () => {
    state.compare = false;
    renderPreview();
  }));
  wireCanvasGestures();
}

/** Click to pick a panel, drag to pan its photo, scroll to zoom it. */
function wireCanvasGestures() {
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const rects = layoutPanels(state.layout, canvas.width, canvas.height);
    const index = hitPanel(rects, px, py);
    if (index === -1) return;
    state.selected = index;
    const panel = state.panels[index];
    drag = { x: px, y: py, panX: panel.panX, panY: panel.panY, moved: false, rect: rects[index] };
    canvas.setPointerCapture(event.pointerId);
    refreshPanelControls();
    renderPreview();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const panel = state.panels[state.selected];
    panel.panX = drag.panX + (px - drag.x) / drag.rect.w;
    panel.panY = drag.panY + (py - drag.y) / drag.rect.h;
    panel.panX = Math.max(-0.6, Math.min(0.6, panel.panX));
    panel.panY = Math.max(-0.6, Math.min(0.6, panel.panY));
    drag.moved = true;
    renderPreview();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
    refreshPanelControls();
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selected];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * Math.exp(-event.deltaY * 0.0012)));
    refreshPanelControls();
    renderPreview();
  }, { passive: false });
  const stage = document.getElementById('stage');
  stage.addEventListener('dragover', (event) => event.preventDefault());
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    if (event.dataTransfer.files.length) addUploads(event.dataTransfer.files);
  });
}

/** Applies a screenshot scene: layout, grade, size, words and photos. */
async function applyShotScene(scene) {
  state.layout = LAYOUTS[scene.layout] ? scene.layout : 'trio-hero';
  state.grade = GRADES[scene.grade] ? scene.grade : 'sunset';
  state.size = EXPORT_SIZES.some((s) => s.id === scene.size) ? scene.size : '1080x1080';
  state.caption.title = scene.title;
  state.caption.subtitle = scene.subtitle;
  state.extras.sun = scene.sun;
  state.extras.palms = scene.palms;
  state.extras.frame = scene.frame;
  document.getElementById('caption-title').value = scene.title;
  document.getElementById('caption-subtitle').value = scene.subtitle;
  syncPanelsToLayout();
  scene.photos.forEach((file, i) => {
    const found = library.findIndex((entry) => entry.file === `${file}.jpg`);
    if (found !== -1 && state.panels[i]) {
      state.panels[i].photo = found;
      state.panels[i].image = library[found].image;
    }
  });
  refreshAll();
  await markShotReady(scene, renderPreview);
}

// Automation hooks: the app's own export, callable from a test or screenshot
// run, returning the exact PNG bytes the Export button would download.
window.__viceExport = async (w, h) => {
  await document.fonts.ready;
  return renderCoverToSize(state, w, h).toDataURL('image/png');
};
window.__viceState = state;

async function init() {
  wireControls();
  for (const sample of SAMPLES) {
    try {
      const image = await loadImage(`samples/${sample.file}`);
      library.push({ ...sample, image, thumb: `samples/${sample.file}` });
    } catch (error) {
      status.textContent = `Sample ${sample.file} did not load.`;
    }
  }
  rebuildLibrary();
  syncPanelsToLayout();
  state.panels.forEach((panel, i) => {
    panel.photo = i % library.length;
    panel.image = library[panel.photo] ? library[panel.photo].image : null;
  });
  try {
    await document.fonts.load('100px "Anton"');
    await document.fonts.load('100px "Bebas Neue"');
    await document.fonts.load('100px "Archivo Black"');
  } catch (error) {
    // Falls back to system fonts; the poster still renders.
  }
  const scene = shotScene(location.search);
  if (scene.shot) {
    await applyShotScene(scene);
  } else {
    refreshAll();
  }
}

init();
