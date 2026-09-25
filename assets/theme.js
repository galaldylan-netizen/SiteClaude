/* Squizio Mist — theme.js (sans dépendance) */
(() => {
  'use strict';

  const html = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => motionQuery.matches || html.classList.contains('reduce-motion');
  const T = () => (window.theme && window.theme.strings) || {};

  const announce = (msg) => {
    const live = document.getElementById('LiveRegion');
    if (!live) return;
    live.textContent = '';
    setTimeout(() => { live.textContent = msg; }, 60);
  };

  const formatMoney = (cents) => {
    const format = (window.theme && window.theme.moneyFormat) || '{{amount}}';
    const value = (cents / 100);
    const withDelims = (n, thousands, decimal, precision = 2) => {
      const parts = n.toFixed(precision).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return parts.join(decimal);
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return withDelims(value, ',', '.', 0);
        case 'amount_with_comma_separator': return withDelims(value, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return withDelims(value, '.', ',', 0);
        case 'amount_with_apostrophe_separator': return withDelims(value, "'", '.');
        default: return withDelims(value, ',', '.');
      }
    });
  };

  /* ---------- Piège du focus pour les fenêtres modales ---------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
  let trapCleanup = null;
  const trapFocus = (container, onEscape) => {
    releaseFocus();
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onEscape(); return; }
      if (e.key !== 'Tab') return;
      const items = $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler);
    trapCleanup = () => document.removeEventListener('keydown', handler);
  };
  const releaseFocus = () => { if (trapCleanup) { trapCleanup(); trapCleanup = null; } };

  /* ---------- Préférence « réduire les animations » ---------- */
  const initMotionToggle = () => {
    $$('[data-motion-toggle]').forEach((btn) => {
      const sync = () => btn.setAttribute('aria-pressed', html.classList.contains('reduce-motion') ? 'true' : 'false');
      sync();
      btn.addEventListener('click', () => {
        const on = !html.classList.contains('reduce-motion');
        html.classList.toggle('reduce-motion', on);
        try { localStorage.setItem('sq-reduce-motion', on ? '1' : '0'); } catch (e) {}
        sync();
        if (on) revealAll();
      });
    });
  };

  /* ---------- En-tête ---------- */
  const initHeader = () => {
    const header = $('[data-header]');
    if (!header) return;
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 20);
      const goingDown = y > lastY && y > 400;
      const drawerOpen = document.body.classList.contains('has-overlay');
      header.classList.toggle('is-hidden', goingDown && !drawerOpen && !reducedMotion());
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  };

  /* ---------- Panneaux (menu mobile, panier) ---------- */
  const openPanel = (panel, focusTarget, opener) => {
    panel.hidden = false;
    panel._opener = opener || document.activeElement;
    document.body.classList.add('has-overlay');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-open')));
    (focusTarget || $(FOCUSABLE, panel))?.focus();
    trapFocus(panel, () => closePanel(panel));
  };
  const closePanel = (panel) => {
    panel.classList.remove('is-open');
    document.body.classList.remove('has-overlay');
    document.body.style.overflow = '';
    releaseFocus();
    const done = () => { if (!panel.classList.contains('is-open')) panel.hidden = true; };
    reducedMotion() ? done() : setTimeout(done, 550);
    panel._opener?.focus?.();
    $$('[aria-expanded="true"][aria-controls="' + panel.id + '"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  };

  const initMobileMenu = () => {
    const menu = $('[data-mobile-menu]');
    if (!menu) return;
    $$('[data-menu-open]').forEach((btn) => btn.addEventListener('click', () => {
      btn.setAttribute('aria-expanded', 'true');
      openPanel(menu, $('button[data-menu-close]', menu), btn);
    }));
    $$('[data-menu-close]', menu).forEach((btn) => btn.addEventListener('click', () => closePanel(menu)));
  };

  /* ---------- Recherche prédictive ---------- */
  const initSearch = () => {
    const modal = $('[data-search-modal]');
    if (!modal || typeof modal.showModal !== 'function') return;
    const input = $('[data-predictive-input]', modal);
    const results = $('[data-predictive-results]', modal);
    const status = $('#PredictiveStatus');
    $$('[data-search-open]').forEach((btn) => btn.addEventListener('click', () => { modal.showModal(); input.focus(); }));
    $$('[data-search-close]', modal).forEach((btn) => btn.addEventListener('click', () => modal.close()));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

    let timer;
    let controller;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { results.innerHTML = ''; status.textContent = ''; return; }
      timer = setTimeout(async () => {
        controller?.abort();
        controller = new AbortController();
        try {
          const url = `${window.theme.routes.root}search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6`;
          const res = await fetch(url, { signal: controller.signal });
          const data = await res.json();
          const products = data?.resources?.results?.products || [];
          results.innerHTML = products.map((p) => `
            <a href="${p.url}">
              ${p.image ? `<img src="${p.image}" alt="" width="56" height="56" loading="lazy">` : ''}
              <span><strong>${escapeHtml(p.title)}</strong><br><span class="price">${escapeHtml(p.price ? formatMoney(Math.round(parseFloat(p.price) * 100)) : '')}</span></span>
            </a>`).join('');
          status.textContent = products.length ? `${products.length} résultat(s)` : 'Aucun résultat';
        } catch (e) { /* requête annulée */ }
      }, 220);
    });
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Panier (tiroir + AJAX) ---------- */
  const cart = {
    drawer: () => $('[data-cart-drawer]'),
    open(opener) {
      const d = this.drawer();
      if (!d) { window.location.href = window.theme.routes.cart; return; }
      openPanel(d, $('[data-cart-close]:not(.drawer__overlay)', d), opener);
    },
    close() { const d = this.drawer(); if (d) closePanel(d); },
    async refresh(sectionsHtml) {
      let htmlStr = sectionsHtml?.['cart-drawer'];
      if (!htmlStr) {
        const res = await fetch(`${window.location.pathname}?sections=cart-drawer`);
        htmlStr = (await res.json())['cart-drawer'];
      }
      const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
      const fresh = $('[data-cart-drawer]', doc);
      const current = this.drawer();
      if (fresh && current) {
        const wasOpen = current.classList.contains('is-open');
        current.innerHTML = fresh.innerHTML;
        bindCartDrawer();
        if (wasOpen) trapFocus(current, () => cart.close());
      }
      const res = await fetch(`${window.theme.routes.cart}.js`);
      const data = await res.json();
      $$('[data-cart-count]').forEach((el) => { el.textContent = data.item_count > 0 ? data.item_count : ''; el.dataset.count = data.item_count; });
      return data;
    },
    async add(form) {
      const fd = new FormData(form);
      fd.append('sections', 'cart-drawer');
      fd.append('sections_url', window.location.pathname);
      const res = await fetch(`${window.theme.routes.cartAdd}.js`, { method: 'POST', body: fd, headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || data.message || T().error);
      await this.refresh(data.sections);
      return data;
    },
    async change(line, quantity) {
      const res = await fetch(`${window.theme.routes.cartChange}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line, quantity, sections: ['cart-drawer'], sections_url: window.location.pathname })
      });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || data.message || T().error);
      if ($('[data-cart-page]')) { window.location.reload(); return data; }
      await this.refresh(data.sections);
      announce(T().cartUpdated || '');
      return data;
    }
  };

  const bindLineControls = (root) => {
    $$('[data-line]', root).forEach((wrap) => {
      const line = parseInt(wrap.dataset.line, 10);
      const input = $('[data-line-input]', wrap);
      input?.addEventListener('change', () => updateLine(wrap, line, parseInt(input.value, 10) || 0));
    });
    $$('[data-line-change]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        const wrap = btn.closest('.cart-item');
        const line = parseInt($('[data-line]', wrap).dataset.line, 10);
        updateLine(wrap, line, parseInt(btn.dataset.lineChange, 10));
      });
    });
  };
  const updateLine = async (wrap, line, qty) => {
    wrap.classList.add('is-loading');
    try { await cart.change(line, Math.max(0, qty)); }
    catch (e) { announce(e.message); wrap.classList.remove('is-loading'); }
    const d = cart.drawer();
    if (d && d.classList.contains('is-open')) ($('[data-cart-close]:not(.drawer__overlay)', d))?.focus();
  };
  const bindCartDrawer = () => {
    const d = cart.drawer();
    if (!d) return;
    $$('[data-cart-close]', d).forEach((b) => b.addEventListener('click', () => cart.close()));
    bindLineControls(d);
  };

  const initCart = () => {
    bindCartDrawer();
    const page = $('[data-cart-page]');
    if (page) bindLineControls(page);
    $$('[data-cart-open]').forEach((a) => a.addEventListener('click', (e) => {
      if ($('[data-cart-page]')) return;
      e.preventDefault();
      cart.open(a);
    }));
    document.addEventListener('submit', async (e) => {
      const form = e.target.closest('[data-product-form]');
      if (!form) return;
      e.preventDefault();
      const btn = e.submitter && form.contains(e.submitter) ? e.submitter : $('[type="submit"]', form);
      const err = $('[data-form-error]', form);
      if (err) { err.hidden = true; err.textContent = ''; }
      btn?.classList.add('is-loading');
      btn?.setAttribute('aria-busy', 'true');
      try {
        await cart.add(form);
        announce(T().added || '');
        cart.open(btn);
      } catch (ex) {
        if (err) { err.textContent = ex.message; err.hidden = false; } else { announce(ex.message); }
      } finally {
        btn?.classList.remove('is-loading');
        btn?.removeAttribute('aria-busy');
      }
    });
  };

  /* ---------- Apparition au scroll ---------- */
  let revealObserver;
  const revealAll = () => $$('[data-reveal], [data-split]').forEach((el) => el.classList.add('is-visible'));
  const initReveal = () => {
    const els = $$('[data-reveal], [data-split]');
    if (reducedMotion() || !('IntersectionObserver' in window)) { revealAll(); return; }
    /* Un élément masqué par clip-path n'est jamais « visible » pour l'observer : on observe alors son parent. */
    const targets = new Map();
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (targets.get(entry.target) || [entry.target]).forEach((el) => el.classList.add('is-visible'));
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach((el) => {
      if (el.classList.contains('is-visible')) return;
      const watch = el.dataset.reveal === 'clip' && el.parentElement ? el.parentElement : el;
      if (!targets.has(watch)) targets.set(watch, []);
      targets.get(watch).push(el);
      revealObserver.observe(watch);
    });
  };

  /* Découpe des titres mot par mot (le texte reste lu normalement : aria-label sur le titre) */
  const initSplit = () => {
    $$('[data-split]').forEach((el) => {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = '1';
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      let i = 0;
      const walk = (node) => {
        Array.from(node.childNodes).forEach((child) => {
          if (child.nodeType === 3) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span');
              w.className = 'word';
              w.setAttribute('aria-hidden', 'true');
              const inner = document.createElement('span');
              inner.style.setProperty('--i', i++);
              inner.textContent = part;
              w.appendChild(inner);
              frag.appendChild(w);
            });
            child.replaceWith(frag);
          } else if (child.nodeType === 1) {
            walk(child);
          }
        });
      };
      walk(el);
    });
  };

  /* ---------- Parallaxe, inclinaison, boutons magnétiques ---------- */
  const initParallax = () => {
    const els = $$('[data-parallax]');
    if (!els.length) return;
    let ticking = false;
    const update = () => {
      if (reducedMotion()) { els.forEach((el) => { el.style.transform = ''; }); ticking = false; return; }
      const vh = window.innerHeight;
      els.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const speed = parseFloat(el.dataset.parallax) || 0.1;
        const max = el.offsetHeight * 0.065;
        const offset = Math.max(-max, Math.min(max, (r.top + r.height / 2 - vh / 2) * -speed));
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  };

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const initTilt = () => {
    if (!finePointer.matches) return;
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (reducedMotion()) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      el.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1)';
    });
  };
  const initMagnetic = () => {
    if (!finePointer.matches) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (reducedMotion()) return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  };

  /* ---------- Carrousel d'avis ---------- */
  const initTracks = () => {
    const scrollBy = (btn, dir) => {
      const track = document.getElementById(btn.getAttribute('aria-controls'));
      if (!track) return;
      const card = track.firstElementChild;
      const step = card ? card.getBoundingClientRect().width + 20 : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * step, behavior: reducedMotion() ? 'auto' : 'smooth' });
    };
    $$('[data-scroll-prev]').forEach((b) => b.addEventListener('click', () => scrollBy(b, -1)));
    $$('[data-scroll-next-track]').forEach((b) => b.addEventListener('click', () => scrollBy(b, 1)));
  };

  /* ---------- Fiche produit ---------- */
  const initProduct = () => {
    $$('[data-product-section]').forEach((section) => {
      const form = $('form[data-product-form]', section);
      const idInput = $('[data-variant-id]', section);
      const addBtn = $('[data-add-button]', section);
      const addLabel = $('[data-add-label]', section);
      const stickyBtn = $('[data-sticky-add]', section);
      const stickyPrice = $('[data-sticky-price]', section);
      const priceWrap = $('[data-price-wrapper]', section);
      const stock = $('[data-stock]', section);
      const variantsEl = $('[data-variants-json]', section);
      const variants = variantsEl ? JSON.parse(variantsEl.textContent) : [];

      /* Quantité */
      const qty = $('[data-quantity] input', section);
      $('[data-qty-minus]', section)?.addEventListener('click', () => { qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) - 1); });
      $('[data-qty-plus]', section)?.addEventListener('click', () => { qty.value = (parseInt(qty.value, 10) || 1) + 1; });

      /* Galerie */
      const mainWrap = $('.gallery__main', section);
      const mainImg = $('.gallery__main img', section);
      const setImage = (thumb) => {
        if (!mainImg || !thumb) return;
        $$('[data-thumb]', section).forEach((t) => t.setAttribute('aria-current', t === thumb ? 'true' : 'false'));
        const swap = () => {
          mainImg.srcset = thumb.dataset.srcset;
          mainImg.src = thumb.dataset.src;
          mainImg.alt = thumb.dataset.alt;
          mainWrap.classList.remove('is-changing');
        };
        if (reducedMotion()) { swap(); return; }
        mainWrap.classList.add('is-changing');
        setTimeout(swap, 250);
      };
      $$('[data-thumb]', section).forEach((t) => t.addEventListener('click', () => setImage(t)));

      /* Zoom plein écran */
      const lb = $('[data-lightbox]', section);
      if (lb && typeof lb.showModal === 'function') {
        $('[data-lightbox-open]', section)?.addEventListener('click', () => {
          const img = $('[data-lightbox-img]', lb);
          img.src = mainImg.currentSrc || mainImg.src;
          img.alt = mainImg.alt;
          lb.showModal();
        });
        $('[data-lightbox-close]', lb)?.addEventListener('click', () => lb.close());
        lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'IMG') lb.close(); });
      }

      /* Variantes */
      const picker = $('[data-variant-picker]', section);
      if (picker && variants.length) {
        const updateAvailability = (selected) => {
          $$('input[type="radio"]', picker).forEach((input) => {
            const idx = parseInt(input.dataset.optionIndex, 10);
            const test = selected.slice();
            test[idx] = input.value;
            const match = variants.find((v) => v.options.every((o, i) => o === test[i]));
            input.classList.toggle('is-unavailable', !match || !match.available);
          });
        };
        const onChange = () => {
          const selected = [];
          $$('fieldset', picker).forEach((fs, i) => {
            const checked = $('input:checked', fs);
            selected[i] = checked ? checked.value : null;
            const label = $(`[data-option-value="${i}"]`, picker);
            if (label && checked) label.textContent = checked.value;
          });
          updateAvailability(selected);
          const variant = variants.find((v) => v.options.every((o, i) => o === selected[i]));
          const available = !!(variant && variant.available);
          if (variant) {
            idInput.value = variant.id;
            const url = new URL(window.location.href);
            url.searchParams.set('variant', variant.id);
            window.history.replaceState({}, '', url.toString());
            if (variant.featured_media) {
              const thumb = $(`[data-thumb][data-media-id="${variant.featured_media.id}"]`, section);
              if (thumb) setImage(thumb);
            }
            refreshPrice(variant.id);
            if (stickyPrice) stickyPrice.textContent = formatMoney(variant.price);
          }
          const label = variant ? (available ? T().addToCart : T().soldOut) : T().unavailable;
          if (addLabel) addLabel.textContent = label;
          [addBtn, stickyBtn].forEach((b) => { if (b) b.disabled = !available; });
          if (stock) {
            stock.classList.toggle('stock--out', !available);
            stock.textContent = available ? stock.dataset.inStock || stock.textContent : T().soldOut;
          }
          announce(`${label}${variant ? ' — ' + formatMoney(variant.price) : ''}`);
        };
        if (stock) stock.dataset.inStock = stock.textContent.trim();
        picker.addEventListener('change', onChange);
        const initial = $$('fieldset', picker).map((fs) => $('input:checked', fs)?.value);
        updateAvailability(initial);
      }

      /* Prix mis à jour par le serveur (garde l'Omnibus, la TVA, etc.) */
      const refreshPrice = async (variantId) => {
        if (!priceWrap) return;
        try {
          const res = await fetch(`${section.dataset.url}?variant=${variantId}&section_id=${section.dataset.sectionId}`);
          const text = await res.text();
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const fresh = $('[data-price-wrapper]', doc);
          if (fresh) priceWrap.innerHTML = fresh.innerHTML;
        } catch (e) { /* on garde l'ancien prix affiché */ }
      };

      /* Barre d'achat collante */
      const sticky = $('[data-sticky-atc]', section);
      if (sticky && addBtn && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(([entry]) => {
          const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          sticky.classList.toggle('is-visible', show);
          sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
          sticky.inert = !show;
        });
        io.observe(addBtn);
      }
      if (form) form.setAttribute('novalidate', 'novalidate');
    });
  };

  /* ---------- Produits similaires ---------- */
  const initRecommendations = () => {
    $$('[data-recommendations]').forEach(async (el) => {
      try {
        const res = await fetch(el.dataset.url);
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const fresh = $('[data-recommendations]', doc);
        if (fresh && fresh.innerHTML.trim()) {
          el.innerHTML = fresh.innerHTML;
          initReveal();
          initSplit();
        }
      } catch (e) { /* section facultative */ }
    });
  };

  /* ---------- Bouton « préférences cookies » (bannière native Shopify) ---------- */
  const initCookiePrefs = () => {
    const btns = $$('[data-cookie-preferences]');
    if (!btns.length) return;
    const ready = () => window.privacyBanner && typeof window.privacyBanner.showPreferences === 'function';
    const show = () => btns.forEach((b) => { b.hidden = false; b.addEventListener('click', () => window.privacyBanner.showPreferences()); });
    if (ready()) { show(); return; }
    let tries = 0;
    const iv = setInterval(() => { tries += 1; if (ready()) { clearInterval(iv); show(); } else if (tries > 20) clearInterval(iv); }, 500);
  };

  /* ---------- Lien « défiler » du hero ---------- */
  const initScrollLink = () => {
    $$('[data-scroll-next]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }));
  };

  const init = () => {
    initMotionToggle();
    initSplit();
    initReveal();
    initHeader();
    initMobileMenu();
    initSearch();
    initCart();
    initParallax();
    initTilt();
    initMagnetic();
    initTracks();
    initProduct();
    initRecommendations();
    initCookiePrefs();
    initScrollLink();
    motionQuery.addEventListener?.('change', () => { if (reducedMotion()) revealAll(); });
  };

  window.SquizioCart = cart;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
