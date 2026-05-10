# UI / UX Design Document
## HR Management System (HRMS)

**Aesthetic:** Professional · Trustworthy · Role-Aware · Compliant

**Prepared for:** Nexora Technologies Pvt. Ltd.
**Prepared by:** Abhishek Pundir
**Document Date:** May 2026 · Version 1.0
**Confidential — For Internal Use Only**

---

## 1. Design Philosophy

The Nexora HRMS follows a **"Structured Compliance"** design philosophy — built to communicate authority, reduce cognitive load, and make every HR action feel deliberate and traceable. Every screen is designed so the user always knows where they are, what they can do, and what the consequence of each action is.

| Principle | What It Means |
|---|---|
| **Structured** | Every screen has a defined hierarchy. The user always knows where they are, what action is available, and what happens next. HR workflows carry legal and payroll consequences — the interface must reflect that weight. |
| **Trustworthy** | Professional typography, consistent spacing, and restrained colour create a platform that feels reliable. Payroll, leave approvals, and performance ratings demand confidence — the UI must never feel casual. |
| **Role-Aware** | The interface adapts completely to the logged-in role. Employees see their own records. Managers see their team. Admin sees everything. No role is exposed to controls or data that do not concern them. |
| **Compliant** | Every action — approval, payroll finalisation, attendance correction — produces a traceable, system-generated audit record that no user (Admin included) can edit or delete. The design surfaces audit context at the right moments and never hides consequences from the user. |

---

## 2. Colour System

The palette is built around **Deep Forest Green** and **warm neutral Gray** — conveying institutional authority, HR compliance credibility, and calm precision. Green is the brand anchor; gray manages hierarchy and breathing room. Every colour is purposeful — Rich Green for success, Deep Crimson for alerts and destructive actions, Warm Umber for warnings and pending states.

### Primary Colours

| Colour Name | Hex Code | Token | Usage |
|---|---|---|---|
| Deep Forest Green | `#1C3D2E` | `forest` | Primary buttons, active navigation, section headers, brand moments |
| Emerald | `#2D7A5F` | `emerald` | Secondary actions, hover states, sub-headings, links, highlights |
| Mint | `#C8E6DA` | `mint` | Info boxes, table alternates, badge backgrounds |
| Soft Mint Accent | `#E4F1EB` | `softmint` | Table row alternates, card highlights, info fills |
| Deep Charcoal | `#1A2420` | `charcoal` | Page titles, primary headings — maximum contrast |
| Warm Slate | `#4A5E57` | `slate` | Body text, metadata, secondary labels |
| Off-White | `#F6F8F7` | `offwhite` | Page background — green-tinted, easier on the eye than pure white |
| White | `#FFFFFF` | `white` | Card backgrounds, input fields, table rows |
| Sage Border | `#C0CEC8` | `sage` | Table borders, input outlines, dividers |
| Warm Mid-Gray | `#5F6B66` | `midgray` | Footer text, muted labels, end-of-document markers |

### Semantic / Status Colours

| Purpose | Hex Code | Token | Usage |
|---|---|---|---|
| Rich Green | `#1A7A4A` | `richgreen` | Approved badges, completed actions, payroll Finalised confirmations |
| Green BG | `#D4F0E0` | `greenbg` | Approved badge backgrounds, success notification fills |
| Deep Crimson | `#C0392B` | `crimson` | Error states, destructive buttons, rejected / overdue badges |
| Crimson BG | `#FAE0DD` | `crimsonbg` | Rejected / error badge backgrounds |
| Warm Umber | `#A05C1A` | `umber` | Pending / awaiting action states, escalation alert labels |
| Umber BG | `#FAECD4` | `umberbg` | Pending badge backgrounds, draft and in-progress state fills |
| Locked / Closed BG | `#E4EBE8` | `lockedbg` | Locked / Closed badge backgrounds (closed performance cycles, exited employee status) |
| Locked / Closed FG | `#1A2420` | `lockedfg` | Locked / Closed badge text — paired with a lock icon |

### Colour Usage Guidelines

- **Deep Forest Green (`#1C3D2E`)** — Reserve for primary CTAs, active nav states, and section anchors. Never use for large body text blocks.
- **Emerald (`#2D7A5F`)** — Hover states, links, sub-headings, and secondary interactive elements. Provides visual variety without breaking brand.
- **Deep Charcoal (`#1A2420`)** — Headlines only. Creates strong hierarchy and maximum contrast against off-white backgrounds.
- **Warm Slate (`#4A5E57`)** — All body text. Softer than pure black — reduces eye strain during extended data entry and form review.
- **Deep Crimson (`#C0392B`)** — Error states and destructive action buttons only. Never used decoratively.
- **Rich Green (`#1A7A4A`)** — Success and approved states only. Pairs with Green BG and a lock icon for the **Finalised** payslip / payroll-run state.
- **Warm Umber (`#A05C1A`)** — Pending and escalation states only — anything awaiting action but not yet failed.
- **Locked / Closed (`#E4EBE8` / `#1A2420`)** — Used together for cycle closure and the Locked sub-state. Always paired with a lock glyph so the meaning is unambiguous; never confuse with the green Finalised treatment.

All text must meet WCAG AA minimum contrast ratio (4.5:1) at every font size and on every background colour.

---

## 3. Typography System

Typography is the primary tool for communicating hierarchy across an interface used by four distinct roles. We use Google Fonts for reliability, performance, and zero licensing cost.

### Font Families

**Inter (Primary — All UI Text)**
- Weights: Regular (400), Medium (500), Semi-Bold (600), Bold (700)
- Purpose: Maximum legibility across dashboards, forms, tables, and data-heavy screens
- Usage: All body text, labels, table data, form inputs, navigation items, button text
- Rationale: Designed specifically for screen interfaces — superior rendering at small sizes and high-density data tables

**Poppins (Display — Headings Only)**
- Weights: Semi-Bold (600), Bold (700)
- Purpose: Geometric, modern authority for page titles and section headings
- Usage: H1 page titles, H2 section headings, dashboard metric values
- Alternative: Inter Bold can substitute if a single-font system is preferred

### Type Scale & Hierarchy

| Element | Font | Size | Weight | Colour |
|---|---|---|---|---|
| H1 — Page Title | Poppins | 32px | Bold (700) | `#1A2420` |
| H2 — Section Heading | Poppins | 24px | Semi-Bold (600) | `#1C3D2E` |
| H3 — Sub-heading | Inter | 18px | Semi-Bold (600) | `#2D7A5F` |
| Body Text | Inter | 16px | Regular (400) | `#4A5E57` |
| Label / Meta | Inter | 13px | Medium (500) | `#4A5E57` |
| Button Text | Inter | 14px | Semi-Bold (600) | `#FFFFFF` |
| Badge / Tag | Inter | 12px | Bold (700) | role-specific |
| Table Data | Inter | 14px | Regular (400) | `#1A2420` |

