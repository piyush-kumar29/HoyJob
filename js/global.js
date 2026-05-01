/* ============================================
   GLOBAL JS — Auth helpers, api helpers, nav
   ============================================ */

const API_BASE = window.HJ_CONFIG ? window.HJ_CONFIG.API_BASE : 'http://localhost:5000/api';
const CLERK_KEY = window.HJ_CONFIG ? window.HJ_CONFIG.CLERK_PUBLISHABLE_KEY : '';

let Clerk;

// --- Clerk Initialization ---
async function initClerk() {
  if (CLERK_KEY === 'pk_test_XXXX') {
    console.warn('Clerk Publishable Key is not set in config.js');
    return;
  }

  const script = document.createElement('script');
  script.setAttribute('data-clerk-publishable-key', CLERK_KEY);
  script.async = true;
  script.src = `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
  script.crossOrigin = 'anonymous';
  script.addEventListener('load', async function () {
    Clerk = window.Clerk;
    await Clerk.load();
    updateUIBasedOnAuth();
  });
  document.head.appendChild(script);
}

function updateUIBasedOnAuth() {
  buildNav();
  // Any other UI updates that depend on auth state
}

// --- Auth Helpers (Clerk-based) ---
async function getToken() {
  if (!Clerk || !Clerk.session) return null;
  return await Clerk.session.getToken();
}

function getUser() {
  if (!Clerk || !Clerk.user) return null;
  return {
    id: Clerk.user.id,
    name: `${Clerk.user.firstName} ${Clerk.user.lastName}`,
    email: Clerk.user.emailAddresses[0].emailAddress,
    role: Clerk.user.publicMetadata.role || 'agent',
    avatar: Clerk.user.imageUrl
  };
}

function isLoggedIn() {
  return !!(Clerk && Clerk.user);
}

async function logout() {
  if (Clerk) {
    await Clerk.signOut();
    window.location.href = getBasePath() + 'index.html';
  }
}

// --- API Helpers ---
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = await getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { msg: await response.text() };
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || data.msg || `HTTP Error ${response.status}`);
    }
    return data;
  } catch (err) {
    console.error(`Fetch error at ${endpoint}:`, err);
    throw err;
  }
}

// --- Path helpers ---
function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : './';
}

// --- Nav Builder ---
function buildNav() {
  const user = getUser();
  const base = getBasePath();
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  const path = window.location.pathname;
  const hash = window.location.hash;
  const isIndex = path.includes('index.html') || path.endsWith('/') || path === '';

  if (!user) {
    nav.innerHTML = `
      <a href="${base}index.html" class="logo">
        <div class="logo-oval"><div class="logo-h">H</div><span>HoyJob</span></div>
      </a>
      <div class="nav-links">
        <a href="${base}index.html#about">About</a>
        <a href="${base}index.html#how">How it Works</a>
        <a href="${base}pages/jobs.html">Marketplace</a>
      </div>
      <div class="nav-actions">
        <a href="${base}pages/login.html">Log In</a>
        <a href="${base}pages/signup.html" class="btn btn-primary btn-sm">Join HoyJob</a>
      </div>`;
  } else {
    const dashboardLink = user.role === 'recruiter' ? 'recruiter-dashboard.html' : 'agent-dashboard.html';
    nav.innerHTML = `
      <a href="${base}pages/${dashboardLink}" class="logo">
        <div class="logo-oval"><div class="logo-h">H</div><span>HoyJob</span></div>
      </a>
      <div class="nav-links">
        <a href="${base}pages/${dashboardLink}">Console</a>
        <a href="${base}pages/jobs.html">${user.role === 'recruiter' ? 'Candidates' : 'Marketplace'}</a>
        <a href="${base}pages/chat.html">Inbox</a>
      </div>
      <div class="nav-actions">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <a href="${base}pages/profile.html" class="avatar"><img src="${user.avatar}" style="width:100%; border-radius:50%"></a>
          <button onclick="logout()" class="btn btn-ghost btn-sm">Log Out</button>
        </div>
      </div>`;
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  initClerk();
});
