// ============================================================
// VoxaNews — script condiviso di layout e autenticazione
// L'accesso è reale (Supabase Auth): la sessione persiste da sola
// nel browser, non serve più portarla dietro nei link.
// ============================================================

const NAV_ITEMS = [
  { key: 'politica', label: 'Politica', href: 'politica.html' },
  { key: 'economia', label: 'Economia', href: 'economia.html' },
  { key: 'tecnologia', label: 'Tecnologia', href: 'tecnologia.html' },
  { key: 'cultura', label: 'Cultura', href: 'cultura.html' },
  { key: 'sport', label: 'Sport', href: 'sport.html' },
  { key: 'opinioni', label: 'Opinioni', href: 'opinioni.html' },
];

async function getAuthState() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { loggedIn: false };
  const user = session.user;
  const displayName = (user.user_metadata && user.user_metadata.full_name) || user.email;
  return { loggedIn: true, email: user.email, displayName };
}

function buildHeaderHTML(activeKey, auth) {
  const navLinksDesktop = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="nav-link ${item.key === activeKey ? 'active' : ''} hover:text-accent transition-colors duration-300">${item.label}</a>
  `).join('');

  const navLinksMobile = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="nav-link ${item.key === activeKey ? 'active' : ''} hover:text-accent">${item.label}</a>
  `).join('');

  let authDesktop, authMobile;
  if (auth.loggedIn) {
    authDesktop = `
      <span class="text-sm text-ink/70">Ciao, <span class="font-medium text-ink">${auth.displayName}</span></span>
      <a href="account.html" class="text-sm font-medium text-ink/70 hover:text-accent transition-colors duration-300">Il mio account</a>
      <button id="logout-btn" class="text-sm font-semibold bg-ink text-white px-5 py-2.5 rounded-sm hover:bg-accent transition-colors duration-300">Esci</button>
    `;
    authMobile = `
      <div class="flex flex-col gap-3 pt-4 border-t border-hairline mt-2 normal-case">
        <span class="text-sm text-ink/70">Ciao, <span class="font-medium text-ink">${auth.displayName}</span></span>
        <a href="account.html" class="font-medium text-ink/70">Il mio account</a>
        <button id="logout-btn-mobile" class="font-semibold bg-ink text-white px-5 py-2.5 rounded-sm text-center">Esci</button>
      </div>
    `;
  } else {
    authDesktop = `
      <a href="login.html" class="text-sm font-semibold bg-ink text-white px-5 py-2.5 rounded-sm hover:bg-accent transition-colors duration-300">Accedi</a>
    `;
    authMobile = `
      <div class="pt-4 border-t border-hairline mt-2 normal-case">
        <a href="login.html" class="block font-semibold bg-ink text-white px-5 py-2.5 rounded-sm text-center">Accedi</a>
      </div>
    `;
  }

  return `
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        <a href="index.html" class="font-serif text-2xl lg:text-[28px] font-bold tracking-tight text-ink shrink-0">VoxaNews</a>
        <nav class="hidden lg:flex items-center gap-10 text-[13px] font-medium uppercase tracking-wide text-ink/80">
          ${navLinksDesktop}
        </nav>
        <div class="hidden lg:flex items-center gap-5">
          ${authDesktop}
        </div>
        <button id="menu-toggle" aria-label="Apri menu" aria-expanded="false" class="lg:hidden p-2 -mr-2 text-ink">
          <svg id="icon-open" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
          <svg id="icon-close" class="w-6 h-6 hidden" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    <div id="mobile-menu" class="lg:hidden overflow-hidden max-h-0 opacity-0 border-t border-hairline">
      <nav class="flex flex-col px-6 py-4 gap-4 text-sm font-medium uppercase tracking-wide text-ink/80">
        ${navLinksMobile}
        ${authMobile}
      </nav>
    </div>
  `;
}

