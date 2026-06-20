// Change Chrome Extension - Content Script

// --- 1. CSS INJECTION HELPERS ---
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
        }
        if (change.code) {
          chrome.runtime.sendMessage({ type: 'EXECUTE_MAIN_WORLD_JS', code: change.code });
        }
      });
    }
  });
}

// Execute immediately when the content script wakes up
applySavedOverrides();

// --- 3. DYNAMIC DOM EXTRACTION ENGINE (TWO-LAYER) ---
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'meta', 'link', 'title', 'head', 'base']);

function isDynamic(cls) {
  if (/^[a-zA-Z]{1,3}\d{3,}/.test(cls)) return true;       // ytp4892, yt-3Kd
  if (/^[a-zA-Z0-9_-]{12,}$/.test(cls) && /\d/.test(cls)) return true;  // hashed strings
  if (/^css-[a-zA-Z0-9]+$/.test(cls)) return true;          // emotion/styled-components
  if (/^_[a-zA-Z0-9]{4,}$/.test(cls)) return true;          // CSS modules
  return false;
}

function getStableClasses(el) {
  const classes = [...el.classList];
  const stable = classes.filter(cls => {
    if (/^(ytd|md|v|chakra|Mui)-/i.test(cls)) return true;
    if (cls.includes('__') || cls.includes('--')) return true;
    if (isDynamic(cls)) return false;
    return true;
  });
  return stable;
}

function getFingerprint(el) {
  const tag = el.tagName.toLowerCase();
  const stable = getStableClasses(el).sort();
  return tag + (stable.length > 0 ? '.' + stable.join('.') : '');
}

function isVisible(el) {
  if (!el.isConnected) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'body' || tag === 'html') return true;
  try {
    // 1. Check direct properties on the element itself
    const elStyle = window.getComputedStyle(el);
    if (elStyle.display === 'none') return false;
    if (elStyle.visibility === 'hidden') return false;
    if (elStyle.opacity === '0') return false;

    // 2. Check if any ancestor is hidden via display: none
    let parent = el.parentElement;
    while (parent && parent.tagName.toLowerCase() !== 'html') {
      try {
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.display === 'none') return false;
      } catch (e) {}
      parent = parent.parentElement;
    }
  } catch (e) {
    return false;
  }
  return true;
}

function getLayoutCSS(el) {
  try {
    const s = window.getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const parts = [];
    
    const d = s.display;
    if (d === 'flex' || d === 'inline-flex' || d === 'grid' || d === 'inline-grid' ||
        d === 'none' || d === 'contents' || d === 'inline-block') {
      parts.push('d:' + d);
    }
    
    if (s.position !== 'static') parts.push('pos:' + s.position);
    
    if (d === 'flex' || d === 'inline-flex') {
      if (s.flexDirection !== 'row') parts.push('fd:' + s.flexDirection);
      const jc = s.justifyContent;
      if (jc && jc !== 'normal' && jc !== 'flex-start') parts.push('jc:' + jc);
      const ai = s.alignItems;
      if (ai && ai !== 'normal' && ai !== 'stretch') parts.push('ai:' + ai);
      if (s.gap && s.gap !== '0px' && s.gap !== 'normal') parts.push('gap:' + s.gap);
      if (s.flexWrap && s.flexWrap !== 'nowrap') parts.push('fw:' + s.flexWrap);
    }
    
    if (d === 'grid' || d === 'inline-grid') {
      if (s.gridTemplateColumns && s.gridTemplateColumns !== 'none') {
        let gtc = s.gridTemplateColumns;
        if (gtc.length > 30) gtc = gtc.slice(0, 30) + '…';
        parts.push('gtc:' + gtc);
      }
    }
    
    if (s.minWidth && s.minWidth !== '0px' && s.minWidth !== 'auto') parts.push('mw:' + s.minWidth);
    if (s.maxWidth && s.maxWidth !== 'none') parts.push('mxw:' + s.maxWidth);
    if (s.minHeight && s.minHeight !== '0px' && s.minHeight !== 'auto') parts.push('mh:' + s.minHeight);
    if (s.maxHeight && s.maxHeight !== 'none') parts.push('mxh:' + s.maxHeight);
    
    const ox = s.overflowX, oy = s.overflowY;
    if (ox === oy && ox !== 'visible') {
      parts.push('of:' + ox);
    } else {
      if (ox !== 'visible') parts.push('of-x:' + ox);
      if (oy !== 'visible') parts.push('of-y:' + oy);
    }
    
    const pt = s.paddingTop, pr = s.paddingRight, pb = s.paddingBottom, pl = s.paddingLeft;
    if (pt === pr && pr === pb && pb === pl) {
      if (pt !== '0px') parts.push('p:' + pt);
    } else if (pt !== '0px' || pr !== '0px' || pb !== '0px' || pl !== '0px') {
      parts.push(`p:${pt} ${pr} ${pb} ${pl}`);
    }
    
    const textTags = new Set(['a','button','h1','h2','h3','h4','h5','h6','p','span','label','li','input','textarea']);
    if (textTags.has(tag)) {
      parts.push('fs:' + s.fontSize);
      parts.push('c:' + s.color);
    }
    
    const bg = s.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') parts.push('bg:' + bg);
    
    const bgImg = s.backgroundImage;
    if (bgImg && bgImg !== 'none') {
      let bgI = bgImg;
      if (bgI.length > 30) bgI = bgI.slice(0, 30) + '…';
      parts.push('bg-img:' + bgI);
    }
    
    const br = s.borderRadius;
    if (br && br !== '0px') parts.push('br:' + br);
    if (s.opacity !== '1') parts.push('op:' + s.opacity);
    
    if (tag === 'svg' || tag === 'path') {
      if (s.fill && s.fill !== 'none') parts.push('fill:' + s.fill);
      if (s.stroke && s.stroke !== 'none') parts.push('stroke:' + s.stroke);
    }
    
    return parts.length > 0 ? '{' + parts.join('; ') + '}' : '';
  } catch (e) {
    return '';
  }
}

