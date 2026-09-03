const SUPABASE_URL = 'https://alwzdqhmcaeaovqifckk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Vk9fq_1pp0uHljb7vWULDg__38OM61D';

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
menu?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
}));

document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('contact-form');
const status = document.getElementById('form-status');
let lastSubmission = 0;

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const business = String(data.get('business') || '').trim();
  const message = String(data.get('message') || '').trim();
  const honeypot = String(data.get('website') || '').trim();

  if (honeypot) return;
  if (!name || name.length > 100 || !email || email.length > 320 || !message || message.length > 5000) {
    status.textContent = 'Please check the required fields and try again.';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    status.textContent = 'Please enter a valid email address.';
    return;
  }
  if (Date.now() - lastSubmission < 30000) {
    status.textContent = 'Please wait a little before sending another inquiry.';
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.style.opacity = '.65';
  status.textContent = 'Sending…';

  try {
    const { error } = await supabase.from('contact_submissions').insert({ name, email, business: business || null, message });
    if (error) throw error;
    lastSubmission = Date.now();
    form.reset();
    status.textContent = 'Thanks! Your project inquiry has been sent.';
  } catch (error) {
    console.error('Contact submission failed:', error);
    status.textContent = 'Something went wrong. Please try again later.';
  } finally {
    button.disabled = false;
    button.style.opacity = '1';
  }
});
