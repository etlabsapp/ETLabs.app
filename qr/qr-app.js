/* ET Labs Free QR: page wiring. Everything runs locally. This file makes no network requests and
   never writes what you type to the URL, history, title, cookies or storage. */
(function () {
  "use strict";
  var Q = window.ETQR;
  var $ = function (id) { return document.getElementById(id); };
  var mode = "url";
  var current = null; // { payload, matrix }
  var timer = 0;

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".qr-tab"));
  var errIds = { url: "err-url", text: "err-text", wifi: "err-wifi", email: "err-email" };
  var focusIds = { url: "in-url", text: "in-text", wifi: "in-ssid", email: "in-to" };
  var emptyText = { url: "Type a link to make your code.", text: "Type some text to make your code.",
    wifi: "Add your network name to make your code.", email: "Add an email address to make your code." };

  function opts() {
    var ec = document.querySelector('input[name="ec"]:checked');
    return { size: +$("opt-size").value, margin: +$("opt-margin").value,
      fg: $("opt-fg").value, bg: $("opt-bg").value, ec: ec ? ec.value : "M" };
  }

  function fields() {
    return { url: $("in-url").value, text: $("in-text").value, ssid: $("in-ssid").value,
      security: $("in-sec").value, password: $("in-pass").value, hidden: $("in-hidden").checked,
      to: $("in-to").value, subject: $("in-subject").value, body: $("in-body").value };
  }

  function setStatus(msg) { $("qr-status").textContent = msg; }

  function showError(msg) {
    Object.keys(errIds).forEach(function (m) {
      var el = $(errIds[m]);
      var on = m === mode && !!msg;
      el.hidden = !on;
      el.textContent = on ? msg : "";
    });
    var inp = $(focusIds[mode]);
    if (msg) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid");
  }

  function setReady(on) {
    ["btn-png", "btn-svg", "btn-print"].forEach(function (id) { $(id).disabled = !on; });
    $("qr-canvas").hidden = !on;
    $("qr-empty").hidden = on;
    $("qr-opens").hidden = !on;
  }

  function render() {
    var o = opts();
    $("out-size").textContent = o.size + " px";
    $("out-margin").textContent = o.margin + (o.margin === 1 ? " module" : " modules");
    var c = Q.contrast(o.fg, o.bg);
    $("warn-contrast").hidden = !(c.ratio < 4.5 || c.inverted);
    $("warn-contrast").textContent = c.inverted
      ? "Low contrast. Some phones may not scan this. Light codes on dark backgrounds often fail; try swapping the colors."
      : "Low contrast. Some phones may not scan this.";
    $("warn-margin").hidden = o.margin >= 4;

    var b = Q.buildPayload(mode, fields());
    $("qr-empty").textContent = emptyText[mode];
    if (!b.payload) { current = null; showError(b.error); setReady(false); setStatus(b.error || ""); return; }
    var m = Q.makeMatrix(b.payload, o.ec);
    if (m.error) { current = null; showError(m.error); setReady(false); setStatus(m.error); return; }
    showError("");
    current = { payload: b.payload, matrix: m };

    // Preview: crisp canvas (>= 640 px backing store), shown at up to 320 CSS px.
    var cv = $("qr-canvas");
    var total = m.count + o.margin * 2;
    var px = Math.max(640, total * 4);
    cv.width = px; cv.height = px;
    Q.drawToContext(cv.getContext("2d"), m, { size: px, margin: o.margin, fg: o.fg, bg: o.bg });
    // On screen (and in print) a Wi-Fi password shows as bullets unless "Show" is on; the code itself holds the real one.
    var shown = Q.displayPayload(mode, fields(), showPass()).payload;
    cv.setAttribute("aria-label", "QR code for " + shown);
    var v = $("qr-opens-value");
    v.textContent = shown;              // text only, never HTML
    v.title = shown;
    setReady(true);
    setStatus("");
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(render, 120); }

  function save(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  $("btn-png").addEventListener("click", function () {
    render(); if (!current) return;
    var o = opts(), cv = document.createElement("canvas");
    cv.width = o.size; cv.height = o.size;
    Q.drawToContext(cv.getContext("2d"), current.matrix, { size: o.size, margin: o.margin, fg: o.fg, bg: o.bg });
    cv.toBlob(function (blob) { save(blob, "etlabs-qr.png"); setStatus("PNG downloaded (" + o.size + " px)."); }, "image/png");
  });
  $("btn-svg").addEventListener("click", function () {
    render(); if (!current) return;
    var o = opts();
    save(new Blob([Q.toSvg(current.matrix, o)], { type: "image/svg+xml" }), "etlabs-qr.svg");
    setStatus("SVG downloaded.");
  });
  $("btn-print").addEventListener("click", function () { render(); if (current) window.print(); });
  $("opt-swap").addEventListener("click", function () {
    var f = $("opt-fg").value; $("opt-fg").value = $("opt-bg").value; $("opt-bg").value = f; render();
  });
  function showPass() { return $("btn-showpass").getAttribute("aria-pressed") === "true"; }
  $("btn-showpass").addEventListener("click", function () {
    var on = !showPass();
    this.setAttribute("aria-pressed", on ? "true" : "false");
    this.setAttribute("aria-label", on ? "Hide password" : "Show password");
    this.textContent = on ? "Hide" : "Show";
    $("in-pass").type = on ? "text" : "password";
    render();
  });
  $("in-sec").addEventListener("change", function () { $("row-pass").hidden = this.value === "nopass"; });

  function selectTab(btn, focus) {
    mode = btn.getAttribute("data-mode");
    tabs.forEach(function (t) {
      var on = t === btn;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) btn.focus();
    render();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t, false); });
    t.addEventListener("keydown", function (e) {
      var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
      if (j === null) return;
      e.preventDefault();
      selectTab(tabs[(j + tabs.length) % tabs.length], true);
    });
  });

  document.querySelector(".qr-tool").addEventListener("input", schedule);
  document.querySelector(".qr-tool").addEventListener("change", schedule);

  // Options open at desktop widths, closed on phones (Design spec).
  if (window.matchMedia("(max-width: 900px)").matches) $("qr-options").open = false;
  render();
}());
