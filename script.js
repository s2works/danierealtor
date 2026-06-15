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
    toggle.setAttribute("aria-expanded", "false");
  }
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

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

  /* ============================================================
     Listings carousel
     ============================================================ */
  var track = document.getElementById("carouselTrack");
  var viewport = document.getElementById("carouselViewport");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var dotsWrap = document.getElementById("carouselDots");

  function initCarousel(data) {
    if (!track || !data || !data.length) return;
    /* Build cards */
    function spec(value, label) {
      if (value === null || value === undefined || value === "") return "";
      return '<span><b>' + value + "</b> " + label + "</span>";
    }

    track.innerHTML = data.map(function (p) {
      var specs = [
        spec(p.beds, p.beds === 1 ? "bed" : "beds"),
        spec(p.baths, p.baths === 1 ? "bath" : "baths"),
        spec(p.sqft, "sq ft")
      ].join("");
      var specsBlock = specs ? '<div class="card__specs">' + specs + "</div>" : "";

      return (
        '<a class="card" href="' + p.url + '" target="_blank" rel="noopener" aria-label="' +
          p.address + ", " + p.city + '">' +
          '<div class="card__media">' +
            '<span class="card__status">' + p.status + "</span>" +
            '<img src="' + p.image + '" alt="' + p.address + '" loading="lazy" />' +
            '<div class="card__price">' + p.price + "</div>" +
          "</div>" +
          '<div class="card__body">' +
            '<h3 class="card__addr">' + p.address + "</h3>" +
            '<p class="card__city">' + p.city + "</p>" +
            '<span class="card__type">' + p.type + "</span>" +
            specsBlock +
            '<span class="card__link">View details →</span>' +
          "</div>" +
        "</a>"
      );
    }).join("");

    var cards = Array.prototype.slice.call(track.children);
    var index = 0;

    function perView() {
      var w = window.innerWidth;
      if (w < 640) return 1;
      if (w < 1024) return 2;
      return 3;
    }

    function maxIndex() {
      return Math.max(0, cards.length - perView());
    }

    function sizeCards() {
      var pv = perView();
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      var vw = viewport.clientWidth;
      var cardW = (vw - gap * (pv - 1)) / pv;
      cards.forEach(function (c) { c.style.setProperty("--card-w", cardW + "px"); });
      return { cardW: cardW, gap: gap };
    }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      var pages = maxIndex() + 1;
      for (var i = 0; i < pages; i++) {
        (function (i) {
          var b = document.createElement("button");
          b.setAttribute("aria-label", "Go to listing group " + (i + 1));
          b.addEventListener("click", function () { goTo(i); });
          dotsWrap.appendChild(b);
        })(i);
      }
    }

    function update() {
      var dims = sizeCards();
      index = Math.min(index, maxIndex());
      var offset = index * (dims.cardW + dims.gap);
      track.style.transform = "translateX(" + -offset + "px)";

      if (prevBtn) prevBtn.disabled = index <= 0;
      if (nextBtn) nextBtn.disabled = index >= maxIndex();

      if (dotsWrap) {
        Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
          d.classList.toggle("active", i === index);
        });
      }
    }

    function goTo(i) {
      index = Math.max(0, Math.min(i, maxIndex()));
      update();
      restartAuto();
    }
    function next() { goTo(index >= maxIndex() ? 0 : index + 1); }
    function prev() { goTo(index <= 0 ? maxIndex() : index - 1); }

    if (nextBtn) nextBtn.addEventListener("click", next);
    if (prevBtn) prevBtn.addEventListener("click", prev);

    /* Autoplay */
    var autoTimer = null;
    function startAuto() {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      autoTimer = setInterval(function () {
        if (document.hidden) return;
        next();
      }, 5000);
    }
    function stopAuto() { if (autoTimer) clearInterval(autoTimer); }
    function restartAuto() { stopAuto(); startAuto(); }

    var carousel = document.getElementById("carousel");
    if (carousel) {
      carousel.addEventListener("mouseenter", stopAuto);
      carousel.addEventListener("mouseleave", startAuto);
    }

    /* Touch / drag swipe */
    var startX = 0, dragging = false;
    function onStart(x) { startX = x; dragging = true; stopAuto(); }
    function onEnd(x) {
      if (!dragging) return;
      dragging = false;
      var dx = x - startX;
      if (Math.abs(dx) > 45) { dx < 0 ? next() : prev(); }
      restartAuto();
    }
    viewport.addEventListener("touchstart", function (e) { onStart(e.touches[0].clientX); }, { passive: true });
    viewport.addEventListener("touchend", function (e) { onEnd(e.changedTouches[0].clientX); }, { passive: true });
    viewport.addEventListener("mousedown", function (e) { onStart(e.clientX); });
    window.addEventListener("mouseup", function (e) { if (dragging) onEnd(e.clientX); });

    /* Keyboard */
    viewport.setAttribute("tabindex", "0");
    viewport.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    });

    /* Init + resize */
    var resizeT;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { buildDots(); update(); }, 150);
    });

    buildDots();
    update();
    startAuto();

    /* Recompute once images/fonts settle */
    window.addEventListener("load", function () { buildDots(); update(); });
  }

  /* Load live listings from the serverless proxy; fall back to static data */
  (function loadListings() {
    if (!track) return;
    var fallback = window.DANIE_LISTINGS || [];

    if (typeof fetch !== "function") { initCarousel(fallback); return; }

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 6000) : null;

    fetch("/api/listings", controller ? { signal: controller.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (payload) {
        if (timer) clearTimeout(timer);
        var live = payload && payload.listings;
        initCarousel(live && live.length ? live : fallback);
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        initCarousel(fallback);
      });
  })();
})();
