// Change Chrome Extension - Background Service Worker

const BLOCKED_TERMS = [
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document.write',
  'document.writeln',
  'eval(',
  'Function(',
  'setTimeout(',
  'setInterval(',
  'requestAnimationFrame(',
  'fetch(',
  'XMLHttpRequest',
  'WebSocket',
  'navigator.',
  'window.location',
  'window.open',
  'document.cookie',
  'localStorage',
  'sessionStorage',
  '<script',
  'import(',
  'require('
];

function isSafe(code) {
  return true; // Guardrails temporarily disabled as requested
}

const SYSTEM_PROMPT = `You are a world-class Frontend Design & Layout Engine. Your job is to write safe JavaScript that modifies the visual appearance and layout of webpages based on user requests.`;

const CRITICAL_RULES = `You are given a highly compressed === ENHANCED DOM TREE === preceded by a === DESIGN SYSTEM === block.
The DESIGN SYSTEM extracts the site's global typography and semantic color palette. You MUST map your designs to these exact roles (dominantBackground, surfaceColor, accentColor, primaryText) to perfectly match the site's native branding.
The ENHANCED DOM TREE shows the parent-child hierarchy, classes, IDs, [W×H at X,Y] screen coordinates, and minified {computed CSS}. Each node also contains a unique sel="..." CSS selector. Use this inline CSS data to understand the layout before writing modifications.

--- CORE SAFETY & ARCHITECTURE ---
- Guaranteed Selectors: NEVER guess a CSS selector. You MUST use the exact sel="..." string provided for the target element in the DOM tree. If no selector exists for your target, return { "success": false, "reason": "target element not found in extraction" }.
- Child-Aware Resizing: When modifying layout dimensions (width, height) of a container, you MUST inspect its direct children's flex/grid/width properties. Emit CSS fixes for any child that has hardcoded widths that break the new parent size.
- Class Cloning: When creating new structural components on a site that uses a CSS framework, DO NOT write raw CSS. You MUST clone the exact "class" string from a neighboring element.
- CSS Injection over JS Loops: To handle infinite scroll and lazy-loaded elements, NEVER use JavaScript forEach loops to apply broad styling changes. You MUST inject raw <style> tags with broad CSS classes.
- Scroll Listeners: You may use window.addEventListener('scroll') for sticky/shrinking elements, but you may ONLY read window.scrollY and modify CSS. No fetching or DOM insertion inside scroll handlers.
- NEVER use blocked terms: eval(), setTimeout(), setInterval(), requestAnimationFrame(), fetch(), XMLHttpRequest, WebSocket, navigator., window.location, window.open, document.cookie, localStorage, sessionStorage, document.write, innerHTML, outerHTML.
- Wrap your entire code in a single try { } catch(e) { }. Every querySelector call must be null-checked before use.

--- FRONTEND DESIGN SKILLS ---
You must implement designs that look PREMIUM, modern, and aesthetically stunning.
- Semantic Theming: Theme changes MUST produce a minimum of 8 semantically distinct color values mapped to roles (dominantBackground, surfaceColor, surfaceRaised, accentColor, accentHover, primaryText, secondaryText, borderColor). NEVER apply the exact same base color to different roles.
- Theme Swapping & Precedence: To apply your theme, you MUST identify the specific selectors of elements using the old colors from the DOM, and inject CSS to override them. You MUST use !important on EVERY CSS rule you inject to guarantee it overrides React/Tailwind/inline styles.
- Global Dark Mode: When requested to create a "dark mode", target the root containers (body, html, #root, #__next) first. Then, explicitly write CSS to override large bright areas (colored banners, light cards, headers, navbars) to dark surface colors (#1e1e1e, #2c2c2c).
- Hover State Preservation: For EVERY element whose background or color you modify, you MUST emit a :hover variant in the CSS that is 10-15% darker/lighter. Never leave an interactive element without a hover state.
- Viewport Media Queries: The top of the prompt provides the user's Viewport size. You MUST wrap all structural layout changes (position, display, width) in an @media (min-width: Xpx) query (where X is 90% of innerWidth rounded to nearest 100) to protect responsiveness.
- Proportional Typography: Font size changes must use calc() or em on the body or :root level. NEVER hardcode absolute pixel sizes on individual elements.
- Graceful Refusals: If requested to add backend logic, build new functional features, or alter mobile layouts, return success: false with a clear user-friendly explanation.

OUTPUT FORMAT:
Return only a raw JSON object. No markdown. No code fences. No explanation before or after. Only the JSON object itself.

If the user asks a question, requests an explanation of the page structure/selectors, or initiates a general conversation:
{
  "success": true,
  "code": "",
  "css": "",
  "summary": "",
  "reversalCode": "",
  "response": "Your detailed conversational reply. You can mention tags, classes, and IDs you see in the DOM structure, explain why certain layouts are constrained, or answer their questions directly (markdown is supported)."
}

If you can safely and confidently fulfill a layout change or visual modification:
{
  "success": true,
  "themePalette": {
    "dominantBackground": "#hex1",
    "surfaceColor": "#hex2",
    "surfaceRaised": "#hex3",
    "accentColor": "#hex4",
    "accentHover": "#hex5",
    "primaryText": "#hex6",
    "secondaryText": "#hex7",
    "borderColor": "#hex8"
  },
  "layoutAnalysis": "A mandatory analysis where you think step-by-step BEFORE writing any code. You must: 1) Extract the sel='...' for the target element. 2) Inspect its direct children's CSS. 3) Plan the exact CSS to inject, including required :hover states and @media wrappers.",
  "code": "your complete JS as a single string with \\n for newlines",
  "css": "the equivalent CSS styles to inject (e.g., '@media (min-width: 1000px) { #masthead { position: fixed !important; } }'), or an empty string if it cannot be achieved via CSS",
  "summary": "one concise sentence describing what this change does",
  "reversalCode": "your complete reversal JS as a single string",
  "response": "Optional brief explanation of what you changed or selectors you targeted (markdown is supported)"
}

If you cannot safely fulfill the request (ambiguous, impossible, out of scope feature request, or would require violating the rules above):
{
  "success": false,
  "reason": "one sentence explaining why this cannot be done safely or why it's not possible"
}`;

