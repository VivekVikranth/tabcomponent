/*! tenneco-tabs.js - vanilla, accessible tabs + Splide center carousel
   Requirements: Splide (https://splidejs.com) loaded globally as `Splide`.
*/
(function () {
    const SELECTORS = {
      root: '.tenneco-tabs',
      intro: '.tenneco-tabs__intro',
      panelsWrap: '.tenneco-tabs__panels',
      panel: '.tenneco-tabs__panel',
      returnBtn: '.tenneco-tabs__return',
      bar: '.tenneco-tabs__bar',
      barArrow: '.tenneco-tabs__bar-arrow',
      listWrap: '.tenneco-tabs__list-wrap',
      list: '.tenneco-tabs__list',
      tab: '.tenneco-tabs__tab',
      splide: '.splide',
      splideTrack: '.splide__track',
      splideList: '.splide__list',
    };
  
    const HASH_KEY = 'tab';
    const KEY = {
      Enter: 'Enter',
      Space: ' ',
      Spacebar: 'Spacebar',
      Home: 'Home',
      End: 'End',
      ArrowLeft: 'ArrowLeft',
      ArrowRight: 'ArrowRight',
      ArrowUp: 'ArrowUp',
      ArrowDown: 'ArrowDown',
    };
  
    const INTRO_DELAY_MS = 2200;
    const SCROLL_AMOUNT_PX = 220;
  
    // === Splide base options (desktop/tablet show prev+active+next)
    const SPLIDE_OPTS = {
      type: 'loop',
      focus: 'center',
      perMove: 1,
      perPage: 3,                 // prev + active + next visible
      gap: '32px',
      arrows: true,
      pagination: true,
      drag: true,
      trimSpace: false,
      speed: 500,
      easing: 'cubic-bezier(.2,.6,.2,1)',
      padding: { left: 0, right: 0 },
      breakpoints: {
        1199: { perPage: 3, gap: '28px' },
        1024: { perPage: 3, gap: '24px' },
        // NOTE: mobile specifics (perPage:1). Final padding is applied dynamically (below).
        767:  { perPage: 1, gap: '5px', padding: { left: 10, right: 10 } }
      },
    };
  
    // ===== Helpers
    function qs(node, sel) { return node.querySelector(sel); }
    function qsa(node, sel) { return Array.prototype.slice.call(node.querySelectorAll(sel)); }
    function toSlug(text) {
      return (text || '')
        .toLowerCase()
        .trim()
        .replace(/&/g, ' and ')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
    function getHashParams() {
      const h = window.location.hash.replace(/^#/, '');
      if (!h) return {};
      return h.split('&').reduce((acc, pair) => {
        const [k, v] = pair.split('=');
        if (k) acc[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
        return acc;
      }, {});
    }
    function setHashParam(key, value) {
      const params = getHashParams();
      if (value == null || value === '') delete params[key];
      else params[key] = value;
      const newHash = Object.keys(params)
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join('&');
      if (history && history.replaceState) {
        history.replaceState(null, '', newHash ? `#${newHash}` : location.pathname + location.search);
      } else {
        window.location.hash = newHash;
      }
    }
  
    function ensureIdsAndSlugs(root) {
      const list = qs(root, SELECTORS.list);
      const panels = qsa(root, SELECTORS.panel);
      const tabs = qsa(root, SELECTORS.tab);
      const uid = root.id || `tt-${Math.random().toString(36).slice(2, 8)}`;
      if (!root.id) root.id = uid;
  
      tabs.forEach((tab, i) => {
        const slug = tab.dataset.tab || tab.dataset.slug || toSlug(tab.textContent);
        tab.dataset.slug = slug;
  
        if (!tab.id) tab.id = `${uid}-tab-${i}`;
        const panel = panels[i];
        if (panel) {
          if (!panel.id) panel.id = `${uid}-panel-${i}`;
          tab.setAttribute('aria-controls', panel.id);
          panel.setAttribute('aria-labelledby', tab.id);
          panel.setAttribute('role', 'tabpanel');
        }
        tab.setAttribute('role', 'tab');
        tab.setAttribute('tabindex', i === 0 ? '0' : '-1');
        tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      });
  
      if (list) list.setAttribute('role', 'tablist');
    }
  
    function getDefaultIndex(root) {
      const hash = getHashParams()[HASH_KEY];
      if (hash) {
        const tabs = qsa(root, SELECTORS.tab);
        const idx = tabs.findIndex(t => (t.dataset.slug || '').toLowerCase() === hash.toLowerCase());
        if (idx >= 0) return idx;
      }
      const defSlug = root.getAttribute('data-default-tab');
      if (defSlug) {
        const tabs = qsa(root, SELECTORS.tab);
        const idx = tabs.findIndex(t => (t.dataset.slug || '').toLowerCase() === defSlug.toLowerCase());
        if (idx >= 0) return idx;
      }
      return 0;
    }
  
    function activateTab(root, index, opts = {}) {
      const { updateHash = true, focusTab = false } = opts;
      const tabs = qsa(root, SELECTORS.tab);
      const panels = qsa(root, SELECTORS.panel);
      if (!tabs.length || !panels.length) return;
  
      const clamped = Math.max(0, Math.min(index, tabs.length - 1));
      tabs.forEach((tab, i) => {
        const selected = i === clamped;
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.setAttribute('tabindex', selected ? '0' : '-1');
        panels[i] && panels[i].toggleAttribute('hidden', !selected);
        if (selected && focusTab) tab.focus({ preventScroll: true });
      });
  
      if (updateHash) {
        const slug = (tabs[clamped].dataset.slug || '').toLowerCase();
        if (slug) setHashParam(HASH_KEY, slug);
      }
  
      const listWrap = qs(root, SELECTORS.listWrap);
      if (listWrap) {
        tabs[clamped].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
  
      const panel = panels[clamped];
      initPanelCarousel(root, panel);
    }
  
    function onTabClick(e) {
      const tab = e.currentTarget;
      const root = tab.closest(SELECTORS.root);
      const tabs = qsa(root, SELECTORS.tab);
      const idx = tabs.indexOf(tab);
      activateTab(root, idx, { updateHash: true, focusTab: false });
    }
    function onTabKeydown(e) {
      const key = e.key || e.code;
      const tab = e.currentTarget;
      const root = tab.closest(SELECTORS.root);
      const tabs = qsa(root, SELECTORS.tab);
      const idx = tabs.indexOf(tab);
      let next = null;
  
      switch (key) {
        case KEY.ArrowRight:
        case KEY.ArrowDown: next = Math.min(idx + 1, tabs.length - 1); break;
        case KEY.ArrowLeft:
        case KEY.ArrowUp:   next = Math.max(idx - 1, 0); break;
        case KEY.Home:      next = 0; break;
        case KEY.End:       next = tabs.length - 1; break;
        case KEY.Enter:
        case KEY.Space:
        case KEY.Spacebar:
          activateTab(root, idx, { updateHash: true, focusTab: false });
          e.preventDefault();
          return;
      }
      if (next !== null) { tabs[next].focus(); e.preventDefault(); }
    }
  
    // Bottom bar overflow arrows
    function updateBarArrows(root) {
      const wrap = qs(root, SELECTORS.listWrap);
      const [leftBtn, rightBtn] = qsa(root, SELECTORS.barArrow);
      if (!wrap || !leftBtn || !rightBtn) return;
      const canScrollLeft = wrap.scrollLeft > 1;
      const canScrollRight = wrap.scrollWidth - wrap.clientWidth - wrap.scrollLeft > 1;
      leftBtn.toggleAttribute('hidden', !canScrollLeft);
      rightBtn.toggleAttribute('hidden', !canScrollRight);
    }
    function bindBarArrows(root) {
      const wrap = qs(root, SELECTORS.listWrap);
      const [leftBtn, rightBtn] = qsa(root, SELECTORS.barArrow);
      if (!wrap || !leftBtn || !rightBtn) return;
      leftBtn.addEventListener('click', () => wrap.scrollBy({ left: -SCROLL_AMOUNT_PX, behavior: 'smooth' }));
      rightBtn.addEventListener('click', () => wrap.scrollBy({ left:  SCROLL_AMOUNT_PX, behavior: 'smooth' }));
      wrap.addEventListener('scroll', () => updateBarArrows(root));
      window.addEventListener('resize', () => updateBarArrows(root));
      updateBarArrows(root);
    }
  
    // Return button → activate first tab
    function bindReturnButtons(root) {
      qsa(root, SELECTORS.returnBtn).forEach(btn => {
        btn.addEventListener('click', () => activateTab(root, 0, { updateHash: true, focusTab: true }));
      });
    }
  
    // ===== Carousel height stabilizer
    function px(n) { return (n || 0) + 'px'; }
    function measureSlideHeight(slide) {
      if (!slide) return 0;
      const cs = getComputedStyle(slide);
      return slide.offsetHeight + parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0);
    }
    function setTrackHeight(panel, mode) {
      const track = qs(panel, SELECTORS.splideTrack);
      const slides = qsa(panel, SELECTORS.splide + ' ' + SELECTORS.splideList + ' .splide__slide');
      if (!track || slides.length === 0) return;
      if (mode === 'animate') {
        const active = qs(panel, '.splide__slide.is-active') || slides[0];
        track.style.height = px(measureSlideHeight(active));
      } else {
        let maxH = 0;
        slides.forEach(s => { maxH = Math.max(maxH, measureSlideHeight(s)); });
        track.style.height = px(maxH);
      }
    }
    function setupHeightObservers(panel, mode) {
      const list = qs(panel, SELECTORS.splideList);
      if (!list) return;
      const ro = new ResizeObserver(() => setTrackHeight(panel, mode));
      ro.observe(list);
      panel.__tt_ro && panel.__tt_ro.disconnect();
      panel.__tt_ro = ro;
  
      const mo = new MutationObserver(() => setTrackHeight(panel, mode));
      mo.observe(list, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
      panel.__tt_mo && panel.__tt_mo.disconnect();
      panel.__tt_mo = mo;
  
      const onResize = () => setTrackHeight(panel, mode);
      window.addEventListener('resize', onResize);
      panel.__tt_resize && window.removeEventListener('resize', panel.__tt_resize);
      panel.__tt_resize = onResize;
    }
  
    // ===== Mobile half-peek via PADDING (works reliably with v4)
    const MOBILE_PEEK_RATIO = 0.18; // ≈18vw each side
  
    function getMobilePadPx() {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      return Math.max(24, Math.round(vw * MOBILE_PEEK_RATIO)); // min 24px
    }
  
    function normPad(v) {
      v = v || {};
      return { left: Number(v.left) || 0, right: Number(v.right) || 0 };
    }
    function padEqual(a, b) {
      const A = normPad(a), B = normPad(b);
      return A.left === B.left && A.right === B.right;
    }
  
    // v4-compatible: set options via property then refresh(); guard against recursion
    function applyResponsivePeek(splide) {
      if (splide.__tt_applying) return; // reentrancy guard
  
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      const current = splide.options || {};
      let desired;
  
      if (isMobile) {
        const p = getMobilePadPx();
        desired = {
          ...current,
          perPage: 1,
          focus: 'center',
          padding: { left: p, right: p },   // <-- use padding for “half peek”
          peek: { before: 0, after: 0 },    // ensure peek is off
        };
      } else {
        desired = {
          ...current,
          perPage: 3,
          padding: { left: 0, right: 0 },
          peek: { before: 0, after: 0 },
        };
      }
  
      const needsUpdate =
        current.perPage !== desired.perPage ||
        !padEqual(current.padding, desired.padding);
  
      if (!needsUpdate) return;
  
      splide.__tt_applying = true;
      splide.options = desired;
      if (typeof splide.refresh === 'function') {
        setTimeout(() => {
          try { splide.refresh(); } finally { splide.__tt_applying = false; }
        }, 0);
      } else {
        splide.__tt_applying = false;
      }
    }
  
    // Keep Splide instances per panel
    const splideRegistry = new WeakMap();
  
    function initPanelCarousel(root, panel) {
      if (!panel) return;
      const mode = (root.getAttribute('data-carousel-height') || 'lock').toLowerCase();
      const sEl = qs(panel, SELECTORS.splide);
      if (!sEl) return;
  
      if (splideRegistry.has(panel)) {
        requestAnimationFrame(() => setTrackHeight(panel, mode));
        return splideRegistry.get(panel);
      }
  
      if (typeof Splide !== 'function') {
        console.warn('[tenneco-tabs] Splide not found; carousel not initialized.');
        return null;
      }
  
      let opts = { ...SPLIDE_OPTS };
      const dataOpts = sEl.getAttribute('data-splide');
      if (dataOpts) {
        try { opts = { ...opts, ...JSON.parse(dataOpts) }; } catch (e) {}
      }
  
      const splide = new Splide(sEl, opts);
      splide.on('mounted move updated resized', () => setTrackHeight(panel, mode));
      // Peek/padding logic only on 'mounted'; window 'resize' keeps it in sync
      splide.on('mounted', () => applyResponsivePeek(splide));
      splide.mount();
  
      // Initial height + mobile padding
      requestAnimationFrame(() => {
        applyResponsivePeek(splide);
        setTrackHeight(panel, mode);
      });
  
      splideRegistry.set(panel, splide);
      return splide;
    }
  
    // Intro overlay and first init
    function setupIntroAndInit(root) {
      const intro = qs(root, SELECTORS.intro);
  
      const initComponent = () => {
        ensureIdsAndSlugs(root);
        const tabs = qsa(root, SELECTORS.tab);
        tabs.forEach(t => {
          t.addEventListener('click', onTabClick);
          t.addEventListener('keydown', onTabKeydown);
        });
        bindBarArrows(root);
        bindReturnButtons(root);
        activateTab(root, getDefaultIndex(root), { updateHash: true, focusTab: false });
      };
  
      if (!intro) { initComponent(); return; }
  
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            intro.style.display = 'flex';
            setTimeout(() => {
              intro.style.display = 'none';
              initComponent();
            }, INTRO_DELAY_MS);
            io.disconnect();
          }
        });
      }, { rootMargin: '0px 0px -15% 0px', threshold: 0.15 });
  
      io.observe(root);
    }
  
    // Public API
    function stabilize(root) {
      const r = root || document;
      qsa(r, SELECTORS.root).forEach(rt => {
        const activePanel = qsa(rt, SELECTORS.panel).find(p => !p.hasAttribute('hidden')) || qsa(rt, SELECTORS.panel)[0];
        if (activePanel) {
          const mode = (rt.getAttribute('data-carousel-height') || 'lock').toLowerCase();
          setupHeightObservers(activePanel, mode);
          setTrackHeight(activePanel, mode);
        }
      });
    }
  
    // Boot
    document.addEventListener('DOMContentLoaded', function () {
      qsa(document, SELECTORS.root).forEach(setupIntroAndInit);
  
      // Expose hooks
      window.TennecoTabs = window.TennecoTabs || {};
      window.TennecoTabs.stabilize = stabilize;
      window.TennecoTabs.activate = function (rootEl, index) { activateTab(rootEl, index, { updateHash: true, focusTab: true }); };
  
      // Keep mobile padding/peek in sync on viewport changes (e.g., rotate)
      window.addEventListener('resize', () => {
        qsa(document, SELECTORS.root).forEach(root => {
          const panels = qsa(root, SELECTORS.panel);
          panels.forEach(panel => {
            const splide = splideRegistry.get(panel);
            if (splide) applyResponsivePeek(splide);
          });
        });
      });
    });
  
    // Handle hash deep-link updates
    window.addEventListener('hashchange', function () {
      const params = getHashParams();
      if (!params[HASH_KEY]) return;
      qsa(document, SELECTORS.root).forEach(root => {
        const tabs = qsa(root, SELECTORS.tab);
        const idx = tabs.findIndex(t => (t.dataset.slug || '').toLowerCase() === params[HASH_KEY].toLowerCase());
        if (idx >= 0) activateTab(root, idx, { updateHash: false, focusTab: false });
      });
    });
  })();
  