import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_NAME, FREE_ITEM_LIMIT, GOOGLE_OAUTH_ENABLED } from './config.js';
import { categories, freshItems, foodItems, promoItems, quickActions, profileMenus } from './data.js';

const root = document.getElementById('root');
const modalHost = document.getElementById('modalHost');
const bottomNav = document.getElementById('bottomNav');
const notifyIconBtn = document.getElementById('notifyIconBtn');

const state = {
  ready: false,
  authMode: 'login',
  nav: 'home',
  view: 'auth',
  category: 'fresh',
  query: '',
  catalogFilter: 'all',
  catalogSort: 'default',
  modal: null,
  session: null,
  profile: null,
  items: [],
  toastTimer: null,
  formData: null,
  editedId: null,
  rememberedEmail: localStorage.getItem('freshnote_email') || '',
  rememberMe: true,
  loading: false,
  setupMissing: !SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('PASTE_') || SUPABASE_ANON_KEY.includes('PASTE_'),
  notifiedKeys: new Set(),
};

const demoAuthDisabled = state.setupMissing;
const supabase = demoAuthDisabled ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

function $(selector, scope = document) {
  return scope.querySelector(selector);
}

function escapeHTML(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function daysLeft(dateStr) {
  if (!dateStr) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target - now) / 86400000);
}

function statusOf(item) {
  const remaining = daysLeft(item.expiry_date);
  if (remaining < 0) return { key: 'expired', label: `Sudah expired ${Math.abs(remaining)} hari`, tone: 'danger' };
  if (remaining <= Number(item.reminder_days || 3)) return { key: 'soon', label: `Mau habis ${remaining} hari lagi`, tone: 'warn' };
  return { key: 'safe', label: `Aman ${remaining} hari lagi`, tone: 'success' };
}

function avatarLetter(name = '') {
  return String(name || 'F').trim().slice(0, 1).toUpperCase();
}

function itemEmoji(item) {
  const map = {
    fresh: '🌿',
    food: '🍗',
    promo: '🔥',
    Makanan: '🍱',
    'Minuman': '🥤',
    'Obat': '💊',
    'Kosmetik': '🧴',
    'Rumah Tangga': '🧽',
    'Lainnya': '📦',
  };
  return item.icon || map[item.category] || '📦';
}

function itemImage(item) {
  if (item.image_data) return `<img src="${item.image_data}" alt="${escapeHTML(item.title)}" />`;
  return `<div class="emoji">${escapeHTML(itemEmoji(item))}</div>`;
}

function getAllCatalog() {
  return [...freshItems.map((x) => ({ ...x, categoryKey: 'fresh' })), ...foodItems.map((x) => ({ ...x, categoryKey: 'food' }))];
}

function getCatalogByTab(tab) {
  return tab === 'food' ? foodItems : freshItems;
}

function getCatalogMatches(query = '', tab = 'fresh') {
  const data = tab === 'all' ? getAllCatalog() : getCatalogByTab(tab);
  const q = query.trim().toLowerCase();
  return data.filter((item) => !q || `${item.name} ${item.desc} ${item.shelfLife}`.toLowerCase().includes(q));
}

function countByStatus(items) {
  return {
    all: items.length,
    soon: items.filter((x) => statusOf(x).key === 'soon').length,
    expired: items.filter((x) => statusOf(x).key === 'expired').length,
    safe: items.filter((x) => statusOf(x).key === 'safe').length,
  };
}

