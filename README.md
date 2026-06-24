<div align="center">
  <img src="assets/banner.png" alt="Reframe Hero Banner" width="100%" />
  
  <br />
  <br />

  <img src="https://img.shields.io/badge/Chrome_Web_Store-Pending_Review-a855f7?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Web Store" />
  <img src="https://img.shields.io/badge/License-MIT-0ea5e9?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Contributions-Welcome-22c55e?style=for-the-badge" alt="Contributions" />

  <h3><i>Why stop at vibe coding your own website when you can vibe code other people's sites too</i></h3>
</div>

---

## <img src="https://api.iconify.design/lucide:zap.svg?color=%23a855f7" width="28" align="top" /> The Problem (The web wasn't built for you specifically, but it could be)

Here's the thing nobody talks about: no website is perfect for everyone. The developer built it for *their* idea of a user, and buddy, that user is not you.

- You open a news site and there are more ads and popups than actual words in the article.
- Your university portal looks like it was designed in 2003 by someone who genuinely hated students.
- A web app you use daily has a sidebar or panel you've never once clicked on purpose, but you've definitely misclicked it 300 times and it's been quietly ruining your day for months.

And what are your options?
Send the developer a passive-aggressive feature request that'll sit in their backlog for years.

> [!NOTE]  
> Yeah, no. There had to be a better way.

---

## <img src="https://api.iconify.design/lucide:rocket.svg?color=%230ea5e9" width="28" align="top" /> So... what is Reframe?

**Reframe** is a Chrome extension that lets you redesign any website on the internet, *YESSS ANYYY*, by just describing what you want in plain English.

That's it. That's the whole pitch.

You type something like *"make the background dark and move the sidebar to the bottom"* and Reframe's AI figures out the DOM structure, generates perfectly scoped CSS/JS, bypasses Content Security Policies, and permanently saves your changes even across SPA navigations where the site tries to fight back by re-rendering everything.

> [!TIP]
> Think of it as a universal remote control for the internet's UI, except instead of pressing buttons, you just complain about the layout in natural language and it fixes itself.

---

## <img src="https://api.iconify.design/lucide:image.svg?color=%23a855f7" width="28" align="top" /> Showcases

### Making WhatsApp Web Actually Usable

So I use WhatsApp a lot on desktop, but the web version has always bugged me. On mobile, it's this clean, narrow, focused chat window. On desktop? They stretch it across your entire 27-inch monitor like it's trying to fill a movie theater screen. Why does a single text message need to be 1400 pixels wide? Who decided this was okay?

And don't even get me started on typing long messages. The native input bar is this tiny little strip at the bottom. Try editing the 10th line of a 50-line message in that thing. It's a nightmare. You're scrolling a 2-line viewport trying to find a typo. Genuinely rage-inducing.

So I used Reframe to fix it:

1. Shrunk the main chat window down to a mobile-width view (because that's how WhatsApp is *meant* to feel).
2. Took all that newly empty space on the right and told the AI to build a massive floating notepad widget where I can actually draft, edit, and send long messages like a civilized person.

**Before — the unnecessarily wide default:**

![Current WhatsApp](https://github.com/user-attachments/assets/85ef2787-b6e6-4930-aa72-d415395c2941)

**After — mobile-width chat + floating draft panel:**

https://github.com/user-attachments/assets/9aa229b2-f008-4847-a348-0992365efffb

---

### Giving My Friend's Website a Dark Mode (Without Asking Permission)

A friend of mine built a website. Great site. One problem: no dark mode. I could've opened a GitHub issue and waited 3-6 business months for them to maybe add it. Or I could just... do it myself. In 30 seconds. Without touching their codebase.

I opened their site, typed *"add a dark mode toggle button in the top right corner"* into Reframe, and watched it inject a fully functional toggle that smoothly transitions between light and dark themes. It even persists across page reloads.

Did I tell my friend? Eventually. Was it hilarious watching their confusion when I sent them a screenshot of *their own website* with a feature they never built? Absolutely.

**Live Site:** [Link](https://onlinefoodorderingsystem.vercel.app/)

**Demo Video:**

https://github.com/user-attachments/assets/2a0a9b93-2a9b-47d0-9070-8f6cb391c7d5

---

## <img src="https://api.iconify.design/lucide:cpu.svg?color=%230ea5e9" width="28" align="top" /> How It Works (for the nerds)

Reframe isn't just wrapping an LLM call and slapping `innerHTML` on the page. It's genuinely engineered to handle the chaos of modern web apps:

1. **DOM Skeleton Extraction** — When you open the popup, Reframe extracts a compressed structural skeleton of the page (not the full DOM, that would murder your token budget) and feeds it to the LLM as context.
2. **Multi-Turn AI Pipeline** — The LLM doesn't just yolo one response. It goes through 4 structured turns: analyze the page → plan a design strategy → generate the code → self-review for visibility issues. Each turn has strict JSON schemas so the AI can't wander off and start philosophizing instead of writing CSS (yes, this actually happened during development).
3. **CSP Bypass via Service Worker** — Modern websites use Content Security Policies to block inline scripts. Reframe sidesteps this entirely by routing all JavaScript execution through Chrome's `chrome.scripting.executeScript` API in the background service worker, injecting directly into the page's MAIN world.
4. **SPA Persistence** — Single Page Apps (React, Next.js, etc.) love to tear down and rebuild the DOM on every navigation. Reframe fights back with a multi-listener hydration system (`popstate`, `pushState`, `replaceState`, `MutationObserver`) that instantly re-injects your saved CSS/JS the millisecond the site tries to wipe it.
5. **Idempotent JS Guards** — Every generated JavaScript block is wrapped in a unique execution guard (`window.__reframeExt_CHANGEID__`) so re-running the same code on SPA navigation doesn't duplicate elements or stack event listeners.

---

## <img src="https://api.iconify.design/lucide:users.svg?color=%23a855f7" width="28" align="top" /> Contributions Needed (Urgently) (Please) (I'm Begging)

This project is fully open-source and there's a *ridiculous* amount of cool stuff that could be built on top of it. If any of these excite you, please open a PR — I will mass-produce gratitude:

| Feature | Description | Difficulty |
|---|---|---|
| **Improve the Design System Prompt** | The AI prompt that generates CSS/JS is the heart of Reframe. Better prompts = better results. If you're good at prompt engineering or have ideas for making the AI output more reliable, this is the easiest and highest-impact way to contribute | Easy |
| **Prompt Templates** | Pre-built prompt libraries for common tasks ("add dark mode", "hide sidebar", "increase font size") so users don't have to write prompts from scratch | Easy |
| **Community Themes** | Export your customizations as shareable JSON configs (imagine a "Perfect Twitter Dark Mode" that anyone can one-click install) | Medium |
| **Cloud Sync** | Sync your customizations across all your Chrome instances via an external backend | Medium |
| **Visual Element Picker** | Point-and-click mode where you click an element on screen, and Reframe feeds *that specific node* to the LLM for surgical edits | Hard |
| **Auto-Healing Selectors** | When a website updates its class names and breaks your saved override, the AI automatically detects the breakage and repairs the selectors | Hard |

---

## <img src="https://api.iconify.design/lucide:terminal.svg?color=%230ea5e9" width="28" align="top" /> Setup

> [!IMPORTANT]
> **We are currently working on deploying and publishing Reframe to the Chrome Web Store for a seamless 1-click install!** In the meantime, you can easily install it locally as a developer extension below.

**Prerequisites:** You'll need a free API key from any one of these providers:
- <img src="https://img.shields.io/badge/Google_Gemini-a855f7?style=flat-square&logo=googlegemini&logoColor=white" /> [(free tier available)](https://aistudio.google.com/apikey)
- <img src="https://img.shields.io/badge/Groq-0ea5e9?style=flat-square&logo=groq&logoColor=white" /> [(free tier available)](https://console.groq.com/keys)
- <img src="https://img.shields.io/badge/OpenRouter-525252?style=flat-square" /> [(pay-as-you-go)](https://openrouter.ai/settings/keys)

**Installation:**
```bash
git clone https://github.com/Hrithwin123/Reframe.git
```
1. Open `chrome://extensions` in your browser
2. Enable **Developer Mode** (toggle in the top right)
3. Click **Load Unpacked** → Select the `reframe` folder inside the cloned repo
4. Pin the Reframe extension to your toolbar for easy access
5. Click the Reframe icon → Hit the gear icon → Paste your API key
6. Navigate to literally any website and start telling it what to do

---

<p align="center">
  <i>Built with sleep deprivation and a mass amount of spite towards websites that refuse to have a decent layout.</i>
</p>
