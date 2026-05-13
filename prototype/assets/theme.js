/* ============================================================================
 * Nexora HRMS — Central Theme Configuration
 * ----------------------------------------------------------------------------
 * Single source of truth for the prototype's colour palette and typography.
 * Edit values in `THEME` below — every HTML page that loads this file picks
 * the new values up automatically (no per-file edits needed).
 *
 * What this file does on load:
 *   1. Configures Tailwind (`tailwind.config`) so utility classes like
 *      `bg-forest` or `text-emerald` resolve to the colours below.
 *   2. Injects the Google Fonts <link> for Inter + Poppins.
 *   3. Exposes every colour as a CSS custom property on :root, so plain
 *      CSS can use `var(--forest)` etc.
 *
 * Usage in HTML (after the Tailwind CDN script):
 *     <script src="https://cdn.tailwindcss.com"></script>
 *     <script src="../assets/theme.js"></script>
 *  (use `assets/theme.js` for files at the prototype root, e.g. index.html)
 * ==========================================================================*/

(function () {
  // ---- THEME ---------------------------------------------------------------
  // Change colours here. Keys become Tailwind class suffixes (e.g. "forest"
  // becomes `bg-forest`, `text-forest`, `border-forest`, etc.) and CSS
  // variables (e.g. `var(--forest)`).
  const THEME = {
    colors: {
      // Primary brand
      forest:    '#1C3D2E',  // primary CTAs, active nav, section anchors
      emerald:   '#2D7A5F',  // hover states, links, sub-headings
      mint:      '#C8E6DA',  // info boxes, table row hovers, soft fills
      softmint:  '#E4F1EB',  // table alternates, card highlights
      sage:      '#C0CEC8',  // borders, dividers, subtle separators

      // Text & surfaces
      charcoal:  '#1A2420',  // page titles, primary headings
      slate:     '#4A5E57',  // body text, metadata, secondary labels
      offwhite:  '#F6F8F7',  // page background

      // Status — semantic
      richgreen: '#1A7A4A',  // approved / success
      greenbg:   '#D4F0E0',  // approved badge background
      crimson:   '#C0392B',  // error / destructive
      crimsonbg: '#FAE0DD',  // error badge background
      umber:     '#A05C1A',  // pending / awaiting action
      umberbg:   '#FAECD4',  // pending badge background

      // Locked / Closed states (per SRS §9.1)
      lockedbg:  '#E4EBE8',  // locked / closed badge background
      lockedfg:  '#1A2420',  // locked badge text (charcoal)
    },
    fonts: {
      heading: ['Poppins', 'sans-serif'],
      body:    ['Inter',   'sans-serif'],
    },
    // Google Fonts request — keep in sync with `fonts` above when changing
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap',
  };

  // ---- 1. Tailwind config --------------------------------------------------
  if (typeof tailwind !== 'undefined') {
    tailwind.config = {
      theme: {
        extend: {
          colors: THEME.colors,
          fontFamily: {
            heading: THEME.fonts.heading,
            body:    THEME.fonts.body,
          },
        },
      },
    };
  } else {
    console.warn(
      '[theme.js] Tailwind CDN was not loaded before this script. ' +
      'Make sure <script src="https://cdn.tailwindcss.com"></script> ' +
      'comes BEFORE <script src=".../theme.js"></script>.'
    );
  }

  // ---- 2. Google Fonts (loaded once per page) ------------------------------
  if (!document.getElementById('nexora-fonts')) {
    const link = document.createElement('link');
    link.id   = 'nexora-fonts';
    link.rel  = 'stylesheet';
    link.href = THEME.googleFontsHref;
    document.head.appendChild(link);
  }

  // ---- 3. CSS custom properties on :root + custom scrollbars ---------------
  // Lets non-Tailwind CSS use the same colours via var(--forest), etc.
  if (!document.getElementById('nexora-theme-vars')) {
    const style = document.createElement('style');
    style.id = 'nexora-theme-vars';
    const vars = Object.entries(THEME.colors)
      .map(([name, hex]) => `  --${name}: ${hex};`)
      .join('\n');

    // Custom scrollbars (WebKit + Firefox) — themed to match the palette.
    // Light surfaces use sage thumb / mint hover; dark surfaces (.bg-forest,
    // <aside>) use mint thumb / white hover so they remain visible.
    const scrollbarCSS = `
      /* Firefox */
      * { scrollbar-width: thin; scrollbar-color: #C0CEC8 transparent; }
      .bg-forest, .bg-forest *, aside, aside * {
        scrollbar-color: rgba(200, 230, 218, 0.4) transparent;
      }

      /* WebKit (Chrome, Safari, Edge) */
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background-color: #C0CEC8;
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: content-box;
        transition: background-color 0.2s ease;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: #2D7A5F;
        background-clip: content-box;
      }
      ::-webkit-scrollbar-corner { background: transparent; }

      /* Dark surfaces (sidebar, forest backgrounds) */
      .bg-forest::-webkit-scrollbar-thumb,
      aside::-webkit-scrollbar-thumb {
        background-color: rgba(200, 230, 218, 0.35);
        background-clip: content-box;
      }
      .bg-forest::-webkit-scrollbar-thumb:hover,
      aside::-webkit-scrollbar-thumb:hover {
        background-color: rgba(255, 255, 255, 0.6);
        background-clip: content-box;
      }

      /* Slightly thinner on small viewports */
      @media (max-width: 768px) {
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { border-width: 1px; }
      }
    `;

    // Hero scene CSS — used by [data-nx-hero] elements on the checkin page,
    // dashboards, and anywhere else we want a forest scene with time-of-day
    // gradient swap. Page-side code only needs to drop the `data-nx-hero`
    // attribute on a card; this stylesheet handles colour, animations, and
    // tod-aware backgrounds.
    const heroCSS = `
      @keyframes nx-blob1     { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(28px,-22px) scale(1.08); } }
      @keyframes nx-blob2     { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-32px,18px) scale(1.10); } }
      @keyframes nx-blob3     { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(18px,28px) scale(0.95); } }
      @keyframes nx-sun-pulse { 0%,100% { opacity:.5; transform: scale(1); } 50% { opacity:.75; transform: scale(1.06); } }
      @keyframes nx-dust      { 0% { transform: translateY(0) translateX(0); opacity:0; } 10% { opacity:.6; } 90% { opacity:.6; } 100% { transform: translateY(-180px) translateX(40px); opacity:0; } }
      @keyframes nx-twinkle   { 0%,100% { opacity:.3; transform: scale(.9); } 50% { opacity:1; transform: scale(1.2); } }
      @keyframes nx-flip-in   { from { transform: rotateY(90deg); opacity:0; } to { transform: rotateY(0); opacity:1; } }
      @keyframes nx-flip-out  { from { transform: rotateY(0); opacity:1; } to { transform: rotateY(-90deg); opacity:0; } }

      @media (prefers-reduced-motion: reduce) {
        .nx-b1,.nx-b2,.nx-b3,.nx-sun,.nx-dust,.nx-star { animation: none !important; }
      }
      .nx-b1   { animation: nx-blob1 14s ease-in-out infinite; }
      .nx-b2   { animation: nx-blob2 18s ease-in-out infinite; }
      .nx-b3   { animation: nx-blob3 16s ease-in-out infinite; }
      .nx-sun  { animation: nx-sun-pulse 5s ease-in-out infinite; }
      .nx-dust { animation: nx-dust 9s linear infinite; }
      .nx-d2{animation-delay:2s;} .nx-d3{animation-delay:4s;} .nx-d4{animation-delay:6s;} .nx-d5{animation-delay:8s;}
      .nx-star { animation: nx-twinkle 3.2s ease-in-out infinite; }
      .nx-s2{animation-delay:.6s;} .nx-s3{animation-delay:1.2s;} .nx-s4{animation-delay:1.8s;}
      .nx-s5{animation-delay:2.4s;} .nx-s6{animation-delay:1s;}    .nx-s7{animation-delay:2s;}

      /* Time-of-day gradient variants.
         Morning commits to a sunrise palette (deep magenta → coral → gold);
         day commits to a clear-sky palette (deep cerulean → cyan → teal).
         Both finish in the forest base so the scene anchors. Cinematic feel
         comes from the base gradient itself plus a strong sun halo. */
      [data-nx-hero][data-tod="morning"] {
        background:
          /* Bright sun halo (upper-right) */
          radial-gradient(ellipse 60% 45% at 78% 22%, rgba(255,210,150,0.65), transparent 65%),
          /* Sunrise gradient — purple sky → magenta → coral → gold → forest */
          linear-gradient(180deg, #3D2C56 0%, #8A3B6B 22%, #D45F4E 42%, #F08850 58%, #F5B570 72%, #2D7A5F 92%, #1C3D2E 100%);
      }
      [data-nx-hero][data-tod="day"] {
        background:
          /* Bright sun halo */
          radial-gradient(ellipse 55% 42% at 80% 20%, rgba(255,235,170,0.65), transparent 62%),
          /* Clear-sky gradient — deep cerulean → cyan → teal → forest */
          linear-gradient(180deg, #1E5F8E 0%, #3A88BC 25%, #6FB5D6 48%, #6FBE9E 70%, #2D7A5F 90%, #1C3D2E 100%);
      }
      [data-nx-hero][data-tod="evening"] { background: linear-gradient(180deg, #5B3D6F 0%, #B85B6F 45%, #F4A56B 80%, #B85B6F 100%); }
      [data-nx-hero][data-tod="night"]   { background: linear-gradient(180deg, #0A1F2E 0%, #112A38 40%, #1C3D2E 100%); }

      /* Sun glow — strong warm drop-shadow so the sun reads as a light
         source rather than a flat disc. Larger and warmer than before. */
      [data-nx-hero][data-tod="morning"] .nx-sun { filter: drop-shadow(0 0 38px rgba(255, 190, 130, 0.75)); }
      [data-nx-hero][data-tod="day"]     .nx-sun { filter: drop-shadow(0 0 42px rgba(255, 225, 145, 0.75)); }

      /* Atmospheric horizon haze — soft band along the bottom for depth.
         Tuned warm for morning, cool for day. */
      [data-nx-hero][data-tod="morning"]::before,
      [data-nx-hero][data-tod="day"]::before {
        content: '';
        position: absolute;
        inset: auto 0 0 0;
        height: 32%;
        pointer-events: none;
        z-index: 0;
      }
      [data-nx-hero][data-tod="morning"]::before {
        background: linear-gradient(180deg, transparent 0%, rgba(255,170,110,0.16) 50%, transparent 100%);
      }
      [data-nx-hero][data-tod="day"]::before {
        background: linear-gradient(180deg, transparent 0%, rgba(180,225,240,0.18) 50%, transparent 100%);
      }

      /* Sun-rays — soft conical glow radiating from the sun, only on
         morning + day. Sits behind the sun SVG visually thanks to z-index. */
      [data-nx-hero][data-tod="morning"]::after,
      [data-nx-hero][data-tod="day"]::after {
        content: '';
        position: absolute;
        top: -10%;
        right: -5%;
        width: 55%;
        height: 75%;
        background: conic-gradient(from 200deg at 75% 25%, transparent 0deg, rgba(255,220,160,0.10) 12deg, transparent 24deg, rgba(255,220,160,0.10) 40deg, transparent 56deg, rgba(255,220,160,0.10) 78deg, transparent 100deg);
        pointer-events: none;
        z-index: 0;
        mix-blend-mode: screen;
      }
      /* Sun / moon colour per tod (recoloured shared markup) */
      [data-nx-hero][data-tod="morning"] .nx-celestial { color:#F4A56B; }
      [data-nx-hero][data-tod="day"]     .nx-celestial { color:#FFD56B; }
      [data-nx-hero][data-tod="evening"] .nx-celestial { color:#FBC97D; }
      [data-nx-hero][data-tod="night"]   .nx-celestial { color:#E4F1EB; }
      /* Dot-grid colour swap on light gradients (morning, day, evening) */
      [data-nx-hero][data-tod="morning"] .nx-dotgrid circle { fill:#1C3D2E; }
      [data-nx-hero][data-tod="day"]     .nx-dotgrid circle { fill:#1C3D2E; }
      [data-nx-hero][data-tod="evening"] .nx-dotgrid circle { fill:#FFFFFF; }
      /* Stars only at night */
      [data-nx-hero] .nx-stars { display:none; }
      [data-nx-hero][data-tod="night"] .nx-stars { display:block; }
      /* Clouds only during day (overrides nx-clouds default = hidden) */
      [data-nx-hero] .nx-clouds { display:none; }
      [data-nx-hero][data-tod="day"] .nx-clouds { display:block; }
      /* Mountains brighter on light gradients for legibility */
      [data-nx-hero][data-tod="morning"] .nx-mtn-front { fill:#1C3D2E; fill-opacity:.7; }
      [data-nx-hero][data-tod="morning"] .nx-mtn-back  { fill:#1C3D2E; fill-opacity:.4; }
      [data-nx-hero][data-tod="day"]     .nx-mtn-front { fill:#1C3D2E; fill-opacity:.85; }
      [data-nx-hero][data-tod="day"]     .nx-mtn-back  { fill:#2D7A5F; fill-opacity:.55; }
      [data-nx-hero][data-tod="evening"] .nx-mtn-front { fill:#1A2420; fill-opacity:.75; }
      [data-nx-hero][data-tod="evening"] .nx-mtn-back  { fill:#1A2420; fill-opacity:.45; }
      /* Drifting clouds (day only) */
      @keyframes nx-cloud-drift { from { transform: translateX(-15%); } to { transform: translateX(115%); } }
      .nx-cloud { animation: nx-cloud-drift 50s linear infinite; }
      .nx-c2 { animation-duration: 70s; animation-delay: -20s; }
      .nx-c3 { animation-duration: 60s; animation-delay: -45s; }
      @media (prefers-reduced-motion: reduce) { .nx-cloud { animation: none !important; } }

      /* Check-out flip — used on the checkin page's working/confirm panels. */
      .nx-panel { transform-style: preserve-3d; transition: transform 0.45s ease, opacity 0.35s ease; }
      .nx-panel.nx-checking-out  { animation: nx-flip-out 0.4s forwards; }
      .nx-panel.nx-checked-in    { animation: nx-flip-in 0.45s; }
      .nx-confirm.nx-show        { animation: nx-flip-in 0.5s; }
    `;

    // Sidebar enhancement — gives every <aside> a layered background that
    // matches the cinematic hero card aesthetic: deep vertical gradient,
    // soft aurora streak, top brand glow, and a dot grain texture.
    // Implemented in CSS so it lights up everywhere without per-page edits.
    const sidebarCSS = `
      aside {
        position: relative;
        isolation: isolate;
        background:
          linear-gradient(115deg, transparent 35%, rgba(200,230,218,0.06) 50%, transparent 65%),
          radial-gradient(ellipse 80% 45% at 50% 0%, rgba(111,190,158,0.22), transparent 70%),
          radial-gradient(ellipse 90% 40% at 50% 100%, rgba(15,46,34,0.55), transparent 65%),
          linear-gradient(180deg, #1C3D2E 0%, #163528 50%, #0F2E22 100%) !important;
      }
      aside::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 24px 24px;
        pointer-events: none;
        z-index: 0;
      }
      aside::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 240px;
        background: radial-gradient(ellipse at top, rgba(200,230,218,0.15), transparent 70%);
        pointer-events: none;
        z-index: 0;
      }
      aside > * { position: relative; z-index: 1; }
    `;

    style.textContent = `:root {\n${vars}\n}\n${scrollbarCSS}\n${heroCSS}\n${sidebarCSS}`;
    document.head.appendChild(style);
  }

  // Apply data-tod ("morning" | "day" | "evening" | "night") to every
  // [data-nx-hero] element so its gradient + sun colour reflect wall time.
  function applyTimeOfDay() {
    const h = new Date().getHours();
    let tod = 'day';
    if      (h >= 5  && h < 11)  tod = 'morning';
    else if (h >= 17 && h < 19)  tod = 'evening';
    else if (h <  5  || h >= 19) tod = 'night';
    document.querySelectorAll('[data-nx-hero]').forEach(el => el.setAttribute('data-tod', tod));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTimeOfDay);
  } else {
    applyTimeOfDay();
  }
  // Refresh hourly so a long-open tab transitions correctly across boundaries.
  setInterval(applyTimeOfDay, 60 * 60 * 1000);

  // Expose the theme on window for runtime inspection / debugging
  window.NexoraTheme = THEME;
})();
