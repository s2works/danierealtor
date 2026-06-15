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

})();
