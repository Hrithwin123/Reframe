// Reframe Chrome Extension - Background Service Worker

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

const PROMPT_TURN_1_ANALYSIS = `You are a Senior Frontend Developer in ANALYSIS mode. Do not write any code. Your only job is to understand the current state of the page.

User request: "{userPrompt}"

Step 1 - Analyse only. Identify:
- What is the current background color of the page?
- What styling system is being used (tailwind/css-variables/inline/stylesheet)?
- List every distinct surface type visible (navbar, cards, inputs, modals, badges etc)
- For each surface, what is its current background color?
- Which surfaces contain text that will need recoloring?
- Are there any elements that should NOT be modified (brand colors, images, status badges)?

Return ONLY valid JSON in this exact format:
{
  "stylingMethod": "tailwind|css-variables|stylesheet|inline",
  "cssVariablesExist": true|false,
  "cssVariablesUsed": true|false,
  "surfaces": [
    { "name": "navbar", "selector": "#navbar", "currentBg": "#ffffff", "hasText": true }
  ],
  "preserveElements": ["hero gradient", "orange buttons"],
  "textElements": [
    { "selector": "h3.item-title", "currentColor": "#111", "surface": "food card" }
  ]
}`;

const PROMPT_TURN_2_PLANNING = `You are a Senior Frontend Developer & UI/UX Designer in PLANNING mode. Do not write any code yet.
Based on your analysis, create a complete change plan for the user's request.

CRITICAL DESIGN AESTHETICS:
1. **Use Rich Aesthetics**: The user should be WOWED at first glance. Use best practices in modern web design (e.g., vibrant but harmonious colors, sleek dark modes, glassmorphism, dynamic micro-animations).
2. **Prioritize Visual Excellence**: Avoid generic colors (plain red, blue, green). Use curated, premium palettes (e.g., tailored HSL colors, smooth gradients). Ensure typography is modern and sleek.
3. **Use a Dynamic Design**: Interfaces must feel responsive and alive. Plan for hover effects, active states, and smooth transitions on interactive elements.
4. **Premium Designs**: Make the design feel state-of-the-art. Failure to create a visually stunning layout is UNACCEPTABLE.
5. **Color Theory & Layered Contrast (CRITICAL)**: Do NOT blindly assign the same color to a container and its contents! You MUST check the parent's background color before assigning text color. If a surface is dark, its text MUST be light. Ensure distinct contrast between layered surfaces (e.g., page background vs card background) so nothing becomes invisible.

Step 2 - Plan only. For each surface identified:
- What should its new background color be?
- What text elements inside it need recoloring and to what?
- What is the correct CSS approach given the styling method detected?
- List any dependent elements (if you change X, what else must change?)
- What elements must be explicitly preserved?

Return ONLY valid JSON in this exact format:
{
  "approach": "explanation of overall strategy in one paragraph",
  "paletteMap": {
    "pageBackground": "#0F0F0F",
    "navbarBackground": "#1A1A1A",
    "cardBackground": "#242424",
    "cardHover": "#2C2C2C",
    "primaryText": "#F5F5F5",
    "secondaryText": "#A0A0A0",
    "mutedText": "#606060",
    "borderColor": "#2A2A2A",
    "inputBackground": "#1A1A1A",
    "preservedAccent": "#FF5733"
  },
  "changes": [
    {
      "target": "navbar",
      "selector": "#navbar",
      "property": "background",
      "from": "#ffffff",
      "to": "#1A1A1A",
      "dependents": ["navbar text -> #F5F5F5"]
    }
  ],
  "preservedElements": [
    { "selector": ".hero", "reason": "brand gradient, do not touch" }
  ]
}`;

