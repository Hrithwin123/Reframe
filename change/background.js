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

const PROMPT_TURN_2_PLANNING = `You are a Senior Frontend Developer in PLANNING mode. Do not write any code yet.
Based on your analysis, create a complete change plan for the user's request.

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

const PROMPT_TURN_3_CODE = `You are a Senior Frontend Developer in CODE GENERATION mode.
Based on your analysis and plan, now write the complete JavaScript and CSS.

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

Return ONLY valid JSON in this exact format:
{
  "css": "complete CSS string (e.g. 'body { background: #111 !important; }')",
  "js": "complete JS string (or empty string)", 
  "selectorsUsed": ["#navbar", ".card"],
  "estimatedElementsAffected": 47
}`;

const PROMPT_TURN_4_REVIEW = `You are a Senior Frontend Developer in REVIEW mode.
Review the code you just generated against your initial analysis.

Step 4 - Review your generated code. Check for:
- Any surface from your analysis that was NOT addressed in the code?
- Any text element that sits on a darkened surface but wasn't recolored?
- Any selector that might not exist or is ambiguous?
- Any preserved element that was accidentally modified?
- Any missing hover states on interactive elements?

If the code is perfectly correct, return ready: true.
If the code missed anything, write the completely fixed CSS and JS and return ready: true.

Return ONLY valid JSON in this exact format:
{
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
  // Retrieve API Key and Model Name
  const storage = await chrome.storage.local.get(['llm_api_key', 'llm_model_name']);
  const apiKey = storage.llm_api_key;
  const modelName = storage.llm_model_name || '';

  if (!apiKey) {
    return { success: false, reason: 'API key is not configured. Please open extension options and save your API key.' };
  }

async function callLLM(apiKey, systemPrompt, userText, modelName) {
  const isGroq = apiKey.startsWith('gsk_');
  const isOpenRouter = apiKey.startsWith('sk-or-');
  const isOllama = apiKey.toLowerCase() === 'ollama';
  const isOAI = isGroq || isOpenRouter || isOllama;

  let url;
  if (isGroq) url = 'https://api.groq.com/openai/v1/chat/completions';
  else if (isOpenRouter) url = 'https://openrouter.ai/api/v1/chat/completions';
  else if (isOllama) url = 'http://localhost:11434/v1/chat/completions';
  else url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestHeaders = {
    'Content-Type': 'application/json'
  };
  if (isOAI && !isOllama) {
    requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    if (isOpenRouter) {
      requestHeaders['HTTP-Referer'] = 'https://github.com/Harshith404/Reframe';
      requestHeaders['X-Title'] = 'Reframe Change Extension';
    }
  }

  let requestBody;
  if (isOAI) {
    let targetModel = 'llama-3.3-70b-versatile';
    if (isOpenRouter) targetModel = 'openai/gpt-oss-120b';
    if (modelName) targetModel = modelName; // Override if provided

    requestBody = {
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      };
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
    const errMsg = isGroq
      ? (errJson?.error?.message || `Groq API returned status ${apiResponse.status}`)
      : isOpenRouter
      ? (errJson?.error?.message || `OpenRouter API returned status ${apiResponse.status}`)
      : isOllama
      ? (errJson?.error?.message || `Ollama API returned status ${apiResponse.status}. Is Ollama running?`)
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

  const baseContext = `Website: ${domain}\nDOM Structure:\n${skeleton}\n\nExisting Changes:\n${existingList}\n\nUser request: "${userPrompt}"`;
  
  const broadcastStatus = (stepMsg) => {
    chrome.runtime.sendMessage({ type: 'PIPELINE_STATUS', step: stepMsg });
  };

  try {
    // Turn 1: Analysis
    broadcastStatus('🔍 Analysing page structure...');
    const prompt1 = PROMPT_TURN_1_ANALYSIS.replace('{userPrompt}', userPrompt);
    const analysis = await callLLM(apiKey, prompt1, baseContext, modelName);
    
    // Turn 2: Planning
    broadcastStatus('📋 Planning changes...');
    const context2 = baseContext + '\n\n=== TURN 1: ANALYSIS ===\n' + JSON.stringify(analysis, null, 2);
    const plan = await callLLM(apiKey, PROMPT_TURN_2_PLANNING, context2, modelName);

    // Turn 3: Code Generation
    broadcastStatus('⚙️ Generating code...');
    const context3 = context2 + '\n\n=== TURN 2: PLAN ===\n' + JSON.stringify(plan, null, 2);
    const codeGen = await callLLM(apiKey, PROMPT_TURN_3_CODE, context3, modelName);

    // Turn 4: Review
    broadcastStatus('✅ Reviewing...');
    const context4 = context3 + '\n\n=== TURN 3: GENERATED CODE ===\n' + JSON.stringify(codeGen, null, 2);
    const review = await callLLM(apiKey, PROMPT_TURN_4_REVIEW, context4, modelName);

    const stripCodeFences = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
    };

    let finalCss = '';
    let finalJs = '';
    if (review.fixedCode && (review.fixedCode.css || review.fixedCode.js)) {
      finalCss = review.fixedCode.css || '';
      finalJs = review.fixedCode.js || '';
    } else {
      finalCss = codeGen.css || '';
      finalJs = codeGen.js || '';
    }

    finalCss = stripCodeFences(finalCss);
    finalJs = stripCodeFences(finalJs);

    if (!isSafe(finalJs)) {
      return { success: false, reason: 'The generated code contained potentially unsafe operations and was blocked.' };
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

    if (finalCss) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'APPLY_CHANGE', 
          css: finalCss,
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
          args: [finalCss, changeIndex]
        });
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
              console.error("Failed to execute generated JS:", e);
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
      const changeObject = {
        summary: review.summary || 'Custom layout adjustment (CoT Pipeline)',
        code: finalJs,
        css: finalCss,
        reversalCode: '/* reversal unavailable — reload the page to reset */',
        reversalAvailable: false,
        timestamp: new Date().toISOString(),
        prompt: userPrompt
      };

      stack.push(changeObject);
      await chrome.storage.local.set({ [domain]: stack });

      return { 
        success: true, 
        summary: changeObject.summary, 
        response: review.response || 'Successfully planned and generated changes!',
        changeIndex: changeIndex,
        hasChanges: true
      };
    } else {
      return { 
        success: true, 
        response: review.response || 'No layout changes were necessary.',
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