### Readability Settings

- **Line Height:** 1.6 for UI elements, 1.75 for body and form content
- **Line Length:** Maximum 720px for reading-heavy screens (payslip view, policy text, review comments)
- **Paragraph Spacing:** 1.25em between paragraphs in document and report views
- **Letter Spacing:** Default for body text; 0.03em tracking for all-caps labels and status badges
- **Minimum Font Size:** 12px — nothing smaller on any screen at any breakpoint

---

## 4. Layout System

### Login Screen

The login is a full-bleed brand surface — a single forest-green canvas that establishes the platform's authority before the user has authenticated.

- **Background:** Deep Forest Green (`#1C3D2E`) covers the whole viewport. A faint white dot grid (≈7 % opacity) and three softly drifting blurred mint / emerald blobs add depth without noise. Two outline SVG illustrations (an organisational tree and a leaf / growth motif) anchor opposite corners at low opacity.
- **Top brand bar:** Mint logo tile + "Nexora HRMS" wordmark on the left; a small "Need an account? Contact HR" hint on the right.
- **Two-column hero (≥ lg):** Left column carries the brand pitch — accent bar, headline `Your complete HR platform.` (with the second line shimmering through a mint → white → mint gradient), a 2-column module grid (Employees · Leave · Attendance · Payroll · Performance), a stats strip (`250+ Employees · 4 Roles · 100% Audit-ready`), and a single italic pull-quote.
- **Sign-in card (right):** Frosted glass — `rgba(255,255,255,0.95)` with `backdrop-filter: blur(12px)` and a subtle mint-to-emerald glow. The card gently bobs (6 s `translateY` keyframe). Inside: email and password fields with inline icons (mail / lock), a show / hide-password eye toggle, a "Keep me signed in for 30 days" checkbox, a forest-to-emerald gradient CTA with a sliding right arrow, a divider, and a 2×2 grid of role shortcut tiles (Admin / Manager / Employee / Payroll Officer) each with a coloured initial badge. A trust micro-line (`Encrypted · Role-based access · Audit logged`) sits below the card.
- **Footer strip:** Copyright on the left, "All rights reserved." on the right.
- **Mobile (< lg):** The left column collapses; the form becomes the single focus, gaining a short shine headline of its own. All decorative SVGs hide on small viewports to reduce noise.
- **Vertical centring:** Body uses `display: flex; flex-direction: column`; main is `flex: 1`; the form column is grid-centred so the card sits true-vertically in the available space regardless of left-column height.
- **Reduced motion:** All animations gated by `prefers-reduced-motion: reduce`.

### Global Navigation

#### Top Bar (in-app)
- **Background:** White with a 1 px sage border at the bottom
- **Height:** 60 px on desktop, 56 px on mobile
- **Left:** Page title in 16–20 px Poppins / Inter Semi-Bold
- **Right:** Notification bell + user avatar with role badge + secondary action links specific to the screen
- **Role badge colours:** Employee = Soft Mint  ·  Manager = Soft Mint  ·  Payroll Officer = Soft Mint  ·  Admin = Mint

#### Notification Bell

A single notification bell sits in every page header on the right cluster, at the same baseline as the role badge and avatar:

- **Style:** 36 × 36 px square button, 1 px sage border, 8 px radius, slate icon. Hover lightens the background to off-white and the icon shifts to forest.
- **Unread indicator:** A 6 px crimson dot pinned to the top-right of the bell when at least one unread notification exists.
- **Behaviour:** Clicking opens the role's `notifications.html` page. Bell is implemented as an `<a>` (not a `<button>`) so it is keyboard-focusable and behaves like every other navigation target.
- **Consistency:** Where a header already had a bell, it is wired to `notifications.html`. Where a header had no bell, one is injected — so every role on every page exposes the same notification entry point.

On mobile (`< 1024 px`) the right cluster is decluttered — secondary text links and the role badge text are hidden so the title has clear breathing room next to the burger button. The bell stays visible alongside the avatar circle.

#### Sidebar Navigation (Desktop)
- **Width:** 240 px fixed, present at viewports ≥ 1024 px
- **Background:** Layered atmospheric forest stack, applied globally via `theme.js` so every `<aside>` inherits it without per-page wiring:
  - **Base:** vertical gradient `#1C3D2E → #163528 → #0F2E22` (top → bottom)
  - **Aurora streak:** soft 115° luminous band of `rgba(200,230,218,0.06)` cutting across the column
  - **Top brand glow:** mint radial halo (`rgba(200,230,218,0.15)`) behind the Nexora logo / role-panel subtitle
  - **Bottom shadow:** deeper green pool (`rgba(15,46,34,0.55)`) anchoring the bottom
  - **Dot grain:** 24 px white dot pattern at 5 % opacity for fine texture
  - `isolation: isolate` and a `z-index: 1` rule on direct children keep nav links and active states crisp above the background layers
- **Active item:** Emerald-tinted background, white text, 2 px mint left accent bar
- **Hover:** Subtle white-tinted fill; the link nudges 2 px to the right (200 ms transform)
- **Focus-visible:** 2 px mint outline, 2 px offset
- **Sections:** Items are grouped (e.g. "My Records") with thin hairline dividers
- **Scope:** Each role sees only their own navigation items — no hidden or greyed items from other roles
- **My Profile entry:** Always present in every sidebar — appears just above "Sign Out" with a person glyph; opens the role's `profile.html`
- **Check In / Out entry:** Auto-injected by `sidebar.js` after "My Attendance" in any role sidebar that does not already list it (per BL-004 every role is also an Employee). The label flips between "Check In" and "Check Out" via `NxCheckin.apply()`, driven by `localStorage['nx-checkin-state']`.

