# Danie Gagnon — REALTOR® Landing Page

A modern, elegant, mobile-first landing page for **Danie Gagnon**, REALTOR® with
**EXIT Realty Associates** in Dieppe, New Brunswick.

## Highlights

- **Single-page, no build step** — plain HTML/CSS/JS, deploys anywhere (Vercel, Netlify, GitHub Pages, any static host).
- **Sleek, fresh design** — ink-navy + warm-gold palette, Cormorant Garamond / Manrope typography.
- **Smooth section transitions** — scroll-reveal animations, animated stat counters, hero parallax & zoom, sticky nav, scroll-progress bar.
- **Listings carousel** — responsive (1 / 2 / 3 cards), autoplay, arrows, dots, drag & touch-swipe, keyboard support.
- **Fully responsive** — slide-in mobile menu, fluid type, single-column layouts on small screens.
- **Accessible** — semantic markup, focus states, `prefers-reduced-motion` support.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | Page markup & content |
| `styles.css` | All styling & responsive rules |
| `script.js`  | Nav, reveals, counters, carousel logic |
| `listings.js` | Static fallback property data for the carousel |
| `api/listings.js` | Vercel serverless proxy that scrapes her live EXIT Moncton listings |

## Editing content

- **Listings (auto-updating):** the carousel first calls `/api/listings`, a serverless
  function that fetches Danie's live EXIT Moncton page
  (<https://www.exitmoncton.ca/properties_for_agent/1364350/all>) **server-side** —
  bypassing the cross-origin/`403` blocks the browser hits — and returns normalized JSON.
  Responses are CDN-cached for 15 min (`stale-while-revalidate`). It parses JSON-LD
  structured data; inspect/tune the parser at `/api/listings?debug=1`.
- **Listings (fallback):** if the proxy is unreachable or returns nothing, the carousel
  falls back to `window.DANIE_LISTINGS` in `listings.js`. Keep that list reasonable so the
  page is never empty.
- **Headshot:** the About section uses a styled "DG" monogram placeholder. Drop a real
  photo into `index.html` (`.about__photo`) when available.
- **Contact:** the form opens the visitor's email client (`mailto:`). Swap the `action`
  for a form service (Formspree, Getform, etc.) to capture submissions server-side.

## Run locally

```bash
# any static server, e.g.
python3 -m http.server 8000
# then open http://localhost:8000
```

## Contact details on the page

- 📞 (506) 866-9713 · ✉️ danie@exitmoncton.ca
- 🏢 260 Champlain St, Dieppe, NB E1A 1P3
- Instagram [@danierealtor](https://www.instagram.com/danierealtor/) · [REALTOR.ca profile](https://www.realtor.ca/agent/2236807/danie-gagnon-260-champlain-st-dieppe-new-brunswick-e1a1p3)

---

*Each office independently owned & operated. Not intended to solicit properties already listed for sale.*
