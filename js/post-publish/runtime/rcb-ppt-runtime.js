// @ts-nocheck
(function() {
  'use strict';

  if (window.__RCB_PPT_INITIALIZED__) return;
  window.__RCB_PPT_INITIALIZED__ = true;

  var config = window.__RCB_POST_PUBLISH_CONFIG__ || {};
  var settings = config.settings || {};
  var enabledTools = settings.enabledTools || { glossary: true, resources: true, help: true };

  // State
  var activeTab = settings.defaultOpenTool || (enabledTools.glossary ? 'glossary' : (enabledTools.resources ? 'resources' : 'help'));
  var isDrawerOpen = false;
  var glossSearchQuery = '';
  var glossSelectedLetter = '';
  var glossSelectedCategory = '';
  var resSearchQuery = '';
  var resSelectedCategory = '';
  var resSelectedType = '';

  var lastFocusedElement = null;

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createLauncher() {
    var existing = document.getElementById('rcb-ppt-root');
    if (existing) return;

    var root = document.createElement('div');
    root.id = 'rcb-ppt-root';
    root.className = 'rcb-ppt-root rcb-ppt-theme-' + (settings.launcherTheme || 'default') +
      ' rcb-ppt-surface-' + (settings.surfaceTheme || 'light') +
      ' rcb-ppt-pos-' + (settings.launcherPosition === 'bottom-left' ? 'left' : 'right');

    // Launcher Button
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'rcb-ppt-launcher';
    btn.className = 'rcb-ppt-launcher-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'rcb-ppt-drawer');
    btn.setAttribute('aria-label', settings.launcherLabel || 'Course Tools');

    var posStyle = settings.launcherPosition === 'bottom-left' ? 'left' : 'right';
    var sideOffset = (settings.desktopOffsetSide || 24) + 'px';
    var bottomOffset = (settings.desktopOffsetBottom || 24) + 'px';
    btn.style[posStyle] = sideOffset;
    btn.style.bottom = bottomOffset;

    var iconSvg = '<svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><path d="M4 6h24v2H4zm0 9h24v2H4zm0 9h24v2H4z"/></svg>';
    if (settings.launcherStyle === 'icon-only') {
      btn.innerHTML = '<span class="rcb-ppt-launcher-icon">' + iconSvg + '</span>';
      btn.title = settings.launcherLabel || 'Course Tools';
    } else {
      btn.innerHTML = '<span class="rcb-ppt-launcher-icon">' + iconSvg + '</span><span>' + escapeHTML(settings.launcherLabel || 'Course Tools') + '</span>';
    }

    btn.addEventListener('click', toggleDrawer);
    root.appendChild(btn);

    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.id = 'rcb-ppt-backdrop';
    backdrop.className = 'rcb-ppt-backdrop';
    backdrop.addEventListener('click', closeDrawer);
    root.appendChild(backdrop);

    // Drawer
    var drawer = document.createElement('div');
    drawer.id = 'rcb-ppt-drawer';
    drawer.className = 'rcb-ppt-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Course Tools Panel');
    // Closed = inert immediately (visibility only flips after the slide-out finishes).
    drawer.setAttribute('inert', '');

    drawer.innerHTML = `
      <div class="rcb-ppt-drawer-header">
        <div class="rcb-ppt-header-top">
          <h2 class="rcb-ppt-header-title">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><path d="M4 6h24v2H4zm0 9h24v2H4zm0 9h24v2H4z"/></svg>
            <span>${escapeHTML(settings.launcherLabel || 'Course Tools')}</span>
          </h2>
          <button type="button" class="rcb-ppt-close-btn" aria-label="Close Course Tools panel">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16 24 9.4z"/></svg>
          </button>
        </div>
        <div class="rcb-ppt-tabs" role="tablist">
          ${enabledTools.glossary ? `<button type="button" class="rcb-ppt-tab-btn" id="rcb-ppt-tab-glossary" data-tab="glossary" role="tab" aria-selected="false" aria-controls="rcb-ppt-body" tabindex="-1">Glossary</button>` : ''}
          ${enabledTools.resources ? `<button type="button" class="rcb-ppt-tab-btn" id="rcb-ppt-tab-resources" data-tab="resources" role="tab" aria-selected="false" aria-controls="rcb-ppt-body" tabindex="-1">Resources</button>` : ''}
          ${enabledTools.help ? `<button type="button" class="rcb-ppt-tab-btn" id="rcb-ppt-tab-help" data-tab="help" role="tab" aria-selected="false" aria-controls="rcb-ppt-body" tabindex="-1">Help & Support</button>` : ''}
        </div>
      </div>
      <div class="rcb-ppt-drawer-body" id="rcb-ppt-body" role="tabpanel"></div>
    `;

    drawer.querySelector('.rcb-ppt-close-btn').addEventListener('click', closeDrawer);

    drawer.querySelectorAll('.rcb-ppt-tab-btn').forEach(function(tabBtn) {
      tabBtn.addEventListener('click', function() {
        switchTab(tabBtn.getAttribute('data-tab'));
      });
    });

    // Tab pattern: one tab stop (the selected tab); arrows/Home/End move selection and focus.
    drawer.querySelector('.rcb-ppt-tabs').addEventListener('keydown', function(e) {
      var tabs = Array.prototype.slice.call(drawer.querySelectorAll('.rcb-ppt-tab-btn'));
      var index = tabs.indexOf(document.activeElement);
      if (index === -1) return;
      var next = -1;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === -1) return;
      e.preventDefault();
      switchTab(tabs[next].getAttribute('data-tab'));
      tabs[next].focus();
    });

    root.appendChild(drawer);
    document.body.appendChild(root);

    // Keyboard trap & Escape listener
    document.addEventListener('keydown', function(e) {
      if (!isDrawerOpen) return;
      if (e.key === 'Escape') {
        closeDrawer();
      } else if (e.key === 'Tab') {
        trapFocus(e, drawer);
      }
    });

    renderActiveTab();
  }

  function trapFocus(e, container) {
    var focusables = container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }

  function toggleDrawer() {
    if (isDrawerOpen) closeDrawer();
    else openDrawer();
  }

  function openDrawer() {
    isDrawerOpen = true;
    lastFocusedElement = document.activeElement;
    var drawer = document.getElementById('rcb-ppt-drawer');
    var backdrop = document.getElementById('rcb-ppt-backdrop');
    var btn = document.getElementById('rcb-ppt-launcher');

    if (drawer) { drawer.removeAttribute('inert'); drawer.classList.add('rcb-ppt-open'); }
    if (backdrop) backdrop.classList.add('rcb-ppt-open');
    if (btn) btn.setAttribute('aria-expanded', 'true');

    renderActiveTab();

    setTimeout(function() {
      var firstInput = drawer ? drawer.querySelector('input, button.rcb-ppt-tab-btn, button.rcb-ppt-close-btn') : null;
      if (firstInput) firstInput.focus();
    }, 100);
  }

  function closeDrawer() {
    isDrawerOpen = false;
    var drawer = document.getElementById('rcb-ppt-drawer');
    var backdrop = document.getElementById('rcb-ppt-backdrop');
    var btn = document.getElementById('rcb-ppt-launcher');

    if (drawer) { drawer.setAttribute('inert', ''); drawer.classList.remove('rcb-ppt-open'); }
    if (backdrop) backdrop.classList.remove('rcb-ppt-open');
    if (btn) btn.setAttribute('aria-expanded', 'false');

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function switchTab(tabKey) {
    activeTab = tabKey;
    var drawer = document.getElementById('rcb-ppt-drawer');
    if (!drawer) return;
    drawer.querySelectorAll('.rcb-ppt-tab-btn').forEach(function(b) {
      var isCurrent = b.getAttribute('data-tab') === tabKey;
      b.classList.toggle('rcb-ppt-active', isCurrent);
      b.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      b.tabIndex = isCurrent ? 0 : -1;
    });
    renderActiveTab();
  }

  function renderActiveTab() {
    var body = document.getElementById('rcb-ppt-body');
    if (!body) return;

    var drawer = document.getElementById('rcb-ppt-drawer');
    if (drawer) {
      drawer.querySelectorAll('.rcb-ppt-tab-btn').forEach(function(b) {
        var isCurrent = b.getAttribute('data-tab') === activeTab;
        b.classList.toggle('rcb-ppt-active', isCurrent);
        b.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        b.tabIndex = isCurrent ? 0 : -1;
      });
    }
    body.setAttribute('aria-labelledby', 'rcb-ppt-tab-' + activeTab);

    if (activeTab === 'glossary') renderGlossary(body);
    else if (activeTab === 'resources') renderResources(body);
    else if (activeTab === 'help') renderHelp(body);
  }

  function renderGlossary(container) {
    var glossary = config.glossary || { entries: [] };
    var entries = glossary.entries || [];

    // Extract available letters and categories
    var letters = new Set();
    var categories = new Set();
    entries.forEach(function(e) {
      var firstLetter = (e.term || '').trim().charAt(0).toUpperCase();
      if (firstLetter >= 'A' && firstLetter <= 'Z') letters.add(firstLetter);
      if (e.category) categories.add(e.category);
    });

    var filtered = entries.filter(function(e) {
      var termText = (e.term + ' ' + (e.abbreviation || '') + ' ' + (e.aliases || '') + ' ' + (e.definition || '')).toLowerCase();
      var matchesSearch = !glossSearchQuery || termText.includes(glossSearchQuery.toLowerCase());
      var matchesLetter = !glossSelectedLetter || (e.term || '').trim().toUpperCase().startsWith(glossSelectedLetter);
      var matchesCat = !glossSelectedCategory || e.category === glossSelectedCategory;
      return matchesSearch && matchesLetter && matchesCat;
    });

    container.innerHTML = `
      <div class="rcb-ppt-search-box">
        <svg class="rcb-ppt-search-icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M21.4 20C23 18.1 24 15.6 24 13 24 6.9 19.1 2 13 2 6.9 2 2 6.9 2 13 2 19.1 6.9 24 13 24 15.7 24 18.1 23 20 21.4L28.3 29.7 29.7 28.3 21.4 20ZM13 22C8 22 4 18 4 13 4 8 8 4 13 4 18 4 22 8 22 13 22 18 18 22 13 22Z"/></svg>
        <input type="search" class="rcb-ppt-search-input" id="rcb-ppt-gloss-search" placeholder="Search terms, acronyms, definitions..." value="${escapeHTML(glossSearchQuery)}" aria-label="Search glossary">
      </div>

      <div class="rcb-ppt-az-pills" role="toolbar" aria-label="Alphabetical jump">
        <button type="button" class="rcb-ppt-az-btn ${!glossSelectedLetter ? 'rcb-ppt-selected' : ''}" data-letter="" aria-label="All letters">All</button>
        ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(function(char) {
          var hasEntries = letters.has(char);
          var isSel = glossSelectedLetter === char;
          return `<button type="button" class="rcb-ppt-az-btn ${isSel ? 'rcb-ppt-selected' : ''}" data-letter="${char}" ${!hasEntries ? 'disabled' : ''}>${char}</button>`;
        }).join('')}
      </div>

      ${categories.size > 0 ? `
        <div class="rcb-ppt-category-pills" role="toolbar" aria-label="Filter by category">
          <button type="button" class="rcb-ppt-cat-pill ${!glossSelectedCategory ? 'rcb-ppt-selected' : ''}" data-cat="">All Categories</button>
          ${Array.from(categories).map(function(cat) {
            var isSel = glossSelectedCategory === cat;
            return `<button type="button" class="rcb-ppt-cat-pill ${isSel ? 'rcb-ppt-selected' : ''}" data-cat="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`;
          }).join('')}
        </div>
      ` : ''}

      <div class="rcb-ppt-results-status" role="status" aria-live="polite" style="font-size: 12px; opacity: 0.7;">
        ${filtered.length} term${filtered.length === 1 ? '' : 's'} available
      </div>

      <div class="rcb-ppt-terms-list" style="display: flex; flex-direction: column; gap: 12px;">
        ${filtered.length === 0 ? `<div style="text-align: center; padding: 24px 0; opacity: 0.7;">No terms match your search filter.</div>` :
          filtered.map(function(term) {
            return `
              <div class="rcb-ppt-gloss-card">
                <h3 class="rcb-ppt-gloss-term">
                  <span>${escapeHTML(term.term)}</span>
                  ${term.abbreviation ? `<span class="rcb-ppt-gloss-abbrev">${escapeHTML(term.abbreviation)}</span>` : ''}
                </h3>
                <div class="rcb-ppt-gloss-def">${term.definition || ''}</div>
                ${term.resourceUrl ? `
                  <a href="${escapeHTML(term.resourceUrl)}" target="_blank" rel="noopener noreferrer" class="rcb-ppt-gloss-link">
                    <span>${escapeHTML(term.resourceLabel || 'Related Resource')}</span>
                    <svg width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="M26 26H6V6h10V4H6a2 2 0 00-2 2v20a2 2 0 002 2h20a2 2 0 002-2V16h-2z"/><path d="M28 4h-8v2h4.59L15.3 15.3l1.41 1.41L26 7.41V12h2z"/></svg>
                  </a>
                ` : ''}
              </div>
            `;
          }).join('')
        }
      </div>
    `;

    var searchInput = container.querySelector('#rcb-ppt-gloss-search');
    searchInput.addEventListener('input', function() {
      glossSearchQuery = searchInput.value;
      var caret = searchInput.selectionStart;
      renderGlossary(container);
      // The list is re-rendered on every keystroke; put focus and caret back in the search box.
      var refreshed = container.querySelector('#rcb-ppt-gloss-search');
      if (refreshed) { refreshed.focus(); try { refreshed.setSelectionRange(caret, caret); } catch (err) { /* type=search may not support it */ } }
    });

    container.querySelectorAll('.rcb-ppt-az-btn:not([disabled])').forEach(function(btn) {
      btn.addEventListener('click', function() {
        glossSelectedLetter = btn.getAttribute('data-letter');
        renderGlossary(container);
      });
    });

    container.querySelectorAll('.rcb-ppt-cat-pill').forEach(function(btn) {
      btn.addEventListener('click', function() {
        glossSelectedCategory = btn.getAttribute('data-cat');
        renderGlossary(container);
      });
    });
  }

  function renderResources(container) {
    var resources = config.resources || { items: [] };
    var items = resources.items || [];

    var categories = new Set();
    var types = new Set();
    items.forEach(function(item) {
      if (item.category) categories.add(item.category);
      if (item.type) types.add(item.type);
    });

    var filtered = items.filter(function(item) {
      var text = (item.title + ' ' + (item.description || '') + ' ' + (item.category || '')).toLowerCase();
      var matchesSearch = !resSearchQuery || text.includes(resSearchQuery.toLowerCase());
      var matchesCat = !resSelectedCategory || item.category === resSelectedCategory;
      var matchesType = !resSelectedType || item.type === resSelectedType;
      return matchesSearch && matchesCat && matchesType;
    });

    container.innerHTML = `
      <div class="rcb-ppt-search-box">
        <svg class="rcb-ppt-search-icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M21.4 20C23 18.1 24 15.6 24 13 24 6.9 19.1 2 13 2 6.9 2 2 6.9 2 13 2 19.1 6.9 24 13 24 15.7 24 18.1 23 20 21.4L28.3 29.7 29.7 28.3 21.4 20ZM13 22C8 22 4 18 4 13 4 8 8 4 13 4 18 4 22 8 22 13 22 18 18 22 13 22Z"/></svg>
        <input type="search" class="rcb-ppt-search-input" id="rcb-ppt-res-search" placeholder="Search resources, guides, tools..." value="${escapeHTML(resSearchQuery)}" aria-label="Search resources">
      </div>

      ${categories.size > 0 ? `
        <div class="rcb-ppt-category-pills" role="toolbar" aria-label="Filter resources by category">
          <button type="button" class="rcb-ppt-cat-pill ${!resSelectedCategory ? 'rcb-ppt-selected' : ''}" data-cat="">All Categories</button>
          ${Array.from(categories).map(function(cat) {
            var isSel = resSelectedCategory === cat;
            return `<button type="button" class="rcb-ppt-cat-pill ${isSel ? 'rcb-ppt-selected' : ''}" data-cat="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`;
          }).join('')}
        </div>
      ` : ''}

      <div class="rcb-ppt-results-status" role="status" aria-live="polite" style="font-size: 12px; opacity: 0.7;">
        ${filtered.length} resource${filtered.length === 1 ? '' : 's'} available
      </div>

      <div class="rcb-ppt-resources-list" style="display: flex; flex-direction: column; gap: 12px;">
        ${filtered.length === 0 ? `<div style="text-align: center; padding: 24px 0; opacity: 0.7;">No resources match your search filter.</div>` :
          filtered.map(function(res) {
            var href = res.sourceType === 'upload' && res.fileRef ? `assets/rcb-ppt/resources/${res.fileRef.name}` : (res.url || '#');
            var isDownload = res.openBehavior === 'download';
            return `
              <div class="rcb-ppt-res-card ${res.featured ? 'rcb-ppt-featured' : ''}">
                <div class="rcb-ppt-res-header">
                  <h3 class="rcb-ppt-res-title">${escapeHTML(res.title)}</h3>
                  ${res.category ? `<span class="rcb-ppt-gloss-abbrev">${escapeHTML(res.category)}</span>` : ''}
                </div>
                ${res.description ? `<p class="rcb-ppt-res-desc">${escapeHTML(res.description)}</p>` : ''}
                <a href="${escapeHTML(href)}" ${isDownload ? 'download' : 'target="_blank" rel="noopener noreferrer"'} class="rcb-ppt-res-action-btn">
                  <span>${escapeHTML(res.actionLabel || (isDownload ? 'Download' : 'Open'))}</span>
                  <svg width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="M26 26H6V6h10V4H6a2 2 0 00-2 2v20a2 2 0 002 2h20a2 2 0 002-2V16h-2z"/><path d="M28 4h-8v2h4.59L15.3 15.3l1.41 1.41L26 7.41V12h2z"/></svg>
                </a>
              </div>
            `;
          }).join('')
        }
      </div>
    `;

    var searchInput = container.querySelector('#rcb-ppt-res-search');
    searchInput.addEventListener('input', function() {
      resSearchQuery = searchInput.value;
      var caret = searchInput.selectionStart;
      renderResources(container);
      var refreshed = container.querySelector('#rcb-ppt-res-search');
      if (refreshed) { refreshed.focus(); try { refreshed.setSelectionRange(caret, caret); } catch (err) { /* type=search may not support it */ } }
    });

    container.querySelectorAll('.rcb-ppt-cat-pill').forEach(function(btn) {
      btn.addEventListener('click', function() {
        resSelectedCategory = btn.getAttribute('data-cat');
        renderResources(container);
      });
    });
  }

  function renderHelp(container) {
    var help = config.help || {};
    var faqs = help.faqItems || [];

    container.innerHTML = `
      ${help.intro ? `<div style="font-size: 14px; line-height: 1.5; margin-bottom: 8px;">${help.intro}</div>` : ''}

      <div class="rcb-ppt-contact-grid">
        ${help.supportEmail ? `
          <div class="rcb-ppt-contact-card">
            <div class="rcb-ppt-contact-info">
              <span class="rcb-ppt-contact-label">Support Email</span>
              <span class="rcb-ppt-contact-val">${escapeHTML(help.supportEmail)}</span>
            </div>
            <a href="mailto:${escapeHTML(help.supportEmail)}" class="rcb-ppt-contact-action">Email Support</a>
          </div>
        ` : ''}

        ${help.supportPhone ? `
          <div class="rcb-ppt-contact-card">
            <div class="rcb-ppt-contact-info">
              <span class="rcb-ppt-contact-label">Support Phone</span>
              <span class="rcb-ppt-contact-val">${escapeHTML(help.supportPhone)}</span>
            </div>
            <a href="tel:${escapeHTML(help.supportPhone)}" class="rcb-ppt-contact-action">Call</a>
          </div>
        ` : ''}

        ${help.supportPortalUrl ? `
          <div class="rcb-ppt-contact-card">
            <div class="rcb-ppt-contact-info">
              <span class="rcb-ppt-contact-label">Support Portal</span>
              <span class="rcb-ppt-contact-val">${escapeHTML(help.supportPortalLabel || 'Helpdesk Portal')}</span>
            </div>
            <a href="${escapeHTML(help.supportPortalUrl)}" target="_blank" rel="noopener noreferrer" class="rcb-ppt-contact-action">Open Portal</a>
          </div>
        ` : ''}
      </div>

      ${(help.supportHours || help.responseTime) ? `
        <div style="font-size: 13px; opacity: 0.8; padding: 10px 14px; border-radius: 8px; background-color: rgba(0,0,0,0.03);">
          ${help.supportHours ? `<div><strong>Hours:</strong> ${escapeHTML(help.supportHours)}</div>` : ''}
          ${help.responseTime ? `<div><strong>Response Time:</strong> ${escapeHTML(help.responseTime)}</div>` : ''}
        </div>
      ` : ''}

      ${faqs.length > 0 ? `
        <div style="margin-top: 8px;">
          <h3 style="font-size: 15px; font-weight: 700; margin: 0 0 10px;">Troubleshooting & FAQs</h3>
          <div class="rcb-ppt-faq-accordion" style="display: flex; flex-direction: column; gap: 8px;">
            ${faqs.map(function(faq, idx) {
              return `
                <div class="rcb-ppt-faq-item" id="rcb-ppt-faq-${idx}">
                  <button type="button" class="rcb-ppt-faq-trigger" aria-expanded="false" aria-controls="rcb-ppt-faq-ans-${idx}">
                    <span>${escapeHTML(faq.question)}</span>
                    <svg class="rcb-ppt-faq-arrow" width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M16 22L6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z"/></svg>
                  </button>
                  <div class="rcb-ppt-faq-body" id="rcb-ppt-faq-ans-${idx}">${faq.answer || ''}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;

    container.querySelectorAll('.rcb-ppt-faq-trigger').forEach(function(trigger) {
      trigger.addEventListener('click', function() {
        var item = trigger.closest('.rcb-ppt-faq-item');
        var body = item.querySelector('.rcb-ppt-faq-body');
        var isExpanded = trigger.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
          trigger.setAttribute('aria-expanded', 'false');
          item.classList.remove('rcb-ppt-active');
          body.style.maxHeight = null;
        } else {
          trigger.setAttribute('aria-expanded', 'true');
          item.classList.add('rcb-ppt-active');
          body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createLauncher);
  } else {
    createLauncher();
  }

  // Restrained MutationObserver to re-attach if Rise SPA cleans the body
  var observer = new MutationObserver(function() {
    if (!document.getElementById('rcb-ppt-root')) {
      createLauncher();
    }
  });
  observer.observe(document.body, { childList: true });

})();
