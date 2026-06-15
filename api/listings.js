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

/* Strategy 2 — embedded JSON state blobs (__NEXT_DATA__, __NUXT__,
   __INITIAL_STATE__, or any application/json). Deep-walks for objects
   that carry a price + address signature (handles RESO/DDF feeds). */

var PRICE_KEYS   = ["listprice", "price", "currentprice", "askingprice", "originallistprice"];
var ADDR_KEYS    = ["unparsedaddress", "streetaddress", "address", "addressline1", "fulladdress"];
var CITY_KEYS    = ["city", "addresslocality", "municipality"];
var REGION_KEYS  = ["stateorprovince", "addressregion", "province"];
var BED_KEYS     = ["bedroomstotal", "bedrooms", "numberofbedrooms", "beds"];
var BATH_KEYS    = ["bathroomstotalinteger", "bathroomstotal", "bathrooms", "numberofbathrooms", "baths"];
var AREA_KEYS    = ["livingarea", "buildingareatotal", "squarefootage", "sqft", "floorsize"];
var TYPE_KEYS    = ["propertytype", "propertysubtype", "type", "propertytypelabel"];
var IMG_KEYS     = ["media", "photos", "images", "image", "primaryphoto", "photourl", "thumbnail"];
var URL_KEYS     = ["url", "detailsurl", "permalink", "link", "href", "slug"];

function getKey(obj, keys) {
  for (var k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    if (keys.indexOf(k.toLowerCase()) !== -1) return obj[k];
  }
  return undefined;
}

function extractImage(v) {
  if (!v) return null;
  if (typeof v === "string") return v.indexOf("http") === 0 ? v : null;
  if (Array.isArray(v)) {
    for (var i = 0; i < v.length; i++) {
      var got = extractImage(v[i]);
      if (got) return got;
    }
    return null;
  }
  if (typeof v === "object") {
    return extractImage(v.MediaURL || v.url || v.contentUrl || v.src || v.Uri || v.href);
  }
  return null;
}

function looksLikeListingObj(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  var hasPrice = getKey(obj, PRICE_KEYS) != null;
  var hasAddr = getKey(obj, ADDR_KEYS) != null;
  return hasPrice && hasAddr;
}

function normalizeObj(obj) {
  var addr = getKey(obj, ADDR_KEYS);
  if (addr && typeof addr === "object") addr = addr.streetAddress || addr.name;
  var city = getKey(obj, CITY_KEYS);
  var region = getKey(obj, REGION_KEYS);
  if (!addr) return null;

  var cityLine = [city, region].filter(Boolean).join(", ") || "New Brunswick";
  var url = firstString(getKey(obj, URL_KEYS));
  if (!url || url.indexOf("http") !== 0) url = AGENT_LISTINGS_URL;

  var beds = pickNumber(getKey(obj, BED_KEYS));
  var baths = pickNumber(getKey(obj, BATH_KEYS));
  var area = getKey(obj, AREA_KEYS);
  if (area && typeof area === "object") area = area.value;
  var sqftNum = pickNumber(area);

  var type = getKey(obj, TYPE_KEYS);
  var img = extractImage(getKey(obj, IMG_KEYS));

  return {
    address: String(addr),
    city: cityLine,
    price: formatPrice(getKey(obj, PRICE_KEYS), getKey(obj, ["pricecurrency", "currency"])),
    status: String(getKey(obj, ["standardstatus", "status", "mlsstatus"]) || "For Sale"),
    type: type ? humanizeType(String(type)) : "Property",
    beds: beds,
    baths: baths,
    sqft: sqftNum ? sqftNum.toLocaleString("en-CA") : null,
    image: img || FALLBACK[0].image,
    url: url
  };
}

function deepCollect(node, out, depth) {
  if (depth > 8 || node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach(function (n) { deepCollect(n, out, depth + 1); });
    return;
  }
  if (looksLikeListingObj(node)) {
    var n = normalizeObj(node);
    if (n) out.push(n);
  }
  for (var k in node) {
    if (Object.prototype.hasOwnProperty.call(node, k)) deepCollect(node[k], out, depth + 1);
  }
}

function parseEmbeddedJson(html) {
  var listings = [];
  var blocks = [];

  var nextData = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (nextData) blocks.push(nextData[1]);

  var jsonRe = /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  var jm;
  while ((jm = jsonRe.exec(html)) !== null) blocks.push(jm[1]);

  var stateRe = /(?:__INITIAL_STATE__|__NUXT__|__APOLLO_STATE__|window\.__DATA__)\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/gi;
  var sm;
  while ((sm = stateRe.exec(html)) !== null) blocks.push(sm[1]);

  blocks.forEach(function (raw) {
    try {
      var out = [];
      deepCollect(JSON.parse(raw.trim()), out, 0);
      listings = listings.concat(out);
    } catch (e) { /* skip */ }
  });

  return dedupe(listings);
}

/* ---------- handler ---------- */

module.exports = async function handler(req, res) {
  var debug = req.query && (req.query.debug === "1" || req.query.debug === "true");

  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=86400");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  var diagnostics = {
    fetched: false, status: null, htmlLength: 0,
    jsonLd: 0, embedded: 0, strategy: "fallback"
  };

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
        "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8",
        "Referer": "https://www.exitmoncton.ca/"
      }
    });
    clearTimeout(t);

    diagnostics.fetched = true;
    diagnostics.status = resp.status;

    if (resp.ok) {
      var html = await resp.text();
      diagnostics.htmlLength = html.length;

      var ld = parseJsonLd(html);
      diagnostics.jsonLd = ld.length;

      var embedded = parseEmbeddedJson(html);
      diagnostics.embedded = embedded.length;

      var found = dedupe(ld.concat(embedded));

      if (found.length) {
        diagnostics.strategy = ld.length ? "json-ld" : "embedded-json";
        return res.status(200).json({
          source: "live",
          updatedAt: new Date().toISOString(),
          count: found.length,
          listings: found.slice(0, 24),
          debug: debug ? diagnostics : undefined
        });
      }

      if (debug) {
        // Strip tags so the snippet is readable for parser tuning.
        var text = html.replace(/<script[\s\S]*?<\/script>/gi, " ")
                       .replace(/<style[\s\S]*?<\/style>/gi, " ")
                       .replace(/<[^>]+>/g, " ")
                       .replace(/\s+/g, " ").trim();
        diagnostics.priceMatches = (html.match(/\$\s?\d{2,3}(,\d{3})/g) || []).slice(0, 12);
        diagnostics.hasNextData = /__NEXT_DATA__/.test(html);
        diagnostics.textSnippet = text.slice(0, 2000);
      }
    } else if (debug) {
      diagnostics.note = "Upstream returned non-OK status (likely bot protection).";
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
