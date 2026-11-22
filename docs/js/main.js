import { initJobs } from './jobs.js';
import { initAssistant } from './assistant.js';
import { initContact } from './contact.js';

const ANNOUNCEMENT_KEY = 'gi-announcement-dismissed';

function initAnnouncement() {
  const bar = document.getElementById('announcement');
  if (!bar) return;
  if (localStorage.getItem(ANNOUNCEMENT_KEY) === 'true') bar.hidden = true;
  bar.querySelector('.announcement-close').addEventListener('click', () => {
    bar.hidden = true;
    localStorage.setItem(ANNOUNCEMENT_KEY, 'true');
  });
}

function initMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
}

initAnnouncement();
initMenu();
initJobs();
initAssistant();
initContact();
