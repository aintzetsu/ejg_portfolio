'use strict';

// Text and projects remain available if scripting is unavailable.
document.getElementById('year').textContent = new Date().getFullYear();
const header = document.querySelector('.site-header');
const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 50);
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

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

// Project carousel with button, keyboard, and touch swipe controls
const carousel = document.querySelector('.carousel');
const cards = Array.from(carousel.querySelectorAll('.project-card'));
const controls = carousel.querySelector('.carousel-controls');
let current = 0;

function showProject(index) {
  current = (index + cards.length) % cards.length;
  cards.forEach((card, i) => { card.hidden = i !== current; });
  const title = cards[current].querySelector('h3').textContent;
  document.getElementById('projectStatus').textContent = `${current + 1} of ${cards.length} — ${title}`;
}

document.getElementById('prevProject').addEventListener('click', () => showProject(current - 1));
document.getElementById('nextProject').addEventListener('click', () => showProject(current + 1));
carousel.addEventListener('keydown', event => {
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
  if (!touchStartX || event.changedTouches.length !== 1) return;
  const deltaX = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(deltaX) > 45) {
    showProject(current + (deltaX < 0 ? 1 : -1));
  }
  touchStartX = 0;
}, { passive: true });

showProject(0);
controls.hidden = false;

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
    subject: `Portfolio Message from ${name}`,
    body: `Name: ${name}\nEmail: ${email}\n\n${message}`
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
      let input = contactForm.querySelector(`input[type="hidden"][name="${key}"]`);
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
    const mailtoUrl = `mailto:gaudicosmedisonjr@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
  }, { threshold: 0.12 });
  document.querySelectorAll('.section-heading, .skill-group').forEach(element => observer.observe(element));
}
