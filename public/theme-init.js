// This script must run IMMEDIATELY before any rendering to prevent flash
// It runs synchronously and blocks rendering
(function() {
  try {
    const stored = localStorage.getItem("theme-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      const savedTheme = parsed.state?.theme;
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Default to dark if no preference stored
      document.documentElement.classList.add("dark");
    }
  } catch (e) {
    // Default to dark on error
    document.documentElement.classList.add("dark");
  }
})();

