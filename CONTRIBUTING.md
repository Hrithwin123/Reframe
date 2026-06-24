# Contributing to Reframe

First off, thank you for considering contributing to Reframe! Whether you're fixing a bug, adding a new feature, or tweaking the AI prompts, your help is incredibly appreciated.

We want to make this project as welcoming as possible, especially if this is your first time contributing to open source. You don't need to be a senior engineer to help out—if you know how to talk to an AI, you can improve this extension!

---

## 🛠️ How the Extension Works (The Short Version)

To get your bearings, here is exactly how Reframe operates:
1. **`popup.js` / `popup.html`**: The UI you see when you click the extension. It sends your typed prompt to the background script.
2. **`content.js`**: Injects a lightweight script into the website to scrape the current page structure (the DOM skeleton) and sends it back to the extension.
3. **`background.js`**: The absolute brain of the operation. It takes your prompt, combines it with the website's DOM skeleton, and talks to the AI (Gemini/Groq) to generate CSS and JavaScript overrides.

---

## 🚀 Getting Started (Step-by-Step for Beginners)

If you're new to GitHub, don't worry. Here is the exact terminal flow to get your own version of Reframe running locally.

### 1. Fork and Clone
1. Click the **"Fork"** button at the top right of this repository to copy it to your own GitHub account.
2. Open your terminal and clone your copy:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Reframe.git
   cd Reframe
   ```

### 2. Create a Branch
Always create a new branch for your work:
```bash
git checkout -b my-awesome-new-feature
```

### 3. Load the Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Turn on **"Developer mode"** in the top right corner.
3. Click **"Load unpacked"** and select the `reframe` folder you just cloned.
4. If you make changes to `popup.html` or `popup.js`, you don't need to do anything. If you edit `background.js` or `content.js`, click the **Refresh** icon on the extension card in `chrome://extensions/` to load your new code.

---

## 🤖 Tinkering with the AI Prompts

The most impactful way to contribute without writing complex code is by improving the **AI Prompt**. 

If you open `reframe/background.js`, you'll see large blocks of text where we instruct the LLM on how to behave. This is the "Design System Prompt". 

**How you can help:**
- Does the AI often write bad CSS? Add a rule to the prompt telling it to use `!important` tags or target specific IDs.
- Does the AI hallucinate UI elements? Add a rule forcing it to only modify existing elements found in the DOM skeleton.
- **Test it:** Change the prompt, hit refresh on the extension, and try to style a website to see if your prompt made the AI smarter!

---

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