const PROMPT_TURN_3_CODE = `You are a Senior Frontend Developer & UI/UX Designer in CODE GENERATION mode.
Based on your analysis and premium design plan, now write the complete JavaScript and CSS.

CRITICAL DESIGN AESTHETICS:
- Implement the premium design outlined in Step 2.
- Inject smooth transitions (e.g., 'transition: all 0.2s ease-in-out') on interactive elements.
- Use box-shadows, subtle gradients, and glassmorphism (backdrop-filter) where appropriate to create depth.
- **GUARANTEE VISIBILITY**: Ensure perfect text contrast. Never make text the same color as its parent background. Ensure cards and nested surfaces visually separate from the main page background.
- The final result must look incredibly premium and modern.
Step 3 - Code only. Rules:
- Follow the paletteMap exactly, do not deviate from planned colors
- Address every surface in your changes list
- For every surface you modify, explicitly handle all text descendants
- Use the approach determined in Step 2 based on styling method
- Every selector must be null-checked if using JS, but prioritize CSS <style> injection.
- Include hover states for every interactive element
- Do not touch preserved elements
- ALWAYS use !important on your CSS overrides.
- Use explicit CSS selectors from Turn 1.
- All generated JavaScript MUST be fully idempotent. Use a unique guard ID to prevent double-execution, but ONLY set it to true if the target element exists. Wrap the entire JS block like this:
  if (!window.__reframeExt_CHANGEID__) {
    const target = document.querySelector('.target-element');
    if (target) {
      window.__reframeExt_CHANGEID__ = true;
      try {
        // actual change code here
      } catch(e) {}
    }
  }
  Replace CHANGEID with a unique string based on what the change does (e.g. darkmode, navbar_bottom, hide_sidebar). This ensures re-running on SPA navigation skips already-applied changes without re-running them unnecessarily, while allowing retries if the page hasn't finished rendering yet.
Return ONLY valid JSON in this exact format:
{
  "thought_process": "Brief step-by-step reasoning for how you will write the CSS/JS to achieve the goal.",
  "css": "complete CSS string (e.g. 'body { background: #111 !important; }')",
  "js": "complete JS string (or empty string)", 
  "selectorsUsed": ["#navbar", ".card"],
  "estimatedElementsAffected": 47
}`;

const PROMPT_TURN_4_REVIEW = `You are a Senior Frontend Developer in REVIEW mode.
Review the code you just generated against your initial analysis.

Step 4 - Review your generated code. Check for:
- Any surface from your analysis that was NOT addressed in the code?
- **VISIBILITY CHECK (CRITICAL)**: Did you make any text the exact same or similar color to its background? (e.g., dark text on a dark card). If so, fix it immediately so it is readable.
- Are nested surfaces clearly distinguishable from the page background?
- Any selector that might not exist or is ambiguous?
- Any preserved element that was accidentally modified?
- Any missing hover states on interactive elements?
- Is the generated JavaScript idempotent? (Running it twice should not duplicate elements or styles)

If the code is perfectly correct and highly visible, return ready: true.
If the code missed anything or created visibility issues, write the completely fixed CSS and JS and return ready: true.

Return ONLY valid JSON in this exact format:
{
  "thought_process": "Brief step-by-step review of the generated code against the constraints.",
  "missedSurfaces": ["input placeholder text"],
  "fixedCode": { "css": "corrected CSS", "js": "corrected JS" },
  "confidence": 95,
  "ready": true,
  "summary": "Brief summary of what this change does (for the UI)",
  "response": "Brief chat response explaining the result"
}`;

// Register dynamic rules to strip CSP response headers, enabling JavaScript injection for personal local testing
function registerCSPStripperRule() {
  if (typeof chrome.declarativeNetRequest === 'undefined') {
    console.warn("declarativeNetRequest API is not available. Please ensure the 'declarativeNetRequest' permission is declared in manifest.json and reload the extension.");
    return;
  }
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [1, 2],
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
      },
      {
        id: 2,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "Origin", operation: "remove" }
          ]
        },
        condition: {
          urlFilter: "*11434*",
          resourceTypes: ["xmlhttprequest", "other"]
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
    case 'REAPPLY_JS':
      return await handleReapplyJS(message, sender);
    case 'RE_EXECUTE_CHANGE':
      return await handleReExecuteChange(message, sender);
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}


