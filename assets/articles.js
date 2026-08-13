// ============================================================
// VoxaNews — lettura e rendering degli articoli dal database
// ============================================================

const CATEGORY_LABELS = {
  politica: 'Politica',
  economia: 'Economia',
  tecnologia: 'Tecnologia',
  cultura: 'Cultura',
  sport: 'Sport',
  opinioni: 'Opinioni',
};

const FALLBACK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#E5E7EB"/></svg>';
const FALLBACK_IMG = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(FALLBACK_SVG);

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

async function fetchArticles({ category = null, limit = 20 } = {}) {
  let query = sb.from('articles').select('*').order('publish_at', { ascending: false });
  if (category) query = query.eq('category', category);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.error('Errore nel caricamento degli articoli:', error);
    return [];
  }
  return data || [];
}

function articleHref(article) {
  // Punta alla pagina pre-renderizzata (migliore per SEO e anteprime social).
  // Il prefisso cambia se ci troviamo già dentro la cartella /articoli/
  const prefix = window.location.pathname.includes('/articoli/') ? '' : 'articoli/';
  return `${prefix}${article.id}.html`;
}

function renderHeroHTML(article) {
  const img = article.image_url || FALLBACK_IMG;
  const href = articleHref(article);
  return `
    <a href="${href}" class="block img-zoom rounded-sm mb-6 lg:mb-8">
      <img src="${img}" alt="${escapeHtml(article.image_alt || article.title)}" class="w-full h-[320px] lg:h-[480px] object-cover">
    </a>
    <p class="text-[13px] font-semibold uppercase tracking-widest text-accent mb-3">${categoryLabel(article.category)}</p>
    <a href="${href}" class="block">
      <h1 class="font-serif text-3xl lg:text-[44px] leading-[1.15] font-bold text-ink title-hover transition-colors duration-300 hover:text-accent mb-4">
        ${escapeHtml(article.title)}
      </h1>
    </a>
    <p class="text-lg text-ink/70 leading-relaxed mb-5 max-w-2xl">${escapeHtml(article.excerpt || '')}</p>
    <div class="flex items-center gap-3 text-sm text-ink/60">
      <span class="font-medium text-ink/80">di ${escapeHtml(article.author)}</span>
      <span>·</span>
      <span>${article.read_minutes} min read</span>
    </div>
  `;
}

function renderSecondaryHTML(article) {
  const img = article.image_url || FALLBACK_IMG;
  const href = articleHref(article);
  const excerptHTML = article.excerpt
    ? `<p class="text-sm text-ink/60 leading-relaxed max-h-0 group-hover:max-h-24 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out mb-0 group-hover:mb-2">${escapeHtml(article.excerpt)}</p>`
    : '';
  return `
    <article class="group pb-8 border-b border-hairline last:border-0 last:pb-0">
      <a href="${href}" class="block img-zoom rounded-sm mb-4">
        <img src="${img}" alt="${escapeHtml(article.image_alt || article.title)}" class="w-full h-44 object-cover">
      </a>
      <p class="text-[12px] font-semibold uppercase tracking-widest text-accent mb-2">${categoryLabel(article.category)}</p>
      <a href="${href}">
        <h2 class="font-serif text-xl leading-snug font-semibold text-ink title-hover transition-colors duration-300 group-hover:text-accent mb-2">
          ${escapeHtml(article.title)}
        </h2>
      </a>
      ${excerptHTML}
      <div class="flex items-center gap-2 text-xs text-ink/60">
        <span class="font-medium text-ink/80">di ${escapeHtml(article.author)}</span>
        <span>·</span>
        <span>${article.read_minutes} min read</span>
      </div>
    </article>
  `;
}

function renderCardHTML(article) {
  const img = article.image_url || FALLBACK_IMG;
  const href = articleHref(article);
  const excerptHTML = article.excerpt
    ? `<p class="text-sm text-ink/60 leading-relaxed max-h-0 group-hover:max-h-24 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out mb-0 group-hover:mb-2">${escapeHtml(article.excerpt)}</p>`
    : '';
  return `
    <article class="card-group group">
      <a href="${href}" class="block img-zoom rounded-sm mb-4">
        <img src="${img}" alt="${escapeHtml(article.image_alt || article.title)}" class="w-full h-48 object-cover">
      </a>
      <p class="text-[11px] font-semibold uppercase tracking-widest text-accent mb-2">${categoryLabel(article.category)}</p>
      <a href="${href}">
        <h3 class="font-serif text-lg leading-snug font-semibold text-ink title-hover mb-2">${escapeHtml(article.title)}</h3>
      </a>
      ${excerptHTML}
      <div class="flex items-center gap-2 text-xs text-ink/60">
        <span class="font-medium text-ink/80">di ${escapeHtml(article.author)}</span>
        <span>·</span>
        <span>${article.read_minutes} min read</span>
      </div>
    </article>
  `;
}

function emptyStateHTML(message) {
  return `<p class="text-sm text-ink/50 col-span-full py-10">${escapeHtml(message)}</p>`;
}

