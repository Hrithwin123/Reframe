document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const modelNameInput = document.getElementById('model-name');
  const saveBtn = document.getElementById('save-btn');
  const statusDiv = document.getElementById('status');

  // Load existing API key and model name
  chrome.storage.local.get(['llm_api_key', 'llm_model_name'], (result) => {
    if (result.llm_api_key) {
      apiKeyInput.value = result.llm_api_key;
    }
    if (result.llm_model_name) {
      modelNameInput.value = result.llm_model_name;
    }
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    const model = modelNameInput.value.trim();

    if (!key) {
      showStatus('Please enter a valid API key or "ollama".', 'error');
      return;
    }

    if (key.toLowerCase() === 'ollama' && !model) {
      showStatus('Please specify an Ollama Model Name (e.g., llama3.2).', 'error');
      return;
    }

    if (!key.startsWith('AIzaSy') && !key.startsWith('gsk_') && !key.startsWith('sk-or-') && key.toLowerCase() !== 'ollama') {
      showStatus('Warning: Unrecognized API key format. Checking key...', 'error');
    }

    chrome.storage.local.set({ llm_api_key: key, llm_model_name: model }, () => {
      showStatus('Settings saved successfully! You can now use the extension.', 'success');
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Clear status after 3.5 seconds
    setTimeout(() => {
      statusDiv.style.opacity = '0';
      statusDiv.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        statusDiv.style.display = 'none';
        statusDiv.style.opacity = '1';
      }, 500);
    }, 3500);
  }
});
