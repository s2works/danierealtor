/* ============================================================
   /api/listings  —  Vercel serverless function
   ------------------------------------------------------------
   Fetches Danie's live listings page on the EXIT Moncton site
   from the server (a real browser User-Agent avoids the 403 the
   browser/CORS would otherwise hit) and returns normalized JSON
   for the carousel.

   Strategy, in order of reliability:
     1. JSON-LD  (<script type="application/ld+json">) — the
        structured-data standard most listing platforms emit.
     2. Generic price/address scan as a best-effort fallback.

   If the upstream fetch fails or yields nothing, we return a
   curated FALLBACK list so the carousel is never empty.

   Tune/inspect with:  /api/listings?debug=1
   ============================================================ */

const SOURCE_URL =
  "https://www.exitmoncton.ca/properties_for_agent/1364350/all";

const AGENT_LISTINGS_URL = SOURCE_URL;

const FALLBACK = [
  { address: "940 Frampton Lane", city: "Moncton, NB", price: "$399,900", status: "For Sale", type: "Single Family", beds: 4, baths: 2, sqft: "1,800", image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1000&q=80", url: AGENT_LISTINGS_URL },
  { address: "69 Barrieau Road", city: "Moncton, NB", price: "$389,900", status: "For Sale", type: "Multi-Family", beds: null, baths: null, sqft: "1,728", image: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1000&q=80", url: AGENT_LISTINGS_URL },
  { address: "100 Lancefield Drive", city: "Moncton, NB", price: "$302,900", status: "For Sale", type: "Single Family", beds: 3, baths: 2, sqft: "1,280", image: "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1000&q=80", url: AGENT_LISTINGS_URL },
  { address: "Lot Laverdure Street", city: "Cocagne, NB", price: "$55,000", status: "For Sale", type: "Land / Lot", beds: null, baths: null, sqft: null, image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80", url: AGENT_LISTINGS_URL }
];

/* ---------- helpers ---------- */

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function firstString(v) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return firstString(v[0]);
  if (v && typeof v === "object") return v.url || v.contentUrl || v["@id"] || null;
  return null;
}

function formatPrice(price, currency) {
  if (price == null || price === "") return "Contact for price";
  var num = Number(String(price).replace(/[^0-9.]/g, ""));
  if (!isFinite(num) || num <= 0) return "Contact for price";
  var sym = currency === "USD" ? "US$" : "$";
  return sym + num.toLocaleString("en-CA");
}

function buildAddress(addr) {
  if (!addr) return { line: null, city: null };
  if (typeof addr === "string") return { line: addr, city: null };
  var line =
    addr.streetAddress ||
    addr.name ||
    [addr.streetAddress, addr.addressLocality].filter(Boolean).join(", ");
  var cityParts = [addr.addressLocality, addr.addressRegion].filter(Boolean);
  return {
    line: line || null,
    city: cityParts.length ? cityParts.join(", ") : null
  };
}

function pickNumber() {
  for (var i = 0; i < arguments.length; i++) {
    var v = arguments[i];
    if (v == null) continue;
    if (typeof v === "object") v = v.value;
    var n = Number(v);
    if (isFinite(n) && n > 0) return n;
  }
  return null;
}

/* Flatten JSON-LD graphs and arrays into a list of objects */
function collectLdNodes(parsed, out) {
  asArray(parsed).forEach(function (node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node["@graph"])) collectLdNodes(node["@graph"], out);
    if (Array.isArray(node.itemListElement)) {
      node.itemListElement.forEach(function (it) {
        collectLdNodes(it && it.item ? it.item : it, out);
      });
    }
    out.push(node);
  });
}

function looksLikeListing(node) {
  var type = asArray(node["@type"]).join(" ").toLowerCase();
  var listingTypes = [
    "residence", "house", "apartment", "product", "realestatelisting",
    "singlefamilyresidence", "offer", "accommodation", "place"
  ];
  var typeMatch = listingTypes.some(function (t) { return type.indexOf(t) !== -1; });
  var hasOffer = node.offers || node.price || node.priceSpecification;
  var hasAddr = node.address || node.streetAddress;
  return typeMatch && (hasOffer || hasAddr || node.floorSize);
}

