/* Castron - shared behaviour. Plain JavaScript, no framework, no external requests. */
(function () {
  'use strict';
  // ===== CONFIGURATION: edit these before launch =====
  // siteUrl: your real domain, used for share links.
  // forms: paste an endpoint from a form service (for example Formspree, Basin or Getform)
  //        to deliver submissions. Left empty, forms validate and confirm but send nothing.
  var CONFIG = {
    siteUrl: 'https://example.com',
    forms: { newsletter: '', contact: '', pitch: '', notify: '' }
  };
  var SITE_URL = CONFIG.siteUrl;

  // Posts a form to its configured endpoint; resolves immediately when none is set.
  function sendForm(kind, fields) {
    var url = CONFIG.forms[kind];
    if (!url) { return Promise.resolve(); }
    var body = new FormData();
    Object.keys(fields).forEach(function (k) { body.append(k, fields[k]); });
    body.append('_page', location.href);
    return fetch(url, { method: 'POST', body: body, headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } });
  }
  var SHARE_TEXT = 'Castron: a family of companies, home of CastronTech tools';
  var SPA = document.documentElement.getAttribute('data-mode') === 'spa';

  var $ = function (id) { return document.getElementById(id); };
  var isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()); };

  // ---------- Mobile menu ----------
  var menuBtn = $('menuBtn'), mobileMenu = $('mobileMenu');
  function setMenu(open) {
    mobileMenu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(mobileMenu.hidden); });
  mobileMenu.addEventListener('click', function (e) { if (e.target.closest('a')) { setMenu(false); } });

  function markNav(key) {
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === key;
      if (a.tagName === 'BUTTON') { a.classList.toggle('is-current', on); return; }
      if (on) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
    });
  }

  // ---------- Account dialog ----------
  var overlay = $('overlay'), title = $('dialogTitle');
  var loginForm = $('loginForm'), signupForm = $('signupForm'), done = $('authDone');
  var lastTrigger = null;
  function showView(view) {
    loginForm.hidden = view !== 'login';
    signupForm.hidden = view !== 'signup';
    done.hidden = view !== 'done';
    if (view === 'login') { title.textContent = 'Welcome back'; }
    if (view === 'signup') { title.textContent = 'Create your account'; }
    overlay.querySelectorAll('.form-error').forEach(function (el) { el.textContent = ''; });
  }
  function openDialog(view, trigger) {
    lastTrigger = trigger || document.activeElement;
    setMenu(false);
    showView(view);
    overlay.hidden = false;
    document.body.classList.add('locked');
    var first = overlay.querySelector('#' + (view === 'signup' ? 'signupForm' : 'loginForm') + ' input');
    if (first) { first.focus(); }
  }
  function closeDialog() {
    overlay.hidden = true;
    document.body.classList.remove('locked');
    if (lastTrigger && document.contains(lastTrigger)) { lastTrigger.focus(); }
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-open]');
    if (btn) { e.preventDefault(); openDialog(btn.getAttribute('data-open'), btn); }
  });
  $('closeBtn').addEventListener('click', closeDialog);
  $('doneBtn').addEventListener('click', closeDialog);
  overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) { closeDialog(); } });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDialog(); return; }
    if (e.key !== 'Tab') { return; }
    var items = Array.prototype.filter.call(overlay.querySelectorAll('a[href], button, input'),
      function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!items.length) { return; }
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  function fail(form, msg) { form.querySelector('.form-error').textContent = msg; }
  function succeed(text) { $('authDoneText').textContent = text; title.textContent = 'All set'; showView('done'); $('doneBtn').focus(); }
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!isEmail($('loginEmail').value)) { return fail(loginForm, 'Enter the email address you signed up with.'); }
    if (!$('loginPassword').value) { return fail(loginForm, 'Enter your password.'); }
    succeed('You are logged in. Your licenses and downloads will appear in your account.');
  });
  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!$('suName').value.trim()) { return fail(signupForm, 'Enter your name.'); }
    if (!isEmail($('suEmail').value)) { return fail(signupForm, 'Enter a valid email address, like you@company.com.'); }
    if ($('suPassword').value.length < 12) { return fail(signupForm, 'Use a password of at least 12 characters.'); }
    if (!$('suAgree').checked) { return fail(signupForm, 'Accept the terms to create an account.'); }
    succeed('Account created. We sent a verification link to ' + $('suEmail').value.trim() + '.');
  });

  // ---------- Newsletter ----------
  $('subForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('subEmail').value.trim();
    if (!isEmail(email)) { $('subError').textContent = 'Enter a valid email address, like you@company.com.'; return; }
    $('subError').textContent = '';
    sendForm('newsletter', { email: email }).then(function () {
      $('subEmailOut').textContent = email;
      $('subForm').hidden = true;
      $('subDone').hidden = false;
    }, function () { $('subError').textContent = 'Sorry, that did not go through. Please try again in a moment.'; });
  });
  $('subEmail').addEventListener('input', function () { $('subError').textContent = ''; });

  // ---------- Sharing ----------
  var u = encodeURIComponent(SITE_URL), t = encodeURIComponent(SHARE_TEXT);
  $('shareX').href = 'https://x.com/intent/post?url=' + u + '&text=' + t;
  $('shareLinkedIn').href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + u;
  $('shareReddit').href = 'https://www.reddit.com/submit?url=' + u + '&title=' + t;
  $('shareEmail').href = 'mailto:?subject=' + t + '&body=' + u;
  if (navigator.share) {
    $('nativeShare').hidden = false;
    $('nativeShare').addEventListener('click', function () {
      navigator.share({ title: 'Castron', text: SHARE_TEXT, url: SITE_URL }).catch(function () {});
    });
  }
  $('copyBtn').addEventListener('click', function () {
    var label = $('copyLabel');
    function show(text) { label.textContent = text; setTimeout(function () { label.textContent = 'Copy link'; }, 2000); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = SITE_URL; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); document.body.removeChild(ta);
        show(ok ? 'Link copied' : 'Copy failed');
      } catch (err) { show('Copy failed'); }
    }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(SITE_URL).then(function () { show('Link copied'); }, fallback); }
    else { fallback(); }
  });

  // ---------- Tools catalog: category chips + search ----------
  var grid = $('toolGrid');
  var toolState = { cat: 'all', plat: 'all', q: '' };
  function applyTools() {
    if (!grid) { return; }
    var shown = 0;
    grid.querySelectorAll('.tool-card').forEach(function (card) {
      var okCat = toolState.cat === 'all' || card.getAttribute('data-cat') === toolState.cat;
      var okPlat = toolState.plat === 'all' || (' ' + card.getAttribute('data-platform') + ' ').indexOf(' ' + toolState.plat + ' ') >= 0;
      var hay = (card.getAttribute('data-name') + ' ' + card.textContent).toLowerCase();
      var okQ = !toolState.q || hay.indexOf(toolState.q) >= 0;
      card.hidden = !(okCat && okPlat && okQ);
      if (!card.hidden) { shown++; }
    });
    document.querySelectorAll('.chip[data-cat]').forEach(function (c) {
      c.setAttribute('aria-pressed', String(c.getAttribute('data-cat') === toolState.cat));
    });
    document.querySelectorAll('.chip[data-plat]').forEach(function (c) {
      c.setAttribute('aria-pressed', String(c.getAttribute('data-plat') === toolState.plat));
    });
    $('toolEmpty').hidden = shown !== 0;
    $('toolCount').textContent = shown + (shown === 1 ? ' tool' : ' tools');
  }
  function setCategory(cat) {
    var valid = ['all', 'identity', 'hardening', 'patching', 'automation'];
    toolState.cat = valid.indexOf(cat) >= 0 ? cat : 'all';
    applyTools();
  }
  if (grid) {
    document.querySelectorAll('.chip[data-plat]').forEach(function (c) {
      c.addEventListener('click', function () { toolState.plat = c.getAttribute('data-plat'); applyTools(); });
    });
    document.querySelectorAll('.chip[data-cat]').forEach(function (c) {
      c.addEventListener('click', function () {
        setCategory(c.getAttribute('data-cat'));
        // Keep the filter in the address so the view can be bookmarked or shared.
        var cat = toolState.cat === 'all' ? '' : toolState.cat;
        if (SPA) { history.replaceState(null, '', '#/tools' + (cat ? '/' + cat : '')); }
        else { history.replaceState(null, '', cat ? '#' + cat : location.pathname); }
      });
    });
    $('toolSearch').addEventListener('input', function (e) { toolState.q = e.target.value.trim().toLowerCase(); applyTools(); });
    if (!SPA) { setCategory(location.hash.replace('#', '') || 'all'); }
  }

  // ---------- Single-file preview: hash router ----------
  // The published preview holds every page in one file; the real site uses separate .html files.
  if (SPA) {
    function route() {
      var h = location.hash;
      if (h && h.indexOf('#/') !== 0) { return; }  // plain in-page anchors like #newsletter
      var parts = h.replace(/^#\/?/, '').split('/');
      var page = parts[0] || 'home', scrollTo = null, nav = page;
      if (page === 'videos' || page === 'families') { scrollTo = page; nav = page === 'families' ? 'families' : 'tech'; page = 'home'; }
      if (page === 'family') { page = parts[1] || 'home'; nav = 'families'; }
      if (page === 'tools') { nav = 'tech'; }
      if (page === 'tool') { page = parts[1] || 'tools'; nav = 'tech'; }
      if (!document.querySelector('[data-page="' + page + '"]')) { page = 'home'; nav = 'home'; }
      document.querySelectorAll('[data-page]').forEach(function (p) { p.hidden = p.getAttribute('data-page') !== page; });
      if (page === 'tools') { setCategory(parts[1] || 'all'); }
      if (page === 'learn' && window.__castronSetTopic) { window.__castronSetTopic(parts[1] || ''); }
      var pageEl = document.querySelector('[data-page="' + page + '"]');
      document.title = (pageEl && pageEl.getAttribute('data-title')) || 'Castron';
      closeFamilies(); if (typeof closeMegas === 'function') { closeMegas(); }
      markNav(nav);
      setMenu(false);
      if (scrollTo) { var el = $(scrollTo); if (el) { el.scrollIntoView(); } } else { window.scrollTo(0, 0); }
    }
    window.addEventListener('hashchange', route);
    route();
  } else {
    markNav(document.body.getAttribute('data-nav') || '');
  }

  // ---------- Families drop-down ----------
  var famBtn = $('famBtn'), famMenu = $('famMenu');
  function closeFamilies() {
    if (famBtn && famMenu && !famMenu.hidden) { famMenu.hidden = true; famBtn.setAttribute('aria-expanded', 'false'); }
  }
  if (famBtn && famMenu) {
    famBtn.addEventListener('click', function () {
      var open = famMenu.hidden;
      famMenu.hidden = !open;
      famBtn.setAttribute('aria-expanded', String(open));
      if (open) { var first = famMenu.querySelector('a'); if (first) { first.focus(); } }
    });
    famMenu.addEventListener('click', function (e) { if (e.target.closest('a')) { closeFamilies(); } });
    document.addEventListener('click', function (e) { if (!e.target.closest('.nav-drop')) { closeFamilies(); } });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !famMenu.hidden) { closeFamilies(); famBtn.focus(); }
    });
  }

  // ---------- Light / dark switch (dark is the default; the choice is remembered) ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
  applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('castron-theme', next); } catch (err) { /* private mode: still switches, just not remembered */ }
    });
  });

  // ---------- Mega menus: click or keyboard everywhere, hover on devices with a mouse ----------
  var megaBtns = Array.prototype.slice.call(document.querySelectorAll('.mega-btn'));
  function closeMegas(except) {
    (megaBtns || []).forEach(function (b) {
      if (b === except) { return; }
      b.setAttribute('aria-expanded', 'false');
      var p = $(b.getAttribute('aria-controls')); if (p) { p.hidden = true; }
    });
  }
  function openMega(b) {
    closeMegas(b);
    b.setAttribute('aria-expanded', 'true');
    $(b.getAttribute('aria-controls')).hidden = false;
  }
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  megaBtns.forEach(function (b) {
    var panel = $(b.getAttribute('aria-controls')), item = b.parentNode, timer;
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-expanded') === 'true') { closeMegas(); } else { openMega(b); }
    });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); openMega(b); var f = panel.querySelector('a'); if (f) { f.focus(); } }
    });
    if (canHover) {
      // a short delay stops menus flickering open as the mouse passes over the bar
      item.addEventListener('mouseenter', function () { clearTimeout(timer); timer = setTimeout(function () { openMega(b); }, 120); });
      item.addEventListener('mouseleave', function () { clearTimeout(timer); timer = setTimeout(function () {
        b.setAttribute('aria-expanded', 'false'); panel.hidden = true; }, 180); });
    }
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) { closeMegas(); } });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.mega-item')) { closeMegas(); } });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    var open = megaBtns.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
    if (open) { closeMegas(); open.focus(); }
  });

  // ---------- Learn hub: filter guides by topic ----------
  var articleGrid = $('articleGrid');
  function setTopic(topic) {
    if (!articleGrid) { return; }
    var valid = ['windows', 'linux', 'macos', 'networking', 'security', 'pc'];
    topic = valid.indexOf(topic) >= 0 ? topic : '';
    var shown = 0;
    articleGrid.querySelectorAll('.article-card').forEach(function (c) {
      var hit = !topic || (' ' + c.getAttribute('data-topics') + ' ').indexOf(' ' + topic + ' ') >= 0;
      c.hidden = !hit; if (hit) { shown++; }
    });
    document.querySelectorAll('.topic-card').forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-topic') === topic)); });
    $('articleEmpty').hidden = shown !== 0;
    $('topicClear').hidden = !topic;
  }
  if (articleGrid) {
    document.querySelectorAll('.topic-card').forEach(function (t) {
      t.addEventListener('click', function () {
        var topic = t.getAttribute('aria-pressed') === 'true' ? '' : t.getAttribute('data-topic');
        setTopic(topic);
        if (SPA) { history.replaceState(null, '', '#/learn' + (topic ? '/' + topic : '')); }
        else { history.replaceState(null, '', topic ? '#' + topic : location.pathname); }
      });
    });
    $('topicClear').addEventListener('click', function () { setTopic(''); if (SPA) { history.replaceState(null, '', '#/learn'); } });
    if (!SPA) { setTopic(location.hash.replace('#', '')); }
  }
  window.__castronSetTopic = setTopic;
  // the router ran before this was defined, so apply a topic from a direct link now
  if (SPA && /^#\/learn\//.test(location.hash)) { setTopic(location.hash.split('/')[2] || ''); }

  // ---------- Email links: open the mail app, and always copy the address ----------
  // On a normal website a mailto: link opens the visitor's email app. Inside an embedded
  // preview (an iframe) browsers may block that, so we open it in a new context instead.
  // Copying the address covers visitors who use webmail and have no desktop mail app set up.
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) { return navigator.clipboard.writeText(text); }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); document.body.removeChild(ta); ok ? resolve() : reject();
      } catch (err) { reject(err); }
    });
  }
  var framed = false; try { framed = window.self !== window.top; } catch (err) { framed = true; }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="mailto:"]'); if (!a) { return; }
    var address = decodeURIComponent(a.getAttribute('href').slice(7).split('?')[0]);
    if (framed) { e.preventDefault(); try { window.open(a.href, '_blank', 'noopener'); } catch (err) { /* blocked: the copy below still helps */ } }
    copyText(address).then(function () { toast('Opening your email app. Address copied: ' + address); },
                           function () { toast('Email us at ' + address); });
  });

  // ---------- Article share bars ----------
  // Links are built from the page's real address, so shares point at the article itself.
  function wireShare(bar) {
    var url = SPA ? SITE_URL.replace(/\/$/, '') + '/' + bar.getAttribute('data-file') : location.href.split('#')[0];
    var title = bar.getAttribute('data-title').replace(/&amp;/g, '&');
    var u = encodeURIComponent(url), t = encodeURIComponent(title);
    var targets = {
      x: 'https://x.com/intent/post?url=' + u + '&text=' + t,
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u,
      reddit: 'https://www.reddit.com/submit?url=' + u + '&title=' + t,
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + u,
      email: 'mailto:?subject=' + t + '&body=' + t + '%0A%0A' + u
    };
    bar.querySelectorAll('a[data-share]').forEach(function (a) { a.href = targets[a.getAttribute('data-share')]; });
    var copy = bar.querySelector('button[data-share="copy"]');
    copy.addEventListener('click', function () {
      copyText(url).then(function () { toast('Link copied: ' + url); }, function () { toast(url); });
    });
  }
  setTimeout(function () { document.querySelectorAll('.share-bar').forEach(wireShare); }, 0);

  // ---------- Article pitch form ----------
  var pitch = $('pitchForm');
  if (pitch) {
    pitch.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = pitch.querySelector('.form-error');
      if (!$('pf-name').value.trim()) { err.textContent = 'Please tell us your name.'; return; }
      if (!isEmail($('pf-email').value)) { err.textContent = 'Enter a valid email address so we can reply.'; return; }
      if (!$('pf-title').value.trim()) { err.textContent = 'Add a working title, even a rough one.'; return; }
      if ($('pf-outline').value.trim().length < 30) { err.textContent = 'Add a few sentences of outline so we can judge the idea.'; return; }
      err.textContent = '';
      sendForm('pitch', { name: $('pf-name').value.trim(), email: $('pf-email').value.trim(), title: $('pf-title').value.trim(),
                          topic: $('pf-topic').value, outline: $('pf-outline').value.trim() }).then(function () {
        $('pitchDone').textContent = 'Thanks! We read every pitch and reply within 5 business days.';
        pitch.hidden = true; $('pitchDone').hidden = false;
      }, function () { err.textContent = 'Sorry, the pitch could not be sent. Please email us directly.'; });
    });
  }

  // ---------- "Field notes" links: bring the visitor to the signup, ready to type ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#newsletter"]'); if (!a) { return; }
    var band = $('newsletter'); if (!band) { return; }
    e.preventDefault();
    closeMegas(); setMenu(false);
    // Animate short trips; jump on long ones, where a smooth scroll feels like nothing happened.
    // The site sets smooth scrolling in CSS, so switch it off for the jump itself.
    var header = document.querySelector('.site-header');
    var y = band.getBoundingClientRect().top + window.pageYOffset - (header ? header.offsetHeight : 0);
    var far = Math.abs(y - window.pageYOffset) > window.innerHeight * 2;
    var root = document.documentElement, previous = root.style.scrollBehavior;
    if (far) { root.style.scrollBehavior = 'auto'; window.scrollTo(0, y); root.style.scrollBehavior = previous; }
    else { window.scrollTo({ top: y, behavior: 'smooth' }); }
    var input = $('subEmail');
    if (input && !$('subForm').hidden) { setTimeout(function () { input.focus({ preventScroll: true }); }, 450); }
  });

  // ---------- Contact form ----------
  var contactForm = $('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = contactForm.querySelector('.form-error');
      var name = $('cf-name').value.trim(), email = $('cf-email').value.trim(), msg = $('cf-msg').value.trim();
      if (!name) { err.textContent = 'Please tell us your name.'; $('cf-name').focus(); return; }
      if (!isEmail(email)) { err.textContent = 'Enter a valid email address so we can reply.'; $('cf-email').focus(); return; }
      if (msg.length < 10) { err.textContent = 'Please add a little more detail so we can help.'; $('cf-msg').focus(); return; }
      err.textContent = '';
      sendForm('contact', { name: name, email: email, subject: $('cf-subject').value, message: msg }).then(function () {
        var done = $('contactDone');
        done.textContent = 'Thanks ' + name + '. Your message is on its way; we will reply to ' + email + '.';
        contactForm.hidden = true; done.hidden = false;
      }, function () { err.textContent = 'Sorry, the message could not be sent. Please email us directly.'; });
    });
  }

  // ---------- "Notify me" forms on coming-soon family pages ----------
  document.querySelectorAll('.notify-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]'), err = form.querySelector('.form-error');
      var email = input.value.trim();
      if (!isEmail(email)) { err.textContent = 'Enter a valid email address, like you@company.com.'; input.focus(); return; }
      err.textContent = '';
      var done = form.parentNode.querySelector('.notify-done');
      done.textContent = 'Thanks. We will email ' + email + ' when ' + form.getAttribute('data-family') + ' opens.';
      form.hidden = true; done.hidden = false;
    });
  });

  document.querySelectorAll('.year').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
