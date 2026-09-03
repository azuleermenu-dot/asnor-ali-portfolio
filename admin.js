const SUPABASE_URL = 'https://alwzdqhmcaeaovqifckk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Vk9fq_1pp0uHljb7vWULDg__38OM61D';

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Keep the admin session scoped to this browser tab instead of persistent local storage.
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginStatus = document.getElementById('login-status');
const dashboardStatus = document.getElementById('dashboard-status');
const submissions = document.getElementById('submissions');
const adminEmail = document.getElementById('admin-email');

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
let inactivityTimer = null;
let currentUser = null;
let authCheckInProgress = false;

function setStatus(el, message) {
  el.textContent = message || '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isAdmin(user) {
  return user?.app_metadata?.role === 'admin';
}

function showLogin() {
  currentUser = null;
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  stopInactivityTimer();
}

function showDashboard(user) {
  currentUser = user;
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  adminEmail.textContent = user.email || '';
  resetInactivityTimer();
}

function stopInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

function resetInactivityTimer() {
  stopInactivityTimer();
  if (!currentUser) return;
  inactivityTimer = setTimeout(async () => {
    await supabase.auth.signOut();
    showLogin();
    loginForm.reset();
    setStatus(loginStatus, 'Signed out after 30 minutes of inactivity.');
  }, INACTIVITY_LIMIT_MS);
}

async function requireAdmin() {
  if (authCheckInProgress) return currentUser;
  authCheckInProgress = true;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      showLogin();
      return null;
    }

    if (!isAdmin(user)) {
      await supabase.auth.signOut();
      showLogin();
      setStatus(loginStatus, 'Access denied. This account is not an administrator.');
      return null;
    }

    showDashboard(user);
    return user;
  } finally {
    authCheckInProgress = false;
  }
}

async function loadSubmissions() {
  const user = await requireAdmin();
  if (!user) return;

  setStatus(dashboardStatus, 'Loading submissions…');
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('id,name,email,business,message,created_at,status')
    .order('created_at', { ascending: false });

  if (error) {
    submissions.innerHTML = '';
    setStatus(dashboardStatus, `Could not load submissions: ${error.message}`);
    return;
  }

  setStatus(dashboardStatus, `${data.length} submission${data.length === 1 ? '' : 's'}.`);
  if (!data.length) {
    submissions.innerHTML = '<div class="empty">No contact submissions yet.</div>';
    return;
  }

  submissions.innerHTML = data.map((item) => {
    const status = ['new', 'replied', 'archived'].includes(item.status) ? item.status : 'new';
    return `
      <article class="submission">
        <div class="submission-head">
          <div>
            <h2>${escapeHtml(item.name)}</h2>
            <div class="meta"><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a></div>
            ${item.business ? `<div class="meta">Business: ${escapeHtml(item.business)}</div>` : ''}
            <div class="meta">${escapeHtml(new Date(item.created_at).toLocaleString())}</div>
          </div>
          <div class="submission-actions">
            <label class="sr-only" for="status-${escapeHtml(item.id)}">Status</label>
            <select id="status-${escapeHtml(item.id)}" class="status-select" data-status-id="${escapeHtml(item.id)}">
              <option value="new" ${status === 'new' ? 'selected' : ''}>New</option>
              <option value="replied" ${status === 'replied' ? 'selected' : ''}>Replied</option>
              <option value="archived" ${status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
        </div>
        <div class="message">${escapeHtml(item.message)}</div>
      </article>
    `;
  }).join('');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(loginStatus, '');
  loginButton.disabled = true;
  loginButton.textContent = 'Signing in…';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setStatus(loginStatus, 'Sign-in failed. Check your email and password.');
    loginButton.disabled = false;
    loginButton.textContent = 'Sign in';
    return;
  }

  const user = data.user;
  if (!isAdmin(user)) {
    await supabase.auth.signOut();
    setStatus(loginStatus, 'Access denied. This account is not an administrator.');
    loginButton.disabled = false;
    loginButton.textContent = 'Sign in';
    return;
  }

  loginButton.disabled = false;
  loginButton.textContent = 'Sign in';
  await requireAdmin();
  await loadSubmissions();
});

document.getElementById('logout-button').addEventListener('click', async () => {
  await supabase.auth.signOut();
  showLogin();
  loginForm.reset();
  setStatus(loginStatus, 'Signed out.');
});

document.getElementById('refresh-button').addEventListener('click', loadSubmissions);

submissions.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-status-id]');
  if (!select) return;

  const user = await requireAdmin();
  if (!user) return;

  const id = select.dataset.statusId;
  const status = select.value;
  if (!['new', 'replied', 'archived'].includes(status)) return;

  select.disabled = true;
  const { error } = await supabase
    .from('contact_submissions')
    .update({ status })
    .eq('id', id);

  select.disabled = false;

  if (error) {
    setStatus(dashboardStatus, `Status update failed: ${error.message}`);
    await loadSubmissions();
    return;
  }

  setStatus(dashboardStatus, `Submission marked ${status}.`);
  resetInactivityTimer();
});

['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
  document.addEventListener(eventName, () => {
    if (currentUser) resetInactivityTimer();
  }, { passive: true });
});

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (!session) {
    showLogin();
    return;
  }
  const user = await requireAdmin();
  if (user) await loadSubmissions();
});

requireAdmin().then((user) => {
  if (user) loadSubmissions();
});
