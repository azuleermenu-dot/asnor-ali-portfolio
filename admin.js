const SUPABASE_URL = 'https://alwzdqhmcaeaovqifckk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Vk9fq_1pp0uHljb7vWULDg__38OM61D';

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
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
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
}

function showDashboard(user) {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  adminEmail.textContent = user.email || '';
}

async function requireAdmin() {
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
}

async function loadSubmissions() {
  setStatus(dashboardStatus, 'Loading submissions…');
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('id,name,email,business,message,created_at')
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

  submissions.innerHTML = data.map((item) => `
    <article class="submission">
      <div class="submission-head">
        <div>
          <h2>${escapeHtml(item.name)}</h2>
          <div class="meta"><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a></div>
          ${item.business ? `<div class="meta">Business: ${escapeHtml(item.business)}</div>` : ''}
          <div class="meta">${escapeHtml(new Date(item.created_at).toLocaleString())}</div>
        </div>
        <button class="delete" type="button" data-delete-id="${escapeHtml(item.id)}">Delete</button>
      </div>
      <div class="message">${escapeHtml(item.message)}</div>
    </article>
  `).join('');
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

submissions.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete-id]');
  if (!button) return;

  const id = button.dataset.deleteId;
  if (!confirm('Delete this submission permanently?')) return;

  button.disabled = true;
  const { error } = await supabase.from('contact_submissions').delete().eq('id', id);
  if (error) {
    button.disabled = false;
    setStatus(dashboardStatus, `Delete failed: ${error.message}`);
    return;
  }
  await loadSubmissions();
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
