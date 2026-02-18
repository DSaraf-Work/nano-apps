# Prompt: Add App to nano-apps Repo

Use this prompt whenever you want Claude to add a new app to your nano-apps Cloudflare Pages repo.

---

## The Prompt

```
I have a Cloudflare Pages site called nano-apps structured like this:

nano-apps/
├── index.html          ← root landing page (lists all apps as cards)
├── _headers            ← Cloudflare headers config
├── _redirects          ← trailing slash redirects
└── apps/
    └── [app-name]/
        ├── index.html
        ├── sw.js
        └── manifest.json

I want to add a new app called "[APP NAME]". Here is the app (attached file / described below):
[ATTACH FILE or DESCRIBE THE APP]

Please give me ALL files I need to add or modify, ready to drop into my repo:

1. apps/[app-name]/index.html  — the app itself, with:
   - <link rel="manifest" href="./manifest.json"/> in <head>
   - <meta name="apple-mobile-web-app-capable" content="yes"/> in <head>
   - <meta name="apple-mobile-web-app-title" content="[App Name]"/> in <head>
   - SW registration before </body>: navigator.serviceWorker.register('./sw.js', { scope: './' })

2. apps/[app-name]/manifest.json — with:
   - "start_url": "./"
   - "scope": "./"
   - "display": "standalone"
   - Appropriate name, theme_color, background_color, icons

3. apps/[app-name]/sw.js — service worker appropriate for this app type:
   - For map apps: cache Leaflet/tile resources, network-first for tiles
   - For notification apps: handle push events, notification clicks, snooze/done actions
   - For simple apps: basic cache-first offline support

4. Updated root index.html — add a new <a class="app-card"> card in the grid with:
   - Matching icon emoji and accent color
   - Short name and description
   - Relevant tags (PWA, Maps, Offline, Notifications, etc.)

5. Updated _redirects — add: /apps/[app-name]  /apps/[app-name]/  301

6. Updated _headers — add any app-specific headers if needed

Then zip all new/modified files so I can drop them straight into the repo and push.
```

---

## Tips

- **If you have an existing HTML file**: attach it and say "add this to my nano-apps repo"
- **If you want a new app built from scratch**: describe it and Claude will build + integrate it in one shot
- **Accent colors to pick from** (for the card's `--card-color`):
  - Amber `#f59e0b` — productivity/reminders
  - Green `#34d87a` — maps/location
  - Blue `#60a5fa` — info/utility
  - Purple `#a78bfa` — creative/media
  - Red `#ef4444` — alerts/timers
  - Orange `#f97316` — fitness/health

## After getting the files

```bash
# Copy files into your repo (assuming repo is already cloned)
# Then:
git add .
git commit -m "feat: add [app-name]"
git push
# Cloudflare auto-deploys in ~30 seconds
```
