// Pre-paint UI theme bootstrap: reads the visitor's choice from localStorage and
// sets data-ui / data-look / data-cockpit-tone on <html> before React hydrates
// to avoid a flash of the wrong palette or unstyled text. Loaded as a static
// external script so it does not require 'unsafe-inline' under strict CSP.
try {
  var theme = localStorage.getItem('simdream_ui_theme');
  var tone = localStorage.getItem('simdream_cockpit_tone');
  var root = document.documentElement;
  root.setAttribute('data-ui', theme === 'cockpit' ? 'cockpit' : 'brand');
  if (theme === 'studio') root.setAttribute('data-look', 'studio');
  if (theme === 'cockpit') {
    root.setAttribute(
      'data-cockpit-tone',
      tone === 'cobalt' || tone === 'squadron' ? tone : 'classic'
    );
  }
} catch (e) {}
