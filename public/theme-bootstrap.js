// Applies the saved interface theme before first paint (no flicker). Served as a
// same-origin file rather than inline so the Content-Security-Policy needs no
// 'unsafe-inline' or per-script hash for it.
// Mirrors applyThemeToDocument in lib/theme/ui-theme-context.tsx: "studio" (Clean Studio) is the
// daylight palette plus a data-look restyle, so it carries data-ui="brand" as well.
try {
  var theme = localStorage.getItem('simdream_ui_theme');
  var root = document.documentElement;
  root.setAttribute('data-ui', theme === 'brand' || theme === 'studio' ? 'brand' : 'cockpit');
  if (theme === 'studio') root.setAttribute('data-look', 'studio');
} catch (e) {}

// Progressive-enhancement guard for mobile browsers (iOS Safari, Android Chrome /
// Samsung Internet): `<Link href="..."><Button>` renders `<a href="..."><button>`.
// In WebKit/Blink, a nested `<button>` consumes taps without triggering native `<a>`
// navigation until React attaches `<Link>`'s synthetic click handler. If a user taps
// before hydration completes, follow the enclosing link immediately.
try {
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    var el = e.target && e.target.closest ? e.target.closest('a[href] button:not([disabled])') : null;
    if (!el) return;
    var hydrated = Object.keys(el).some(function (k) {
      return k.indexOf('__reactFiber') === 0 || k.indexOf('__reactProps') === 0;
    });
    if (!hydrated) {
      var anchor = el.closest('a[href]');
      if (anchor && anchor.href) {
        window.location.assign(anchor.href);
      }
    }
  });
} catch (e) {}
