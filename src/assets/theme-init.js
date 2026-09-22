(function () {
  var saved = null;
  try {
    saved = localStorage.getItem('cumbre20-theme');
  } catch (error) {
    saved = null;
  }

  var preference = saved === 'light' || saved === 'dark' ? saved : 'system';
  var resolved = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;

  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
}());
