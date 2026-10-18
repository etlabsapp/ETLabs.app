/* ET Labs Free QR: pure logic shared by the page and the tests. No DOM, no network, no storage. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./vendor/qrcode-generator/qrcode.js"));
  else root.ETQR = factory(root.qrcode);
}(typeof self !== "undefined" ? self : this, function (qrcode) {
  "use strict";
  // Encode text as UTF-8 bytes (the library's default is Latin-1 only).
  qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

  var EC_NAMES = { L: "Low", M: "Medium", Q: "Quartile", H: "High" };

  function ok(payload) { return { payload: payload, error: null }; }
  function fail(error) { return { payload: null, error: error }; }

  /* URL mode: add https:// when there is no scheme; only http/https; encode the typed text as is. */
  function buildUrl(raw) {
    var s = String(raw || "").trim();
    if (!s) return fail("");
    if (/\s/.test(s)) return fail("Links can't contain spaces. Use Text mode for anything else.");
    var m = /^([a-z][a-z0-9+.\-]*):/i.exec(s);
    var hasScheme = m && !/^\d+(\/|$)/.test(s.slice(m[0].length)); // "host:8080" is a port, not a scheme
    if (!hasScheme) s = "https://" + s;
    else if (!/^https?:\/\//i.test(s)) return fail("Only http:// and https:// links work here. Use Text mode for anything else.");
    var u;
    try { u = new URL(s); } catch (e) { return fail("That doesn't look like a web address."); }
    if (u.protocol !== "http:" && u.protocol !== "https:") return fail("Only http:// and https:// links work here.");
    if (!u.hostname || (u.hostname.indexOf(".") === -1 && u.hostname !== "localhost" && !/^\[.*\]$/.test(u.hostname)))
      return fail("That doesn't look like a web address.");
    return ok(s);
  }

  function buildText(raw) {
    var s = String(raw == null ? "" : raw);
    if (!s.trim()) return fail("");
    return ok(s);
  }

  /* Wi-Fi: WIFI:T:<WPA|WEP|nopass>;S:<ssid>;P:<pass>;H:<true|false>;;  with \ ; , : " escaped. */
  function wifiEscape(v) { return String(v).replace(/([\\;,:"])/g, "\\$1"); }
  function buildWifi(f) {
    f = f || {};
    var ssid = String(f.ssid || "");
    var t = f.security === "WEP" ? "WEP" : f.security === "nopass" ? "nopass" : "WPA";
    var pass = String(f.password || "");
    if (!ssid) return fail("");
    if (t !== "nopass" && !pass) return fail("Add the Wi-Fi password, or choose No password.");
    var out = "WIFI:T:" + t + ";S:" + wifiEscape(ssid) + ";";
    if (t !== "nopass") out += "P:" + wifiEscape(pass) + ";";
    out += "H:" + (f.hidden ? "true" : "false") + ";;";
    return ok(out);
  }

  /* Email: mailto:<to>?subject=..&body=.. (RFC 6068: percent-encoded, line breaks as CRLF). */
  function enc(v) { return encodeURIComponent(String(v).replace(/\r?\n/g, "\r\n")); }
  function buildEmail(f) {
    f = f || {};
    var to = String(f.to || "").trim();
    if (!to) return fail("");
    if (!/^[^\s@,;?&#%]+@[^\s@,;?&#%]+\.[^\s@,;?&#%]+$/.test(to)) return fail("That doesn't look like an email address.");
    var q = [];
    if (f.subject) q.push("subject=" + enc(f.subject));
    if (f.body) q.push("body=" + enc(f.body));
    return ok("mailto:" + to + (q.length ? "?" + q.join("&") : ""));
  }

  /* What the page shows under the code: same as the payload, except a Wi-Fi password is replaced by bullets
     unless showPassword is true. The QR code and downloads always use buildPayload (the real password). */
  var MASK = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  function displayPayload(mode, fields, showPassword) {
    if (mode !== "wifi" || showPassword || !fields.password || fields.security === "nopass") return buildPayload(mode, fields);
    var masked = {}; for (var k in fields) masked[k] = fields[k];
    masked.password = MASK;
    return buildWifi(masked);
  }

  function buildPayload(mode, fields) {
    switch (mode) {
      case "text": return buildText(fields.text);
      case "wifi": return buildWifi(fields);
      case "email": return buildEmail(fields);
      default: return buildUrl(fields.url);
    }
  }

  /* Returns {count, dark(r,c)} or {error}. Version is picked automatically (1..40). */
  function makeMatrix(payload, ec) {
    ec = EC_NAMES[ec] ? ec : "M";
    try {
      var q = qrcode(0, ec);
      q.addData(payload, "Byte");
      q.make();
      return { count: q.getModuleCount(), dark: function (r, c) { return q.isDark(r, c); }, error: null };
    } catch (e) {
      var level = EC_NAMES[ec] + " (" + ec + ")";
      return { error: "This is too long for a QR code at " + level + " error correction." +
        (ec === "L" ? " Shorten it." : " Shorten it or pick a lower level (L holds the most).") };
    }
  }

  /* Pixel edges for module i of n across size px (integer edges keep every module crisp). */
  function edge(i, total, size) { return Math.round(i * size / total); }

  /* Draws onto a 2D context of size x size. */
  function drawToContext(ctx, m, opts) {
    var margin = opts.margin, size = opts.size, total = m.count + margin * 2;
    ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = opts.fg;
    for (var r = 0; r < m.count; r++) {
      var y0 = edge(r + margin, total, size), y1 = edge(r + margin + 1, total, size);
      for (var c = 0; c < m.count; c++) {
        if (!m.dark(r, c)) continue;
        var x0 = edge(c + margin, total, size), x1 = edge(c + margin + 1, total, size);
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
  }

  function xmlAttr(v) { return String(v).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }

  function toSvg(m, opts) {
    var margin = opts.margin, total = m.count + margin * 2, d = [];
    for (var r = 0; r < m.count; r++) {
      for (var c = 0; c < m.count; c++) {
        if (!m.dark(r, c)) continue;
        var run = 1;
        while (c + run < m.count && m.dark(r, c + run)) run++;
        d.push("M" + (c + margin) + " " + (r + margin) + "h" + run + "v1h-" + run + "z");
        c += run - 1;
      }
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + opts.size + '" height="' + opts.size +
      '" viewBox="0 0 ' + total + " " + total + '" shape-rendering="crispEdges">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + xmlAttr(opts.bg) + '"/>' +
      '<path fill="' + xmlAttr(opts.fg) + '" d="' + d.join("") + '"/></svg>\n';
  }

  /* WCAG 2.x contrast. */
  function hexToRgb(h) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim());
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function luminance(rgb) {
    var a = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrast(fg, bg) {
    var a = hexToRgb(fg), b = hexToRgb(bg);
    if (!a || !b) return { ratio: 1, inverted: false };
    var lf = luminance(a), lb = luminance(b);
    return { ratio: (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05), inverted: lf > lb };
  }

  return { buildPayload: buildPayload, buildUrl: buildUrl, buildText: buildText, buildWifi: buildWifi,
    buildEmail: buildEmail, displayPayload: displayPayload, MASK: MASK, wifiEscape: wifiEscape, makeMatrix: makeMatrix, drawToContext: drawToContext,
    toSvg: toSvg, contrast: contrast, EC_NAMES: EC_NAMES };
}));
