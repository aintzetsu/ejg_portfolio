'use strict';

// Text and projects remain available if scripting is unavailable.
document.getElementById('year').textContent = new Date().getFullYear();
const header = document.querySelector('.site-header');
const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 50);
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

// Theme toggle (light/dark) persisted in localStorage
const themeToggle = document.getElementById('themeToggle');
const themeMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  if (themeMeta) themeMeta.content = isDark ? '#161513' : '#f5f4f1';
  if (themeToggle) {
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    themeToggle.querySelector('.theme-icon').textContent = isDark ? '☀' : '◐';
  }
}

if (themeToggle) {
  themeToggle.hidden = false;
  const savedTheme = (() => {
    try { return localStorage.getItem('ejg-theme'); } catch { return null; }
  })();
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    try { localStorage.setItem('ejg-theme', nextTheme); } catch {}
  });
}

// Responsive mobile navigation toggle
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const mobileQuery = window.matchMedia('(max-width: 640px)');

function syncMenuVisibility() {
  if (!menuToggle || !mainNav) return;
  if (mobileQuery.matches) {
    header.classList.add('js-nav-ready');
    menuToggle.hidden = false;
  } else {
    header.classList.remove('js-nav-ready', 'menu-open');
    menuToggle.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
  }
}

if (menuToggle && mainNav) {
  syncMenuVisibility();
  mobileQuery.addEventListener('change', syncMenuVisibility);
  menuToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      header.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Highlight active navigation link based on visible section
const navLinks = Array.from(document.querySelectorAll('#mainNav a[href^="#"]'));
const sections = navLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

function setActiveNav(id) {
  navLinks.forEach(link => {
    const matches = link.getAttribute('href') === '#' + id;
    link.classList.toggle('is-active', matches);
    if (matches) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

if ('IntersectionObserver' in window && sections.length > 0) {
  const navObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visible.length > 0) setActiveNav(visible[0].target.id);
  }, { rootMargin: '-25% 0px -55% 0px', threshold: [0.1, 0.4] });
  sections.forEach(section => navObserver.observe(section));
}

// Missing optional images get a clean text fallback, rather than a broken icon.
document.querySelectorAll('img').forEach(image => {
  const handleError = () => {
    image.hidden = true;
    const fallback = image.parentElement.querySelector('.image-fallback, .portrait-fallback');
    if (fallback) fallback.hidden = false;
  };
  image.addEventListener('error', handleError);
  if (image.complete && image.naturalWidth === 0) handleError();
});

// Project carousel with tabs, "View all" toggle, arrows, keyboard, and swipe controls
const carousel = document.querySelector('.carousel');
const cards = Array.from(carousel.querySelectorAll('.project-card'));
const controls = carousel.querySelector('.carousel-controls');
const toolbar = document.querySelector('.project-toolbar');
const tabButtons = toolbar ? Array.from(toolbar.querySelectorAll('button[role="tab"]')) : [];
const toggleAllButton = document.getElementById('toggleAllProjects');
let current = 0;
let showAll = false;

function syncProjectView() {
  cards.forEach((card, i) => {
    card.hidden = !showAll && i !== current;
  });
  tabButtons.forEach((btn, i) => {
    btn.setAttribute('aria-selected', String(!showAll && i === current));
  });
  if (toggleAllButton) {
    toggleAllButton.setAttribute('aria-pressed', String(showAll));
    toggleAllButton.textContent = showAll ? 'Carousel view' : 'View all (' + cards.length + ')';
  }
  controls.hidden = showAll;
  const title = cards[current].querySelector('h3').textContent;
  document.getElementById('projectStatus').textContent = (current + 1) + ' of ' + cards.length + ' — ' + title;
}

function showProject(index) {
  showAll = false;
  current = (index + cards.length) % cards.length;
  syncProjectView();
}

tabButtons.forEach((btn, idx) => {
  btn.addEventListener('click', () => showProject(idx));
});

if (toggleAllButton) {
  toggleAllButton.addEventListener('click', () => {
    showAll = !showAll;
    syncProjectView();
  });
}

document.getElementById('prevProject').addEventListener('click', () => showProject(current - 1));
document.getElementById('nextProject').addEventListener('click', () => showProject(current + 1));
carousel.addEventListener('keydown', event => {
  if (showAll) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showProject(current + (event.key === 'ArrowRight' ? 1 : -1));
  }
});