#### Sidebar Drawer (Mobile / Tablet)
On viewports below `1024 px` the sidebar collapses to an off-canvas drawer:
- **Trigger:** A burger button — three forest-green lines, no background, no shadow — fixed at the top-left of the page header. The button is `top-0` with a `60 px` flex hit area so the icon centres vertically with the page title regardless of header height (60 / 64 px).
- **Drawer:** Slides in from the left (`translateX(-100%)` → `0`, 300 ms `ease-in-out`). Pattern A sidebars (`position: fixed`) just translate; Pattern B sidebars (flex-flow) are temporarily promoted to `position: fixed` on mobile and revert to `position: static` at `lg+`.
- **Backdrop:** `bg-charcoal/60` with a 2 px backdrop blur, fades in with the drawer.
- **Burger state:** When the drawer is open the burger fades out (`opacity-0 pointer-events-none`); there is **no separate close button inside the drawer**. The user closes the drawer by tapping the backdrop, pressing `Escape`, or clicking any nav link (which auto-closes for the next page load).
- **Body scroll lock:** While the drawer is open the body has `overflow-hidden`. Reset on close.
- **Resize:** Crossing the `lg` breakpoint resets the drawer state automatically.

The drawer behaviour is implemented as a single shared script (`assets/sidebar.js`) loaded on every role page; no per-page wiring is required.

### Dashboard Layout

- **Container:** Max-width 1280 px, centred, auto margins
- **Summary tiles:** 4-column grid on desktop, 2-column on tablet, 1-column on mobile
- **Tile anatomy:** Metric value (32 px Poppins Bold) + label (13 px Inter) + trend / status indicator
- **Left accent bar on each tile:** 4 px solid — colour matches metric context (green / crimson / umber / gray)
- **Content below tiles:** Full-width table or card grid depending on the module

### Module / Detail View

- **Container:** Page-width by default; max-width 760 px centred for form-heavy screens (leave application, payslip, review form)
- **Side margins:** 16 px mobile, 32 px tablet, 48 px desktop
- **Vertical rhythm:** 8 px base grid — all spacing in multiples of 8
- **Mobile main padding:** Heavy `p-8` is automatically compressed to `1rem` so card content keeps a clean edge against the viewport
- **Data tables:** Full container width, sticky header row, alternating row shading; their parent allows horizontal scroll on small viewports
- **Payslip viewer:** Full width, page controls pinned to the bottom

### Page-level overflow rules

- `html, body` are constrained to `overflow-x: hidden; max-width: 100vw` on mobile, eliminating any horizontal scroll
- Card rows that put content on the left and actions on the right (`flex items-start justify-between`, `flex items-center justify-between`) wrap on mobile with an 8 px row-gap so right-side action clusters fall below the content rather than getting clipped

### Time-of-day Hero Scene

A reusable rich background applied to surfaces that benefit from a sense of moment in the day — currently the **Check In / Out** card and the **dashboard greeting** on each role's dashboard. Any element marked `data-nx-hero` automatically inherits the treatment.

| Time band | Mood key | Sky / gradient | Sun / moon | Atmosphere |
|---|---|---|---|---|
| 05:00 – 10:59 | **morning** | coppery-orange → tan → emerald → forest (`#C97155 → #C8804D → #5BAA85 → #2D7A5F → #1C3D2E`) | amber `#F4A56B` | warm "golden hour" sunrise, mountains rendered in lighter forest |
| 11:00 – 16:59 | **day** | deep teal → emerald → forest (`#3F8AA8 → #4A9C88 → #2D7A5F → #1C3D2E`) | golden `#FFD56B` | three drifting white clouds animate across the upper sky |
| 17:00 – 18:59 | **evening** | violet → rose → amber | saffron `#FBC97D` | sunset gradient, mountains darker for contrast |
| 19:00 – 04:59 | **night** | navy → forest | moonlight `#E4F1EB` | seven twinkling white stars become visible |

> **Brightness tuning.** The morning and day gradients were originally pale (peach/cream and sky-blue/cyan); they have been deepened so the dashboard greeting card — which is much shorter than the check-in hero — reads with the same atmospheric weight as evening and night. The lighter top stops were dropped and the darker greens were brought up earlier in the gradient.

**Behaviour**
- A small `applyTimeOfDay()` helper in `theme.js` reads the wall clock on `DOMContentLoaded` and re-runs every hour, setting `data-tod="morning|day|evening|night"` on every `[data-nx-hero]` on the page.
- The CSS rules for the four states live alongside the theme tokens in `theme.js`, so the colour shift is automatic — no per-page wiring.
- All decorative elements (drift blobs, sun pulse, dust motes, twinkling stars, drifting clouds) respect `prefers-reduced-motion`.
- The same scene markup is reused on the dashboard greeting card; the only difference is the dashboard hero is shorter (`px-6 py-6`) while the checkin hero is taller (`px-8 py-12`).

**Prototype-only demo controls**

Both the **Check In / Out hero** and the **dashboard greeting hero** on each role's dashboard carry a small demo dock (`#nx-tod-demo`) with five swatches:

| Swatch | Effect |
|---|---|
| 🌅 Morning | force the morning scene |
| ☀️ Day | force the day scene |
| 🌇 Evening | force the evening scene |
| 🌙 Night | force the night scene |
| ⟲ Live | revert to wall-clock time |

This dock is purely for prototype demos / visual review — **it is not part of the production UI**. It is safe to delete every `<div id="nx-tod-demo">…</div>` block before shipping; nothing else depends on them. The wall-clock auto-detection will continue to work without them.

**Check-in state preview dock (employee/checkin.html only)**

The employee Check In / Out page also carries a `#nx-state-demo` dock at the top-right of the hero with three swatches — ⏰ Ready · ✓ Working · 🌙 Out — that toggles between the three panel states (`#nx-ready-panel`, `#nx-working-panel`, `#nx-confirm-panel`). This is a prototype-only preview affordance so reviewers can see all three designs without manipulating localStorage; it should be stripped before shipping. The `Ready` panel itself (the "Ready to Start" design with the gradient Check-In button + late-mark reminder strip) is **not** prototype-only — it is the intended pre-check-in design and would render in production whenever today's attendance row has no check-in time.

### Self-Service Hero Card

A second reusable hero treatment, distinct from the time-of-day scene, used on the "page-defining" summary card at the top of self-service screens — currently:

- **My Attendance** — Attendance Overview band with attendance %, total hours, month nav, and the Regularise CTA
- **My Payslips** — Year-to-date / latest payslip summary
- **My Reviews / My Review** — Active performance cycle banner with deadlines

The treatment establishes the data-viz hierarchy of the page; it is **not** applied to surface-level cards (those use the white sage-bordered card style).

**Layer stack** (front to back, all inside one `relative overflow-hidden rounded-2xl` wrapper):

