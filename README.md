# LEGENDS static deploy (GitHub Pages / any static host)

## Files
- `index.html` — adaptive PC+touch build (default)
- `mobile.html` — touch-forced UI (large buttons, Quick Match dock)
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png` — PWA / Add to Home Screen
- `sw.js` — light offline shell cache
- `relay/` — WebSocket multiplayer relay (`npm start`, set PORT)

## GitHub Pages
1. Push this `deploy/` folder as the Pages root (or `/docs`).
2. Open the site on your phone → browser menu → **Add to Home Screen**.
3. Multiplayer needs the relay hosted separately (Railway/Render/Fly) and `NET` URL pointed at it.

## Manual UI switch
- `?ui=mobile` or the in-menu **Phone layout** button → `mobile.html`
- `?ui=pc` or **Desktop layout** → `index.html`