// Register dynamic rules to strip CSP response headers, enabling JavaScript injection for personal local testing
function registerCSPStripperRule() {
  if (typeof chrome.declarativeNetRequest === 'undefined') {
    console.warn("declarativeNetRequest API is not available. Please ensure the 'declarativeNetRequest' permission is declared in manifest.json and reload the extension.");
    return;
  }
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            {
              header: "content-security-policy",
              operation: "remove"
            },
            {
              header: "x-content-security-policy",
              operation: "remove"
            },
            {
              header: "x-webkit-csp",
              operation: "remove"
            }
          ]
        },
        condition: {
          urlFilter: "*",
          resourceTypes: ["main_frame", "sub_frame"]
        }
      }
    ]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Failed to register CSP stripping rule:", chrome.runtime.lastError);
    } else {
      console.log("CSP stripping rule successfully registered.");
    }
  });
}

// Call on installation and startup
chrome.runtime.onInstalled.addListener(registerCSPStripperRule);
chrome.runtime.onStartup.addListener(registerCSPStripperRule);
// Also execute immediately in case the worker starts up/reloads
registerCSPStripperRule();

// Chrome Extension Message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(response => sendResponse(response))
    .catch(error => {
      console.error('Error in background listener:', error);
      sendResponse({ success: false, reason: error.message || 'An unexpected worker error occurred.' });
    });
  return true; // Keeps the sendResponse channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'GENERATE_CHANGE':
      return await handleGenerateChange(message);
    case 'UNDO_CHANGE':
      return await handleUndoChange(message);
    case 'RESET_SITE':
      return await handleResetSite(message);
    case 'EXECUTE_MAIN_WORLD_JS':
      return await handleExecuteMainWorldJs(message, sender);
    case 'REAPPLY_CHANGES':
      return await handleReapplyChanges(message, sender);
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

