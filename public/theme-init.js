// Apply the persisted (or system) theme before first paint to avoid a flash.
// Kept as an external file (not inline) so the production CSP can use
// script-src 'self' without needing 'unsafe-inline' or per-build hashes.
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