// Homepage: ultimi articoli, un articolo "in evidenza" + due secondari + griglia
async function renderHome() {
  const heroContainer = document.getElementById('hero-container');
  const secondaryContainer = document.getElementById('secondary-container');
  const gridContainer = document.getElementById('grid-container');
  if (!heroContainer) return;

  const articles = await fetchArticles({ limit: 20 });

  if (!articles.length) {
    heroContainer.innerHTML = emptyStateHTML('Nessun articolo pubblicato per ora. Torna presto.');
    if (secondaryContainer) secondaryContainer.innerHTML = '';
    if (gridContainer) gridContainer.innerHTML = '';
    return;
  }

  const featuredIndex = articles.findIndex(a => a.featured);
  const hero = featuredIndex >= 0 ? articles[featuredIndex] : articles[0];
  const rest = articles.filter(a => a.id !== hero.id);
  const secondary = rest.slice(0, 2);
  const gridItems = rest.slice(2, 10);

  heroContainer.innerHTML = renderHeroHTML(hero);
  if (secondaryContainer) {
    secondaryContainer.innerHTML = secondary.length
      ? secondary.map(renderSecondaryHTML).join('')
      : '';
  }
  if (gridContainer) {
    gridContainer.innerHTML = gridItems.length
      ? gridItems.map(renderCardHTML).join('')
      : emptyStateHTML('Nessun altro articolo pubblicato per ora.');
  }
}

// ============================================================
// Commenti sugli articoli
// ============================================================

const CLIENT_BANNED_WORDS = [
  'stronzo', 'stronza', 'coglione', 'cogliona', 'idiota',
  'deficiente', 'merda', 'bastardo', 'bastarda', 'troia',
  'puttana', 'vaffanculo', 'cazzo', 'cazzata', 'minchia',
  'scemo', 'scema', 'imbecille', 'rincoglionito',
];

function containsBannedWords(text) {
  const lowered = text.toLowerCase();
  return CLIENT_BANNED_WORDS.some((word) => lowered.includes(word));
}

async function fetchComments(articleId) {
  const { data, error } = await sb
    .from('comments')
    .select('*')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Errore nel caricamento dei commenti:', error);
    return [];
  }
  return data || [];
}

function renderCommentHTML(comment, currentUserId, isAdmin) {
  const canDelete = currentUserId === comment.user_id || isAdmin;
  const date = new Date(comment.created_at).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `
    <div class="py-5 border-b border-hairline" data-comment-id="${comment.id}">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm font-semibold text-ink">${escapeHtml(comment.author_name)}</p>
        <div class="flex items-center gap-3">
          <p class="text-xs text-ink/40">${date}</p>
          ${canDelete ? `<button class="delete-comment-btn text-xs text-accent/70 hover:text-accent transition-colors duration-300" data-comment-id="${comment.id}">Elimina</button>` : ''}
        </div>
      </div>
      <p class="text-sm text-ink/80 leading-relaxed">${escapeHtml(comment.content)}</p>
    </div>
  `;
}

async function renderCommentsSection(articleId) {
  const container = document.getElementById('comments-container');
  if (!container) return;

  const auth = await getAuthState();
  const { data: adminRow } = auth.loggedIn
    ? await sb.from('admins').select('user_id').eq('user_id', (await sb.auth.getUser()).data.user.id).maybeSingle()
    : { data: null };
  const isAdmin = !!adminRow;
  const currentUserId = auth.loggedIn ? (await sb.auth.getUser()).data.user.id : null;

  const comments = await fetchComments(articleId);

  const formHTML = auth.loggedIn
    ? `
      <form id="comment-form" class="mb-8" novalidate>
        <textarea id="comment-content" rows="3" required placeholder="Scrivi un commento..."
                  class="w-full border border-hairline bg-white px-4 py-3 text-sm rounded-sm focus:outline-none focus:border-accent transition-colors duration-300 mb-3"></textarea>
        <p id="comment-error" class="text-sm text-accent hidden mb-3"></p>
        <button type="submit" class="bg-ink text-white text-sm font-semibold px-6 py-3 rounded-sm hover:bg-accent transition-colors duration-300">Pubblica commento</button>
      </form>
    `
    : `<p class="text-sm text-ink/60 mb-8"><a href="login.html" class="text-accent hover:text-ink underline transition-colors duration-300">Accedi</a> per lasciare un commento.</p>`;

  const commentsHTML = comments.length
    ? comments.map((c) => renderCommentHTML(c, currentUserId, isAdmin)).join('')
    : `<p class="text-sm text-ink/40">Nessun commento ancora. Sii il primo a scrivere il tuo.</p>`;

  container.innerHTML = `
    <h2 class="font-serif text-2xl font-bold text-ink mb-6">Commenti</h2>
    ${formHTML}
    <div id="comments-list">${commentsHTML}</div>
  `;

  const form = document.getElementById('comment-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textarea = document.getElementById('comment-content');
      const errorEl = document.getElementById('comment-error');
      const content = textarea.value.trim();
      errorEl.classList.add('hidden');

      if (!content) return;

      if (containsBannedWords(content)) {
        errorEl.textContent = 'Il commento contiene linguaggio non consentito. Modifica il testo e riprova.';
        errorEl.classList.remove('hidden');
        return;
      }

      const { data: { user } } = await sb.auth.getUser();
      const displayName = (user.user_metadata && user.user_metadata.full_name) || user.email;

      const { error } = await sb.from('comments').insert({
        article_id: articleId,
        user_id: user.id,
        author_name: displayName,
        content,
      });

      if (error) {
        errorEl.textContent = error.message.includes('non consentito')
          ? error.message
          : 'Non è stato possibile pubblicare il commento. Riprova.';
        errorEl.classList.remove('hidden');
        return;
      }

      textarea.value = '';
      renderCommentsSection(articleId);
    });
  }

  container.querySelectorAll('.delete-comment-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Eliminare questo commento?')) return;
      const { error } = await sb.from('comments').delete().eq('id', btn.dataset.commentId);
      if (!error) renderCommentsSection(articleId);
    });
  });
}