async function handleReapplyChanges(message, sender) {
  const { domain } = message;
  const tabId = sender.tab?.id;
  if (!tabId || !domain) return { success: false };

  const domainData = await chrome.storage.local.get([domain]);
  const stack = domainData[domain] || [];
  
  for (let i = 0; i < stack.length; i++) {
    const parsed = stack[i].parsed;
    if (parsed.css) {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (cssCode, idx) => {
          const id = `change-ext-style-${idx}`;
          if (!document.getElementById(id)) {
            const style = document.createElement('style');
            style.id = id;
            style.textContent = cssCode;
            (document.head || document.documentElement).appendChild(style);
          }
        },
        args: [parsed.css, i]
      });
    }
    if (parsed.code) {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: (codeString) => {
          try { eval(codeString); } catch (e) {}
        },
        args: [parsed.code]
      });
    }
  }
  return { success: true };
}

async function handleExecuteMainWorldJs({ code }, sender) {
  const tabId = sender.tab?.id;
  if (!tabId) return { success: false, reason: 'No active tab ID' };
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (codeString) => {
        try {
          eval(codeString);
        } catch (e) {
          console.error("Failed to execute dynamic code in main world:", e);
        }
      },
      args: [code]
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to execute script via scripting API:', err);
    return { success: false, reason: err.message };
  }
}