// --- REAPPLY_JS: Called by content.js at document_idle and on SPA navigation ---
// CSS is already handled by content-early.js. This only handles JS.
async function handleReapplyJS(message, sender) {
  const { domain } = message;
  const tabId = sender.tab?.id;
  if (!tabId || !domain) return { success: false };

  console.log(`[Reframe Ext Background] Received REAPPLY_JS for domain: ${domain}, tabId: ${tabId}`);

  const domainData = await chrome.storage.local.get([domain]);
  const data = domainData[domain];
  if (!data || Array.isArray(data) || !data.changes || data.changes.length === 0) {
    console.log(`[Reframe Ext Background] No JS changes to re-apply for ${domain}.`);
    return { success: true };
  }

  console.log(`[Reframe Ext Background] Found ${data.changes.length} changes. Iterating over JS...`);

  for (let i = 0; i < data.changes.length; i++) {
    const change = data.changes[i];
    if (!change.js) continue;
    try {
      console.log(`[Reframe Ext Background] Re-executing JS for change index [${i}] (${change.summary})`);
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (code) => {
          try { 
            eval(code); 
            console.log('[Reframe Ext Page Context] Successfully evaluated JS snippet.');
          } catch (e) { 
            console.warn('[Reframe Ext Page Context] JS evaluation error:', e); 
          }
        },
        args: [change.js]
      });
    } catch (e) {
      console.warn(`[Reframe Ext Background] Failed to executeScript for change [${i}]:`, e);
    }
  }
  return { success: true };
}

