document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const statusDiv = document.getElementById('status');

  // Load existing API key
  chrome.storage.local.get(['llm_api_key'], (result) => {
    if (result.llm_api_key) {
      apiKeyInput.value = result.llm_api_key;
    }
  });

  // Save API key
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();

    if (!key) {
      showStatus('Please enter a valid API key.', 'error');
      return;
    }

    if (!key.startsWith('AIzaSy') && !key.startsWith('gsk_')) {
      showStatus('Warning: API keys typically start with "AIzaSy" (Gemini) or "gsk_" (Groq). Checking key...', 'error');
    }

    chrome.storage.local.set({ llm_api_key: key }, () => {
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
