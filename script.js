/* ============================================================
   Danie Gagnon — interactions
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Nav: scrolled state + scroll progress ---------- */
  var nav = document.getElementById("nav");
  var progress = document.getElementById("scrollProgress");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("scrolled", y > 40);

    if (progress) {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");

  function closeMenu() {
    if (!links) return;
    links.classList.remove("open");
    document.body.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
    // Tap outside the panel (on the scrim) to close
    document.addEventListener("click", function (e) {
      if (!document.body.classList.contains("menu-open")) return;
      if (nav.contains(e.target)) return;
      closeMenu();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
  }
  // Register one or more elements for the reveal animation (works for
  // elements added dynamically after load, e.g. listing cards).
  function registerReveal(els) {
    els.forEach(function (el) {
      if (io) { io.observe(el); } else { el.classList.add("in"); }
    });
  }
  registerReveal(Array.prototype.slice.call(document.querySelectorAll(".reveal")));

  /* ---------- Animated stat counters ---------- */
  var counters = document.querySelectorAll(".stat__num[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.getAttribute("data-count"), 10);
        var start = null;
        var dur = 1400;
        function step(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        cObs.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cObs.observe(el); });
  }

  /* ---------- Hero parallax ---------- */
  var heroBg = document.querySelector(".hero__bg");
  if (heroBg && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener("scroll", function () {
      var y = window.scrollY || window.pageYOffset;
      if (y < window.innerHeight) {
        heroBg.style.transform = "scale(1.12) translateY(" + y * 0.18 + "px)";
      }
    }, { passive: true });
  }

  /* ---------- Contact form (AJAX submit to Formspree) ---------- */
  var form = document.getElementById("contactForm");
  var statusEl = document.getElementById("formStatus");
  var submitBtn = document.getElementById("formSubmit");

  if (form && statusEl) {
    function setStatus(msg, type) {
      statusEl.textContent = msg;
      statusEl.className = "form-status" + (type ? " form-status--" + type : "");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Guard: remind to configure the endpoint before going live.
      if (form.action.indexOf("YOUR_FORM_ID") !== -1) {
        setStatus("Form not configured yet — add your Formspree form ID.", "error");
        return;
      }

      var btnText = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }
      setStatus("", "");

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      }).then(function (response) {
        if (response.ok) {
          form.reset();
          setStatus("Thank you — your message is on its way. I'll be in touch shortly.", "success");
        } else {
          return response.json().then(function (data) {
            var msg = data && data.errors
              ? data.errors.map(function (er) { return er.message; }).join(", ")
              : "Something went wrong. Please try again or call me directly.";
            setStatus(msg, "error");
          });
        }
      }).catch(function () {
        setStatus("Network error. Please try again, or call/text (506) 866-9713.", "error");
      }).finally(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = btnText; }
      });
    });
  }

  /* ---------- Recent listings (from a published Google Sheet) ---------- */
  var listingsGrid = document.getElementById("listingsGrid");
  if (listingsGrid) {
    /* ===== CONFIG =================================================
       1. Publish/share your Google Sheet as view-only.
       2. Paste the Sheet ID below — it's the long string in the sheet
          URL between "/d/" and "/edit".
       3. SHEET_NAME is the tab name; leave "" to use the first tab.
       Until a real ID is set, sample cards are shown so the design
       is visible. ============================================== */
    var SHEET_ID = "YOUR_SHEET_ID";
    var SHEET_NAME = "";

    var emptyEl = document.getElementById("listingsEmpty");
    var FALLBACK_IMG = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=70";

    var SAMPLE = [
      { status: "Active", price: "459000", address: "12 Rue Belliveau", city: "Dieppe, NB", beds: "3", baths: "2", sqft: "1,820", image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=70", link: "https://www.exitmoncton.ca/properties_for_agent/1364350/all" },
      { status: "Pending", price: "329900", address: "47 Hennessey Road", city: "Moncton, NB", beds: "4", baths: "3", sqft: "2,100", image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=900&q=70", link: "https://www.exitmoncton.ca/properties_for_agent/1364350/all" },
      { status: "Active", price: "289000", address: "9 Coverdale Court", city: "Riverview, NB", beds: "3", baths: "2", sqft: "1,540", image: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=900&q=70", link: "https://www.exitmoncton.ca/properties_for_agent/1364350/all" }
    ];

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    function money(v) {
      if (!v) return "";
      var s = String(v).trim();
      var n = parseFloat(s.replace(/[^0-9.]/g, ""));
      if (isNaN(n)) return s; // already formatted text — show as-is
      return "$" + n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
    }
    function statusClass(s) {
      var k = (s || "").toLowerCase();
      if (k.indexOf("sold") !== -1) return "sold";
      if (k.indexOf("pend") !== -1 || k.indexOf("cond") !== -1) return "pending";
      return "active";
    }

    function card(it) {
      var specs = [];
      if (it.beds)  specs.push("<li>" + esc(it.beds) + " bd</li>");
      if (it.baths) specs.push("<li>" + esc(it.baths) + " ba</li>");
      if (it.sqft)  specs.push("<li>" + esc(it.sqft) + " sq ft</li>");
      var img = it.image || FALLBACK_IMG;
      var hasLink = !!it.link;
      var openTag = hasLink
        ? '<a class="listing__media" href="' + esc(it.link) + '" target="_blank" rel="noopener">'
        : '<div class="listing__media">';
      var closeTag = hasLink ? "</a>" : "</div>";
      var status = it.status
        ? '<span class="listing__status listing__status--' + statusClass(it.status) + '">' + esc(it.status) + "</span>"
        : "";
      var linkRow = hasLink
        ? '<a class="listing__link" href="' + esc(it.link) + '" target="_blank" rel="noopener">View details ↗</a>'
        : "";
      return '<article class="listing reveal">' +
          openTag +
            '<img src="' + esc(img) + '" alt="' + esc(it.address || "Listing") + '" loading="lazy" />' +
            status +
          closeTag +
          '<div class="listing__body">' +
            (it.price ? '<div class="listing__price">' + esc(money(it.price)) + "</div>" : "") +
            (it.address ? '<h3 class="listing__addr">' + esc(it.address) + "</h3>" : "") +
            (it.city ? '<p class="listing__city">' + esc(it.city) + "</p>" : "") +
            (specs.length ? '<ul class="listing__specs">' + specs.join("") + "</ul>" : "") +
            linkRow +
          "</div>" +
        "</article>";
    }

    function render(items) {
      listingsGrid.setAttribute("aria-busy", "false");
      if (!items || !items.length) {
        listingsGrid.innerHTML = "";
        if (emptyEl) emptyEl.hidden = false;
        return;
      }
      if (emptyEl) emptyEl.hidden = true;
      listingsGrid.innerHTML = items.map(card).join("");
      registerReveal(Array.prototype.slice.call(listingsGrid.querySelectorAll(".reveal")));
    }

    // Minimal RFC-4180-ish CSV parser (handles quoted commas + newlines).
    function parseCSV(text) {
      var rows = [], row = [], field = "", inQuotes = false;
      for (var i = 0; i < text.length; i++) {
        var c = text[i];
        if (inQuotes) {
          if (c === '"') {
            if (text[i + 1] === '"') { field += '"'; i++; }
            else { inQuotes = false; }
          } else { field += c; }
        } else if (c === '"') { inQuotes = true; }
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c !== "\r") { field += c; }
      }
      if (field.length || row.length) { row.push(field); rows.push(row); }
      return rows;
    }

    function rowsToListings(rows) {
      if (!rows.length) return [];
      var headers = rows[0].map(function (h) { return h.trim().toLowerCase(); });
      function idx(names) {
        for (var n = 0; n < names.length; n++) {
          var k = headers.indexOf(names[n]);
          if (k !== -1) return k;
        }
        return -1;
      }
      var col = {
        status:   idx(["status"]),
        price:    idx(["price"]),
        address:  idx(["address", "street"]),
        city:     idx(["city", "town"]),
        beds:     idx(["beds", "bedrooms", "bed"]),
        baths:    idx(["baths", "bathrooms", "bath"]),
        sqft:     idx(["sqft", "sq ft", "size", "square feet"]),
        image:    idx(["image", "photo", "image url", "photo url"]),
        link:     idx(["link", "url", "details"]),
        featured: idx(["featured", "show"]),
        order:    idx(["order", "sort"])
      };
      var out = [];
      for (var r = 1; r < rows.length; r++) {
        var cells = rows[r];
        var get = function (k) { return k !== -1 && cells[k] != null ? cells[k].trim() : ""; };
        var address = get(col.address), price = get(col.price);
        if (!address && !price) continue; // skip blank rows
        if (col.featured !== -1) {
          var f = get(col.featured).toLowerCase();
          if (f && ["no", "false", "0", "hide"].indexOf(f) !== -1) continue;
        }
        out.push({
          status: get(col.status), price: price, address: address,
          city: get(col.city), beds: get(col.beds), baths: get(col.baths),
          sqft: get(col.sqft), image: get(col.image), link: get(col.link),
          order: col.order !== -1 ? parseFloat(get(col.order)) : NaN
        });
      }
      out.sort(function (a, b) {
        var ao = isNaN(a.order) ? Infinity : a.order;
        var bo = isNaN(b.order) ? Infinity : b.order;
        return ao - bo;
      });
      return out;
    }

    function load() {
      if (SHEET_ID === "YOUR_SHEET_ID" || !SHEET_ID) { render(SAMPLE); return; }
      var url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv";
      if (SHEET_NAME) { url += "&sheet=" + encodeURIComponent(SHEET_NAME); }
      fetch(url)
        .then(function (r) { if (!r.ok) throw new Error("sheet fetch failed"); return r.text(); })
        .then(function (text) {
          var items = rowsToListings(parseCSV(text));
          render(items.length ? items : SAMPLE);
        })
        .catch(function () { render(SAMPLE); });
    }
    load();
  }

})();