function sortItems(items) {
  const arr = [...items];
  if (state.catalogSort === 'soonest') {
    arr.sort((a, b) => daysLeft(a.expiry_date) - daysLeft(b.expiry_date));
  } else if (state.catalogSort === 'oldest') {
    arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (state.catalogSort === 'newest') {
    arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return arr;
}

function filteredSavedItems() {
  let list = [...state.items];
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter((item) => `${item.title} ${item.category} ${item.notes || ''}`.toLowerCase().includes(q));
  }
  if (state.catalogFilter === 'soon') list = list.filter((x) => statusOf(x).key === 'soon');
  if (state.catalogFilter === 'expired') list = list.filter((x) => statusOf(x).key === 'expired');
  if (state.catalogFilter === 'safe') list = list.filter((x) => statusOf(x).key === 'safe');
  return sortItems(list);
}

function showToast(title, message) {
  clearTimeout(state.toastTimer);
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span>`;
  toast.style.display = 'block';
  state.toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 2800);
}

function openModal(html, className = '') {
  modalHost.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal ${className}" role="dialog" aria-modal="true" data-stop>
        ${html}
      </div>
    </div>
  `;
}

function closeModal() {
  modalHost.innerHTML = '';
  state.modal = null;
  state.formData = null;
  state.editedId = null;
}

function renderAuth() {
  const register = state.authMode === 'register';
  root.innerHTML = `
    <section class="auth-screen">
      <div class="auth-card">
        <img class="auth-logo" src="assets/logo.png" alt="FreshNote" />
        <h1>FreshNote</h1>
        <p class="sub">Kelola bahan, pantau masa habis, dan simpan data per akun.</p>

        <div class="screen-card" style="padding:14px; text-align:left;">
          <div class="chip-row" style="margin-bottom: 14px;">
            <button class="chip ${!register ? 'active' : ''}" data-auth-tab="login">Masuk</button>
            <button class="chip ${register ? 'active' : ''}" data-auth-tab="register">Daftar</button>
          </div>

          <form id="authForm" class="auth-form">
            ${register ? `
              <div class="field">
                <label>Nama</label>
                <input class="input" name="full_name" placeholder="Nama kamu" value="${escapeHTML(state.profile?.full_name || '')}" required>
              </div>
            ` : ''}
            <div class="field">
              <label>Email</label>
              <input class="input" type="email" name="email" placeholder="nama@email.com" value="${escapeHTML(state.rememberedEmail)}" required>
            </div>
            <div class="field">
              <label>Password</label>
              <input class="input" type="password" name="password" placeholder="Minimal 6 karakter" required>
            </div>
            <label class="checkbox-row"><input type="checkbox" name="remember" ${state.rememberMe ? 'checked' : ''}> Remember me</label>
            <button class="btn primary full" type="submit">${register ? 'Daftar' : 'Login'}</button>
          </form>

          <div class="oauth-row" style="margin-top: 12px;">
            <button class="oauth-btn" id="googleLoginBtn" ${GOOGLE_OAUTH_ENABLED ? '' : 'disabled title="Google OAuth belum diaktifkan"'}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
              <span>Google</span>
            </button>
          </div>

          <div class="auth-toggle">
            ${register ? 'Sudah punya akun?' : 'Belum punya akun?'}
            <button type="button" data-switch-auth>${register ? 'Masuk sekarang' : 'Daftar sekarang'}</button>
          </div>
        </div>

        <div class="notice ${state.setupMissing ? 'danger' : 'warn'}" style="margin-top:12px; text-align:left;">
          ${state.setupMissing ? 'Koneksi Supabase belum diisi. Tempel URL dan anon key dulu di js/config.js.' : 'Kalau signup masih minta verifikasi email, matikan Confirm email di Supabase Authentication atau atur SMTP/redirect URL.'}
        </div>
      </div>
    </section>
  `;
}

function renderHome() {
  const counts = countByStatus(state.items);
  const featuredFresh = getCatalogMatches(state.query, state.category).slice(0, 4);
  const featuredFood = foodItems.slice(0, 4);

  root.innerHTML = `
    <div class="view">
      <div class="search-row">
        <div class="search-box">
          <span class="search-ico">⌕</span>
          <input id="searchInput" placeholder="Cari bahan..." value="${escapeHTML(state.query)}" />
        </div>
        <button class="search-filter" id="filterBtn" aria-label="Filter">☰</button>
      </div>

      <div class="screen-card hero-card">
        <div class="quick-row">
          <div class="quick-chip"><span>🚚</span><span>${quickActions[0].label}</span></div>
          <button class="area-chip" id="areaBtn">${quickActions[1].label} <span>↓</span></button>
        </div>
      </div>

      <div class="promo-banner">
        <img src="assets/promo1.png" alt="Promo FreshNote" />
      </div>

      <div class="section">
        <div class="section-head">
          <div class="section-title"><span class="icon">🌿</span><span>Kategori Bahan-Bahan Segar</span></div>
          <button class="link-btn" data-open-catalog="fresh">Lihat Semua</button>
        </div>
        <div class="horizontal-list">
          <div class="food-card big-add-card" data-open-form="fresh">
            <div class="plus">+</div>
          </div>
          ${featuredFresh.map(renderCatalogThumb).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <div class="section-title"><span class="icon">🍱</span><span>Kategori Bahan Makanan & Minuman</span></div>
          <button class="link-btn" data-open-catalog="food">Lihat Semua</button>
        </div>
        <div class="horizontal-list">
          <div class="food-card big-add-card" data-open-form="food"><div class="plus">+</div></div>
          ${featuredFood.map(renderCatalogThumb).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <div class="section-title"><span class="icon">🔥</span><span>Promosi Minggu Ini</span></div>
          <button class="link-btn" data-open-promo>Ubah Filter</button>
        </div>
        <div class="horizontal-list" style="grid-auto-columns: 132px;">
          ${promoItems.map(renderPromoCard).join('')}
        </div>
      </div>

      <div class="screen-card summary-card">
        <div class="section-title"><span class="icon">⌛</span><span>Ringkasan Pengingat</span></div>
        <div class="summary-grid">
          <div class="mini-stat"><strong>${counts.safe}</strong><span>Aman</span></div>
          <div class="mini-stat"><strong>${counts.soon}</strong><span>Mau habis</span></div>
          <div class="mini-stat"><strong>${counts.expired}</strong><span>Expired</span></div>
        </div>
        <div class="actions-bar">
          <button class="btn primary small" data-open-reminder>Tambah pengingat</button>
          <button class="btn secondary small" data-open-saved>Daftar saya</button>
        </div>
      </div>
    </div>
  `;
}

function renderSaved() {
  const items = filteredSavedItems();
  const counts = countByStatus(state.items);
  root.innerHTML = `
    <div class="view">
      <div class="page-title">
        <button class="back-btn" data-back="home">←</button>
        <div>
          <h2>Pengingat Saya</h2>
          <p>${state.profile?.plan === 'premium' ? 'Unlimited reminder aktif.' : `Free plan dibatasi ${FREE_ITEM_LIMIT} item.`}</p>
        </div>
      </div>

      <div class="filter-row">
        <button class="chip ${state.catalogFilter === 'all' ? 'active' : ''}" data-saved-filter="all">Semua (${counts.all})</button>
        <button class="chip ${state.catalogFilter === 'safe' ? 'active' : ''}" data-saved-filter="safe">Aman (${counts.safe})</button>
        <button class="chip ${state.catalogFilter === 'soon' ? 'active' : ''}" data-saved-filter="soon">Mau habis (${counts.soon})</button>
        <button class="chip ${state.catalogFilter === 'expired' ? 'active' : ''}" data-saved-filter="expired">Expired (${counts.expired})</button>
      </div>

      <div class="notice ${state.profile?.plan === 'premium' ? '' : 'warn'}">
        ${state.profile?.plan === 'premium' ? 'Fitur premium aktif: item tak terbatas, ekspor CSV, dan notifikasi browser.' : 'Plan free hanya menampung 8 item. Ubah kolom plan di Supabase jika ingin premium.'}
      </div>

      <div class="saved-list" style="margin-top:12px;">
        ${items.length ? items.map(renderSavedCard).join('') : `<div class="screen-card" style="padding:14px; text-align:center; color: var(--muted);">Belum ada pengingat. Tambahkan dari tombol + atau dari katalog.</div>`}
      </div>
    </div>
  `;
}

function renderProfile() {
  const initials = avatarLetter(state.profile?.full_name || state.session?.user?.email || 'F');
  const plan = state.profile?.plan || 'free';
  root.innerHTML = `
    <div class="view">
      <div class="page-title">
        <button class="back-btn" data-back="home">←</button>
        <div>
          <h2>Profil Saya</h2>
          <p>Atur akun dan status langganan.</p>
        </div>
      </div>

      <div class="profile-card">
        <div class="profile-head">
          <div class="avatar">${escapeHTML(initials)}</div>
          <div>
            <p class="profile-name">${escapeHTML(state.profile?.full_name || 'Pengguna FreshNote')}</p>
            <div class="profile-email">${escapeHTML(state.session?.user?.email || '-')}</div>
          </div>
        </div>

        <div class="profile-section">
          <div class="section-title"><span class="icon">◉</span><span>Status Akun</span></div>
          <div class="saved-chip-row">
            <span class="pill ${plan === 'premium' ? 'success' : 'warn'}">${plan.toUpperCase()}</span>
            <span class="pill">${state.items.length}/${plan === 'premium' ? '∞' : FREE_ITEM_LIMIT} item</span>
          </div>
        </div>

        <div class="profile-section">
          <div class="section-title"><span class="icon">⚙</span><span>Pengaturan</span></div>
          <div class="profile-list">
            ${profileMenus.map((group) => `
              <div>
                <div style="font-size:12px;font-weight:700;margin:6px 0 8px;">${escapeHTML(group.section)}</div>
                ${group.items.map((label) => `<div class="menu-row"><div class="left"><span class="ico">•</span><span>${escapeHTML(label)}</span></div><span>›</span></div>`).join('')}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="actions-bar">
          <button class="btn primary small" data-open-reminder>Tambah pengingat</button>
          <button class="btn secondary small" id="exportCsvBtn">Export CSV</button>
          <button class="btn ghost small" id="logoutBtn">Keluar</button>
        </div>
      </div>

      <div class="notice ${plan === 'premium' ? '' : 'warn'}" style="margin-top:12px;">
        ${plan === 'premium'
          ? 'Premium: unlimited item, urutkan yang paling cepat habis, dan notifikasi browser.'
          : 'Untuk premium, ubah data plan user di tabel profiles dari free menjadi premium.'}
      </div>
    </div>
  `;
}

function renderCatalogView() {
  const tab = state.category;
  const list = getCatalogMatches(state.query, tab);
  root.innerHTML = `
    <div class="view">
      <div class="page-title">
        <button class="back-btn" data-back="home">←</button>
        <div>
          <h2>${escapeHTML(categories.find((c) => c.key === tab)?.label || 'Semua Kategori')}</h2>
          <p>Klik kartu untuk melihat detail atau tambah pengingat.</p>
        </div>
      </div>

      <div class="chip-row" style="margin-bottom:10px;">
        <button class="chip ${tab === 'fresh' ? 'active' : ''}" data-category-tab="fresh">Bahan Segar</button>
        <button class="chip ${tab === 'food' ? 'active' : ''}" data-category-tab="food">Makanan & Minuman</button>
        <button class="chip ${tab === 'all' ? 'active' : ''}" data-category-tab="all">Semua</button>
      </div>

      <div class="filter-row">
        <button class="chip ${state.catalogFilter === 'all' ? 'active' : ''}" data-saved-filter="all">Semua</button>
        <button class="chip ${state.catalogFilter === 'safe' ? 'active' : ''}" data-saved-filter="safe">Aman</button>
        <button class="chip ${state.catalogFilter === 'soon' ? 'active' : ''}" data-saved-filter="soon">Mau Habis</button>
        <button class="chip ${state.catalogFilter === 'expired' ? 'active' : ''}" data-saved-filter="expired">Expired</button>
      </div>

      <div class="catalog-grid">
        ${list.map(renderCatalogCard).join('')}
      </div>
    </div>
  `;
}

function renderHomePage() {
  const summary = countByStatus(state.items);
  const soon = filteredSavedItems().filter((x) => statusOf(x).key === 'soon').slice(0, 3);
  root.innerHTML = `
    <div class="view">
      <div class="search-row">
        <div class="search-box">
          <span class="search-ico">⌕</span>
          <input id="searchInput" placeholder="Cari bahan..." value="${escapeHTML(state.query)}" />
        </div>
        <button class="search-filter" id="filterBtn">☰</button>
      </div>

      <div class="screen-card hero-card">
        <div class="quick-row">
          <div class="quick-chip">${quickActions[0].icon} ${escapeHTML(quickActions[0].label)}</div>
          <button class="area-chip" id="areaBtn">${escapeHTML(quickActions[1].label)} <span>↓</span></button>
        </div>
      </div>

      <div class="promo-banner"><img src="assets/promo1.png" alt="Promo FreshNote"></div>

      <div class="section">
        <div class="section-head">
          <div class="section-title"><span class="icon">🌿</span><span>Kategori Bahan-Bahan Segar</span></div>
          <button class="link-btn" data-open-catalog="fresh">Lihat Semua</button>
        </div>
        <div class="horizontal-list">
          <div class="food-card big-add-card" data-open-form="fresh"><div class="plus">+</div></div>
          ${freshItems.slice(0, 4).map(renderCatalogThumb).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <div class="section-title"><span class="icon">🍱</span><span>Kategori Bahan Makanan & Minuman</span></div>
          <button class="link-btn" data-open-catalog="food">Lihat Semua</button>
        </div>
        <div class="horizontal-list">
          <div class="food-card big-add-card" data-open-form="food"><div class="plus">+</div></div>
          ${foodItems.slice(0, 4).map(renderCatalogThumb).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <div class="section-title"><span class="icon">🔥</span><span>Promosi Minggu Ini</span></div>
          <button class="link-btn" data-open-promo>Ubah Filter</button>
        </div>
        <div class="horizontal-list" style="grid-auto-columns: 132px;">
          ${promoItems.map(renderPromoCard).join('')}
        </div>
      </div>

      <div class="screen-card summary-card">
        <div class="section-title"><span class="icon">⌛</span><span>Pengingat Cepat</span></div>
        <div class="summary-grid">
          <div class="mini-stat"><strong>${summary.safe}</strong><span>Aman</span></div>
          <div class="mini-stat"><strong>${summary.soon}</strong><span>Mau habis</span></div>
          <div class="mini-stat"><strong>${summary.expired}</strong><span>Expired</span></div>
        </div>
        <div class="notice ${state.profile?.plan === 'premium' ? '' : 'warn'}" style="margin-top:12px;">
          ${state.profile?.plan === 'premium'
            ? 'Premium aktif. Kamu bisa menyimpan lebih banyak item dan mengaktifkan notifikasi browser.'
            : `Free plan aktif. Batas penyimpanan ${FREE_ITEM_LIMIT} item.`}
        </div>
        ${soon.length ? `<div class="saved-chip-row" style="margin-top:12px;">${soon.map((item) => `<span class="pill warn">${escapeHTML(item.title)} • ${escapeHTML(statusOf(item).label)}</span>`).join('')}</div>` : ''}
        <div class="actions-bar">
          <button class="btn primary small" data-open-reminder>Buat pengingat</button>
          <button class="btn secondary small" data-open-saved>Lihat daftar</button>
        </div>
      </div>
    </div>
  `;
}

function renderCatalogThumb(item) {
  return `
    <button class="food-card" data-open-detail="${escapeHTML(item.id)}" title="${escapeHTML(item.name)}">
      <div class="food-thumb">${escapeHTML(item.icon)}</div>
      <p class="food-title">${escapeHTML(item.name)}</p>
      <div class="food-sub">Masa berlaku</div>
      <div class="food-sub" style="font-weight:700; color:#1f2a2e; margin-top:2px;">${escapeHTML(item.shelfLife)}</div>
      <div class="food-action">+</div>
    </button>
  `;
}

function renderPromoCard(item) {
  return `
    <div class="promo-card" data-open-promo-detail="${escapeHTML(item.id)}">
      <img class="promo-image" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}">
      <div class="promo-body">
        <div class="promo-badge">${escapeHTML(item.badge)}</div>
        <p class="promo-title">${escapeHTML(item.title)}</p>
        <p class="promo-sub">${escapeHTML(item.subtitle)}</p>
      </div>
    </div>
  `;
}

function renderCatalogCard(item) {
  const status = item.status ? statusOf(item) : null;
  return `
    <article class="catalog-card" data-open-detail="${escapeHTML(item.id)}">
      <div class="catalog-hero">
        ${item.image ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}">` : escapeHTML(item.icon)}
      </div>
      <p class="catalog-name">${escapeHTML(item.name)}</p>
      <p class="catalog-sub">${escapeHTML(item.desc)}</p>
      <div class="catalog-footer">
        <div>
          <div class="catalog-sub" style="margin:0;">Masa berlaku</div>
          <div class="catalog-name" style="margin-top:2px;">${escapeHTML(item.shelfLife)}</div>
        </div>
        <button class="mini-plus" data-add-catalog="${escapeHTML(item.id)}">+</button>
      </div>
    </article>
  `;
}

function renderSavedCard(item) {
  const status = statusOf(item);
  return `
    <div class="saved-card">
      <div class="saved-top">
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <div class="food-thumb" style="width:56px; height:56px; margin:0; border-radius:16px; font-size:24px;">${item.image_data ? `<img src="${escapeHTML(item.image_data)}" alt="${escapeHTML(item.title)}" />` : escapeHTML(itemEmoji(item))}</div>
          <div>
            <p class="saved-name">${escapeHTML(item.title)}</p>
            <div class="saved-meta">${escapeHTML(item.category)} • ${escapeHTML(item.quantity || 1)} ${escapeHTML(item.unit || 'pcs')}</div>
          </div>
        </div>
        <button class="mini-plus" data-toggle-fav="${escapeHTML(item.id)}">${item.is_favorite ? '★' : '☆'}</button>
      </div>
      <div class="saved-chip-row">
        <span class="pill ${status.tone}">${escapeHTML(status.label)}</span>
        <span class="pill">Habis: ${escapeHTML(formatDate(item.expiry_date))}</span>
        <span class="pill">Reminder: ${escapeHTML(item.reminder_days || 3)} hari</span>
      </div>
      <div class="actions-bar">
        <button class="btn secondary small" data-edit-item="${escapeHTML(item.id)}">Ubah</button>
        <button class="btn ghost small" data-open-detail="${escapeHTML(item.id)}">Detail</button>
        <button class="btn danger small" data-delete-item="${escapeHTML(item.id)}">Hapus</button>
      </div>
    </div>
  `;
}

function renderDetail(item, fromDb = false) {
  const cat = getCatalogByTab(item.categoryKey || (item.category === 'Makanan' || item.category === 'Minuman' ? 'food' : 'fresh')).find((x) => x.id === item.id) || item;
  const status = fromDb ? statusOf(item) : null;
  const btnText = fromDb ? 'Ubah Pengingat' : 'Tambah Pengingat';
  const html = `
    <div class="modal-inner">
      <div class="modal-head">
        <strong>${escapeHTML(fromDb ? 'Detail Pengingat' : 'Detail Kategori')}</strong>
        <button class="icon-btn" data-close>✕</button>
      </div>

      <div class="detail-card">
        <div class="detail-hero">
          ${fromDb ? itemImage(item) : `<div class="emoji">${escapeHTML(itemEmoji(item))}</div>`}
        </div>
        <div class="detail-body">
          <h3 class="detail-title">${escapeHTML(item.title || item.name)}</h3>
          <div class="detail-desc">${escapeHTML(item.desc || item.description || 'Bahan ini bisa dipantau masa habisnya melalui FreshNote.')}</div>
          ${fromDb ? `
            <div class="saved-chip-row" style="margin-top:12px;">
              <span class="pill ${status.tone}">${escapeHTML(status.label)}</span>
              <span class="pill">Habis: ${escapeHTML(formatDate(item.expiry_date))}</span>
              <span class="pill">Reminder: ${escapeHTML(item.reminder_days || 3)} hari</span>
            </div>
          ` : `
            <div class="saved-chip-row" style="margin-top:12px;">
              <span class="pill">Masa berlaku: ${escapeHTML(item.shelfLife)}</span>
            </div>
          `}
          <div class="detail-meta">
            <div>
              <div class="meta-label">${fromDb ? 'Kategori' : 'Kategori Bahan'}</div>
              <div class="meta-value">${escapeHTML(item.category || item.categoryKey || 'Umum')}</div>
            </div>
            <button class="round-plus" data-from-detail-add='${escapeHTML(JSON.stringify(item))}'>+</button>
          </div>
        </div>
      </div>
    </div>
  `;
  openModal(html);
}

function renderForm(item = null, presetCategory = 'fresh') {
  const isEdit = Boolean(item);
  state.editedId = isEdit ? item.id : null;
  state.formData = item ? {
    title: item.title || item.name || '',
    category: item.category || (presetCategory === 'food' ? 'Makanan' : 'Lainnya'),
    quantity: item.quantity || 1,
    unit: item.unit || 'pcs',
    expiry_date: item.expiry_date || addDaysISO(item.days || 3),
    reminder_days: item.reminder_days || 3,
    notes: item.notes || item.desc || '',
    image_data: item.image_data || '',
    is_favorite: item.is_favorite ?? false,
  } : {
    title: '',
    category: presetCategory === 'food' ? 'Makanan' : 'Lainnya',
    quantity: 1,
    unit: 'pcs',
    expiry_date: addDaysISO(3),
    reminder_days: 3,
    notes: '',
    image_data: '',
    is_favorite: false,
  };

  const preview = state.formData.image_data
    ? `<img src="${escapeHTML(state.formData.image_data)}" alt="preview" />`
    : `<div class="emoji" style="font-size:60px;">📷</div>`;

  const html = `
    <div class="modal-inner">
      <div class="modal-head">
        <strong>${isEdit ? 'Pengaturan Pengingat' : 'Tambah Pengingat'}</strong>
        <button class="icon-btn" data-close>✕</button>
      </div>

      <form id="itemForm" class="auth-form">
        <div class="screen-card" style="padding:12px; text-align:center;">
          <div class="detail-hero" style="min-height:170px; border-radius: 16px; background:#f2fff9; margin-bottom: 10px; overflow:hidden;">${preview}</div>
          <input class="input" type="file" id="imageInput" accept="image/*">
          <div class="notice" style="margin-top:10px;">Gambar akan disimpan sebagai data lokal di database agar tidak perlu bucket tambahan.</div>
        </div>

        <div class="field">
          <label>Nama bahan</label>
          <input class="input" name="title" value="${escapeHTML(state.formData.title)}" placeholder="Contoh: Mentimun" required>
        </div>

        <div class="field">
          <label>Kategori</label>
          <select class="input" name="category">
            <option ${state.formData.category === 'Makanan' ? 'selected' : ''}>Makanan</option>
            <option ${state.formData.category === 'Minuman' ? 'selected' : ''}>Minuman</option>
            <option ${state.formData.category === 'Bahan Segar' ? 'selected' : ''}>Bahan Segar</option>
            <option ${state.formData.category === 'Rumah Tangga' ? 'selected' : ''}>Rumah Tangga</option>
            <option ${state.formData.category === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
          </select>
        </div>

        <div class="filter-row">
          <div class="field">
            <label>Jumlah</label>
            <input class="input" name="quantity" type="number" min="1" value="${escapeHTML(state.formData.quantity)}" required>
          </div>
          <div class="field">
            <label>Satuan</label>
            <input class="input" name="unit" value="${escapeHTML(state.formData.unit)}" placeholder="pcs" required>
          </div>
        </div>

        <div class="filter-row">
          <div class="field">
            <label>Tanggal habis</label>
            <input class="input" name="expiry_date" type="date" value="${escapeHTML(state.formData.expiry_date)}" required>
          </div>
          <div class="field">
            <label>Pengingat (hari)</label>
            <input class="input" name="reminder_days" type="number" min="1" max="30" value="${escapeHTML(state.formData.reminder_days)}" required>
          </div>
        </div>

        <div class="field">
          <label>Catatan</label>
          <textarea class="input textarea" name="notes" placeholder="Catatan tambahan">${escapeHTML(state.formData.notes)}</textarea>
        </div>

        <label class="checkbox-row"><input type="checkbox" name="favorite" ${state.formData.is_favorite ? 'checked' : ''}> Tandai favorit</label>

        <button class="btn primary full" type="submit">${isEdit ? 'Simpan Perubahan' : 'Simpan Pengingat'}</button>
      </form>

      <div class="notice ${state.profile?.plan === 'premium' ? '' : 'warn'}" style="margin-top:12px;">
        ${state.profile?.plan === 'premium'
          ? 'Premium aktif. Kamu bisa simpan item tanpa batas dan mengurutkan berdasarkan masa habis.'
          : `Free plan hanya bisa menyimpan ${FREE_ITEM_LIMIT} item.`}
      </div>
    </div>
  `;
  openModal(html);
}

function renderFilterModal() {
  const html = `
    <div class="modal-inner">
      <div class="modal-head">
        <strong>Filter</strong>
        <button class="icon-btn" data-close>✕</button>
      </div>
      <div class="field">
        <label>Urutan</label>
        <div class="chip-row" style="flex-wrap:wrap;">
          <button class="chip ${state.catalogSort === 'default' ? 'active' : ''}" data-set-sort="default">Default</button>
          <button class="chip ${state.catalogSort === 'newest' ? 'active' : ''}" data-set-sort="newest">Terbaru</button>
          <button class="chip ${state.catalogSort === 'oldest' ? 'active' : ''}" data-set-sort="oldest">Harga Tertinggi</button>
          <button class="chip ${state.catalogSort === 'soonest' ? 'active' : ''}" data-set-sort="soonest">Paling Cepat Habis</button>
        </div>
      </div>
      <div class="field" style="margin-top: 10px;">
        <label>Status</label>
        <div class="chip-row" style="flex-wrap:wrap;">
          <button class="chip ${state.catalogFilter === 'all' ? 'active' : ''}" data-saved-filter="all">Aman</button>
          <button class="chip ${state.catalogFilter === 'soon' ? 'active' : ''}" data-saved-filter="soon">3 Hari Lagi</button>
          <button class="chip ${state.catalogFilter === 'expired' ? 'active' : ''}" data-saved-filter="expired">Sudah Expired</button>
        </div>
      </div>
    </div>
  `;
  openModal(html);
}

function renderAreaModal() {
  const html = `
    <div class="modal-inner">
      <div class="modal-head">
        <strong>Area</strong>
        <button class="icon-btn" data-close>✕</button>
      </div>
      <div class="chip-row" style="flex-wrap:wrap;">
        <button class="chip active">Area Unmul</button>
        <button class="chip">Samarinda Kota</button>
        <button class="chip">Samarinda Ulu</button>
        <button class="chip">Samarinda Ilir</button>
      </div>
      <div class="notice" style="margin-top:12px;">Area ini hanya tampilan UI, bisa disesuaikan lagi kalau kamu mau ada fitur lokasi sungguhan.</div>
    </div>
  `;
  openModal(html);
}

function renderPromoDetail(id) {
  const promo = promoItems.find((x) => x.id === id);
  const html = `
    <div class="modal-inner">
      <div class="modal-head">
        <strong>Promo</strong>
        <button class="icon-btn" data-close>✕</button>
      </div>
      <div class="detail-card">
        <div class="detail-hero"><img src="${escapeHTML(promo?.image || '/assets/promo1.png')}" alt="promo"></div>
        <div class="detail-body">
          <h3 class="detail-title">${escapeHTML(promo?.title || '')}</h3>
          <div class="detail-desc">${escapeHTML(promo?.subtitle || '')}</div>
          <div class="saved-chip-row" style="margin-top:12px;"><span class="pill warn">${escapeHTML(promo?.badge || '')}</span></div>
        </div>
      </div>
    </div>
  `;
  openModal(html);
}

function renderMissingSupabaseNotice() {
  if (!state.setupMissing) return;
  const notice = document.createElement('div');
  notice.className = 'toast';
  notice.style.display = 'block';
  notice.innerHTML = `<strong>Setup belum lengkap</strong><span>Isi SUPABASE_URL dan SUPABASE_ANON_KEY di js/config.js agar register/login bisa jalan.</span>`;
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 4200);
}

function updateBottomNav() {
  [...bottomNav.querySelectorAll('.nav-item')].forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === state.nav);
  });
}

async function loadSession() {
  if (state.setupMissing) {
    state.view = 'auth';
    render();
    renderMissingSupabaseNotice();
    return;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) console.warn(error);
  state.session = data.session || null;
  if (state.session) {
    await bootstrapUser();
  } else {
    state.view = 'auth';
    render();
  }
}

async function bootstrapUser() {
  if (!state.session) return;
  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', state.session.user.id).maybeSingle();
    state.profile = profile;
    await loadItems();
    state.view = state.nav;
    render();
  } catch (err) {
    console.error(err);
    showToast('Gagal', err.message || 'Tidak bisa memuat profil.');
  }
}

async function loadItems() {
  if (!supabase || !state.session) {
    state.items = [];
    return;
  }
  const { data, error } = await supabase.from('items').select('*').eq('user_id', state.session.user.id).order('created_at', { ascending: false });
  if (error) throw error;
  state.items = data || [];
}

function render() {
  updateBottomNav();
  if (state.view === 'auth') {
    renderAuth();
  } else if (state.view === 'home') {
    renderHomePage();
  } else if (state.view === 'saved') {
    renderSaved();
  } else if (state.view === 'profile') {
    renderProfile();
  } else if (state.view === 'catalog') {
    renderCatalogView();
  }
}

function openAddFromCatalog(catalogItem, presetCategory = 'fresh') {
  renderForm({
    title: catalogItem.name,
    category: presetCategory === 'food' ? 'Makanan' : 'Bahan Segar',
    quantity: 1,
    unit: 'pcs',
    expiry_date: addDaysISO(catalogItem.days || 3),
    reminder_days: Math.min(3, catalogItem.days || 3),
    notes: catalogItem.desc,
    image_data: '',
    is_favorite: false,
  }, presetCategory);
}

function bindStaticEvents() {
  bottomNav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-nav]');
    if (!btn) return;
    state.nav = btn.dataset.nav;
    if (state.session) {
      state.view = state.nav;
    } else {
      state.view = 'auth';
      state.nav = 'home';
    }
    render();
  });

  notifyIconBtn.addEventListener('click', async () => {
    if (!state.session) return showToast('Masuk dulu', 'Login untuk mengaktifkan notifikasi.');
    if (state.profile?.plan !== 'premium') return showToast('Premium', 'Notifikasi browser hanya untuk premium.');
    if (!('Notification' in window)) return showToast('Tidak didukung', 'Browser ini belum mendukung notifikasi.');
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      showToast('Aktif', 'Notifikasi sudah diizinkan.');
      checkSoonNotifications();
    } else {
      showToast('Ditolak', 'Izin notifikasi belum diberikan.');
    }
  });

  root.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-auth-tab], [data-switch-auth], [data-open-catalog], [data-open-form], [data-open-reminder], [data-open-saved], [data-open-promo], [data-open-detail], [data-open-promo-detail], [data-back], [data-add-catalog], [data-edit-item], [data-delete-item], [data-toggle-fav], [data-saved-filter], [data-set-sort], [data-category-tab]');
    if (!t) return;

    if (t.dataset.authTab) {
      state.authMode = t.dataset.authTab;
      render();
      return;
    }
    if (t.dataset.switchAuth) {
      state.authMode = state.authMode === 'login' ? 'register' : 'login';
      render();
      return;
    }
    if (t.dataset.back) {
      state.view = t.dataset.back;
      state.nav = t.dataset.back;
      render();
      return;
    }
    if (t.dataset.openSaved !== undefined) {
      state.nav = 'saved';
      state.view = 'saved';
      render();
      return;
    }
    if (t.dataset.openReminder !== undefined) {
      renderForm(null, state.category);
      return;
    }
    if (t.dataset.openPromo !== undefined) {
      renderFilterModal();
      return;
    }
    if (t.dataset.openPromoDetail) {
      renderPromoDetail(t.dataset.openPromoDetail);
      return;
    }
    if (t.dataset.categoryTab) {
      state.category = t.dataset.categoryTab;
      state.view = 'catalog';
      render();
      return;
    }
    if (t.dataset.openCatalog) {
      state.category = t.dataset.openCatalog;
      state.view = 'catalog';
      render();
      return;
    }
    if (t.dataset.openForm) {
      const data = (t.dataset.openForm === 'food' ? foodItems : freshItems)[0];
      renderForm(null, t.dataset.openForm);
      if (data) {
        state.formData = {
          title: data.name,
          category: t.dataset.openForm === 'food' ? 'Makanan' : 'Bahan Segar',
          quantity: 1,
          unit: 'pcs',
          expiry_date: addDaysISO(data.days || 3),
          reminder_days: Math.min(3, data.days || 3),
          notes: data.desc,
          image_data: '',
          is_favorite: false,
        };
        const hero = $('#modalHost .detail-hero');
        if (hero) hero.innerHTML = `<div class="emoji" style="font-size:60px;">${escapeHTML(data.icon)}</div>`;
      }
      return;
    }
    if (t.dataset.openDetail) {
      const dbItem = state.items.find((x) => x.id === t.dataset.openDetail);
      if (dbItem) {
        renderDetail(dbItem, true);
        return;
      }
      const catalogItem = getAllCatalog().find((x) => x.id === t.dataset.openDetail);
      if (catalogItem) {
        renderDetail(catalogItem, false);
        return;
      }
      return;
    }
    if (t.dataset.addCatalog) {
      const catalogItem = getAllCatalog().find((x) => x.id === t.dataset.addCatalog);
      if (catalogItem) {
        if (!canAddMore()) return;
        renderForm({
          title: catalogItem.name,
          category: catalogItem.categoryKey === 'food' ? 'Makanan' : 'Bahan Segar',
          quantity: 1,
          unit: 'pcs',
          expiry_date: addDaysISO(catalogItem.days || 3),
          reminder_days: Math.min(3, catalogItem.days || 3),
          notes: catalogItem.desc,
          image_data: '',
          is_favorite: false,
        }, catalogItem.categoryKey);
      }
      return;
    }
    if (t.dataset.editItem) {
      const item = state.items.find((x) => x.id === t.dataset.editItem);
      if (item) renderForm(item, item.category === 'Makanan' ? 'food' : 'fresh');
      return;
    }
    if (t.dataset.deleteItem) {
      await deleteItem(t.dataset.deleteItem);
      return;
    }
    if (t.dataset.toggleFav) {
      await toggleFavorite(t.dataset.toggleFav);
      return;
    }
    if (t.dataset.savedFilter) {
      state.catalogFilter = t.dataset.savedFilter;
      if (state.view === 'catalog') render(); else {
        state.view = state.nav;
        render();
      }
      return;
    }
    if (t.dataset.setSort) {
      state.catalogSort = t.dataset.setSort;
      render();
      return;
    }
  });

  root.addEventListener('input', (e) => {
    const input = e.target;
    if (input.id === 'searchInput') {
      state.query = input.value;
      render();
    }
    if (input.id === 'imageInput') {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        state.formData = state.formData || {};
        state.formData.image_data = String(reader.result || '');
        const hero = $('#modalHost .detail-hero');
        if (hero) {
          hero.innerHTML = `<img src="${escapeHTML(state.formData.image_data)}" alt="preview">`;
        }
      };
      reader.readAsDataURL(file);
    }
  });

  root.addEventListener('change', (e) => {
    const input = e.target;
    if (input.closest('#authForm')) {
      if (input.name === 'remember') state.rememberMe = input.checked;
    }
  });

  root.addEventListener('submit', async (e) => {
    const form = e.target.closest('#authForm, #itemForm');
    if (!form) return;
    e.preventDefault();
    if (form.id === 'authForm') return handleAuthSubmit(form);
    if (form.id === 'itemForm') return handleItemSubmit(form);
  });

  modalHost.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]') || e.target.matches('[data-close]')) closeModal();
  });

  modalHost.addEventListener('click', (e) => {
    const t = e.target.closest('[data-close], [data-from-detail-add], [data-set-sort], [data-saved-filter]');
    if (!t) return;
    if (t.dataset.fromDetailAdd) {
      try {
        const item = JSON.parse(t.dataset.fromDetailAdd);
        closeModal();
        renderForm({
          title: item.title || item.name,
          category: item.category || 'Bahan Segar',
          quantity: item.quantity || 1,
          unit: item.unit || 'pcs',
          expiry_date: item.expiry_date || addDaysISO(item.days || 3),
          reminder_days: item.reminder_days || 3,
          notes: item.desc || item.description || '',
          image_data: item.image_data || '',
          is_favorite: false,
        }, item.categoryKey || 'fresh');
      } catch {
        closeModal();
      }
    }
    if (t.dataset.setSort) {
      state.catalogSort = t.dataset.setSort;
      closeModal();
      render();
    }
    if (t.dataset.savedFilter) {
      state.catalogFilter = t.dataset.savedFilter;
      closeModal();
      render();
    }
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#logoutBtn, #exportCsvBtn, #googleLoginBtn, #filterBtn, #areaBtn');
    if (!btn) return;
    if (btn.id === 'logoutBtn') return logout();
    if (btn.id === 'exportCsvBtn') return exportCsv();
    if (btn.id === 'googleLoginBtn') return googleLogin();
    if (btn.id === 'filterBtn') return renderFilterModal();
    if (btn.id === 'areaBtn') return renderAreaModal();
  });
}

async function handleAuthSubmit(form) {
  if (state.setupMissing) {
    showToast('Setup belum lengkap', 'Isi URL dan anon key Supabase dulu.');
    return;
  }
  const fd = new FormData(form);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');
  const fullName = String(fd.get('full_name') || '').trim();
  const remember = fd.get('remember') === 'on';
  state.rememberMe = remember;
  if (remember) localStorage.setItem('freshnote_email', email);
  else localStorage.removeItem('freshnote_email');

  try {
    if (state.authMode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName || email.split('@')[0] } },
      });
      if (error) throw error;
      if (data.session) {
        showToast('Berhasil', 'Akun dibuat dan kamu sudah masuk.');
      } else {
        showToast('Cek email', 'Kalau confirmation aktif, buka email dulu untuk verifikasi.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast('Berhasil', 'Login sukses.');
    }
  } catch (err) {
    const msg = (err && err.message) ? err.message : 'Failed to fetch';
    showToast('Gagal', msg);
  }
}

async function googleLogin() {
  if (!GOOGLE_OAUTH_ENABLED) {
    showToast('Belum aktif', 'Google OAuth belum dikonfigurasi di project ini.');
    return;
  }
  try {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  } catch (err) {
    showToast('Gagal', err.message || 'OAuth error');
  }
}

function canAddMore() {
  if (!state.profile || state.profile.plan === 'premium') return true;
  if (state.items.length < FREE_ITEM_LIMIT) return true;
  showToast('Batas Free', `Free plan hanya bisa menyimpan ${FREE_ITEM_LIMIT} item.`);
  return false;
}

async function handleItemSubmit(form) {
  if (!state.session) return;
  if (!canAddMore() && !state.editedId) return;
  const fd = new FormData(form);
  const payload = {
    user_id: state.session.user.id,
    title: String(fd.get('title') || '').trim(),
    category: String(fd.get('category') || 'Lainnya'),
    quantity: Number(fd.get('quantity') || 1),
    unit: String(fd.get('unit') || 'pcs').trim(),
    expiry_date: String(fd.get('expiry_date') || todayISO()),
    reminder_days: Number(fd.get('reminder_days') || 3),
    notes: String(fd.get('notes') || '').trim(),
    image_data: state.formData?.image_data || '',
    is_favorite: fd.get('favorite') === 'on',
  };
  if (!payload.title) return showToast('Validasi', 'Nama bahan wajib diisi.');
  if (!payload.expiry_date) return showToast('Validasi', 'Tanggal habis wajib diisi.');

  try {
    if (state.editedId) {
      const { error } = await supabase.from('items').update(payload).eq('id', state.editedId).eq('user_id', state.session.user.id);
      if (error) throw error;
      showToast('Berhasil', 'Pengingat diperbarui.');
    } else {
      const { error } = await supabase.from('items').insert(payload);
      if (error) throw error;
      showToast('Berhasil', 'Pengingat disimpan.');
    }
    closeModal();
    await loadItems();
    render();
    checkSoonNotifications();
  } catch (err) {
    showToast('Gagal', err.message || 'Tidak bisa menyimpan item.');
  }
}

async function deleteItem(id) {
  if (!confirm('Hapus item ini?')) return;
  const { error } = await supabase.from('items').delete().eq('id', id).eq('user_id', state.session.user.id);
  if (error) return showToast('Gagal', error.message || 'Tidak bisa menghapus item.');
  showToast('Terhapus', 'Item berhasil dihapus.');
  await loadItems();
  render();
}

async function toggleFavorite(id) {
  const item = state.items.find((x) => x.id === id);
  if (!item) return;
  const { error } = await supabase.from('items').update({ is_favorite: !item.is_favorite }).eq('id', id).eq('user_id', state.session.user.id);
  if (error) return showToast('Gagal', error.message || 'Tidak bisa update favorit.');
  await loadItems();
  render();
}

function exportCsv() {
  if (state.profile?.plan !== 'premium') {
    showToast('Premium', 'Export CSV hanya untuk premium.');
    return;
  }
  const rows = [
    ['Nama', 'Kategori', 'Jumlah', 'Satuan', 'Tanggal Habis', 'Reminder Hari', 'Catatan', 'Status'],
    ...state.items.map((item) => {
      const s = statusOf(item);
      return [item.title, item.category, item.quantity, item.unit, item.expiry_date, item.reminder_days, item.notes || '', s.label];
    }),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `freshnote-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function logout() {
  if (supabase) await supabase.auth.signOut();
  state.session = null;
  state.profile = null;
  state.items = [];
  state.view = 'auth';
  state.nav = 'home';
  render();
}

function checkSoonNotifications() {
  if (!state.session || state.profile?.plan !== 'premium' || !('Notification' in window) || Notification.permission !== 'granted') return;
  const targets = state.items.filter((item) => {
    const status = statusOf(item);
    return status.key === 'soon' || status.key === 'expired';
  });
  targets.forEach((item) => {
    const key = `${item.id}:${item.expiry_date}`;
    if (state.notifiedKeys.has(key)) return;
    state.notifiedKeys.add(key);
    new Notification(`${APP_NAME} reminder`, { body: `${item.title} ${statusOf(item).label.toLowerCase()}` });
  });
}

async function init() {
  bindStaticEvents();
  if (!state.setupMissing) {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      state.session = session;
      if (!session) {
        state.profile = null;
        state.items = [];
        state.view = 'auth';
        state.nav = 'home';
        render();
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      state.profile = profile;
      await loadItems();
      state.view = state.nav;
      render();
      checkSoonNotifications();
    });
    // keep subscription alive without leaking; reference to avoid linter complaints
    window.__freshnoteAuthSub = sub;
  }
  await loadSession();
  state.ready = true;
}

init();
