// Change Chrome Extension - Content Script

// --- 1. SCRIPT/CSS INJECTION HELPERS ---
function injectScript(code) {
  try {
    const script = document.createElement('script');
    script.textContent = code;
    (document.body || document.documentElement).appendChild(script);
    script.remove();
  } catch (error) {
    console.error('Change Extension: Script injection failed:', error);
  }
}

function injectCSS(cssCode, index) {
  try {
    const id = `change-ext-style-${index}`;
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = cssCode;
  } catch (error) {
    console.error('Change Extension: CSS injection failed:', error);
  }
}

function removeCSS(index) {
  try {
    const style = document.getElementById(`change-ext-style-${index}`);
    if (style) {
      style.remove();
    }
  } catch (error) {
    console.error('Change Extension: CSS removal failed:', error);
  }
}

// --- 2. APPLY OVERRIDES ON LOAD ---
function applySavedOverrides() {
  const domain = window.location.hostname;
  chrome.storage.local.get([domain], (result) => {
    const stack = result[domain];
    if (stack && Array.isArray(stack)) {
      console.log(`Change Extension: Applying ${stack.length} saved overrides for ${domain}`);
      stack.forEach((change, index) => {
        if (change.css) {
          injectCSS(change.css, index);
        } else if (change.code) {
          injectScript(change.code);
        }
      });
    }
  });
}

// Execute immediately when the content script wakes up
applySavedOverrides();

// --- 3. DOM SKELETON EXTRACTOR ---
function isDynamicClass(cls) {
  if (/[:/\[\]%]/.test(cls)) return true; // Filter out tailwind classes with special characters
  if (/^[a-zA-Z]{1,3}\d{3,}/.test(cls)) return true;
  if (/^[a-zA-Z0-9_-]{12,}$/.test(cls) && /\d/.test(cls)) return true;
  if (/^css-[a-zA-Z0-9]+$/.test(cls)) return true;
  if (/^_[a-zA-Z0-9]{4,}$/.test(cls)) return true;
  return false;
}

function isVisible(el) {
  const s = window.getComputedStyle(el);
  if (s.display === 'none') return false;
  if (s.visibility === 'hidden') return false;
  if (s.opacity === '0') return false;
  if (el.offsetParent === null && el.tagName.toLowerCase() !== 'body') return false;
  return true;
}

function getIdentity(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = [...el.classList]
    .filter(c => !isDynamicClass(c))
    .slice(0, 3)
    .map(c => `.${c}`)
    .join('');
  const role = el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : '';
  const label = el.getAttribute('aria-label');
  const ariaLabel = (label && label.length < 30) ? `[aria-label="${label}"]` : '';
  return `${tag}${id}${classes}${role}${ariaLabel}`;
}

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'meta', 'link', 'title', 'head']);

function extractNode(el, depth, maxDepth) {
  if (depth > maxDepth) return null;
  const tag = el.tagName?.toLowerCase();
  if (!tag) return null;
  if (SKIP_TAGS.has(tag)) return null;
  
  // Need a try-catch in case window.getComputedStyle throws (e.g. cross-origin issues)
  try {
    if (!isVisible(el)) return null;
  } catch (e) {
    return null;
  }

  const identity = getIdentity(el);
  const children = [];

  if (tag !== 'svg' && tag !== 'img') {
    const childEls = [...el.children];
    const limited = childEls.length > 20 ? childEls.slice(0, 12) : childEls;
    const overflow = childEls.length > 20 ? childEls.length - 12 : 0;

    for (const child of limited) {
      const node = extractNode(child, depth + 1, maxDepth);
      if (node) children.push(node);
    }
    if (overflow > 0) children.push({ identity: `... and ${overflow} more children`, children: [] });
  }

  // skip elements with no identity and no useful children
  const hasIdentity = el.id || [...el.classList].some(c => !isDynamicClass(c)) ||
                      el.getAttribute('role') || el.getAttribute('aria-label');
  if (!hasIdentity && children.length === 0) return null;

  return { identity, children };
}

function serialize(node, depth) {
  const indent = '  '.repeat(depth);
  let out = `${indent}${node.identity}\n`;
  for (const child of node.children) {
    out += serialize(child, depth + 1);
  }
  return out;
}

function getDOMSkeleton() {
  if (!document.body) {
    return '(body element not ready)';
  }
  const root = extractNode(document.body, 0, 6);
  return root ? serialize(root, 0) : '(could not extract DOM skeleton)';
}

// --- 4. MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'APPLY_CHANGE') {
    if (message.css) {
      injectCSS(message.css, message.index);
    } else if (message.code) {
      injectScript(message.code);
    }
    sendResponse({ success: true, type: 'CHANGE_APPLIED' });
  } else if (message.type === 'UNDO_CHANGE') {
    if (message.isCss) {
      removeCSS(message.index);
    } else {
      injectScript(message.reversalCode);
    }
    sendResponse({ success: true });
  } else if (message.type === 'GET_SKELETON') {
    const skeleton = getDOMSkeleton();
    sendResponse({ success: true, type: 'SKELETON_RESPONSE', skeleton });
  }
  return true; // Keep message channel open for responses
});
