// Change Chrome Extension - Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
  const activeDomainEl = document.getElementById('active-domain');
  const chatHistory = document.getElementById('chat-history');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const typingIndicator = document.getElementById('typing-indicator');
  const historyList = document.getElementById('history-list');
  const undoAllBtn = document.getElementById('undo-all-btn');
  const optionsBtn = document.getElementById('options-btn');

  let currentTab = null;
  let currentDomain = '';

  // Open Options page
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Enable/Disable send button based on text input
  chatInput.addEventListener('input', () => {
    sendBtn.disabled = !chatInput.value.trim() || !currentDomain;
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !sendBtn.disabled) {
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', () => {
    if (!sendBtn.disabled) {
      sendMessage();
    }
  });

  // Initialize Extension
  async function initialize() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        setSystemDisabled('Could not find active browser tab.');
        return;
      }

      currentTab = tabs[0];
      const urlStr = currentTab.url || '';
      
      if (!urlStr || urlStr.startsWith('chrome://') || urlStr.startsWith('chrome-extension://') || urlStr.startsWith('edge://') || urlStr.startsWith('about:')) {
        setSystemDisabled('Change cannot modify browser system or settings pages.');
        return;
      }

      try {
        const urlObj = new URL(urlStr);
        currentDomain = urlObj.hostname;
        activeDomainEl.textContent = currentDomain;
      } catch (err) {
        setSystemDisabled('Invalid page URL detected.');
        return;
      }

      // Check if API key is stored, if not prompt options
      chrome.storage.local.get(['llm_api_key'], (result) => {
        if (!result.llm_api_key) {
          addMessage('system', 'Warning: No Gemini API Key configured. Click the settings gear in the top right to configure your API key.');
        }
      });

      // Load and render history
      await loadHistory();

    } catch (err) {
      console.error('Initialization error:', err);
      setSystemDisabled('An extension initialization error occurred.');
    }
  }

  function setSystemDisabled(reason) {
    activeDomainEl.textContent = 'Disabled';
    chatInput.disabled = true;
    chatInput.placeholder = 'Cannot adjust this page...';
    sendBtn.disabled = true;
    addMessage('system', `Change is disabled here: ${reason}`);
  }

  async function loadHistory() {
    if (!currentDomain) return;

    chrome.storage.local.get([currentDomain], (result) => {
      const stack = result[currentDomain] || [];
      renderHistoryList(stack);
    });
  }

  function renderHistoryList(stack) {
    historyList.innerHTML = '';

    if (stack.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No overrides applied to this website yet.</div>';
      undoAllBtn.style.display = 'none';
      return;
    }

    undoAllBtn.style.display = 'block';

    stack.forEach((change, index) => {
      const item = document.createElement('div');
      item.className = 'history-item';

      const content = document.createElement('div');
      content.className = 'history-item-content';

      const summary = document.createElement('div');
      summary.className = 'history-item-summary';
      summary.textContent = change.summary;
      content.appendChild(summary);

      if (change.reversalAvailable === false) {
        const warning = document.createElement('div');
        warning.className = 'history-item-warning';
        warning.textContent = 'Reversal unavailable — reload page to reset';
        content.appendChild(warning);
      }

      const undoBtn = document.createElement('button');
      undoBtn.className = 'undo-btn';
      undoBtn.textContent = 'Undo';
      undoBtn.addEventListener('click', () => undoChange(index));

      item.appendChild(content);
      item.appendChild(undoBtn);
      historyList.appendChild(item);
    });

    // Auto scroll history list to bottom
    historyList.scrollTop = historyList.scrollHeight;
  }

  function addMessage(sender, text) {
    const msg = document.createElement('div');
    msg.className = `message ${sender}-message`;
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    // Support basic markup/styling like bold and code formatting
    if (sender === 'system') {
      content.innerHTML = text;
    } else {
      content.textContent = text;
    }

    msg.appendChild(content);
    chatHistory.appendChild(msg);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  async function sendMessage() {
    const userPrompt = chatInput.value.trim();
    if (!userPrompt || !currentDomain) return;

    // UI Updates
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;
    addMessage('user', userPrompt);
    typingIndicator.style.display = 'flex';
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
      // Step 1: Request skeleton from content script
      let skeleton;
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, { type: 'GET_SKELETON' });
        if (response && response.success) {
          skeleton = response.skeleton;
        } else {
          throw new Error('Content script failed to return skeleton.');
        }
      } catch (err) {
        console.error('Failed to communicate with content script:', err);
        addMessage('error', 'Error: Could not extract site structure. Please refresh the page and try again.');
        typingIndicator.style.display = 'none';
        chatInput.disabled = false;
        return;
      }

      // Step 2: Read current stack from storage to supply existing changes context
      const storageData = await chrome.storage.local.get([currentDomain]);
      const stack = storageData[currentDomain] || [];
      const existingChanges = stack.map(change => change.summary);

      // Step 3: Call background worker to request layout change generation
      chrome.runtime.sendMessage({
        type: 'GENERATE_CHANGE',
        domain: currentDomain,
        skeleton,
        userPrompt,
        existingChanges
      }, (response) => {
        typingIndicator.style.display = 'none';
        chatInput.disabled = false;

        if (chrome.runtime.lastError) {
          addMessage('error', `Worker connection error: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (response && response.success) {
          addMessage('ai', response.summary);
          loadHistory();
        } else {
          addMessage('error', response?.reason || 'Failed to apply changes.');
        }
      });

    } catch (err) {
      console.error('Send message failure:', err);
      addMessage('error', `Execution failed: ${err.message}`);
      typingIndicator.style.display = 'none';
      chatInput.disabled = false;
    }
  }

  async function undoChange(index) {
    if (!currentDomain) return;

    // Loading visual state on buttons
    const buttons = historyList.querySelectorAll('.undo-btn');
    buttons.forEach(btn => btn.disabled = true);

    chrome.runtime.sendMessage({
      type: 'UNDO_CHANGE',
      domain: currentDomain,
      index
    }, (response) => {
      if (chrome.runtime.lastError) {
        addMessage('error', `Undo failed: ${chrome.runtime.lastError.message}`);
        loadHistory(); // reload to reset button disabled states
        return;
      }

      if (response && response.success) {
        addMessage('system', 'Layout override undone successfully.');
        loadHistory();
      } else {
        addMessage('error', response?.reason || 'Failed to undo layout override.');
        loadHistory();
      }
    });
  }

  // Undo All (Reset)
  undoAllBtn.addEventListener('click', () => {
    if (!currentDomain || !currentTab) return;

    if (!confirm(`Are you sure you want to reset all overrides for ${currentDomain}? The page will be reloaded.`)) {
      return;
    }

    chrome.runtime.sendMessage({
      type: 'RESET_SITE',
      domain: currentDomain
    }, (response) => {
      if (response && response.success) {
        chrome.tabs.reload(currentTab.id);
        window.close(); // Close extension popup since page reloads
      } else {
        addMessage('error', response?.reason || 'Failed to reset site layout.');
      }
    });
  });

  // Run initialization
  await initialize();
});
