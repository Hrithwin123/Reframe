// Change Chrome Extension - Early CSS Injector
// Runs at document_start to inject saved CSS overrides BEFORE the page paints,
// preventing flash of unstyled content (FOUC).
// JS execution is intentionally deferred to content.js (document_idle) where the DOM is ready.

(function earlyCSS() {
  const domain = window.location.hostname;
  if (!domain) return;

  chrome.storage.local.get([domain], (result) => {
    const stack = result[domain];
    if (!stack || !Array.isArray(stack)) return;

    stack.forEach((change, index) => {
      if (change.css) {
        const id = `change-ext-style-${index}`;
        // Avoid duplicates if content.js also fires
        if (document.getElementById(id)) return;

        const style = document.createElement('style');
        style.id = id;
        style.textContent = change.css;
        // At document_start, <head> may not exist yet, so append to documentElement
        (document.head || document.documentElement).appendChild(style);
      }
    });
  });
})();
