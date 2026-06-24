# Contributing to Reframe

First off, thank you for considering contributing to Reframe! Whether you're fixing a bug, adding a new feature, or tweaking the AI prompts, your help is incredibly appreciated.

We want to make this project as welcoming as possible, especially if this is your first time contributing to open source. You don't need to be a senior engineer to help out. If you know how to talk to an AI, you can improve this extension!

## 🛠️ How the Extension Works (The Short Version)

To get your bearings, here is exactly how Reframe operates:
1. **`popup.js` / `popup.html`**: The UI you see when you click the extension. It sends your typed prompt to the background script.
2. **`content.js`**: Injects a lightweight script into the website to scrape the current page structure (the DOM skeleton) and sends it back to the extension.
3. **`background.js`**: The absolute brain of the operation. It takes your prompt, combines it with the website's DOM skeleton, and talks to the AI (Gemini/Groq) to generate CSS and JavaScript overrides.

## 🚀 Getting Started (The "Vibe Coding" Way)

Nobody manually runs `git clone` anymore. If you are using an AI coding agent (like Cursor, Windsurf, or Gemini), just copy and paste this exact prompt into your agent to get fully set up in 5 seconds:

```text
I want to contribute to the Reframe Chrome extension. Please clone the repository from https://github.com/Hrithwin123/Reframe.git into my current directory. Once cloned, create a new branch called my-new-feature. Next, briefly read the reframe/background.js and reframe/popup.js files so you understand the architecture, specifically how it uses the Chrome Extensions API to bypass CSP and how the 'Design System Prompt' works for generating CSS/JS. Finally, let me know when you're ready and ask me what feature I want to build!
```

### The "Old School" Manual Way
If you prefer doing things by hand:
1. Fork the repository
2. `git clone https://github.com/YOUR-USERNAME/Reframe.git`
3. `cd Reframe`
4. `git checkout -b my-awesome-new-feature`

### Loading the Extension in Chrome
Regardless of how you cloned it:
1. Open Chrome and navigate to `chrome://extensions/`
2. Turn on **"Developer mode"** in the top right corner.
3. Click **"Load unpacked"** and select the `reframe` folder you just cloned.
4. If you make changes to `popup.html` or `popup.js`, you don't need to do anything. If you edit `background.js` or `content.js`, click the **Refresh** icon on the extension card in `chrome://extensions/` to load your new code.

## 📤 Submitting Your Changes

Once you've added a cool feature or fixed a prompt, it's time to share it!

1. Stage your changes:
   ```bash
   git add .
   ```
2. Commit your changes with a clear message:
   ```bash
   git commit -m "Improve AI prompt for better dark mode generation"
   ```
3. Push it to your forked repository:
   ```bash
   git push origin my-awesome-new-feature
   ```
4. Go back to the original Reframe GitHub repository. You'll see a green button saying **"Compare & pull request"**. Click it, describe what you changed, and hit Submit!

We will review your code and merge it in. Thank you for making Reframe better!
