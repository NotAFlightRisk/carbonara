// before first paint, so a picked theme never flashes the other one
try {
  const theme = localStorage.getItem('carbonara:theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch {
  // nothing saved we can read
}
