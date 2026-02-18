# 📱 Nano Apps

A collection of small, focused Progressive Web Apps hosted on Cloudflare Pages.
**Live:** https://nano-apps.pages.dev

---

## 📁 Repo Structure

```
nano-apps/
├── index.html              ← Landing page (lists all apps)
├── _headers                ← Cloudflare: sets correct headers for PWAs/SWs
├── _redirects              ← Cloudflare: trailing slash redirects
├── README.md
│
└── apps/
    ├── remindly/           ← Each app is self-contained
    │   ├── index.html
    │   ├── sw.js           ← Service worker (scoped to this folder)
    │   └── manifest.json
    │
    └── your-next-app/      ← Add future apps here
        ├── index.html
        ├── sw.js
        └── manifest.json
```

---

## ✅ Apps

| App | Path | Description |
|-----|------|-------------|
| **Remindly** | `/apps/remindly/` | Push notification reminders with follow-ups |

---

## ➕ Adding a New App

### 1. Create the folder
```bash
mkdir apps/your-app-name
```

### 2. Add your app files
Every app needs at minimum:
- `index.html` — the app
- `manifest.json` — PWA metadata (use relative paths: `"start_url": "./"`)
- `sw.js` — service worker (optional but needed for push notifications)

### 3. Add a redirect in `_redirects`
```
/apps/your-app-name  /apps/your-app-name/  301
```

### 4. Add a card to the landing page
Open `index.html` at the root and copy the commented-out card template:
```html
<a href="./apps/your-app-name/" class="app-card" style="--card-color: #60a5fa;">
  <div class="app-icon" style="--icon-bg: rgba(96,165,250,0.12);">🎯</div>
  <div class="app-name">Your App Name</div>
  <div class="app-desc">What does it do?</div>
  <div class="app-tags">
    <span class="tag">PWA</span>
  </div>
</a>
```

### 5. Push to deploy
```bash
git add .
git commit -m "feat: add your-app-name"
git push
```
Cloudflare Pages auto-deploys on push. Takes ~30 seconds.

---

## 🔑 PWA Rules for Each App

For service workers to work correctly in a subfolder:

**manifest.json** — always use relative paths:
```json
{
  "start_url": "./",
  "scope": "./"
}
```

**sw.js registration** — include the scope:
```js
navigator.serviceWorker.register('./sw.js', { scope: './' })
```

**`_headers`** — already configured for all apps at `Service-Worker-Allowed: /`

---

## 🚀 Cloudflare Pages Setup

1. Push this repo to GitHub
2. Go to Cloudflare Pages → Create project → Connect to Git
3. Select your repo
4. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Output directory:** `/` (root)
5. Deploy!

---

## 📋 PWA Checklist for New Apps

- [ ] `manifest.json` with relative `start_url` and `scope`
- [ ] `<link rel="manifest" href="./manifest.json"/>` in `<head>`
- [ ] Service worker registered with `{ scope: './' }`
- [ ] HTTPS (Cloudflare Pages provides this automatically)
- [ ] `_redirects` entry for trailing slash
- [ ] Card added to root `index.html`
