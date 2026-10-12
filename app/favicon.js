// One favicon for every page: a dot. White on black at night, black on white by day.
// The page swaps between the two when the theme switches (see THEME_JS in server.js).
// favicon.png is the same dot, night version, for the home-screen icon and the manifest.
// Oct 2026: replaced the per-note brush characters (marks.json, bake-marks.py).

export const dotSvg = (mode) => {
  const [bg, fg] = mode === 'light' ? ['#fff', '#000'] : ['#000', '#fff'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><circle cx="16" cy="16" r="7" fill="${fg}"/></svg>`;
};

export const FAVICON_LINK = '<link rel="icon" href="/favicon.svg" type="image/svg+xml">';