1. **Base gradient** — diagonal `linear-gradient(160deg, #0F2E22 → #1C3D2E → #2D7A5F → #4DA37A → #6FBE9E)`
2. **Aurora streak** — diagonal 115° band of `rgba(200,230,218,0.20)` for luminance
3. **Warm sun glow** — golden-amber radial in the top-right (~80 px wide, blurred 24 px)
4. **Cool mint pool** — large mint radial in the bottom-left (~96 px wide, blurred 36 px)
5. **Topographic curves** — five flowing white SVG paths at 18 % opacity (data-viz signature)
6. **Mountain silhouettes** — two layered SVG ranges anchored to the bottom edge (back `#0F2E22` at 25 %, front `#1C3D2E` at 30 %)
7. **Dot grain** — 28 px white dot pattern at 10 % opacity
8. **Constellation sparkles** — seven scattered dots in varied sizes; the brightest carry a soft `box-shadow` glow

Inner content sits inside a `<div class="relative …">` so it stacks above all decorative layers. Translucent stat panels inside the hero use `bg-white/10 backdrop-blur-sm` for legibility against the rich background.

**Regularise CTA standard.** Whenever the hero contains a "Regularise" call-to-action (My Attendance), it uses the contrast-amber treatment — `bg-gradient-to-br from-amber-300 to-amber-400`, `text-forest`, `ring-2 ring-white/40`, soft amber bloom layer, and a `hover:scale-105 hover:-translate-y-0.5` lift. This is the only place in the prototype where amber is used as the primary fill; reserved for a single high-prominence action against the green hero.

### Profile Hero Card

The `profile.html` hero uses a separate treatment — mountains and topographic curves felt out of place for an identity card. The profile variant is geometric and ID-card-flavoured:

- **Mesh gradient base** — diagonal `linear-gradient(135deg, #1C3D2E → #2D7A5F → #4DA37A)` overlaid with a warm radial accent at `100% 0%` and a deep forest pool at `0% 100%`
- **Glassy top sheen** — 8 % white wash on the upper half for a frosted-glass quality
- **Diagonal weave** — 16 px stripe pattern at 4 % opacity for refined texture
- **Three nested rotated diamonds** on the right (the signature element):
  - Outer: 11 rem rotated square, 2 px white outline at 10 % opacity
  - Middle: 7 rem rotated square, 1 px mint outline at 30 % opacity
  - Inner: 3 rem rotated square, mint glass tile with `backdrop-filter: blur(4px)`
- **Two soft accent dots** — one mint, one white, scattered

No mountains, no topographic curves, no constellation — those data-viz elements stay reserved for the self-service hero.

---

## 5. Spacing & Grid System

### Base Unit: 8 px

All spacing, padding, and margin values follow an 8 px baseline grid for consistency across all screens and roles.

| Size | Usage |
|---|---|
| **XS — 4 px** | Icon padding, tight inline gaps between related elements |
| **SM — 8 px** | Between label and input, icon-to-text spacing |
| **MD — 16 px** | Card internal padding, list item spacing, form field gaps |
| **LG — 24 px** | Section padding, mobile margins |
| **XL — 32 px** | Between sections, desktop card gaps |
| **2XL — 48 px** | Major page sections, desktop side margins |
| **3XL — 64 px** | Page-level top and bottom padding |

### Responsive Breakpoints

| Breakpoint | Layout Behaviour |
|---|---|
| **Mobile Small — 0–480 px** | Single column. Sidebar collapses to drawer; burger menu in header. Stacked tiles. 16 px margins. |
| **Mobile Large — 481–767 px** | Single column. Sidebar drawer + burger. Larger tap targets. 24 px margins. |
| **Tablet — 768–1023 px** | 2-column grids. Sidebar drawer + burger. 32 px margins. |
| **Desktop Small — 1024–1279 px** | Full sidebar. 2–3 column layouts. 48 px margins. |
| **Desktop — 1280–1439 px** | Full layout. 4-column dashboard tiles. Optimal experience. |
| **Wide — 1440 px+** | Max container 1280 px, centred with equal margins both sides. |

### Responsive Typography Scaling

- **Mobile (0–767 px):** H1 28 px, H2 20 px, Body 15 px, Label 12 px
- **Tablet (768–1023 px):** H1 28 px, H2 22 px, Body 16 px, Label 13 px
- **Desktop (1024 px+):** H1 32 px, H2 24 px, Body 16 px, Label 13 px

---

## 6. Component Library

### Buttons

**Primary Button**
- Background: Deep Forest Green (`#1C3D2E`)
- Text: White, 14 px Inter Semi-Bold
- Padding: 10 px 24 px  ·  Border Radius: 6 px
- Hover State: Background darkens to Emerald (`#2D7A5F`), 2 px lift shadow, 150 ms
- Disabled State: 40 % opacity, not-allowed cursor, no hover effect
- Loading State: Spinner replaces text, button non-interactive
- Examples: Submit Leave Request, Finalise Payroll, Save Review

**Secondary Button**
- Background: Transparent, 1.5 px border in Deep Forest Green
- Text: Deep Forest Green, 14 px Inter Semi-Bold
- Hover State: Mint fill (`#C8E6DA`), border stays, 150 ms
- Examples: Cancel, Back, Download Payslip, Export Report

**Destructive Button**
- Background: Deep Crimson (`#C0392B`)
- Text: White, 14 px Inter Semi-Bold
- Usage: Reverse Payroll, Delete Employee Record, Reject Leave — always paired with a confirmation modal
- Hover State: Darkens to `#9B2D22`, 150 ms

**Burger Button (Mobile)**
- Form: Three forest-green lines, 24 × 24 px, 2.25 stroke-width, no background, no shadow
- Position: Fixed at `top: 0; left: 12 px` with a 60 px tall flex hit area so the icon centres vertically with the page header
- Visibility: `< lg` only
- Open state: Burger fades out; closure happens via backdrop tap, Escape, or any nav-link click
- Hover: forest → emerald
- Focus-visible: 2 px forest outline at 30 % opacity

### Status Badges

| Status | Visual Treatment |
|---|---|
| Pending / Awaiting | Umber background (`#FAECD4`), Warm Umber text (`#A05C1A`) |
| Approved | Rich Green background (`#D4F0E0`), Rich Green text (`#1A7A4A`) |
| Rejected | Crimson background (`#FAE0DD`), Deep Crimson text (`#C0392B`) |
| Active / On Leave | Mint background (`#C8E6DA`), Deep Forest Green text (`#1C3D2E`) |
| Exited | Locked / Closed background (`#E4EBE8`), Warm Slate text (`#4A5E57`) |
| Finalised | Rich Green background (`#D4F0E0`), Rich Green text — with lock icon |
| Locked / Closed | Locked / Closed background (`#E4EBE8`), Charcoal text (`#1A2420`) — with lock icon |
| Not Locked | Umber background (`#FAECD4`), Warm Umber text — used for review cycles still open |
| On Notice | Umber background (`#FAECD4`), Warm Umber text (`#A05C1A`) |
| Draft / In Progress | Umber background (`#FAECD4`), Warm Umber text — for payroll runs and review cycles |
| Manager Changed | Umber background (`#FAECD4`), Warm Umber text — small inline tag with tooltip showing previous → current manager and the change date |

