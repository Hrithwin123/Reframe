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
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'meta', 'link', 'title', 'head', 'base']);

function isVisible(el) {
  const s = window.getComputedStyle(el);
  if (s.display === 'none') return false;
  if (s.visibility === 'hidden') return false;
  if (s.opacity === '0') return false;
  if (el.offsetParent === null && el.tagName.toLowerCase() !== 'body') return false;
  return true;
}

function truncateText(text) {
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function getIdentity(el) {
  let identity = el.tagName.toLowerCase();
  
  // Replace SVG internals entirely
  if (identity === 'svg') return 'svg';

  if (el.id) {
    identity += `#${el.id}`;
  }

  // Keep all classes
  const classes = [...el.classList];
  if (classes.length > 0) {
    identity += '.' + classes.join('.');
  }

  // Meaningful attributes
  const attrNames = ['href', 'src', 'placeholder', 'type', 'alt', 'aria-label', 'role', 'name', 'value'];
  for (const attr of attrNames) {
    const val = el.getAttribute(attr);
    if (val) {
      identity += `[${attr}="${val}"]`;
    }
  }

  return identity;
}

function getDirectText(el) {
  let text = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent + ' ';
    }
  }
  return truncateText(text);
}

function extractNode(el) {
  const tag = el.tagName?.toLowerCase();
  if (!tag) return null;
  if (SKIP_TAGS.has(tag)) return null;

  try {
    if (!isVisible(el)) return null;
  } catch (e) {
    return null;
  }

  const identity = getIdentity(el);
  const text = getDirectText(el);
  
  const node = { identity, text, children: [] };

  if (tag !== 'svg') {
    for (const child of el.children) {
      const childNode = extractNode(child);
      if (childNode) {
        node.children.push(childNode);
      }
    }
  }

  return node;
}

function serializeNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  let line = `${indent}${node.identity}`;
  if (node.text) {
    line += ` {${node.text}}`;
  }
  line += '\n';

  let out = line;
  for (let i = 0; i < node.children.length; i++) {
    out += serializeNode(node.children[i], depth + 1);
  }

  return out;
}

function getDOMSkeleton() {
  if (!document.body) {
    return '(body element not ready)';
  }
  const root = extractNode(document.body);
  if (!root) return '(could not extract DOM skeleton)';
  
  return serializeNode(root, 0);
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
