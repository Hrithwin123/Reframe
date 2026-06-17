// Diagnostic script to list all available Gemini models
const https = require('https');

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("\n[Error] API Key missing!\n");
  console.error("Usage:");
  console.error("  node list_models.js <YOUR_GEMINI_API_KEY>");
  console.error("  OR set GEMINI_API_KEY environment variable and run: node list_models.js\n");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("Fetching supported Gemini models...");
https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.error("\nAPI Error:", json.error.message);
        console.error("Code:", json.error.code);
        console.error("Status:", json.error.status);
      } else if (json.models) {
        console.log("\nAvailable Models:");
        json.models.forEach(m => {
          const name = m.name.replace('models/', '');
          console.log(` - ${name} (${m.displayName || 'No display name'})`);
        });
        console.log("");
      } else {
        console.log("Unexpected response structure:", json);
      }
    } catch (e) {
      console.error("Failed to parse response JSON:", e.message);
      console.log("Raw Response body:", data);
    }
  });
}).on('error', (err) => {
  console.error("Network Request failed:", err.message);
});