### Cards

**Employee Card (Directory View)**
- Background: White, 1 px border (`#C0CEC8`), 8 px border radius
- Header: Employee name (16 px Poppins Bold), employee code (13 px Inter, Warm Slate)
- Content: Role badge, department, reporting manager name, status badge
- Hover State: Shadow elevation increases, border shifts to Emerald (`#2D7A5F`), 200 ms

**Dashboard Summary Tile**
- Background: White, subtle shadow, 8 px border radius
- Metric: 32 px Poppins Bold, Deep Forest Green
- Label: 13 px Inter Medium, Warm Slate
- Left accent bar: 4 px solid — colour matches metric context (green / crimson / umber / gray)
- Examples: Employees on Leave Today, Pending Approvals, Payroll Runs This Month, Reviews Due

**Profile Banner Card**
- Background: Deep Forest Green with a subtle dot pattern overlay (≈ 15 % opacity)
- Border radius: 16 px, soft shadow
- Layout: Single horizontal flex row — `w-20 h-20` mint avatar tile (rounded-2xl, white initials in Poppins Bold) on the left, name (24 px Poppins Bold, white) + EMP code · role · department (13 px Inter, mint at 80 %) in the middle, "Active" pill on the right
- On mobile the row wraps cleanly — no negative margins, no clipping. The banner is flanked by a Personal / Employment two-column grid below, then a Quick Links row with role-aware destinations.

**Manager-Change Audit Card**
- Background: Umber-tinted (`#FAECD4`/40 %)
- Used inside the Manager Rating screen when the reporting manager has changed mid-cycle
- Two rows — a "Previous" tag with the prior manager's name and effective dates, and a "Current" tag (rich-green) with the current manager and effective-from date
- Below the tags, a one-line explanation: "the new manager submits the rating; both are kept on the review record for audit"

### Forms & Inputs

- **Input Fields:** White background, 1 px Sage Border (`#C0CEC8`), 6 px border radius, 16 px padding
- **Focus State:** Deep Forest Green border (`#1C3D2E`), 2 px, soft green glow shadow
- **Error State:** Deep Crimson border (`#C0392B`), error message in crimson below field, label turns crimson
- **Success State:** Rich Green checkmark inside field on valid input
- **Labels:** 13 px Inter Semi-Bold, Deep Charcoal (`#1A2420`), positioned above the field
- **Placeholder:** Warm Slate (`#4A5E57`) at 60 % opacity
- **Required fields:** Deep Crimson asterisk (`*`) beside label
- **Character counter:** Live count below field — e.g. `42 / 200 characters`
- **Date pickers:** Used throughout — leave dates, payroll period, review cycle dates

**Inputs with inline icons (login + sign-in patterns):** A 16 px sage glyph (mail, lock, search) sits 12 px from the left edge of the input, with the value text indented to clear it. Password inputs may add a right-aligned eye / eye-off toggle for show / hide.

**Editable Tax Entry (Payroll Officer payslip — v1)**
- Container: Umber-tinted card with an "Manual · v1" pill chip beside the label
- Field: Numeric input prefixed with `₹`, right-aligned
- Helper line directly below the field: `Reference: gross taxable income (₹X) × flat rate (Y %) = ₹Z` followed by a `Use reference` link that pre-fills the field
- Footnote (umber): "v1: tax is entered manually per payslip. The Indian slab engine ships in v2."
- Action: a small forest "Save Tax Entry" button under the row

**Conflict Error Block (Leave / Regularisation)**
- Pattern: A crimson-tinted `crimsonbg` block with a solid crimson border, an exclamation icon, a bold crimson title (`Leave/Attendance conflict — request blocked`), and a slate body that names the conflicting record and offers a remediation hint.
- Used wherever a leave overlap or leave / regularisation conflict is detected — never replaced by a generic validation error.

### Data Tables

- **Header row:** Deep Forest Green background, white text, 13 px Inter Semi-Bold
- **Alternating rows:** White and Soft Mint Accent (`#E4F1EB`) for readability
- **Hover state:** Row background shifts to Mint (`#C8E6DA`), 150 ms transition
- **Sortable columns:** Up / down caret beside column header, Deep Forest Green on active sort
- **Pagination:** Previous / Next buttons, page indicator, rows-per-page selector
- **Empty state:** Centred message — e.g. "No leave requests found". Never a blank screen.
- **Mobile:** The table's existing wrapper handles horizontal scroll with momentum (`-webkit-overflow-scrolling: touch`).

### Modals

- **Overlay:** Black at 50 % opacity, covers full viewport
- **Modal box:** White, 8 px border radius, 32 px padding, max-width 480 px
- **Title:** 20 px Poppins Bold, Deep Charcoal
- **Body:** 15 px Inter Regular, Warm Slate — always states the consequence clearly
- **Actions:** Right-aligned — Primary button + Secondary button with 12 px gap
- **Destructive modals:** Deep Crimson primary button, consequence clearly stated in body text. Example body: *"This will reverse the finalised payroll. A reversal record will be created. This cannot be undone."*
- **Concurrent-action guard text:** Modals that commit irreversible state (Finalise Payroll, Close Cycle) include a small mint callout immediately above the action buttons — example: *"Concurrent finalisation guard: if another user submits this run at the same time, only one submission succeeds. The other will be safely rejected with a clear notice — the run is never double-locked."*
- **Close:** X icon top-right, ESC key, or clicking the overlay

### Custom Scrollbars

Scrollbars are themed across all surfaces, both page-level and inside nested overflow containers:

| Surface | Track | Thumb | Thumb Hover |
|---|---|---|---|
| Light surfaces (page, tables, cards) | Transparent | Sage `#C0CEC8` | Emerald `#2D7A5F` |
| Dark surfaces (`bg-forest`, sidebars) | Transparent | Mint at 35 % | White at 60 % |

- WebKit (Chrome / Safari / Edge): `::-webkit-scrollbar` rules with a 2 px transparent border and `background-clip: content-box` for a "floating pill" appearance.
- Firefox: `scrollbar-width: thin` + `scrollbar-color`, themed identically.
- Width: 10 px desktop, 6 px mobile. 200 ms hover transition.

