/* ArtAround — Toast Notification System */
(function () {
  const ICONS = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  function ensureStylesheet() {
    if (document.getElementById('aa-toast-styles')) return;
    const link = document.createElement('link');
    link.id   = 'aa-toast-styles';
    link.rel  = 'stylesheet';
    link.href = '/marketplace/components/toast/toast.css';
    document.head.appendChild(link);
  }

  function ensureContainer() {
    ensureStylesheet();
    let c = document.getElementById('aa-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'aa-toast-container';
      c.setAttribute('aria-live', 'polite');
      c.setAttribute('aria-atomic', 'false');
      document.body.appendChild(c);
    }
    return c;
  }

  function show({ type = 'info', message = '', duration = 4500 }) {
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `aa-toast aa-toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    const iconWrap = document.createElement('span');
    iconWrap.className = 'aa-toast-icon';
    iconWrap.innerHTML = ICONS[type] || ICONS.info;

    const msgEl = document.createElement('span');
    msgEl.className = 'aa-toast-msg';
    msgEl.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'aa-toast-close';
    closeBtn.setAttribute('aria-label', 'Chiudi notifica');
    closeBtn.setAttribute('type', 'button');
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    toast.appendChild(iconWrap);
    toast.appendChild(msgEl);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('visible'));
    });

    const dismiss = () => {
      toast.classList.remove('visible');
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 250);
    };

    closeBtn.addEventListener('click', dismiss);
    if (duration > 0) setTimeout(dismiss, duration);
  }

  window.ArtToast = { show };
})();