// Pagina di dettaglio: un singolo articolo per id
async function fetchArticleById(id) {
  const { data, error } = await sb.from('articles').select('*').eq('id', id).single();
  if (error) {
    console.error('Errore nel caricamento dell\'articolo:', error);
    return null;
  }
  return data;
}

function renderBodyParagraphs(content) {
  if (!content) return '';

  const applyInlineBold = (text) => text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      if (p.startsWith('## ')) {
        const heading = escapeHtml(p.slice(3).trim());
        return `<h3 class="font-serif text-xl font-bold text-ink mt-10 mb-4">${heading}</h3>`;
      }
      const escaped = escapeHtml(p);
      return `<p class="mb-6">${applyInlineBold(escaped)}</p>`;
    })
    .join('');
}

async function renderArticlePage() {
  const container = document.getElementById('article-container');
  if (!container) return;

  // L'id può arrivare dalla query string (?id=...) oppure dal nome
  // del file nelle pagine pre-renderizzate (/articoli/<id>.html)
  const params = new URLSearchParams(window.location.search);
  let id = params.get('id');

  if (!id) {
    const match = window.location.pathname.match(/\/articoli\/([^/]+)\.html$/);
    if (match) id = match[1];
  }

  // Se la pagina è già pre-renderizzata, il contenuto c'è: carica solo i commenti
  const alreadyRendered = !container.textContent.includes('Caricamento');
  if (alreadyRendered && id) {
    renderCommentsSection(id);
    return;
  }

  if (!id) {
    container.innerHTML = emptyStateHTML('Articolo non trovato.');
    document.title = 'Articolo non trovato — VoxaNews';
    return;
  }

  const article = await fetchArticleById(id);

  if (!article) {
    container.innerHTML = emptyStateHTML('Questo articolo non esiste più o è stato rimosso.');
    document.title = 'Articolo non trovato — VoxaNews';
    return;
  }

  document.title = `${article.title} — VoxaNews`;
  const setMeta = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', value);
  };
  setMeta('meta[property="og:title"]', article.title);
  setMeta('meta[name="twitter:title"]', article.title);
  if (article.excerpt) {
    setMeta('meta[name="description"]', article.excerpt);
    setMeta('meta[property="og:description"]', article.excerpt);
    setMeta('meta[name="twitter:description"]', article.excerpt);
  }
  if (article.image_url) {
    setMeta('meta[property="og:image"]', article.image_url);
  }

  const img = article.image_url || FALLBACK_IMG;
  const bodyHTML = article.content
    ? renderBodyParagraphs(article.content)
    : `<p class="text-ink/70">${escapeHtml(article.excerpt || '')}</p>`;

  container.innerHTML = `
    <p class="text-[13px] font-semibold uppercase tracking-widest text-accent mb-3">
      <a href="${article.category}.html" class="hover:text-ink transition-colors duration-300">${categoryLabel(article.category)}</a>
    </p>
    <h1 class="font-serif text-3xl lg:text-[42px] leading-[1.15] font-bold text-ink mb-5">${escapeHtml(article.title)}</h1>
    <div class="flex items-center gap-3 text-sm text-ink/60 mb-8">
      <span class="font-medium text-ink/80">di ${escapeHtml(article.author)}</span>
      <span>·</span>
      <span>${article.read_minutes} min read</span>
    </div>
    <img src="${img}" alt="${escapeHtml(article.image_alt || article.title)}" class="w-full h-[280px] lg:h-[440px] object-cover rounded-sm mb-10">
    <div class="prose-article text-lg text-ink/80 leading-relaxed max-w-2xl">
      ${bodyHTML}
    </div>
  `;

  renderCommentsSection(article.id);
}

// Pagine di sezione: tutti gli articoli di una categoria
async function renderCategory(categoryKey) {
  const gridContainer = document.getElementById('grid-container');
  if (!gridContainer) return;
  gridContainer.innerHTML = emptyStateHTML('Caricamento articoli…');
  const articles = await fetchArticles({ category: categoryKey, limit: 24 });
  gridContainer.innerHTML = articles.length
    ? articles.map(renderCardHTML).join('')
    : emptyStateHTML('Nessun articolo pubblicato in questa sezione per ora.');
}
