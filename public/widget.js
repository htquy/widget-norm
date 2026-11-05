/*!
 * Widget Norm — script nhúng chatbot cho website của shop.
 * <script src="https://YOUR_APP/widget.js" data-tenant="lumi-demo" async></script>
 * Giao diện (màu, vị trí, kiểu nút, tự mở, lời mời) lấy từ Admin → Giao diện widget, không cần sửa mã nhúng.
 * API: window.WidgetNorm.open() / .close() / .toggle()
 */
(function () {
  if (window.__widgetNormLoaded) return;
  window.__widgetNormLoaded = true;

  var script = document.currentScript || document.querySelector("script[data-tenant]");
  if (!script) return;
  var tenant = script.getAttribute("data-tenant");
  var base = script.getAttribute("data-base") || new URL(script.src).origin;
  if (!tenant) return;

  var vid;
  try {
    vid = localStorage.getItem("wn_vid");
    if (!vid) {
      vid = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9-]/g, "");
      localStorage.setItem("wn_vid", vid);
    }
  } catch (e) {
    vid = "";
  }

  function lum(hex) {
    var c = [1, 3, 5].map(function (i) {
      var v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function onColor(cfg) {
    if (cfg.onPrimary && cfg.onPrimary !== "auto") return cfg.onPrimary;
    var l = lum(cfg.primaryColor);
    return (1.05 / (l + 0.05)) >= ((l + 0.05) / (lum("#111111") + 0.05)) ? "#ffffff" : "#111111";
  }

  fetch(base + "/api/public/" + encodeURIComponent(tenant) + "/loader?origin=" + encodeURIComponent(location.origin))
    .then(function (r) { return r.json(); })
    .catch(function () { return { allowed: true, primaryColor: "#2563eb", position: "right", launcherStyle: "pill", launcherLabel: "Chat với chúng tôi", radius: "soft", offsetX: 20, offsetY: 20, autoOpenSeconds: 0, proactiveMessage: "" }; })
    .then(function (cfg) {
      if (!cfg || cfg.allowed === false) return;
      mount(cfg);
    });

  function mount(cfg) {
    var side = cfg.position === "left" ? "left" : "right";
    var fg = onColor(cfg);
    var radius = { sharp: 6, soft: 14, round: 22 }[cfg.radius] || 14;
    var ox = (cfg.offsetX == null ? 20 : cfg.offsetX) + "px";
    var oy = (cfg.offsetY == null ? 20 : cfg.offsetY) + "px";
    var circle = cfg.launcherStyle === "circle";

    var css =
      ".wn-root{all:initial}" +
      ".wn-btn{position:fixed;" + side + ":" + ox + ";bottom:" + oy + ";z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:10px;border:0;" +
      (circle ? "width:60px;height:60px;border-radius:999px;padding:0;" : "min-height:52px;border-radius:999px;padding:0 22px 0 18px;") +
      "background:" + cfg.primaryColor + ";color:" + fg + ";font:600 15px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}" +
      ".wn-btn:hover{box-shadow:0 10px 28px rgba(0,0,0,.26);transform:translateY(-1px)}" +
      ".wn-btn:focus-visible{outline:3px solid " + cfg.primaryColor + ";outline-offset:3px}" +
      ".wn-btn .wn-x{display:none}.wn-open .wn-btn .wn-x{display:inline-flex}.wn-open .wn-btn .wn-c{display:none}" +
      ".wn-open .wn-btn .wn-l{display:none}.wn-open .wn-btn{width:56px;height:56px;padding:0;border-radius:999px}" +
      ".wn-frame{position:fixed;" + side + ":" + ox + ";bottom:calc(" + oy + " + 68px);z-index:2147483001;width:400px;height:min(680px,calc(100vh - " + (parseInt(oy, 10) + 96) + "px));border:0;border-radius:" + radius + "px;box-shadow:0 24px 60px -12px rgba(0,0,0,.35);background:#fff;opacity:0;visibility:hidden;transform:translateY(12px) scale(.98);transform-origin:bottom " + side + ";transition:opacity .2s ease,transform .2s ease,visibility .2s}" +
      ".wn-open .wn-frame{opacity:1;visibility:visible;transform:none}" +
      ".wn-tip{position:fixed;" + side + ":" + ox + ";bottom:calc(" + oy + " + 68px);z-index:2147483000;max-width:260px;background:#fff;color:#15181d;border-radius:14px;padding:12px 36px 12px 14px;font:400 14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.18);cursor:pointer}" +
      ".wn-tip button{position:absolute;top:4px;" + (side === "left" ? "left" : "right") + ":4px;width:32px;height:32px;border:0;background:transparent;color:#5b6371;font-size:18px;cursor:pointer;border-radius:999px}" +
      ".wn-open .wn-tip{display:none}" +
      "@media (max-width:540px){.wn-frame{left:0;right:0;bottom:0;width:100vw;height:100dvh;border-radius:0}.wn-open .wn-btn{display:none}}" +
      "@media (prefers-reduced-motion:reduce){.wn-btn,.wn-frame{transition:none}}";

    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.className = "wn-root";
    var btn = document.createElement("button");
    btn.className = "wn-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", cfg.launcherLabel || "Mở chat");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML =
      '<span class="wn-c" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>' +
      '<span class="wn-x" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></span>' +
      (circle ? "" : '<span class="wn-l"></span>');
    if (!circle) btn.querySelector(".wn-l").textContent = cfg.launcherLabel || "Chat";
    root.appendChild(btn);

    var tip = null;
    var tipKey = "wn_tip_closed_" + tenant;
    var tipClosed = false;
    try { tipClosed = sessionStorage.getItem(tipKey) === "1"; } catch (e) {}
    if (cfg.proactiveMessage && !tipClosed) {
      tip = document.createElement("div");
      tip.className = "wn-tip";
      tip.setAttribute("role", "status");
      var span = document.createElement("span");
      span.textContent = cfg.proactiveMessage;
      var x = document.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", "Ẩn lời mời");
      x.textContent = "×";
      tip.appendChild(span);
      tip.appendChild(x);
      x.addEventListener("click", function (e) {
        e.stopPropagation();
        tip.remove();
        try { sessionStorage.setItem(tipKey, "1"); } catch (er) {}
      });
      tip.addEventListener("click", function () { open(); });
      setTimeout(function () { if (tip && !root.classList.contains("wn-open")) root.appendChild(tip); }, 2500);
    }
    document.body.appendChild(root);

    var frame = null;
    function open() {
      if (!frame) {
        frame = document.createElement("iframe");
        frame.className = "wn-frame";
        frame.title = cfg.title || "Chat";
        frame.allow = "clipboard-write";
        frame.src = base + "/embed/" + encodeURIComponent(tenant) + "?vid=" + encodeURIComponent(vid) + "&origin=" + encodeURIComponent(location.origin);
        root.appendChild(frame);
      }
      root.classList.add("wn-open");
      btn.setAttribute("aria-expanded", "true");
      try { sessionStorage.setItem("wn_opened_" + tenant, "1"); } catch (e) {}
    }
    function close() {
      root.classList.remove("wn-open");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }
    function toggle() { root.classList.contains("wn-open") ? close() : open(); }
    btn.addEventListener("click", toggle);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("wn-open")) close(); });
    window.addEventListener("message", function (e) {
      if (e.origin === base && e.data && e.data.type === "wn:close") close();
    });

    var opened = false;
    try { opened = sessionStorage.getItem("wn_opened_" + tenant) === "1"; } catch (e) {}
    if (cfg.autoOpenSeconds > 0 && !opened && window.innerWidth > 540) setTimeout(open, cfg.autoOpenSeconds * 1000);

    window.WidgetNorm = { open: open, close: close, toggle: toggle };
  }
})();