---

## 7. Role-Based Interface Design

Every role in the HRMS sees a distinct interface — same platform, different lens. Navigation, dashboards, and available actions adapt completely to the logged-in role. No role is exposed to controls or data outside their scope.

### Admin (HR) Interface

- **Dashboard:** Organisation-wide headcount, employees on leave today, pending approvals queue, payroll run status, review cycles due
- **Navigation:** All modules — User Management, Leave, Attendance, Payroll, Performance, Configuration
- **Key screens:** Employee creation form, leave approval queue, payroll run initiation, tax settings (v1 manual entry policy is documented under Configuration), performance cycle creation, **My Profile** (read-only personal record), **Notifications** (escalated leaves, regularisations >7 days, payroll-run finalisation prompts, missing-review alerts, status-change events, configuration changes)
- **Unique controls:**
  - Payroll reversal — destructive, two-step confirmation
  - Attendance regularisation override (`> 7` days)
  - Cycle close button (locks all final ratings)
  - Finalise Payroll modal — includes the concurrent-finalisation guard callout (see Modals)
- **Performance Cycle Detail:** When a reporting manager has changed mid-cycle, the affected employee row carries a small umber `Mgr changed` tag whose tooltip lists previous → current manager and the change date — keeping the audit trail visible at the list level (BL-042).

### Manager Interface

