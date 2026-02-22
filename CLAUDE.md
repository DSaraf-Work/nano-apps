# CLAUDE.md - nano-apps Project Guide

## Project Overview

This is a **nano-apps** repository - a collection of small, focused Progressive Web Apps (PWAs) hosted on Cloudflare Pages at https://nano-apps.pages.dev.

### Architecture
- **Hosting**: Cloudflare Pages with auto-deployment from git push
- **Structure**: Multi-app PWA collection with shared landing page
- **Apps**: Each app is self-contained in `/apps/[app-name]/` folders
- **Deployment**: Zero-build configuration, direct file serving

## Current Apps

### 1. **Remindly** (`/apps/remindly/`)
- **Purpose**: Voice-first reminder system with iOS Shortcuts integration
- **Features**: Push notifications, follow-ups, voice input via Shortcuts
- **Backend**: Cloudflare D1 database for iOS sync
- **Recent work**: Voice-first Shortcuts flow, ISO 8601 date handling, URL intake resilience

### 2. **ParkPin** (`/apps/parkpin/`)
- **Purpose**: Location-based app (likely for parking/location marking)
- **Structure**: Standard PWA with manifest, service worker

## Project Structure

```
nano-apps/
├── index.html              # Landing page listing all apps
├── sw.js                   # Root service worker
├── manifest.json           # Root PWA manifest
├── _headers               # Cloudflare headers config
├── _redirects             # Trailing slash redirects
├── wrangler.toml          # Cloudflare Workers config
├── functions/             # Cloudflare Pages Functions
├── schema.sql             # Database schema (D1)
└── apps/
    ├── remindly/
    │   ├── index.html
    │   ├── sw.js          # App-specific service worker
    │   └── manifest.json  # App-specific PWA manifest
    └── parkpin/
        ├── index.html
        ├── sw.js
        └── manifest.json
```

## Development Patterns

### PWA Requirements for Each App
- **Manifest**: Use relative paths `"start_url": "./"` and `"scope": "./"`
- **Service Worker**: Register with scope `{ scope: './' }`
- **Headers**: `_headers` file configures `Service-Worker-Allowed: /`

### Adding New Apps
1. Create `/apps/[app-name]/` folder
2. Add `index.html`, `manifest.json`, `sw.js`
3. Update root `index.html` with new app card
4. Add redirect in `_redirects`: `/apps/[app-name] /apps/[app-name]/ 301`
5. Git commit and push for auto-deployment

### Service Worker Scoping
- Each app has its own SW scoped to its subfolder
- Root SW handles overall caching strategy
- Use network-first for dynamic content, cache-first for static assets

## Cloudflare Integration

### Pages Functions (`/functions/`)
- API endpoints for apps (e.g., reminder sync)
- D1 database integration for persistent data
- Handle CORS for cross-origin requests

### Configuration Files
- **`wrangler.toml`**: Defines D1 bindings, environment configs
- **`_headers`**: Security headers, CORS, PWA support
- **`schema.sql`**: D1 database schema definitions

### Recent Backend Work
- Cloudflare D1 backend added for iOS Shortcuts sync
- API accepts ISO 8601 date strings from iOS Format Date action
- URL intake system made resilient to iOS initialization failures

## Development Guidelines

### When Working on Apps
1. **Test locally**: Use `wrangler pages dev` for local development
2. **PWA compliance**: Ensure manifest.json and SW are properly configured
3. **Mobile-first**: Apps should work well on iOS/Android
4. **Offline support**: Implement appropriate caching strategies

### Code Style
- **Progressive enhancement**: Apps should work without JS
- **Accessibility**: Follow PWA accessibility guidelines
- **Performance**: Minimize bundle sizes, use efficient caching

### iOS Integration (Remindly-specific)
- **Shortcuts app integration**: Voice-first workflow
- **Date handling**: Accept iOS Format Date action outputs
- **URL schemes**: Handle reminder intake via URL parameters
- **Background sync**: D1 database for cross-device sync

## Deployment Process

1. **Local changes**: Make changes to app files
2. **Test**: Use Cloudflare Pages local dev or test directly
3. **Commit**: `git add . && git commit -m "feat: description"`
4. **Deploy**: `git push` triggers automatic Cloudflare Pages deployment
5. **Verify**: Check live site in ~30 seconds

## Key Technical Decisions

- **No build process**: Direct file serving for simplicity
- **Separate SW per app**: Better scoping and cache control
- **D1 for persistence**: Serverless database for app data
- **Voice-first UX**: Remindly optimized for Shortcuts voice input
- **iOS-centric**: Recent focus on iOS Shortcuts integration

## Common Tasks

### Adding a new reminder feature
- Update `/apps/remindly/index.html` for UI
- Modify `/apps/remindly/sw.js` for notification handling
- Update `/functions/` APIs for backend logic
- Test iOS Shortcuts integration

### Debugging PWA issues
- Check `_headers` for SW permissions
- Verify manifest.json relative paths
- Test offline functionality
- Validate notification permissions

### Database changes
- Update `schema.sql`
- Use `wrangler d1 execute` to apply changes
- Update API functions to handle schema changes

## Recent Context
- Active development on Remindly voice features
- iOS Shortcuts integration is a key focus
- API resilience improvements for mobile edge cases
- Unified PWA caching strategy implemented across apps