function getUniqueSelector(el) {
  if (el.id) return `#${el.id}`;
  const path = [];
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    let segment = current.tagName.toLowerCase();
    if (current.id) {
      path.unshift(`#${current.id}`);
      break;
    }
    const siblings = current.parentElement ? [...current.parentElement.children].filter(s => s.tagName === current.tagName) : [];
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      segment += `:nth-of-type(${index})`;
    }
    path.unshift(segment);
    current = current.parentElement;
  }
  return path.join(' > ');
}

function buildTree(el, depth = 0) {
  if (depth > 12) return null;
  if (!isVisible(el)) return null;
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return null;

  const cssStr = getLayoutCSS(el);
  const stableClasses = getStableClasses(el);
  const classesStr = stableClasses.slice(0, 3).length > 0 ? '.' + stableClasses.slice(0, 3).join('.') : '';
  const idStr = el.id ? `#${el.id}` : '';
  
  let roleAttr = el.getAttribute('role');
  const roleStr = roleAttr ? `[role=${roleAttr}]` : '';
  
  let ariaAttr = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder');
  const ariaStr = (ariaAttr && ariaAttr.length < 30) ? `[aria="${ariaAttr}"]` : '';
  
  let textContent = '';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    textContent = el.value || el.getAttribute('placeholder') || '';
  } else {
    textContent = el.innerText || '';
  }
  textContent = textContent.trim().replace(/\s+/g, ' ');
  if (textContent.length > 40) textContent = textContent.slice(0, 40) + '…';
  const textStr = textContent ? `["${textContent}"]` : '';
  
  const isMeaningfulSemantics = new Set([
    'a', 'button', 'input', 'select', 'textarea',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'img', 'video', 'svg', 'form'
  ]).has(tag);
  
  const hasMetadata = !!el.id || stableClasses.length > 0 || roleAttr || ariaAttr || textContent;
  
  // MEANINGLESS WRAPPER ELIMINATION
  if (!isMeaningfulSemantics && !hasMetadata && !cssStr && el.children.length === 1 && tag !== 'svg') {
    return buildTree(el.children[0], depth); // Flatten tree! Do not increment depth.
  }

  const uniqueSelector = getUniqueSelector(el);
  const identityLine = `${tag}${idStr}${classesStr}${roleStr}${ariaStr}${textStr ? ' ' + textStr : ''} sel="${uniqueSelector}"`;

  let geomStr = '';
  try {
    const rect = el.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    const x = Math.round(rect.left);
    const y = Math.round(rect.top);
    if (w > 0 && h > 0) geomStr = `[${w}×${h} at ${x},${y}]`;
  } catch(e) {}
  
  const fullLine = `${identityLine} ${geomStr} ${cssStr}`.trim().replace(/\s+/g, ' ');

  const childrenNodes = [];
  if (tag !== 'svg' && depth < 12) {
    const childEls = [...el.children];
    
    // Deduplication frequencies
    const fingerprintCounts = {};
    for (const child of childEls) {
      if (!isVisible(child) || SKIP_TAGS.has(child.tagName.toLowerCase())) continue;
      const fp = getFingerprint(child);
      fingerprintCounts[fp] = (fingerprintCounts[fp] || 0) + 1;
    }
    
    // Sibling traversal
    const processed = [];
    const seenCounts = {};
    for (let i = 0; i < childEls.length; i++) {
      const child = childEls[i];
      if (!isVisible(child) || SKIP_TAGS.has(child.tagName.toLowerCase())) continue;
      const fp = getFingerprint(child);
      seenCounts[fp] = (seenCounts[fp] || 0) + 1;
      const total = fingerprintCounts[fp];
      
      if (total >= 3) {
        if (seenCounts[fp] <= 2) {
          processed.push({ type: 'element', element: child });
        } else if (seenCounts[fp] === 3) {
          processed.push({ 
            type: 'placeholder-dedup', 
            text: `... ×${total - 2} more identical siblings (${fp})`,
            fingerprint: fp,
            count: total - 2
          });
        }
      } else {
        processed.push({ type: 'element', element: child });
      }
    }
    
    // Limit to 60 children
    let finalChildren = processed;
    if (processed.length > 60) {
      finalChildren = processed.slice(0, 45);
      let skippedCount = 0;
      for (let i = 45; i < processed.length; i++) {
        if (processed[i].type === 'element') skippedCount += 1;
        else if (processed[i].type === 'placeholder-dedup') skippedCount += processed[i].count + 1;
      }
      finalChildren.push({ type: 'placeholder-limit', text: `... ×${skippedCount} more children` });
    }
    
    for (const item of finalChildren) {
      if (item.type === 'element') {
        const childNode = buildTree(item.element, depth + 1);
        if (childNode) childrenNodes.push(childNode);
      } else if (item.type === 'placeholder-dedup') {
        childrenNodes.push({ isPlaceholder: true, text: item.text });
      } else if (item.type === 'placeholder-limit') {
        childrenNodes.push({ isPlaceholder: true, text: item.text });
      }
    }
  }
  
  if (!hasMetadata && childrenNodes.length === 0 && tag !== 'svg') {
    return null;
  }
  
  return {
    fullLine,
    children: childrenNodes,
    isPlaceholder: false
  };
}

