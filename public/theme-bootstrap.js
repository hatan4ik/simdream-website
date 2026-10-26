// Applies the saved interface theme before first paint (no flicker). Served as a
// same-origin file rather than inline so the Content-Security-Policy needs no
// 'unsafe-inline' or per-script hash for it.
try {
  var theme = localStorage.getItem('simdream_ui_theme');
  document.documentElement.setAttribute('data-ui', theme === 'brand' ? 'brand' : 'cockpit');
} catch (e) {}