function buildFooterHTML(auth) {
  const newsletterBlock = auth.loggedIn
    ? `<p class="text-ink/70 text-sm max-w-md">Sei registrato con <span class="font-medium text-ink">${auth.email}</span>: riceverai una email a ogni nuovo articolo pubblicato.</p>`
    : `
      <div>
        <h3 class="font-serif text-2xl font-bold text-ink mb-2">Resta informato</h3>
        <p class="text-ink/60 text-sm max-w-md mb-4">Registrati per ricevere una email ogni volta che pubblichiamo un nuovo articolo.</p>
        <a href="login.html" class="inline-block bg-ink text-white text-sm font-semibold px-6 py-3 rounded-sm hover:bg-accent transition-colors duration-300">Registrati</a>
      </div>
    `;

  return `
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-16">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-12 mb-12 border-b border-hairline">
        ${newsletterBlock}
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-widest text-ink/50 mb-4">Sezioni</h4>
          <ul class="space-y-3 text-sm text-ink/70">
            <li><a href="politica.html" class="hover:text-accent transition-colors duration-300">Politica</a></li>
            <li><a href="economia.html" class="hover:text-accent transition-colors duration-300">Economia</a></li>
            <li><a href="tecnologia.html" class="hover:text-accent transition-colors duration-300">Tecnologia</a></li>
            <li><a href="cultura.html" class="hover:text-accent transition-colors duration-300">Cultura</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-widest text-ink/50 mb-4">Altre sezioni</h4>
          <ul class="space-y-3 text-sm text-ink/70">
            <li><a href="sport.html" class="hover:text-accent transition-colors duration-300">Sport</a></li>
            <li><a href="opinioni.html" class="hover:text-accent transition-colors duration-300">Opinioni</a></li>
            <li><a href="index.html" class="hover:text-accent transition-colors duration-300">Home</a></li>
            <li><a href="#" class="hover:text-accent transition-colors duration-300">Redazione</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-widest text-ink/50 mb-4">Il giornale</h4>
          <ul class="space-y-3 text-sm text-ink/70">
            <li><a href="chi-siamo.html" class="hover:text-accent transition-colors duration-300">Chi siamo</a></li>
            <li><a href="lavora-con-noi.html" class="hover:text-accent transition-colors duration-300">Lavora con noi</a></li>
            <li><a href="contatti.html" class="hover:text-accent transition-colors duration-300">Contatti</a></li>
            <li><a href="admin.html" class="hover:text-accent transition-colors duration-300">Accesso redazione</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-widest text-ink/50 mb-4">Legale</h4>
          <ul class="space-y-3 text-sm text-ink/70">
            <li><a href="privacy.html" class="hover:text-accent transition-colors duration-300">Privacy policy</a></li>
            <li><a href="cookie.html" class="hover:text-accent transition-colors duration-300">Cookie policy</a></li>
            <li><a href="termini.html" class="hover:text-accent transition-colors duration-300">Termini di servizio</a></li>
          </ul>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-hairline">
        <p class="font-serif text-lg font-bold text-ink">VoxaNews</p>
        <p class="text-xs text-ink/50">© 2026 VoxaNews. Tutti i diritti riservati.</p>
      </div>
    </div>
  `;
}

function wireMobileMenu() {
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const iconOpen = document.getElementById('icon-open');
  const iconClose = document.getElementById('icon-close');
  let menuOpen = false;

  menuToggle.addEventListener('click', () => {
    menuOpen = !menuOpen;
    menuToggle.setAttribute('aria-expanded', menuOpen);
    if (menuOpen) {
      mobileMenu.style.maxHeight = mobileMenu.scrollHeight + 'px';
      mobileMenu.style.opacity = '1';
      iconOpen.classList.add('hidden');
      iconClose.classList.remove('hidden');
    } else {
      mobileMenu.style.maxHeight = '0px';
      mobileMenu.style.opacity = '0';
      iconOpen.classList.remove('hidden');
      iconClose.classList.add('hidden');
    }
  });
}

function wireStickyHeader() {
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
  });
}

function wireLogoutButtons() {
  ['logout-btn', 'logout-btn-mobile'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await sb.auth.signOut();
      window.location.href = 'index.html';
    });
  });
}

// Punto di ingresso: da chiamare in ogni pagina passando la sezione attiva
async function initLayout(activeKey) {
  const auth = await getAuthState();
  const headerEl = document.getElementById('header-placeholder');
  const footerEl = document.getElementById('footer-placeholder');
  if (headerEl) headerEl.innerHTML = buildHeaderHTML(activeKey, auth);
  if (footerEl) footerEl.innerHTML = buildFooterHTML(auth);
  wireMobileMenu();
  wireStickyHeader();
  wireLogoutButtons();
  window.SITE_AUTH = auth;
  document.dispatchEvent(new CustomEvent('voxanews:ready', { detail: auth }));
}
