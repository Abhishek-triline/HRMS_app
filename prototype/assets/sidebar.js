/* ============================================================================
 * Nexora HRMS — Shared Sidebar / Mobile Drawer
 * ----------------------------------------------------------------------------
 * Drop-in script. Loaded after theme.js + Tailwind CDN, this script:
 *   1. Finds the first <aside> and adapts it for mobile as a slide-in drawer.
 *   2. Injects a fixed burger button (visible <lg) that toggles the drawer.
 *   3. Injects a backdrop that closes the drawer on tap or Escape.
 *   4. Adjusts the page's fixed header / main offset so the burger doesn't
 *      collide with content on mobile.
 *
 * Two sidebar patterns exist in the prototype:
 *   Pattern A — <aside class="fixed top-0 left-0 h-full w-60 ...">
 *               + <header class="fixed ... left-60 ...">
 *               + <main class="ml-60 pt-16 ...">
 *   Pattern B — <aside class="w-60 flex-shrink-0 ..."> inside
 *               <div class="flex h-screen overflow-hidden">
 *
 * The script auto-detects pattern via aside.classList.contains('fixed').
 * ==========================================================================*/

(function () {
  if (window.__nexoraSidebarInit) return;
  window.__nexoraSidebarInit = true;

  function init() {
    const aside = document.querySelector('aside');
    if (!aside) return;

    const isPatternA = aside.classList.contains('fixed');

    // ---- Helper: detect if THIS sidebar is an Admin sidebar ---------------
    function isAdminSidebar() {
      const hrefs = Array.from(aside.querySelectorAll('a'))
        .map(a => (a.getAttribute('href') || '').toLowerCase());
      return ['employees.html', 'leave-queue.html', 'payroll-runs.html', 'config.html']
        .every(h => hrefs.some(x => x === h || x.endsWith('/' + h)));
    }

    // ---- Helper: produce a className matching the current sidebar's links --
    function sidebarLinkClass() {
      const links = Array.from(aside.querySelectorAll('a'));
      const signOut = links.find(a => /sign out/i.test(a.textContent || ''));
      const sample =
        links.find(a => a !== signOut && !/active|bg-white\/10|bg-emerald\/20/.test(a.className)) ||
        signOut;
      if (!sample) return 'flex items-center gap-3 px-5 py-2.5 text-white/70 hover:bg-white/5 hover:text-white transition-colors text-sm';
      return sample.className
        .replace(/hover:bg-crimson\/20/g, 'hover:bg-emerald/10')
        .replace(/text-white\b/g, 'text-white/70');
    }

    // ---- Inject "Audit Log" link into Admin sidebars ----------------------
    // Per BL-047 / BL-048 admin gets a unified audit log view at audit-log.html.
    // Insert it in the admin nav just before Configuration if Configuration is
    // present, otherwise before Sign Out.
    (function injectAdminAuditLog() {
      if (!isAdminSidebar()) return;

      const links = Array.from(aside.querySelectorAll('a'));
      const hasAudit = links.some(a => /audit-log\.html$/i.test(a.getAttribute('href') || ''));
      if (hasAudit) return;

      const configLink = links.find(a => /(^|\/)config\.html$/i.test(a.getAttribute('href') || ''));
      const signOut    = links.find(a => /sign out/i.test(a.textContent || ''));
      const insertBefore = configLink || signOut;
      if (!insertBefore) return;

      const a = document.createElement('a');
      a.href = 'audit-log.html';
      a.className = sidebarLinkClass();
      a.innerHTML =
        '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>' +
        'Audit Log';
      insertBefore.parentNode.insertBefore(a, insertBefore);
    })();

    // ---- Inject "My Records" group into Admin sidebars --------------------
    // Admin is also an Employee (BL-004) and needs personal self-service pages
    // even though the original admin sidebars only listed admin tools. Detect
    // an admin sidebar (has Employees + Leave + Payroll + Configuration links)
    // and inject My Leave / My Attendance / My Payslips / My Review just
    // before Sign Out.
    (function injectAdminMyRecords() {
      if (!isAdminSidebar()) return;

      // If a "My Records" header already exists, assume the page already lists
      // them (e.g., the four newly created my-* pages) — skip injection there.
      if (aside.querySelector('p[class*="uppercase"]')) return;

      const links = Array.from(aside.querySelectorAll('a'));
      const signOut = links.find(a => /sign out/i.test(a.textContent || ''));
      if (!signOut) return;

      const linkClass = sidebarLinkClass();

      const items = [
        ['my-leave.html',       'My Leave',       'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
        ['my-attendance.html',  'My Attendance',  'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'],
        ['my-payslips.html',    'My Payslips',    'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z'],
        ['my-reviews.html',     'My Review',      'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'],
      ];

      // Section header
      const sec = document.createElement('div');
      sec.className = 'px-5 pt-5 pb-1';
      sec.innerHTML = '<p class="text-white/40 text-xs font-semibold uppercase tracking-widest">My Records</p>';
      signOut.parentNode.insertBefore(sec, signOut);

      // Links
      items.forEach(([href, label, dPath]) => {
        const a = document.createElement('a');
        a.href = href;
        a.className = linkClass;
        a.innerHTML =
          '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="' + dPath + '"/></svg>' +
          label;
        signOut.parentNode.insertBefore(a, signOut);
      });

      // Visual divider before Sign Out
      const div = document.createElement('div');
      div.className = 'px-5 pt-3 pb-1';
      div.innerHTML = '<div class="border-t border-white/10"></div>';
      signOut.parentNode.insertBefore(div, signOut);
    })();

    // ---- Inject "Check In / Out" link into every sidebar ------------------
    // Per BL-004 every role is also an Employee and needs check-in/out access.
    // Originally only the employee sidebar listed checkin.html; admin/manager/
    // payroll-officer sidebars were missing it. Add it once per sidebar, just
    // after the "My Attendance" link so it sits inside the self-service group.
    // The label ("Check In" vs "Check Out") is then re-labeled dynamically by
    // setupCheckinState → NxCheckin.apply() based on localStorage state.
    (function injectCheckinLink() {
      const links = Array.from(aside.querySelectorAll('a'));
      const hasCheckin = links.some(a => /(^|\/)checkin\.html(\?|#|$)/i.test(a.getAttribute('href') || ''));
      if (hasCheckin) return;

      const myAtt = links.find(a => /(^|\/)my-attendance\.html(\?|#|$)/i.test(a.getAttribute('href') || ''));
      const signOut = links.find(a => /sign out/i.test(a.textContent || ''));
      const anchor = myAtt || signOut;
      if (!anchor) return;

      const a = document.createElement('a');
      a.href = 'checkin.html';
      a.className = sidebarLinkClass();
      a.innerHTML =
        '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
        'Check In / Out';
      if (myAtt && myAtt.nextSibling) {
        myAtt.parentNode.insertBefore(a, myAtt.nextSibling);
      } else if (myAtt) {
        myAtt.parentNode.appendChild(a);
      } else {
        signOut.parentNode.insertBefore(a, signOut);
      }
    })();

    // ---- Detect role for this page ---------------------------------------
    // Used to (a) inject "<Role> Panel" subtitle in the sidebar, and (b)
    // resolve the profile.html link target on the header user chip.
    function detectRole() {
      const hrefs = Array.from(aside.querySelectorAll('a'))
        .map(a => (a.getAttribute('href') || '').toLowerCase());
      const has = h => hrefs.some(x => x === h || x.endsWith('/' + h));
      if (['employees.html', 'leave-queue.html', 'payroll-runs.html', 'config.html'].every(has)) {
        return { label: 'Admin' };
      }
      if (has('my-team.html') || has('attendance-team.html')) {
        return { label: 'Manager' };
      }
      if (has('payroll-runs.html') && !has('employees.html')) {
        return { label: 'Payroll' };
      }
      return { label: 'Employee' };
    }
    const role = detectRole();

    // ---- Inject "<Role> Panel" subtitle under the brand text -------------
    (function injectRolePanelSubtitle() {
      const brand = aside.querySelector('span.font-heading');
      if (!brand) return;
      const parent = brand.parentNode;
      if (!parent || parent.dataset.nxBrandWrapped === '1') return;

      const wrap = document.createElement('div');
      wrap.className = 'flex flex-col min-w-0 leading-tight';
      wrap.dataset.nxBrandWrapped = '1';

      const subtitle = document.createElement('span');
      subtitle.className = 'text-mint/60 text-[10px] uppercase tracking-[0.15em] font-semibold mt-0.5';
      subtitle.textContent = role.label + ' Panel';

      parent.insertBefore(wrap, brand);
      wrap.appendChild(brand);
      wrap.appendChild(subtitle);
      parent.dataset.nxBrandWrapped = '1';
    })();

    // ---- Normalise "My Profile" link in the sidebar -----------------------
    // Always remove any existing My Profile link and re-insert exactly one
    // just before Sign Out — keeps it in a consistent slot across all pages.
    // If the user is currently on profile.html, apply the active styling.
    (function ensureProfileLink() {
      aside.querySelectorAll('a').forEach(a => {
        if (/my profile/i.test(a.textContent || '')) a.remove();
      });
      const links = Array.from(aside.querySelectorAll('a'));
      const signOut = links.find(a => /sign out/i.test(a.textContent || ''));
      if (!signOut) return;
      const onProfile = /(^|\/)profile\.html(\?|#|$)/i.test(location.pathname);
      const baseClass = sidebarLinkClass();
      const activeClass = baseClass
        // strip hover/inactive text-white/* and inactive bg utilities, then
        // add active markers so it visually matches other "active" links.
        .replace(/text-white\/70/g, 'text-white')
        .replace(/hover:bg-(white\/5|emerald\/10)/g, '')
        + ' bg-white/10 border-l-2 border-mint font-medium';
      const profile = document.createElement('a');
      profile.href = 'profile.html';
      profile.className = onProfile ? activeClass : baseClass;
      profile.innerHTML =
        '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>' +
        'My Profile';
      signOut.parentNode.insertBefore(profile, signOut);
    })();

    // ---- Remove the user-info chip pinned at the bottom of the sidebar ----
    // The brand "<Role> Panel" header now identifies the workspace, and the
    // header user chip identifies the signed-in user. The bottom chip is
    // redundant and visually heavy on mobile drawers.
    (function removeSidebarUserChip() {
      // Pattern B chips sit as a direct child of <aside> AFTER the <nav>,
      // contain an avatar and one or more name/email lines. Find any such
      // block and remove it.
      const direct = Array.from(aside.children);
      for (const el of direct) {
        if (el.tagName === 'NAV') continue;
        if (el.querySelector && el.querySelector('div.rounded-full')) {
          el.remove();
        }
      }
    })();

    // ---- Strip the role badge from the page header ------------------------
    // The header role chip used to repeat the role under the user's name.
    // Now that the sidebar carries "<Role> Panel", drop the chip from the
    // header so the user info is just avatar + name.
    (function stripHeaderRoleBadge() {
      const header = document.querySelector('header');
      if (!header) return;
      const rightCluster = header.lastElementChild;
      if (!rightCluster || !rightCluster.querySelectorAll) return;
      rightCluster.querySelectorAll('span').forEach(sp => {
        const t = (sp.textContent || '').trim();
        if (/^(Admin|Manager|Employee|Payroll Officer)$/i.test(t)) sp.remove();
      });
    })();

    // ---- Make the header user chip a link to profile.html -----------------
    // Wrap the avatar (and any sibling name container) in an <a> so clicking
    // anywhere on the user pill opens the user's own profile page.
    (function wrapHeaderUserChip() {
      const header = document.querySelector('header');
      if (!header) return;
      const rightCluster = header.lastElementChild;
      if (!rightCluster || !rightCluster.querySelectorAll) return;
      const avatar = rightCluster.querySelector('div.rounded-full');
      if (!avatar) return;
      // Find the container that holds avatar + name (parent if it's a flex
      // chip, else the avatar itself).
      let chip = avatar.parentNode;
      const isChip = chip && chip !== rightCluster &&
        /flex/.test(chip.className) && /items-center/.test(chip.className);
      if (!isChip) chip = avatar;
      if (chip.tagName === 'A') return;
      const a = document.createElement('a');
      a.href = 'profile.html';
      a.title = 'View your profile';
      a.className = (chip.className || '') + ' hover:opacity-80 transition-opacity cursor-pointer';
      while (chip.firstChild) a.appendChild(chip.firstChild);
      chip.replaceWith(a);
    })();

    // ---- Check-in / Check-out state ---------------------------------------
    // Persist the user's checkin state in localStorage and have one helper
    // re-label the sidebar nav item, the page header H1, the action button,
    // and toggle the working/confirm panels on the checkin page itself.
    //
    // State: "in"  → currently working (next action: Check Out)
    //        "out" → checked out today (next action: Check In)
    (function setupCheckinState() {
      function get() {
        try { return localStorage.getItem('nx-checkin-state') || 'in'; }
        catch (e) { return 'in'; }
      }
      function persist(s) {
        try { localStorage.setItem('nx-checkin-state', s); } catch (e) {}
      }
      function apply() {
        const state = get();
        const label = state === 'in' ? 'Check Out' : 'Check In';

        // Sidebar nav links pointing at checkin.html
        document.querySelectorAll('aside a').forEach(a => {
          const href = (a.getAttribute('href') || '').toLowerCase();
          if (/(^|\/)checkin\.html(\?|#|$)/.test(href)) {
            // Replace the trailing text node, preserve any leading <svg>.
            const text = Array.from(a.childNodes).reverse()
              .find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
            if (text) text.textContent = label;
          }
        });

        // Page header H1 — only when it currently reads "Check In / Out" or a
        // prior toggle value. Don't clobber unrelated H1s on other pages.
        document.querySelectorAll('header h1').forEach(h1 => {
          const t = (h1.textContent || '').trim();
          if (/^(Check In|Check Out|Check In ?\/ ?Out)$/i.test(t)) {
            h1.textContent = label;
          }
        });

        // Checkin page itself: panel visibility + action button label.
        const work    = document.getElementById('nx-working-panel');
        const confirm = document.getElementById('nx-confirm-panel');
        if (work && confirm) {
          if (state === 'in') {
            work.classList.remove('hidden');
            confirm.classList.add('hidden');
          } else {
            work.classList.add('hidden');
            confirm.classList.remove('hidden');
          }
        }
        const btn = document.getElementById('nx-check-out-btn');
        if (btn) {
          const text = Array.from(btn.childNodes).reverse()
            .find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
          if (text) text.textContent = label;
        }
      }
      function set(s) { persist(s); apply(); }

      window.NxCheckin = { get, set, apply };
      apply();
    })();

    // ---- Wire the notification bell --------------------------------------
    // Some headers already render a bell <button>. Convert those to <a>.
    // Headers without a bell get one injected so the feature is consistent.
    (function wireBell() {
      const header = document.querySelector('header');
      if (!header) return;

      // Find an existing bell by looking for the canonical bell SVG path.
      const existing = Array.from(header.querySelectorAll('button, a')).find(el =>
        /M15 17h5l-1\.405-1\.405/.test(el.innerHTML)
      );

      if (existing) {
        if (existing.tagName === 'A') {
          existing.setAttribute('href', 'notifications.html');
          existing.setAttribute('aria-label', existing.getAttribute('aria-label') || 'Notifications');
        } else {
          // Replace <button> with <a> while preserving classes + inner SVG/dot.
          const a = document.createElement('a');
          a.href = 'notifications.html';
          a.setAttribute('aria-label', 'Notifications');
          a.className = existing.className;
          a.innerHTML = existing.innerHTML;
          existing.replaceWith(a);
        }
        return;
      }

      // No bell present — inject one before the user avatar in the right cluster.
      const rightCluster = header.lastElementChild;
      if (!rightCluster || !rightCluster.classList.contains('flex')) return;
      const bell = document.createElement('a');
      bell.href = 'notifications.html';
      bell.setAttribute('aria-label', 'Notifications');
      bell.className =
        'relative w-9 h-9 rounded-lg border border-sage/40 flex items-center justify-center text-slate hover:bg-offwhite hover:text-forest transition-colors order-first';
      bell.innerHTML =
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>' +
        '<span class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-crimson rounded-full"></span>';
      rightCluster.insertBefore(bell, rightCluster.firstChild);
    })();

    // ---- Adapt the aside for mobile drawer ---------------------------------
    aside.classList.add(
      '-translate-x-full', 'transition-transform', 'duration-300', 'ease-in-out',
      'lg:translate-x-0', 'z-40'
    );

    if (!isPatternA) {
      // Pattern B: pull aside out of flex flow on mobile, restore on lg
      aside.classList.add(
        'fixed', 'top-0', 'left-0', 'h-full', 'lg:static', 'lg:h-full', 'lg:z-auto'
      );
    }

    // ---- Adjust the page header so the burger doesn't overlap content ----
    // Pattern A: fixed header with `left-60` → swap to `left-0 lg:left-60`.
    // Either pattern: pad the first child of the first <header> on mobile.
    const header = document.querySelector('header');
    if (header) {
      if (header.classList.contains('fixed') && header.classList.contains('left-60')) {
        header.classList.remove('left-60');
        header.classList.add('left-0', 'lg:left-60');
      }
      const firstChild = header.firstElementChild;
      if (firstChild) firstChild.classList.add('ml-14', 'lg:ml-0');
    }

    // ---- Adjust main offset (Pattern A) -----------------------------------
    document.querySelectorAll('main.ml-60').forEach(m => {
      m.classList.remove('ml-60');
      m.classList.add('ml-0', 'lg:ml-60');
    });

    // ---- Inject burger button ---------------------------------------------
    const burger = document.createElement('button');
    burger.id = 'nx-sidebar-burger';
    burger.type = 'button';
    burger.setAttribute('aria-label', 'Open navigation menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.className = [
      'fixed', 'left-3', 'z-50',
      'bg-transparent',
      'text-forest', 'hover:text-emerald',
      'transition-opacity', 'transition-colors',
      'focus:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-forest/30', 'rounded'
    ].join(' ');
    // Inline geometry — independent of Tailwind / UA button styles.
    burger.style.boxSizing      = 'border-box';
    burger.style.width          = '40px';
    burger.style.height         = '40px';
    burger.style.padding        = '0';
    burger.style.margin         = '0';
    burger.style.alignItems     = 'center';
    burger.style.justifyContent = 'center';
    burger.style.lineHeight     = '0'; // kill UA button line-height influence
    // Visibility is driven by a media-query listener (display:flex below lg,
    // display:none from lg up). Tailwind's `lg:hidden` can't compete with an
    // inline `display:flex`, so we manage `display` here ourselves.
    (function bindBreakpoint() {
      const mq = window.matchMedia('(min-width: 1024px)');
      const setDisplay = () => { burger.style.display = mq.matches ? 'none' : 'flex'; };
      setDisplay();
      if (mq.addEventListener) mq.addEventListener('change', setDisplay);
      else if (mq.addListener) mq.addListener(setDisplay); // Safari < 14
    })();
    burger.innerHTML =
      '<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    document.body.appendChild(burger);

    // Position the 40×40 burger so its centre matches the header's centre
    // line — works regardless of whether the header is 60px or 64px tall.
    (function centreOnHeader() {
      const pageHeader = document.querySelector('header');
      if (!pageHeader) { burger.style.top = '10px'; return; }
      const burgerH = 40;
      function sync() {
        const r = pageHeader.getBoundingClientRect();
        if (r.height > 0) {
          burger.style.top = (r.top + (r.height - burgerH) / 2) + 'px';
        }
      }
      sync();
      window.addEventListener('resize', sync);
      setTimeout(sync, 100);
    })();

    // ---- Inject backdrop --------------------------------------------------
    const backdrop = document.createElement('div');
    backdrop.id = 'nx-sidebar-backdrop';
    backdrop.className = [
      'lg:hidden', 'fixed', 'inset-0', 'z-30',
      'bg-charcoal/60', 'backdrop-blur-[2px]',
      'opacity-0', 'pointer-events-none',
      'transition-opacity', 'duration-300'
    ].join(' ');
    document.body.appendChild(backdrop);

    // ---- Open / close logic -----------------------------------------------
    let isOpen = false;

    function setOpen(state) {
      isOpen = state;
      if (state) {
        aside.classList.remove('-translate-x-full');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        backdrop.classList.add('opacity-100');
        burger.setAttribute('aria-expanded', 'true');
        // hide burger while drawer covers it; close via backdrop / Escape / nav-link
        burger.classList.add('opacity-0', 'pointer-events-none');
        document.body.classList.add('overflow-hidden', 'lg:overflow-auto');
      } else {
        aside.classList.add('-translate-x-full');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        backdrop.classList.remove('opacity-100');
        burger.setAttribute('aria-expanded', 'false');
        burger.classList.remove('opacity-0', 'pointer-events-none');
        document.body.classList.remove('overflow-hidden', 'lg:overflow-auto');
      }
    }

    burger.addEventListener('click', () => setOpen(!isOpen));
    backdrop.addEventListener('click', () => setOpen(false));

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) setOpen(false);
    });

    // Close when a nav link is clicked (so the next page loads with drawer shut)
    aside.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => { if (isOpen) setOpen(false); });
    });

    // If the viewport grows past lg, ensure drawer state is reset
    const mq = window.matchMedia('(min-width: 1024px)');
    const onMqChange = () => {
      if (mq.matches && isOpen) setOpen(false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onMqChange);
    else if (mq.addListener) mq.addListener(onMqChange);

    // ---- Polish: nav hover, focus, and mobile header decluttering --------
    const polish = document.createElement('style');
    polish.textContent = `
      aside nav a { transition: background-color 200ms ease, color 200ms ease, transform 200ms ease; }
      aside nav a:hover { transform: translateX(2px); }
      aside nav a:focus-visible { outline: 2px solid #C8E6DA; outline-offset: -2px; border-radius: 8px; }

      /* On mobile, the page header is cramped because of the burger button.
         Hide secondary chrome (subtitles, role badges, ghost action links)
         so the title gets breathing room. Restored at lg+. */
      @media (max-width: 1023px) {
        body > header p,
        body > div header p,
        body main ~ header p { display: none; }

        /* Generic page <header> (not the brand bar in index.html) */
        header.bg-white { flex-wrap: wrap; row-gap: 4px; padding-top: 8px; padding-bottom: 8px; height: auto !important; }
        header.bg-white h1 { font-size: 1rem; line-height: 1.25; }
        header.bg-white p { display: none; }

        /* Right-cluster: drop subtle text links and role badges on mobile */
        header.bg-white > :last-child a[class*="hover:underline"] { display: none; }
        header.bg-white > :last-child span[class*="rounded"][class*="font-bold"] { display: none; }
        header.bg-white > :last-child .text-right { display: none; }

        /* Prevent page-level horizontal scroll on mobile */
        html, body { overflow-x: hidden; max-width: 100vw; }
        main { max-width: 100vw; }

        /* Reduce heavy main padding on mobile (most pages use p-8 / px-8) */
        main > .p-8 { padding: 1rem !important; }
        main > div.p-8 { padding: 1rem !important; }
        main.p-8 { padding: 1rem !important; }

        /* Card rows that put content on the left and actions on the right
           should wrap so the action cluster falls below the content
           rather than getting clipped. */
        main .flex.items-start.justify-between,
        main .flex.items-center.justify-between { flex-wrap: wrap; row-gap: 8px; }

        /* Action button clusters should shrink-wrap, not span absurd widths */
        main .flex.items-start.justify-between > :last-child,
        main .flex.items-center.justify-between > :last-child { min-width: 0; }

        /* Tables: let their existing wrapper scroll instead of overflowing the page */
        main .overflow-x-auto { -webkit-overflow-scrolling: touch; }

        /* Reduce sidebar nav font size slightly so 240px drawer feels right */
        aside nav a { font-size: 0.875rem; }
      }
    `;
    document.head.appendChild(polish);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