async function handleReExecuteChange(message, sender) {
  const { domain, index } = message;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab?.id;
  
  if (!tabId || !domain) return { success: false, reason: 'No active tab found.' };

  const domainData = await chrome.storage.local.get([domain]);
  const data = domainData[domain];
  if (!data || !data.changes || !data.changes[index]) {
    return { success: false, reason: 'Change not found in storage.' };
  }

  const change = data.changes[index];
  console.log(`[Reframe Ext Background] Forcing manual re-execution of change [${index}] (${change.summary})`);

  // Force re-inject CSS just in case
  if (change.css) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (cssCode) => {
          let style = document.getElementById('reframe-ext-persistent');
          if (style && !style.textContent.includes(cssCode)) {
            style.textContent += '\n\n' + cssCode;
          }
        },
        args: [change.css]
      });
    } catch(e) { console.warn(e); }
  }

  // Force re-inject JS
  if (change.js) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (code) => {
          try { 
            eval(code); 
            console.log('[Reframe Ext Page Context] Successfully forced manual re-evaluation of JS snippet.');
          } catch (e) { 
            console.warn('[Reframe Ext Page Context] Manual JS evaluation error:', e); 
          }
        },
        args: [change.js]
      });
    } catch (e) {
      console.warn(`[Reframe Ext Background] Failed manual JS executeScript for change [${index}]:`, e);
      return { success: false, reason: e.message };
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
  // Retrieve API Key and Model Name
  const storage = await chrome.storage.local.get(['llm_api_key', 'llm_model_name']);
  let apiKey = storage.llm_api_key;
  let modelName = storage.llm_model_name;

  if (!apiKey) {
    return { success: false, reason: 'API key is not configured. Please open extension options and save your API key.' };
  }

async function callLLM(apiKey, systemPrompt, userText, modelName) {
  const isGroq = apiKey.startsWith('gsk_');
  const isOpenRouter = apiKey.startsWith('sk-or-');
  const isOAI = isGroq || isOpenRouter;

  let url;
  if (isGroq) url = 'https://api.groq.com/openai/v1/chat/completions';
  else if (isOpenRouter) url = 'https://openrouter.ai/api/v1/chat/completions';
  else url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestHeaders = {
    'Content-Type': 'application/json'
  };
  if (isOAI) {
    requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    if (isOpenRouter) {
      requestHeaders['HTTP-Referer'] = 'https://github.com/Harshith404/Reframe';
      requestHeaders['X-Title'] = 'Reframe Reframe Extension';
    }
  }

  let requestBody;
  if (isOAI) {
    let targetModel = 'llama-3.3-70b-versatile'; // We can safely use 70b now because the 429 auto-retry handles the limits!
    if (isOpenRouter) targetModel = 'openai/gpt-oss-120b';
    if (modelName) targetModel = modelName; // Override if provided

    requestBody = {
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        temperature: 0.2
      };
      
    // Apply json_object format for native OpenAI/Groq endpoints
    requestBody.response_format = { type: 'json_object' };
  } else {
    requestBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };
  }

  const apiResponse = await fetch(url, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(requestBody)
  });

  if (!apiResponse.ok) {
    const errText = await apiResponse.text();
    let errJson;
    try { errJson = JSON.parse(errText); } catch (e) {}
    
    // Auto-retry for 429 Rate Limits
    if (apiResponse.status === 429) {
      const errMsg = errJson?.error?.message || "";
      const match = errMsg.match(/try again in ([\d\.]+)s/);
      let waitTime = 10000; // default 10s
      if (match && match[1]) {
        waitTime = Math.ceil(parseFloat(match[1])) * 1000 + 1000; // add 1s buffer
      }
      console.warn(`Rate limit hit. Sleeping for ${waitTime/1000}s...`);
      
      // Send a UI broadcast if running inside the pipeline
      try {
        chrome.runtime.sendMessage({ type: 'PIPELINE_STATUS', step: `Rate limit hit! Waiting ${Math.round(waitTime/1000)}s...` });
      } catch (e) {}

      await new Promise(resolve => setTimeout(resolve, waitTime));
      return await callLLM(apiKey, systemPrompt, userText, modelName); // Recursive retry
    }

    const errMsg = isGroq
      ? (errJson?.error?.message || `Groq API returned status ${apiResponse.status}`)
      : isOpenRouter
      ? (errJson?.error?.message || `OpenRouter API returned status ${apiResponse.status}`)
      : (errJson?.error?.message || `Gemini API returned status ${apiResponse.status}`);
    throw new Error(errMsg);
  }

  const data = await apiResponse.json();
  const rawText = isOAI
    ? data.choices?.[0]?.message?.content
    : data.candidates?.[0]?.content?.parts?.[0]?.text;
    
  if (!rawText) throw new Error('No response generated by the AI model.');

  let cleanText = rawText.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '');
    cleanText = cleanText.replace(/\s*```$/, '');
  }
  cleanText = cleanText.trim();

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    } else {
      throw new Error('AI returned invalid JSON formatting.');
    }
  }
}

  // Construct dynamic User Prompt
  const existingList = existingChanges && existingChanges.length > 0
    ? existingChanges.map((sum, idx) => `${idx + 1}. ${sum}`).join('\n')
    : 'None';

  const baseContext = `Website: ${domain}
DOM Structure:
${skeleton}

Existing Changes:
${existingList}

IMPORTANT: You MUST generate the CSS and JS for the user's request below. Do NOT skip generation or assume it is already done just because a similar change exists in the "Existing Changes" list. The user is actively requesting this NOW.

User request: "${userPrompt}"`;
  
  const broadcastStatus = (stepMsg) => {
    chrome.runtime.sendMessage({ type: 'PIPELINE_STATUS', step: stepMsg });
  };

  try {
    // Turn 1: Analysis
    broadcastStatus('Analysing page structure...');
    const prompt1 = PROMPT_TURN_1_ANALYSIS.replace('{userPrompt}', userPrompt);
    const analysis = await callLLM(apiKey, prompt1, baseContext, modelName);
    
    // Turn 2: Planning
    broadcastStatus('Planning changes...');
    const context2 = baseContext + '\n\n=== TURN 1: ANALYSIS ===\n' + JSON.stringify(analysis, null, 2);
    const plan = await callLLM(apiKey, PROMPT_TURN_2_PLANNING, context2, modelName);

    // Turn 3: Code Generation
    broadcastStatus('Generating code...');
    const context3 = context2 + '\n\n=== TURN 2: PLAN ===\n' + JSON.stringify(plan, null, 2);
    const codeGen = await callLLM(apiKey, PROMPT_TURN_3_CODE, context3, modelName);

    // Turn 4: Review
    broadcastStatus('Reviewing...');
    const context4 = context3 + '\n\n=== TURN 3: GENERATED CODE ===\n' + JSON.stringify(codeGen, null, 2);
    const review = await callLLM(apiKey, PROMPT_TURN_4_REVIEW, context4, modelName);

    const stripCodeFences = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
    };

    let finalCss = codeGen.css || '';
    let finalJs = codeGen.js || '';

    const fixedCss = review.fixedCode && typeof review.fixedCode.css === 'string' ? review.fixedCode.css.trim() : '';
    const fixedJs = review.fixedCode && typeof review.fixedCode.js === 'string' ? review.fixedCode.js.trim() : '';

    // Only override with fixedCode if the AI actually provided substantial fixed code
    if (fixedCss !== '' || fixedJs !== '') {
      if (fixedCss !== '') finalCss = review.fixedCode.css;
      if (fixedJs !== '') finalJs = review.fixedCode.js;
    }

    finalCss = stripCodeFences(finalCss);
    finalJs = stripCodeFences(finalJs);

    if (!isSafe(finalJs)) {
      return { success: false, reason: 'The generated code contained potentially unsafe operations and was blocked.' };
    }

    // Send code live to page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      return { success: false, reason: 'No active tab found. Please reload the webpage and try again.' };
    }

    if (finalCss) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (cssCode) => {
            // Append to persistent style tag or create it
            let style = document.getElementById('reframe-ext-persistent');
            if (style) {
              style.textContent += '\n\n' + cssCode;
            } else {
              style = document.createElement('style');
              style.id = 'reframe-ext-persistent';
              style.textContent = cssCode;
              (document.head || document.documentElement).appendChild(style);
            }
          },
          args: [finalCss]
        });
      } catch (e) {
        console.warn('Failed to inject CSS via scripting API:', e);
      }
    }

    if (finalJs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: (codeString) => {
            try {
              eval(codeString);
            } catch (e) {
              console.error('Failed to execute generated JS:', e);
            }
          },
          args: [finalJs]
        });
      } catch (e) {
        console.error('Failed to execute generated JS in main world:', e);
      }
    }

    const hasChanges = (finalJs && finalJs.trim() !== '') || (finalCss && finalCss.trim() !== '');

    if (hasChanges) {
      // Save using the persistent format: { changes: [...] }
      const domainData = await chrome.storage.local.get([domain]);
      let existing = domainData[domain];
      if (!existing || Array.isArray(existing)) {
        existing = { changes: [] };
      }

      existing.changes.push({
        id: `change_${Date.now()}`,
        summary: review.summary || 'Custom layout adjustment',
        css: finalCss,
        js: finalJs,
        reversalCss: '',
        reversalJs: '',
        timestamp: new Date().toISOString(),
        prompt: userPrompt
      });

      await chrome.storage.local.set({ [domain]: existing });

      return { 
        success: true, 
        summary: review.summary || 'Custom layout adjustment', 
        response: review.response || 'Successfully planned and generated changes!',
        hasChanges: true
      };
    } else {
      return { 
        success: true, 
        response: `DEBUG INFO:\nCodeGen: ${JSON.stringify(codeGen)}\nReview: ${JSON.stringify(review)}`,
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
  let data = domainData[domain];
  if (!data || Array.isArray(data)) {
    data = { changes: [] };
  }

  if (index < 0 || index >= data.changes.length) {
    return { success: false, reason: 'Invalid change index to undo.' };
  }

  // Remove the change from the array
  data.changes.splice(index, 1);
  await chrome.storage.local.set({ [domain]: data });

  // Rebuild the combined CSS style tag from remaining changes
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    const allCSS = data.changes
      .map(c => c.css || '')
      .filter(Boolean)
      .join('\n\n');

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (css) => {
        let style = document.getElementById('reframe-ext-persistent');
        if (css) {
          if (!style) {
            style = document.createElement('style');
            style.id = 'reframe-ext-persistent';
            (document.head || document.documentElement).appendChild(style);
          }
          style.textContent = css;
        } else if (style) {
          style.remove();
        }
      },
      args: [allCSS]
    });
  }

  return { success: true };
}

async function handleResetSite({ domain }) {
  await chrome.storage.local.remove([domain]);
  return { success: true };
}
