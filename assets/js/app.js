/* =========================================================
   PALAZZO — main JS
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Nav scroll state ---------- */
  const nav = document.querySelector('.nav');
  let lastScroll = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('nav--scrolled', y > 40);
    lastScroll = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile drawer ---------- */
  const menuBtn = document.querySelector('.nav__menu-btn');
  const drawer = document.getElementById('drawer');
  const setDrawer = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('no-scroll', open);
  };
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    setDrawer(open);
  });
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setDrawer(false);
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal, .gold-grow');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- Lightbox ---------- */
  const lbItems = document.querySelectorAll('[data-lightbox]');
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('.lightbox__img');
  const lbCap = lb.querySelector('.lightbox__caption');
  const lbClose = lb.querySelector('.lightbox__close');
  const lbPrev = lb.querySelector('.lightbox__prev');
  const lbNext = lb.querySelector('.lightbox__next');
  let lbList = [];
  let lbIndex = 0;
  const openLb = (i) => {
    lbIndex = i;
    const item = lbList[i];
    lbImg.src = item.src;
    lbImg.alt = item.alt || '';
    lbCap.textContent = item.cap || '';
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  };
  const closeLb = () => {
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    lbImg.src = '';
  };
  const stepLb = (d) => openLb((lbIndex + d + lbList.length) % lbList.length);

  lbItems.forEach((el, i) => {
    el.addEventListener('click', () => {
      lbList = Array.from(document.querySelectorAll('[data-lightbox]')).map(n => {
        const img = n.querySelector('img');
        return {
          src: n.dataset.lightboxFull || (img && img.currentSrc) || (img && img.src),
          alt: img ? img.alt : '',
          cap: n.dataset.caption || (img && img.alt) || ''
        };
      });
      const idx = Array.from(lbItems).indexOf(el);
      openLb(idx);
    });
  });
  lbClose.addEventListener('click', closeLb);
  lbPrev.addEventListener('click', () => stepLb(-1));
  lbNext.addEventListener('click', () => stepLb(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (lb.getAttribute('aria-hidden') === 'false') {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') stepLb(-1);
      if (e.key === 'ArrowRight') stepLb(1);
    }
  });

  /* ---------- Form + Captcha challenge ---------- */
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const submitBtn = form && form.querySelector('button[type="submit"]');
  const startTime = Date.now();

  // Captcha challenge state
  const captchaModal = document.getElementById('captcha-challenge');
  const captchaQ = captchaModal && captchaModal.querySelector('#captcha-q');
  const captchaA = captchaModal && captchaModal.querySelector('#captcha-a');
  let captchaExpected = 0;

  const genCaptcha = () => {
    const a = 1 + Math.floor(Math.random() * 8);
    const b = 1 + Math.floor(Math.random() * 8);
    captchaExpected = a + b;
    if (captchaQ) captchaQ.textContent = `${a} + ${b} =`;
  };
  genCaptcha();

  const showChallenge = () => {
    genCaptcha();
    if (captchaA) { captchaA.value = ''; captchaA.classList.remove('err'); }
    if (captchaModal) { captchaModal.classList.add('visible'); captchaModal.setAttribute('aria-hidden', 'false'); }
    setTimeout(() => captchaA && captchaA.focus(), 120);
  };
  const hideChallenge = () => {
    if (captchaModal) { captchaModal.classList.remove('visible'); captchaModal.setAttribute('aria-hidden', 'true'); }
  };

  const setError = (field, msg) => {
    const wrap = field.closest('.field');
    if (!wrap) return;
    wrap.classList.toggle('field--invalid', Boolean(msg));
    const err = wrap.querySelector('.field__error');
    if (err) err.textContent = msg || '';
  };

  const validateField = (f) => {
    if (f.type === 'hidden' || f.type === 'radio' || f.type === 'checkbox') return true;
    const v = f.value.trim();
    if (f.required && !v) { setError(f, 'Câmp obligatoriu.'); return false; }
    if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      setError(f, 'Adresa de email pare incorectă.'); return false;
    }
    if (f.type === 'tel' && v && !/^[+0-9\s().\-]{7,}$/.test(v)) {
      setError(f, 'Număr invalid.'); return false;
    }
    setError(f, '');
    return true;
  };

  const doSubmit = async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Se trimite…';
    const endpoint = form.getAttribute('action') || '';
    const data = new FormData(form);
    data.delete('company');
    data.append('_origin', location.origin);
    try {
      if (endpoint && endpoint.startsWith('http')) {
        const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Server ' + res.status);
      } else {
        const subject = encodeURIComponent('Solicitare eveniment — ' + (data.get('name') || ''));
        const body = encodeURIComponent(
          'Nume: ' + (data.get('name') || '') + '\n' +
          'Email: ' + (data.get('email') || '') + '\n' +
          'Telefon: ' + (data.get('phone') || '') + '\n' +
          'Tip eveniment: ' + (data.get('event') || '') + '\n' +
          'Data dorită: ' + (data.get('date') || '') + '\n\n' +
          'Mesaj:\n' + (data.get('message') || '')
        );
        window.location.href = `mailto:contact@palazzogrand.ro?subject=${subject}&body=${body}`;
        await new Promise(r => setTimeout(r, 500));
      }
      status.classList.add('form__status--ok');
      status.innerHTML = '<strong>Mulțumim!</strong> Solicitarea a fost trimisă. Vă contactăm în maxim 24h.';
      form.reset();
      // Reset date picker display
      const dp = form.querySelector('.date-display__value');
      const dph = form.querySelector('.date-display__placeholder');
      if (dp) dp.style.display = 'none';
      if (dph) dph.style.display = '';
      genCaptcha();
    } catch (err) {
      status.classList.add('form__status--err');
      status.innerHTML = 'Eroare tehnică. Scrieți-ne direct la <a href="mailto:contact@palazzogrand.ro">contact@palazzogrand.ro</a>.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Trimite solicitarea';
    }
  };

  // Captcha challenge confirm
  if (captchaModal) {
    captchaModal.querySelector('.captcha-challenge__confirm').addEventListener('click', async () => {
      const val = parseInt(captchaA.value, 10);
      if (val !== captchaExpected) {
        captchaA.classList.add('err');
        captchaA.value = '';
        genCaptcha();
        captchaA.focus();
        return;
      }
      hideChallenge();
      await doSubmit();
    });
    captchaModal.querySelector('.captcha-challenge__cancel').addEventListener('click', hideChallenge);
    // Enter key in captcha input
    captchaA.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') captchaModal.querySelector('.captcha-challenge__confirm').click();
    });
    captchaA.addEventListener('input', () => captchaA.classList.remove('err'));
  }

  if (form) {
    form.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea').forEach(f => {
      f.addEventListener('blur', () => validateField(f));
      f.addEventListener('input', () => {
        if (f.closest('.field') && f.closest('.field').classList.contains('field--invalid')) validateField(f);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.className = 'form__status';
      status.textContent = '';

      // Honeypot
      const honey = form.querySelector('input[name="company"]');
      if (honey && honey.value) return;

      // Time-trap
      if (Date.now() - startTime < 3000) {
        status.classList.add('form__status--err');
        status.textContent = 'Vă rugăm să așteptați câteva secunde înainte de a trimite.';
        return;
      }

      // Validate
      let valid = true;
      form.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea').forEach(f => {
        if (f.name === 'company') return;
        if (!validateField(f)) valid = false;
      });
      const consent = form.querySelector('input[name="consent"]');
      if (consent && !consent.checked) {
        valid = false;
        consent.closest('.consent').style.color = '#e8a07a';
      } else if (consent) {
        consent.closest('.consent').style.color = '';
      }
      if (!valid) return;

      // Show captcha challenge
      showChallenge();
    });
  }

  /* ---------- Cookie consent ---------- */
  const COOKIE_KEY = 'palazzo_consent_v1';
  const cookie = document.getElementById('cookie');
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(COOKIE_KEY) || 'null'); } catch { return null; }
  })();

  const loadAnalytics = () => {
    if (window.__analyticsLoaded) return;
    window.__analyticsLoaded = true;
    // Placeholder: replace 'G-XXXXXXX' with real GA4 ID, or swap to Plausible script.
    const id = document.documentElement.dataset.ga;
    if (!id || id === 'G-XXXXXXX') return; // not configured
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true });
  };

  const showCookie = () => cookie && cookie.setAttribute('data-visible', 'true');
  const hideCookie = () => cookie && cookie.setAttribute('data-visible', 'false');

  if (stored && stored.analytics === true) loadAnalytics();
  if (!stored) setTimeout(showCookie, 1200);

  if (cookie) {
    cookie.querySelector('[data-accept-all]').addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, JSON.stringify({ analytics: true, ts: Date.now() }));
      loadAnalytics();
      hideCookie();
    });
    cookie.querySelector('[data-reject]').addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, JSON.stringify({ analytics: false, ts: Date.now() }));
      hideCookie();
    });
  }
  // Allow re-opening from footer link
  document.querySelectorAll('[data-open-cookie]').forEach(b => {
    b.addEventListener('click', (e) => { e.preventDefault(); showCookie(); });
  });

  /* ---------- Hero video — start at offset + reduced motion ---------- */
  const heroVideo = document.querySelector('.hero__bg-video');
  if (heroVideo) {
    const startSec = parseFloat(heroVideo.dataset.start) || 0;

    const seekToStart = () => {
      if (heroVideo.currentTime < startSec) heroVideo.currentTime = startSec;
    };

    heroVideo.addEventListener('loadedmetadata', () => {
      heroVideo.currentTime = startSec;
    });

    // On loop restart the currentTime drops to 0 — bring it back to startSec
    heroVideo.addEventListener('timeupdate', seekToStart);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      heroVideo.removeAttribute('autoplay');
      heroVideo.pause();
    }

    document.addEventListener('visibilitychange', () => {
      document.hidden ? heroVideo.pause() : heroVideo.play().catch(() => {});
    });
  }

  /* ---------- Year stamp ---------- */
  const yEl = document.getElementById('year');
  if (yEl) yEl.textContent = new Date().getFullYear();

  /* ---------- Smooth anchor (with header offset) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------- Custom Date Picker ---------- */
  (() => {
    const wrapper = document.querySelector('.date-picker-wrapper');
    if (!wrapper) return;

    const btn       = wrapper.querySelector('.date-display');
    const valEl     = wrapper.querySelector('.date-display__value');
    const phEl      = wrapper.querySelector('.date-display__placeholder');
    const cal       = wrapper.querySelector('.date-cal');
    const daysGrid  = wrapper.querySelector('.date-cal__days');
    const monthYr   = wrapper.querySelector('.date-cal__month-year');
    const prevBtn   = wrapper.querySelector('.date-cal__prev');
    const nextBtn   = wrapper.querySelector('.date-cal__next');
    const hidden    = wrapper.querySelector('input[type="hidden"]');

    const MONTHS = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie',
                    'Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];

    // Mock booked dates — Saturdays reserved ~2 months out of every 3
    const BOOKED = new Set([
      '2026-06-06','2026-06-13','2026-06-20','2026-06-27',
      '2026-07-11','2026-07-18','2026-07-25',
      '2026-08-01','2026-08-08','2026-08-29',
      '2026-09-12','2026-09-19','2026-09-26',
      '2026-10-03','2026-10-10','2026-10-17',
      '2026-11-07','2026-11-14','2026-11-28',
      '2026-12-05','2026-12-12','2026-12-19',
      '2027-01-09','2027-01-16','2027-01-23',
      '2027-02-06','2027-02-20','2027-02-27',
      '2027-03-06','2027-03-13','2027-03-20',
      '2027-04-10','2027-04-17','2027-04-24',
      '2027-05-08','2027-05-15','2027-05-22','2027-05-29',
      '2027-06-05','2027-06-19','2027-06-26',
    ]);

    const toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const toDisplay = d => `${String(d.getDate()).padStart(2,'0')} / ${String(d.getMonth()+1).padStart(2,'0')} / ${d.getFullYear()}`;

    const today = new Date(); today.setHours(0,0,0,0);
    let curYear  = Math.max(today.getFullYear(), 2026);
    let curMonth = curYear === today.getFullYear() ? today.getMonth() : 0;
    let selected = null;

    const render = () => {
      monthYr.textContent = `${MONTHS[curMonth]} ${curYear}`;
      daysGrid.innerHTML = '';

      const first = new Date(curYear, curMonth, 1);
      const last  = new Date(curYear, curMonth + 1, 0);
      let dow = first.getDay(); // 0=Sun
      dow = dow === 0 ? 6 : dow - 1; // Mon=0

      for (let i = 0; i < dow; i++) {
        const e = document.createElement('div');
        e.className = 'date-cal__day empty';
        daysGrid.appendChild(e);
      }
      for (let d = 1; d <= last.getDate(); d++) {
        const date = new Date(curYear, curMonth, d);
        const iso  = toISO(date);
        const cell = document.createElement('div');
        cell.className = 'date-cal__day';
        cell.textContent = d;

        if (date.getTime() === today.getTime()) cell.classList.add('today');
        if (date < today)         { cell.classList.add('past'); }
        else if (BOOKED.has(iso)) { cell.classList.add('booked'); }
        else {
          if (selected && toISO(selected) === iso) cell.classList.add('selected');
          cell.addEventListener('click', () => {
            selected = date;
            hidden.value = iso;
            valEl.textContent = toDisplay(date);
            valEl.style.display = '';
            phEl.style.display  = 'none';
            btn.setAttribute('aria-expanded', 'false');
            cal.classList.remove('open');
            cal.setAttribute('aria-hidden', 'true');
          });
        }
        daysGrid.appendChild(cell);
      }

      // Disable prev if already at current month/year boundary
      prevBtn.disabled = (curYear === today.getFullYear() && curMonth <= today.getMonth())
                      || (curYear < today.getFullYear());
    };

    const openCal = () => {
      render();
      cal.classList.add('open');
      cal.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
    };
    const closeCal = () => {
      cal.classList.remove('open');
      cal.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', () => cal.classList.contains('open') ? closeCal() : openCal());

    prevBtn.addEventListener('click', () => {
      curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; } render();
    });
    nextBtn.addEventListener('click', () => {
      curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; } render();
    });

    document.addEventListener('click', e => { if (!wrapper.contains(e.target)) closeCal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCal(); });

    render();
  })();
})();