function serializeTree(node, depth = 0) {
  if (node.isPlaceholder) {
    const indent = '  '.repeat(depth);
    return `${indent}${node.text}\n`;
  }
  
  const indent = '  '.repeat(depth);
  let out = `${indent}${node.fullLine}\n`;
  
  for (const child of node.children) {
    out += serializeTree(child, depth + 1);
  }
  
  return out;
}

function extractDesignTokens() {
  const tokens = {};
  try {
    const bodyStyle = window.getComputedStyle(document.body);
    tokens.typography = bodyStyle.fontFamily;
  } catch(e) {}

  const allEls = document.querySelectorAll('div, section, header, nav, main, footer, span, p, h1, h2, h3, button, a');
  const bgCounts = {};
  const colorCounts = {};
  
  allEls.forEach(el => {
    try {
      const s = window.getComputedStyle(el);
      const bg = s.backgroundColor;
      const col = s.color;
      
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        bgCounts[bg] = (bgCounts[bg] || 0) + 1;
      }
      if (col && col !== 'rgba(0, 0, 0, 0)' && col !== 'transparent') {
        colorCounts[col] = (colorCounts[col] || 0) + 1;
      }
    } catch(e) {}
  });
  
  const topBgs = Object.entries(bgCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  const topCols = Object.entries(colorCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  
  tokens.dominantBackground = topBgs[0] || 'unknown';
  tokens.surfaceColor = topBgs[1] || 'unknown';
  tokens.accentColor = topBgs[2] || 'unknown';
  tokens.primaryText = topCols[0] || 'unknown';
  tokens.secondaryText = topCols[1] || 'unknown';

  let out = `=== DESIGN SYSTEM ===\n`;
  out += `Typography: ${tokens.typography || 'unknown'}\n`;
  out += `dominantBackground: ${tokens.dominantBackground} (page bg, darkest layer)\n`;
  out += `surfaceColor: ${tokens.surfaceColor} (cards, panels, raised surfaces)\n`;
  out += `accentColor: ${tokens.accentColor} (brand color, CTAs, active states)\n`;
  out += `primaryText: ${tokens.primaryText} (headings, body)\n`;
  out += `secondaryText: ${tokens.secondaryText} (captions, metadata)\n`;
  
  return out;
}

function getCustomDOMSkeleton() {
  if (!document.body) {
    return '(body element not ready)';
  }
  const designSystem = extractDesignTokens();
  const root = buildTree(document.body, 0);
  if (!root) return '(could not extract DOM skeleton)';
  
  const treeString = serializeTree(root, 0);
  const viewport = `Viewport: ${window.innerWidth}x${window.innerHeight}`;
  return `${designSystem}\n${viewport}\n=== ENHANCED DOM TREE ===\n${treeString}\n`;
}

// --- 4. MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'APPLY_CHANGE') {
    if (message.css) {
      injectCSS(message.css, message.index);
    }
    sendResponse({ success: true, type: 'CHANGE_APPLIED' });
  } else if (message.type === 'UNDO_CHANGE') {
    if (message.isCss) {
      removeCSS(message.index);
    }
    sendResponse({ success: true });
  } else if (message.type === 'GET_SKELETON') {
    const skeleton = getCustomDOMSkeleton();
    console.log("Change Extension - Extracted DOM Skeleton:\n", skeleton);
    sendResponse({ success: true, type: 'SKELETON_RESPONSE', skeleton });
  }
  return true; // Keep message channel open for responses
});

// --- 5. SPA NAVIGATION OBSERVER ---
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    try {
      chrome.runtime.sendMessage({ type: 'REAPPLY_CHANGES', domain: window.location.hostname });
    } catch(e) {}
  }
});
if (document.body) {
  observer.observe(document.body, { subtree: true, childList: true });
}
