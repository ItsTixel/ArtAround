/* ArtAround — Toast Notification System */
(function () {
  const ICONS = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const COLORS = {
    success: { bg: '#F0FDF4', border: 'rgba(22,101,52,0.25)', text: '#166534', icon: '#166534' },
    error:   { bg: '#FEF2F2', border: 'rgba(185,28,28,0.25)',  text: '#B91C1C', icon: '#B91C1C' },
    warning: { bg: '#FFFBEB', border: 'rgba(146,64,14,0.25)',  text: '#92400E', icon: '#92400E' },
    info:    { bg: '#EFF6FF', border: 'rgba(30,64,175,0.25)',  text: '#1E40AF', icon: '#1E40AF' },
  };

  function ensureContainer() {
    let c = document.getElementById('aa-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'aa-toast-container';
      c.setAttribute('aria-live', 'polite');
      c.setAttribute('aria-atomic', 'false');
      Object.assign(c.style, {
        position: 'fixed',
        top: '88px',
        right: '16px',
        zIndex: '9500',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: 'min(360px, calc(100vw - 2rem))',
        pointerEvents: 'none',
      });
      document.body.appendChild(c);
    }
    return c;
  }

  function show({ type = 'info', message = '', duration = 4500 }) {
    const container = ensureContainer();
    const c = COLORS[type] || COLORS.info;
    const toast = document.createElement('div');

    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    Object.assign(toast.style, {
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${c.icon}`,
      borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      fontFamily: "var(--aa-font-sans, 'Inter', sans-serif)",
      fontSize: '0.875rem',
      color: c.text,
      pointerEvents: 'all',
      opacity: '0',
      transform: 'translateX(20px)',
      transition: 'opacity 200ms ease, transform 200ms ease',
      maxWidth: '100%',
    });

    const iconWrap = document.createElement('span');
    iconWrap.innerHTML = ICONS[type] || ICONS.info;
    iconWrap.style.flexShrink = '0';
    iconWrap.style.color = c.icon;
    iconWrap.style.marginTop = '1px';

    const msgEl = document.createElement('span');
    msgEl.style.flex = '1';
    msgEl.style.lineHeight = '1.5';
    msgEl.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Chiudi notifica');
    closeBtn.setAttribute('type', 'button');
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    Object.assign(closeBtn.style, {
      background: 'none', border: 'none', cursor: 'pointer',
      color: c.text, opacity: '0.7', padding: '2px',
      borderRadius: '4px', display: 'flex', flexShrink: '0',
      marginTop: '1px',
    });
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.opacity = '1'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.opacity = '0.7'; });

    toast.appendChild(iconWrap);
    toast.appendChild(msgEl);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    /* animate in */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      });
    });

    const dismiss = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    };

    closeBtn.addEventListener('click', dismiss);
    if (duration > 0) setTimeout(dismiss, duration);
  }

  window.ArtToast = { show };
})();
