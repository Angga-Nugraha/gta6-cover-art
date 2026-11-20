// Fixed scenes for screenshots: a `?shot=` query sets up one exact cover or
// editor view, so a screenshot run reproduces the same poster every time.
// `photo` picks sample files, `layout` / `grade` / `size` pick the poster,
// `title` / `subtitle` the words. window.__shotReady is set once painted.

/** Reads the shot scene out of the page's query string. */
export function shotScene(search) {
  const query = new URLSearchParams(search);
  return {
    shot: query.get('shot') || '',
    layout: query.get('layout') || 'trio-hero',
    grade: query.get('grade') || 'sunset',
    size: query.get('size') || '1080x1080',
    title: query.get('title') || 'Sunset Heist',
    subtitle: query.get('subtitle') || 'Ocean Drive',
    photos: (query.get('photos') || 'neon-portrait,convertible-dusk,pier,boulevard')
      .split(',').map((name) => name.trim()).filter(Boolean),
    sun: query.get('sun') !== '0',
    palms: query.get('palms') !== '0',
    frame: query.get('frame') !== '0',
  };
}

/**
 * Marks the page ready for a screenshot: hides the editor for a cover shot,
 * waits for the webfonts, then paints twice so the canvas is settled.
 */
export async function markShotReady(scene, repaint) {
  if (scene.shot === 'cover') document.body.classList.add('shot-cover');
  try {
    await document.fonts.load('100px "Anton"');
    await document.fonts.load('100px "Bebas Neue"');
    await document.fonts.load('100px "Archivo Black"');
    await document.fonts.ready;
  } catch (error) {
    // A font that fails to load still leaves a usable fallback render.
  }
  repaint();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