function normalizeLd(node) {
  var offer = asArray(node.offers)[0] || {};
  var priceSpec = offer.priceSpecification || node.priceSpecification || {};
  var price = formatPrice(
    offer.price != null ? offer.price : (node.price != null ? node.price : priceSpec.price),
    offer.priceCurrency || node.priceCurrency || priceSpec.priceCurrency
  );

  var addr = buildAddress(node.address || node);
  var type = asArray(node["@type"]).filter(function (t) {
    return ["product", "offer", "place", "thing"].indexOf(String(t).toLowerCase()) === -1;
  })[0];

  var image = firstString(node.image || node.photo);
  var url = firstString(node.url) || node["@id"] || AGENT_LISTINGS_URL;
  if (url && url.indexOf("http") !== 0) url = AGENT_LISTINGS_URL;

  var beds = pickNumber(node.numberOfBedrooms, node.numberOfRooms);
  var baths = pickNumber(node.numberOfBathroomsTotal, node.numberOfBathrooms);
  var floor = node.floorSize && (node.floorSize.value || node.floorSize);
  var sqftNum = pickNumber(floor);

  if (!addr.line && !node.name) return null;

  return {
    address: addr.line || node.name,
    city: addr.city || "New Brunswick",
    price: price,
    status: "For Sale",
    type: type ? humanizeType(String(type)) : "Property",
    beds: beds,
    baths: baths,
    sqft: sqftNum ? sqftNum.toLocaleString("en-CA") : null,
    image: image || FALLBACK[0].image,
    url: url
  };
}

function humanizeType(t) {
  var map = {
    singlefamilyresidence: "Single Family",
    house: "Single Family",
    apartment: "Apartment / Condo",
    residence: "Residential"
  };
  return map[t.toLowerCase()] || t.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function dedupe(listings) {
  var seen = {};
  return listings.filter(function (l) {
    var key = (l.address || "") + "|" + (l.price || "");
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

/* ---------- parsing strategies ---------- */

function parseJsonLd(html) {
  var listings = [];
  var re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var raw = m[1].trim();
    if (!raw) continue;
    try {
      var nodes = [];
      collectLdNodes(JSON.parse(raw), nodes);
      nodes.forEach(function (node) {
        if (looksLikeListing(node)) {
          var norm = normalizeLd(node);
          if (norm) listings.push(norm);
        }
      });
    } catch (e) { /* skip malformed block */ }
  }
  return dedupe(listings);
}

/* ---------- handler ---------- */

module.exports = async function handler(req, res) {
  var debug = req.query && (req.query.debug === "1" || req.query.debug === "true");

  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=86400");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  var diagnostics = { fetched: false, status: null, jsonLd: 0, strategy: "fallback" };

  try {
    var controller = new AbortController();
    var t = setTimeout(function () { controller.abort(); }, 8000);

    var resp = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8"
      }
    });
    clearTimeout(t);

    diagnostics.fetched = true;
    diagnostics.status = resp.status;

    if (resp.ok) {
      var html = await resp.text();
      var ld = parseJsonLd(html);
      diagnostics.jsonLd = ld.length;

      if (ld.length) {
        diagnostics.strategy = "json-ld";
        return res.status(200).json({
          source: "live",
          updatedAt: new Date().toISOString(),
          count: ld.length,
          listings: ld.slice(0, 12),
          debug: debug ? diagnostics : undefined
        });
      }

      if (debug) diagnostics.htmlSnippet = html.slice(0, 1500);
    }
  } catch (err) {
    diagnostics.error = String(err && err.message ? err.message : err);
  }

  /* Fallback — keep the carousel populated no matter what */
  return res.status(200).json({
    source: "fallback",
    updatedAt: new Date().toISOString(),
    count: FALLBACK.length,
    listings: FALLBACK,
    debug: debug ? diagnostics : undefined
  });
};
