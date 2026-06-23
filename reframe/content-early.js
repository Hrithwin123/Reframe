// Reframe Chrome Extension - Early CSS Injector
// Runs at document_start to inject saved CSS BEFORE the page paints.
// JS is handled separately by content.js at document_idle.

chrome.storage.local.get(null, (allData) => {
  const domain = window.location.hostname;
  const data = allData[domain];
  
  if (!data || Array.isArray(data) || !data.changes || data.changes.length === 0) return;

  const allCSS = data.changes
    .map(c => c.css || '')
    .filter(Boolean)
    .join('\n\n');

  if (allCSS) {
    const style = document.createElement('style');
    style.id = 'reframe-ext-persistent';
    style.textContent = allCSS;
    // document.head may not exist yet at document_start
    (document.head || document.documentElement).appendChild(style);
  }
});