let touchStartX = 0;
carousel.addEventListener('touchstart', event => {
  if (event.touches.length === 1) touchStartX = event.touches[0].clientX;
}, { passive: true });
carousel.addEventListener('touchend', event => {
  if (showAll || !touchStartX || event.changedTouches.length !== 1) return;
  const deltaX = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(deltaX) > 45) {
    showProject(current + (deltaX < 0 ? 1 : -1));
  }
  touchStartX = 0;
}, { passive: true });

syncProjectView();
if (toolbar) toolbar.hidden = false;

// Native modal dialog provides focus containment, Escape, and focus restoration.
const modal = document.getElementById('cvModal');
const previewButton = document.getElementById('previewButton');
if (modal && previewButton && typeof modal.showModal === 'function') {
  previewButton.addEventListener('click', event => {
    // Keep modified-click behavior for people opening the PDF in another tab.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const frame = modal.querySelector('iframe');
    if (!frame.getAttribute('src')) frame.src = frame.dataset.src;
    modal.showModal();
    document.body.classList.add('modal-open');
  });
  document.getElementById('closeCV').addEventListener('click', () => modal.close());
  let pointerStartedOutside = false;
  const outside = event => {
    const rect = modal.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  modal.addEventListener('pointerdown', event => { pointerStartedOutside = outside(event); });
  modal.addEventListener('click', event => { if (event.target === modal && pointerStartedOutside && outside(event)) modal.close(); });
  modal.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    previewButton.focus();
  });
}

// One-click email copy
const copyEmailButton = document.getElementById('copyEmail');
if (copyEmailButton) {
  copyEmailButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('gaudicosmedisonjr@gmail.com');
      copyEmailButton.textContent = 'Copied!';
      setTimeout(() => { copyEmailButton.textContent = 'Copy'; }, 2000);
    } catch {
      copyEmailButton.textContent = 'Copy failed';
      setTimeout(() => { copyEmailButton.textContent = 'Copy'; }, 2000);
    }
  });
}

// Contact form handling (supports both Gmail web compose and native mailto client)
const contactForm = document.getElementById('contactForm');
const mailtoButton = document.getElementById('mailtoButton');
const formFeedback = document.getElementById('formFeedback');

function getFormMessageData() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();
  return {
    name,
    email,
    message,
    subject: 'Portfolio Message from ' + name,
    body: 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message
  };
}

function showFeedback(text) {
  if (!formFeedback) return;
  formFeedback.textContent = text;
  formFeedback.hidden = false;
}

if (contactForm) {
  contactForm.addEventListener('submit', () => {
    const { subject, body } = getFormMessageData();
    ['name', 'email', 'message'].forEach(id => document.getElementById(id).removeAttribute('name'));
    const values = { su: subject, body };
    Object.entries(values).forEach(([key, value]) => {
      let input = contactForm.querySelector('input[type="hidden"][name="' + key + '"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        contactForm.append(input);
      }
      input.value = value;
    });
    showFeedback('Opened pre-filled draft in Gmail.');
  });
}

if (mailtoButton && contactForm) {
  mailtoButton.addEventListener('click', () => {
    if (!contactForm.reportValidity()) return;
    const { subject, body } = getFormMessageData();
    const mailtoUrl = 'mailto:gaudicosmedisonjr@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.location.href = mailtoUrl;
    showFeedback('Opened draft in your email app.');
  });
}

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-in');
        observer.unobserve(entry.target);
      } 
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.timeline-item, .credential-card, .skill-group').forEach(element => observer.observe(element));
}