- **Dashboard:** Team headcount, team attendance today, pending leave requests from team, upcoming review deadlines
- **Navigation:** My Team, Leave Approvals, Attendance, Performance — limited to team scope only — plus the personal-records group (My Leave, My Attendance, My Payslips, My Review, **My Profile**)
- **Key screens:** Leave approval / rejection view, attendance regularisation approval, goal-setting form per employee, rating submission form, **My Profile**, **Notifications** (pending leave / regularisation requests from team, manager-review deadline reminders, today's team-on-leave summary, goal-setting prompts at cycle start)
- **Unique controls:** Approve / Reject buttons on leave and attendance — always surface the employee name, dates, and leave type before action
- **Manager Rating screen — Manager-Change Audit card:** When the reporting manager has changed during the cycle, the rating screen renders a Manager-Change Audit card at the top of the right column. The new manager submits the rating; both managers are recorded on the review for audit.

### Employee Interface

- **Dashboard:** My leave balance summary, attendance this month, latest payslip, active review cycle status
- **Navigation:** My Leave, My Attendance, My Payslips, My Reviews, **My Profile** — personal data only
- **Key screens:** Leave application form, check-in / check-out, payslip viewer (PDF), self-rating form, **My Profile**, **Notifications** (leave-status updates, late-mark warnings before annual-leave deduction kicks in, payslip-ready alerts, self-review windows, regularisation outcomes, carry-forward applied)
- **Unique controls:** Leave cancellation with clear balance impact shown, regularisation request form, self-rating edit (until deadline only)
- **Apply Leave — approval routing card:** The form's right-hand routing card shows two destinations explicitly — *Annual / Sick / Casual / Unpaid → Reporting Manager* and *Maternity / Paternity (event-based) → Admin only — both bypass the Manager.* The Important Notes panel mirrors this so the rule is unambiguous.
- **Apply Leave — overlap conflict:** If the chosen dates collide with an existing regularisation request, a Conflict Error Block (see Forms & Inputs) names the conflicting record (e.g. `R-2026-0087`) and explains the resolution. This is never shown as a generic validation error.
- **Regularisation form — overlap conflict:** Symmetric — if the chosen date is already covered by an approved leave, the Conflict Error Block names the leave (e.g. `L-2026-0118`) and instructs the user to cancel the leave first if a correction is genuinely needed.

### Payroll Officer Interface

- **Dashboard:** Current payroll run status, number of employees processed, pending finalisation, tax summary
- **Navigation:** Payroll Runs, Payslips, Reports — payroll scope only — plus the personal-records group (My Leave, My Attendance, My Payslips, My Reviews, **My Profile**)
- **Key screens:** Monthly payroll run initiation, payslip preview before finalisation, LOP calculation review, reversal history, **My Profile**, **Notifications** (run-finalisation prompts, tax-rate updates, LOP-anomaly alerts, reversal events created by Admin, mid-month-joiner detections)
- **Unique controls:** Tax entry — every payslip in v1 carries the **Editable Tax Entry** input (see Forms & Inputs) so the PayrollOfficer can override the system's reference figure per employee. Finalise authority remains with Admin; the run-detail screen surfaces the Admin-only finalisation rule with a banner.

### Notifications (all roles)

- **Always-on entry:** Every page header carries a notification bell on the right cluster (see §4 Top Bar — Notification Bell). The bell exposes a 6 px crimson unread-indicator dot whenever there is at least one unread item.
- **Page anatomy:** A small status strip at the top reads `N unread of M total`, with a `Mark all as read` action. Below it, a row of filter chips (`All` · `Unread` · `Approvals` · `Payroll` · `Performance` · `System`); the active chip uses the forest-on-white treatment, the rest use the secondary outline style. Below that, a vertical list of notification cards.
- **Notification card:** White card with a 1 px sage border that turns forest on hover. Three columns inside — an unread crimson dot (only when unread), a 40 × 40 px tinted icon tile (mint / soft-mint / umber / crimson background depending on category), and the textual block (title in 14 px Inter Semi-Bold, message in slate body, relative timestamp at the top right). Each card behaves as a single navigation target — clicking opens the originating record (a leave detail, payroll-run detail, regularisation queue, etc.) and the card grows a "View →" emerald link on hover.
- **Role-aware content:** Admin sees escalations, finalisation prompts, status changes, configuration changes; Manager sees pending team approvals, review-deadline reminders, today's team-on-leave summary; Employee sees leave-status updates, late-mark warnings, payslip-ready alerts, self-review prompts; Payroll Officer sees run-finalisation prompts, tax-rate updates, LOP anomalies, reversal events.
- **Layout:** Reuses the host role's layout pattern (Pattern A or B) and matches the same content gutter as every other in-app page. Page header `<h1>` reads "Notifications" and the date subtitle that lives next to the H1 on dashboards is omitted.
- **Footer note:** A slate one-liner at the bottom — *"Notifications are retained for 90 days. Audit-relevant events (approvals, payroll runs, reversals, status changes) are kept permanently in the system audit log — system-generated and append-only; no user can edit or delete entries."*

### My Profile (all roles)

- **Always-on entry:** A "My Profile" item lives in every sidebar, just above Sign Out, regardless of role. The entry is normalised at runtime so it is never missing on any page.
- **Page anatomy:** Profile Banner Card (uses the **Profile Hero Card** treatment from §4 — geometric-diamond ID-card variant — with avatar + name + EMP code · role · department + Active pill) above a 2-column Personal / Employment grid above a Quick Links row (My Leave · My Attendance · My Payslips · My Reviews / My Review). Closes with a read-only note: *"Profile details are read-only. To update, contact your HR Administrator."*
- **Layout:** The page reuses the host role's layout pattern (Pattern A or B) so the sidebar, page header, and main offset behave identically to every other page.
- **Header:** Page header H1 reads "My Profile". The breadcrumb / date subtitle paragraph that lives next to the H1 on dashboards is omitted on the profile page.

---

## 8. Interaction & Animation

Animations are subtle and purposeful. Every transition serves a functional goal — orientation, feedback, or confirmation. Nothing animates for decoration. Given the compliance-sensitive nature of HR actions, the interface always confirms consequences before they occur.

### Animation Principles

- **Subtle & Purposeful:** Animations enhance usability — never distract from it
- **Duration:** 150–250 ms for micro-interactions, 300 ms for page transitions and the sidebar drawer slide-in
- **Easing:** `ease-in-out` for a natural feel on all transitions
- **Reduced Motion:** All animations respect `prefers-reduced-motion` — static fallbacks for every transition

### Hover States

| Element | Behaviour |
|---|---|
| Navigation links | Background tint shifts to white-10 % on dark sidebars; the link nudges 2 px to the right (200 ms transform) |
| Primary buttons | Background darkens to Emerald, 2 px vertical lift shadow, 150 ms |
| Cards (employee / role shortcut) | Border shifts to Emerald or Forest, shadow elevation increases, 200 ms |
| Table rows | Row background shifts to Mint (`#C8E6DA`), 150 ms |
| Dashboard tiles | Shadow deepens, slight border highlight, 200 ms |
| Sidebar items | Hover-lift translate + colour shift to white, 200 ms |
| Approve / Reject buttons | Rich Green highlight for Approve, Deep Crimson for Reject — 150 ms |
| Burger button | forest → emerald, 200 ms |

### Loading States

- **Skeleton screens:** Gray shimmer animation for dashboards, tables, and employee lists while data loads
- **Button loading:** Spinner (Deep Forest Green stroke) replaces button text — button non-interactive during submission
- **Page transitions:** Subtle fade-in (200 ms) when navigating between main sections
- **Payroll run progress:** Step indicator — Draft → Processing → Review → Finalised
- **File download:** Progress indicator in Deep Forest Green with percentage label (payslip PDF export)

### Login Animation Set

The login page composes a small set of restrained, looping animations to give the brand surface life without distraction:

- **Drift:** Three blurred blobs each follow their own 14–20 s `ease-in-out` translate-and-scale loop
- **Shine:** The accent words in the headline (`HR platform.`) carry a `mint → white → mint` gradient sweep on an 8 s linear loop
- **Float:** The sign-in card bobs ±6 px on a 6 s `ease-in-out` loop
- **Pulse:** A small mint pulse sits next to the brand mark to signal "live"
- **All four** are disabled when `prefers-reduced-motion: reduce` is set.

### Sidebar Drawer Animation

- 300 ms `ease-in-out` slide on `transform: translateX(...)`
- Backdrop fade (`opacity 0 → 1`) on the same timeline with `pointer-events` toggling at the boundary
- Burger fades out (`opacity 0`) when the drawer is open and fades back in on close
- Close on Escape, on backdrop tap, on viewport crossing the `lg` boundary, or on any nav-link click

---

## 9. Accessibility Guidelines

The HRMS serves employees across varied devices and abilities. WCAG AA compliance is the minimum standard — AAA is the target wherever achievable. HR data is sensitive and consequential; accessibility is not optional.

### Colour Contrast

| Colour Combination | Ratio & Standard |
|---|---|
| Deep Forest Green on White | 8.4 : 1 — passes AAA |
| Deep Charcoal on Off-White | 15.8 : 1 — passes AAA |
| Warm Slate on Off-White | 7.2 : 1 — passes AAA |
| White on Deep Forest Green | 8.4 : 1 — passes AAA |
| Emerald on White | 5.1 : 1 — passes AA |
| Deep Crimson on White (errors) | 5.3 : 1 — passes AA |
| Rich Green on White (success) | 4.7 : 1 — passes AA |

### Keyboard Navigation

- All interactive elements accessible via Tab key in logical DOM order
- Visible focus state: 2 px Deep Forest Green outline, 2 px offset — visible on all backgrounds
- Skip navigation link as first focusable element on every page
- Modal focus trap: Tab cycles within modal when open, returns to trigger element on close
- Dropdown menus: Arrow keys navigate, Enter selects, Escape closes
- Date pickers: Fully keyboard-operable — arrow keys for day / month / year navigation
- Sidebar drawer: Burger is keyboard-focusable (`focus-visible` ring); Escape closes the drawer; focus returns to the burger after close

### Screen Reader Support

- Semantic HTML: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer` used correctly
- ARIA labels on all icon-only buttons (e.g. approve, reject, download, close modal, burger)
- The burger exposes `aria-label="Open navigation menu"` and toggles `aria-expanded`
- ARIA live regions for dynamic updates — leave balance refresh, payroll status change, form error messages
- All data tables include correct `scope` attributes on header cells for row and column association
- Correct heading hierarchy (H1 → H2 → H3) maintained on every page
- Form inputs always associated with a visible label via `for` / `id` pairing

---

## 10. Implementation Notes

### CSS Architecture

- **Theme module (`assets/theme.js`)** — single source of truth for the palette, font loading, CSS custom properties, Tailwind colour tokens, and the global custom scrollbar style block. Loaded on every page, including the login.
- **Sidebar module (`assets/sidebar.js`)** — single shared script that detects the host page's sidebar pattern, injects the burger button + backdrop, applies mobile drawer behaviour, normalises the page-header offset and the main `ml-60` margin, hides decorative right-cluster elements on mobile, normalises the My Profile link, and adds focus-ring + hover-lift polish to nav items.
- **CSS Custom Properties:** All colours, spacing values, and typography defined as variables on `:root`
- **Mobile-First:** Base styles written for mobile, enhanced progressively with `min-width` media queries
- **Component-Based:** Each component (card, button, badge, modal) is a self-contained, reusable unit
- **No inline styles:** All visual properties managed through class-based CSS

### Performance Optimisation

- Web fonts loaded with `font-display: swap` — no invisible text during font load
- Payslip PDFs and data exports generated server-side — no client-side blocking
- Critical CSS inlined for faster first paint on dashboard screens
- Skeleton screens render immediately — perceived performance over actual load time
- Animations disabled on low-end devices via `prefers-reduced-motion` media query
- Large data tables paginated — no more than 50 rows loaded per request
- Sidebar / scrollbar / theme JS modules are idempotent (initialise once per page) to avoid redundant work on hot reloads

### Browser & Device Support

- **Desktop browsers:** Chrome, Firefox, Safari, Edge — last 2 major versions
- **Mobile browsers:** iOS Safari 14+, Chrome for Android — last 2 major versions
- **Minimum viewport:** 320 px width — no content clipped or hidden at this size
- **Graceful degradation:** Core actions (leave request, check-in, approval) work without JavaScript

---

## 11. Design Implementation Checklist

### Colour & Typography
- CSS custom properties defined for all brand and semantic colours, including `lockedbg` and `lockedfg`
- Poppins and Inter fonts loading correctly via Google Fonts
- Type scale applied consistently across all four role interfaces
- All text meets minimum WCAG AA contrast ratio
- Custom scrollbars themed for both light and dark surfaces

### Navigation & Layout
- Sidebar navigation renders correct items per role — no cross-role leakage
- "My Profile" link present in every sidebar across every page
- "Check In / Out" link present in every role sidebar — auto-injected after "My Attendance" by `sidebar.js` if missing; label flips with `localStorage['nx-checkin-state']`
- Sidebar background renders the layered atmospheric stack (gradient, aurora, brand glow, dot grain) defined in §4 — applied via `theme.js`, no per-page wiring
- Notification bell present in every page header — wired to the role's `notifications.html`, with an unread-indicator dot when applicable
- Top bar displays correct role badge and colour per role
- Burger button renders only at `< lg`, vertically centred against the header, three forest lines without a box, and fades out when the drawer is open
- Sidebar drawer opens / closes via burger, backdrop, Escape, and nav-link click
- Crossing `lg` resets the drawer state automatically
- Body scroll lock applied while drawer is open
- Max container width (1280 px) applied and centred on wide screens
- All module views handle empty states — no blank screens

### Components
- All three button variants styled with correct hover and disabled states
- Burger button matches its specification (no box, vertically centred, accessible label)
- All status badges display correct colours and labels — including Locked / Closed using `lockedbg` / `lockedfg` and Finalised using `greenbg` / `richgreen`
- Manager-Changed inline tag rendered with tooltip where applicable
- Profile Banner Card uses the **Profile Hero** treatment (geometric diamonds) — no negative-margin clipping
- Self-Service Hero Card renders the full layer stack on My Attendance, My Payslips, and My Reviews (gradient, aurora, sun, mint pool, topographic curves, mountain silhouettes, dot grain, constellation)
- Regularise CTA on the My Attendance hero uses the contrast-amber gradient + ring + hover-lift treatment
- Editable Tax Entry input (Payroll Officer payslip) accepts manual override and exposes the reference formula
- Conflict Error Block shown for leave / regularisation overlaps — never replaced with a generic validation message
- Manager-Change Audit card rendered on Manager Rating where applicable
- Concurrent-Finalisation guard text rendered inside the Finalise Payroll modal
- Employee cards render name, code, role badge, and status badge correctly
- Modals render with overlay, focus trap, and close on ESC
- Form inputs show correct focus, error, and success states
- Date pickers functional and keyboard-operable on all screens

### Role-Specific Screens
- Admin: Employee creation form, payroll run, tax-settings policy page (v1), cycle creation all functional; performance-detail "Mgr changed" tag visible
- Manager: Leave approval queue, goal-setting form, rating submission with manager-change audit card all functional
- Employee: Leave application (with correct routing card and conflict error), check-in / check-out, regularisation form (with conflict error), self-rating form all functional
- Payroll Officer: Payroll run initiation, payslip with manual tax entry, two-step finalisation modal, reversal history all functional
- Payroll finalisation concurrent submission guard text displayed in modal
- Notifications page renders for each role with role-aware content, status strip, filter chips, and clickable cards routed to the originating record

### Interaction & Accessibility
- All hover states functional at specified durations
- Login animations (drift, shine, float, pulse) loop correctly and pause under `prefers-reduced-motion`
- Sidebar drawer transitions smoothly and pauses under `prefers-reduced-motion`
- Skeleton screens shown during all data-loading states
- Keyboard navigation tested — all elements reachable and operable via Tab, including the burger
- Focus states visible on all interactive elements on all backgrounds
- Screen reader tested on login, dashboard, leave form, payroll, profile, and review screens
- All data tables have correct ARIA `scope` attributes on header cells
- `prefers-reduced-motion` respected — animations disabled when set

### Responsive
- Tested on 320 px, 375 px, 768 px, 1024 px, 1280 px, and 1440 px viewports
- No horizontal scroll on any screen at any breakpoint (`overflow-x: hidden` enforced site-wide)
- Page-header content does not collide with the burger button on mobile
- Card rows wrap their action clusters on mobile so buttons never get clipped
- Touch targets minimum 44 px on all mobile interactive elements
- Tested on iOS Safari and Chrome for Android

---

## Design Summary

This design system creates a professional, role-aware HRMS that prioritises compliance, clarity, and trust. Every decision — colour, spacing, typography, and interaction — is made in service of one goal: an HR platform that every Nexora employee can use confidently and correctly from day one.

**Key design decisions:**

- **Deep Forest Green as the primary anchor** — conveys institutional authority and compliance credibility
- **Inter and Poppins pairing** — maximum data legibility with modern geometric authority for headings
- **Role-aware navigation** — each role sees only what concerns them, eliminating confusion and data exposure risk
- **8 px baseline grid** — consistent rhythm and spacing across all screens, roles, and breakpoints
- **Skeleton screens over spinners** — perceived performance is as important as actual performance
- **Two-step confirmation on all destructive actions** — payroll reversals, cycle closures, and rejections always state consequences and surface concurrent-action protection where applicable
- **Mobile-first responsiveness** — a single shared sidebar drawer + burger pattern keeps every role consistent on phones and tablets, with the desktop sidebar untouched
- **Compliance surfaced by default** — Locked / Finalised badges, Manager-Change audit cards, and specific conflict errors mean SRS-mandated rules are visible in the UI, not buried in business logic
- **Always-on personal record** — every role has a "My Profile" entry in every sidebar so an employee can always reach their own record in one click

Ready to bring this design to life.
