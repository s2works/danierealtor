# Danie Gagnon — REALTOR® Landing Page

A modern, elegant, mobile-first landing page for **Danie Gagnon**, REALTOR® with
**EXIT Realty Associates** in Dieppe, New Brunswick.

## Highlights

- **Single-page, no build step** — plain HTML/CSS/JS, deploys anywhere (Vercel, Netlify, GitHub Pages, any static host).
- **Sleek, fresh design** — ink-navy + warm-gold palette, Cormorant Garamond / Manrope typography.
- **Smooth section transitions** — scroll-reveal animations, animated stat counters, hero parallax & zoom, sticky nav, scroll-progress bar.
- **Listings CTA** — a section linking out to Danie's live EXIT Realty listings page (kept current by the brokerage).
- **Fully responsive** — slide-in mobile menu, fluid type, single-column layouts on small screens.
- **Accessible** — semantic markup, focus states, `prefers-reduced-motion` support.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | Page markup & content |
| `styles.css` | All styling & responsive rules |
| `script.js`  | Nav, scroll reveals, stat counters, hero parallax |

## Editing content

- **Listings:** the Current Listings section is a CTA that links to Danie's live EXIT
  Realty page (<https://www.exitmoncton.ca/properties_for_agent/1364350/all>), so it's
  always up to date without any scraping or maintenance.
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
