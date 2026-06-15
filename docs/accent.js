(function () {
  var STORAGE_KEY = "pindeck_docs_tweaks";
  var DEFAULT_ACCENT = "#3a7bff";

  function clamp255(n) {
    return Math.min(255, Math.max(0, Math.round(n)));
  }

  function normalizeHex(hex) {
    if (!hex || typeof hex !== "string") return null;
    var value = hex.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(value)) {
      value = value.split("").map(function (part) { return part + part; }).join("");
    }
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
    return "#" + value.toLowerCase();
  }

  function hexToRgb(hex) {
    var normalized = normalizeHex(hex) || DEFAULT_ACCENT;
    return [
      parseInt(normalized.slice(1, 3), 16),
      parseInt(normalized.slice(3, 5), 16),
      parseInt(normalized.slice(5, 7), 16),
    ];
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (channel) {
      return clamp255(channel).toString(16).padStart(2, "0");
    }).join("");
  }

  function accentInk(hex) {
    var rgb = hexToRgb(hex);
    var t = 0.58;
    return rgbToHex(
      rgb[0] * (1 - t) + 248 * t,
      rgb[1] * (1 - t) + 250 * t,
      rgb[2] * (1 - t) + 252 * t
    );
  }

  function accentHover(hex) {
    var rgb = hexToRgb(hex);
    return rgbToHex(rgb[0] * 0.78, rgb[1] * 0.78, rgb[2] * 0.78);
  }

  function logoDataUri(accent, pinColor) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 174 32" width="174" height="32">'
      + '<rect x="2" y="4" width="24" height="24" rx="5" fill="#101014" stroke="#ffffff" stroke-opacity=".12"/>'
      + '<text x="14" y="22" font-family="Arial Black, Archivo Black, Geist, Inter, system-ui, sans-serif" font-size="17" font-weight="900" font-style="italic" fill="#ffffff" text-anchor="middle" letter-spacing="-1.2">P/</text>'
      + '<text x="34" y="24" font-family="Arial Black, Archivo Black, Geist, Inter, system-ui, sans-serif" font-size="22" font-weight="900" font-style="italic" fill="' + pinColor + '" letter-spacing="-1.45">PIN</text>'
      + '<text x="76" y="24" font-family="Arial Black, Archivo Black, Geist, Inter, system-ui, sans-serif" font-size="22" font-weight="900" font-style="italic" fill="' + accent + '" letter-spacing="-1.45">DECK</text>'
      + '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function installLogoLockup() {
    var run = function () {
      document.querySelectorAll("img.nav-logo").forEach(function (img) {
        var anchor = img.closest("a");
        if (!anchor) return;
        anchor.classList.add("pindeck-docs-logo-lockup");
        anchor.setAttribute("aria-label", "Pindeck Docs home");
        if (!anchor.querySelector(".pindeck-docs-logo-mark")) {
          anchor.insertAdjacentHTML(
            "beforeend",
            '<span class="pindeck-docs-logo-mark" aria-hidden="true">P/</span>' +
              '<span class="pindeck-docs-logo-word" aria-hidden="true">' +
              '<span class="pindeck-docs-logo-pin">PIN</span>' +
              '<span class="pindeck-docs-logo-deck">DECK</span>' +
              "</span>"
          );
        }
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }

  function updateLogos(accent) {
    var run = function () {
      document.querySelectorAll('img[src="/logo/dark.svg"], img[src="/logo/light.svg"]').forEach(function (img) {
        var isLightLogo = img.getAttribute("src") === "/logo/light.svg";
        img.setAttribute("src", logoDataUri(accent, isLightLogo ? "#111116" : "#ffffff"));
      });
      installLogoLockup();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }

  function applyAccent(accent) {
    var normalized = normalizeHex(accent) || DEFAULT_ACCENT;
    var rgb = hexToRgb(normalized);
    var ink = accentInk(normalized);
    var inkRgb = hexToRgb(ink);
    var hover = accentHover(normalized);
    var hoverRgb = hexToRgb(hover);
    var root = document.documentElement;
    root.style.setProperty("--pd-doc-accent", normalized);
    root.style.setProperty("--pd-doc-accent-ink", ink);
    root.style.setProperty("--pd-doc-accent-soft", normalized + "24");
    root.style.setProperty("--pd-doc-accent-hover", hover);
    root.style.setProperty("--primary", rgb.join(" "));
    root.style.setProperty("--primary-light", inkRgb.join(" "));
    root.style.setProperty("--primary-dark", hoverRgb.join(" "));
    updateLogos(normalized);
  }

  try {
    var params = new URLSearchParams(window.location.search);
    var incomingAccent = normalizeHex(params.get("accent"));
    var incomingTypography = params.get("typography");

    if (incomingAccent) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        accent: incomingAccent,
        typography: incomingTypography || "geist",
      }));
      applyAccent(incomingAccent);
      return;
    }

    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    applyAccent(saved.accent || DEFAULT_ACCENT);
  } catch (_error) {
    applyAccent(DEFAULT_ACCENT);
  }
})();