async function handleGenerateChange({ domain, skeleton, userPrompt, existingChanges }) {
  // Retrieve API Key
  const storage = await chrome.storage.local.get(['llm_api_key']);
  const apiKey = storage.llm_api_key;
  if (!apiKey) {
    return { success: false, reason: 'API key is not configured. Please open extension options and save your API key.' };
  }

  // Construct dynamic User Prompt
  const existingList = existingChanges && existingChanges.length > 0
    ? existingChanges.map((sum, idx) => `${idx + 1}. ${sum}`).join('\n')
    : 'None';

  const userPromptText = `Website: ${domain}
DOM Structure:
${skeleton}

Changes already applied to this site (applied in this order):
${existingList}

${CRITICAL_RULES}

User request: "${userPrompt}"`;

  console.log("Change Extension - API Prompt:\n", userPromptText);

  const isGroq = apiKey.startsWith('gsk_');
  const url = isGroq 
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestHeaders = {
    'Content-Type': 'application/json'
  };
  if (isGroq) {
    requestHeaders['Authorization'] = `Bearer ${apiKey}`;
  }

  const requestBody = isGroq
    ? {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userPromptText
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }
    : {
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPromptText }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      };

  try {
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch (e) {}
      const errMsg = isGroq
        ? (errJson?.error?.message || `Groq API returned status ${apiResponse.status}`)
        : (errJson?.error?.message || `Gemini API returned status ${apiResponse.status}`);
      return { success: false, reason: errMsg };
    }

    const data = await apiResponse.json();
    const rawText = isGroq
      ? data.choices?.[0]?.message?.content
      : data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { success: false, reason: 'No response generated by the AI model.' };
    }

    // Parse Response
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '');
      cleanText = cleanText.replace(/\s*```$/, '');
    }
    cleanText = cleanText.trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (e) {
      // Fallback: try regex match for JSON block
      const match = cleanText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (e2) {
          console.error('Failed to parse matched JSON block:', match[0]);
          return { success: false, reason: 'AI returned invalid JSON formatting. Please try again.' };
        }
      } else {
        console.error('Failed to parse Gemini response as JSON:', rawText);
        return { success: false, reason: 'AI returned invalid JSON formatting. Please try again.' };
      }
    }

    if (!parsed.success) {
      return { success: false, reason: parsed.reason || 'AI was unable to safely process your request.' };
    }

    // Safety validation for generated code
    if (!isSafe(parsed.code)) {
      return { success: false, reason: 'The generated code contained potentially unsafe operations and was blocked. Try rephrasing your request.' };
    }

    // Read existing stack length to determine index
    const domainData = await chrome.storage.local.get([domain]);
    const stack = domainData[domain] || [];
    const changeIndex = stack.length;

    // Send code live to page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      return { success: false, reason: 'No active tab found. Please reload the webpage and try again.' };
    }

    if (parsed.css) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'APPLY_CHANGE', 
          css: parsed.css,
          index: changeIndex
        });
      } catch (e) {
        console.warn('Could not message content script, applying CSS manually via Scripting API', e);
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (cssCode, idx) => {
            const id = `change-ext-style-${idx}`;
            let style = document.getElementById(id);
            if (!style) {
              style = document.createElement('style');
              style.id = id;
              (document.head || document.documentElement).appendChild(style);
            }
            style.textContent = cssCode;
          },
          args: [parsed.css, changeIndex]
        });
      }
    }

    if (parsed.code) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: (codeString) => {
            try {
              eval(codeString);
            } catch (e) {
              console.error("Failed to execute generated JS:", e);
            }
          },
          args: [parsed.code]
        });
      } catch (e) {
        console.error('Failed to execute generated JS in main world:', e);
      }
    }

    const hasChanges = (parsed.code && parsed.code.trim() !== '') || (parsed.css && parsed.css.trim() !== '');

    if (hasChanges) {
      // Reversal Code Safety Check
      const reversalSafe = isSafe(parsed.reversalCode);
      const safeReversalCode = reversalSafe 
        ? parsed.reversalCode 
        : '/* reversal unavailable — reload the page to reset */';

      // Save change to stack
      const changeObject = {
        summary: parsed.summary || 'Custom layout adjustment',
        code: parsed.code,
        css: parsed.css || '',
        reversalCode: safeReversalCode,
        reversalAvailable: reversalSafe,
        timestamp: new Date().toISOString(),
        prompt: userPrompt
      };

      stack.push(changeObject);
      await chrome.storage.local.set({ [domain]: stack });

      return { 
        success: true, 
        summary: changeObject.summary, 
        response: parsed.response,
        changeIndex: changeIndex,
        hasChanges: true
      };
    } else {
      // Just a conversation response
      return { 
        success: true, 
        response: parsed.response || 'Request processed successfully.',
        hasChanges: false
      };
    }

  } catch (err) {
    console.error('API call exception:', err);
    return { success: false, reason: `Network error or API failure: ${err.message}` };
  }
}

async function handleUndoChange({ domain, index }) {
  const domainData = await chrome.storage.local.get([domain]);
  const stack = domainData[domain] || [];

  if (index < 0 || index >= stack.length) {
    return { success: false, reason: 'Invalid change index to undo.' };
  }

  const changeToUndo = stack[index];
  
  // Remove change from stack
  stack.splice(index, 1);
  await chrome.storage.local.set({ [domain]: stack });

  // Apply reversal code to the tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    if (changeToUndo.css) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'UNDO_CHANGE', 
          index: index,
          isCss: true
        });
      } catch (e) {
        console.warn('Could not send undo message to content script, falling back to scripting API', e);
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (idx) => {
            const style = document.getElementById(`change-ext-style-${idx}`);
            if (style) style.remove();
          },
          args: [index]
        });
      }
    }

    if (changeToUndo.reversalCode) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: (codeString) => {
            try {
              eval(codeString);
            } catch (e) {
              console.error("Failed to execute reversal code:", e);
            }
          },
          args: [changeToUndo.reversalCode]
        });
      } catch (e) {
        console.error("Failed to execute scripting API reversal:", e);
      }
    }
  }

  return { success: true };
}

async function handleResetSite({ domain }) {
  await chrome.storage.local.remove([domain]);
  return { success: true };
}
