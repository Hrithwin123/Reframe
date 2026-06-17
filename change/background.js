// Change Chrome Extension - Background Service Worker

const BLOCKED_TERMS = [
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document.write',
  'document.writeln',
  '.remove()',
  '.removeChild(',
  '.replaceWith(',
  '.replaceChild(',
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
  if (!code) return false;
  return !BLOCKED_TERMS.some(term => code.includes(term));
}

const SYSTEM_PROMPT = `You are a browser layout customization engine. Your job is to write JavaScript that modifies the visual appearance and layout of webpages based on user requests. You are given a compact structural skeleton of the page DOM and a plain language request from the user.

ABSOLUTE RULES — never violate these under any circumstances:

1. Only modify visual CSS properties. You may use element.style directly or inject a <style> tag into document.head. Both are acceptable.

2. Never remove or delete any DOM element. If something needs to be hidden, use element.style.display = 'none' or element.style.visibility = 'hidden'. Never call .remove(), .removeChild(), or .replaceWith().

3. Never modify, add, or remove any event listeners.

4. Never touch any <script> tags or modify any JavaScript behavior.

5. Never touch any <form>, <input>, <textarea>, or <button> elements unless the user explicitly asks to resize or reposition them visually.

6. Never use innerHTML, outerHTML, insertAdjacentHTML, or document.write.

7. Never use eval(), setTimeout(), setInterval(), or fetch().

8. Never reference external resources, libraries, or CDNs.

9. Every querySelector call must be null-checked before use. Always check if the element exists before modifying it. Example:
   WRONG:  document.querySelector('#nav').style.position = 'fixed';
   RIGHT:  const el = document.querySelector('#nav');
           if (el) el.style.position = 'fixed';

10. Wrap your entire code block in a single try { } catch(e) { } block. If anything throws, the page must remain unaffected.

11. Prefer ID selectors (#id) over class selectors (.class) wherever available, as IDs are more stable across page updates.

12. When injecting a <style> tag, always give it a unique ID attribute prefixed with "change-ext-" so it can be identified and reversed later. Example:
    const s = document.createElement('style');
    s.id = 'change-ext-navbar-bottom';
    s.textContent = '...your CSS...';
    document.head.appendChild(s);

13. For reversal code: undo all style modifications by resetting them to their original values or empty strings. Remove any injected <style> tags by their ID. Do not undo by re-querying and guessing — be explicit.

14. The reversal code must also be wrapped in try { } catch(e) { }.

OUTPUT FORMAT:
Return only a raw JSON object. No markdown. No code fences. No explanation before or after. Only the JSON object itself.

If you can safely and confidently fulfill the request:
{
  "success": true,
  "code": "your complete JS as a single string with \\n for newlines",
  "css": "the equivalent CSS styles to inject (e.g., '#masthead { position: fixed !important; }'), or an empty string if it cannot be achieved via CSS",
  "summary": "one concise sentence describing what this change does",
  "reversalCode": "your complete reversal JS as a single string"
}

If you cannot safely fulfill the request (ambiguous, impossible, or would require violating the rules above):
{
  "success": false,
  "reason": "one sentence explaining why this cannot be done safely"
}`;

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
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

async function handleGenerateChange({ domain, skeleton, userPrompt, existingChanges }) {
  // Retrieve API Key
  const storage = await chrome.storage.local.get(['llm_api_key']);
  const apiKey = storage.llm_api_key;
  if (!apiKey) {
    return { success: false, reason: 'Gemini API key is not configured. Please open extension options and save your API key.' };
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

User request: "${userPrompt}"`;

  // Query Gemini API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const requestBody = {
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch (e) {}
      const errMsg = errJson?.error?.message || `Gemini API returned status ${apiResponse.status}`;
      return { success: false, reason: errMsg };
    }

    const data = await apiResponse.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { success: false, reason: 'No response generated by the Gemini model.' };
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

    try {
      await chrome.tabs.sendMessage(tab.id, { 
        type: 'APPLY_CHANGE', 
        code: parsed.code,
        css: parsed.css || '',
        index: changeIndex
      });
    } catch (e) {
      console.warn('Could not message content script, applying manually via Scripting API if allowed', e);
      if (parsed.css) {
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
      } else {
        // Fallback: Use scripting API if activeTab permission permits it
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (codeString) => {
            const s = document.createElement('script');
            s.textContent = codeString;
            (document.body || document.documentElement).appendChild(s);
            s.remove();
          },
          args: [parsed.code]
        });
      }
    }

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

    return { success: true, summary: changeObject.summary, changeIndex: changeIndex };

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
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        type: 'UNDO_CHANGE', 
        index: index,
        isCss: !!changeToUndo.css,
        reversalCode: changeToUndo.reversalCode 
      });
    } catch (e) {
      console.warn('Could not send undo message to content script, falling back to scripting API', e);
      if (changeToUndo.css) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (idx) => {
            const style = document.getElementById(`change-ext-style-${idx}`);
            if (style) style.remove();
          },
          args: [index]
        });
      } else {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (codeString) => {
            const s = document.createElement('script');
            s.textContent = codeString;
            (document.body || document.documentElement).appendChild(s);
            s.remove();
          },
          args: [changeToUndo.reversalCode]
        });
      }
    }
  }

  return { success: true };
}

async function handleResetSite({ domain }) {
  await chrome.storage.local.remove([domain]);
  return { success: true };
}
