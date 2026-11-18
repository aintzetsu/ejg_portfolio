'use strict';

// Text and core content remain available if scripting is unavailable.
document.getElementById('year').textContent = new Date().getFullYear();
const header = document.querySelector('.site-header');
const scrollProgress = document.getElementById('scrollProgress');
const backToTopBtn = document.getElementById('backToTop');
const toastBanner = document.getElementById('toastBanner');
let toastTimer = null;

function showToast(message) {
  if (!toastBanner) return;
  toastBanner.textContent = message;
  toastBanner.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastBanner.hidden = true; }, 2400);
}

// Highlight active navigation link and desktop rail based on visible section
const navLinks = Array.from(document.querySelectorAll('#mainNav a[href^="#"]'));
const railLinks = Array.from(document.querySelectorAll('#sectionRail a[data-rail]'));
const sections = Array.from(new Set(
  [...navLinks, ...railLinks]
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean)
));

function setActiveNav(id) {
  navLinks.forEach(link => {
    const matches = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', matches);
    if (matches) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
  railLinks.forEach(link => {
    link.classList.toggle('is-active', link.dataset.rail === id);
  });
}

const careerTimeline = document.getElementById('careerTimeline');
const timelineProgress = document.getElementById('timelineProgress');

const updateScrollState = () => {
  header.classList.toggle('scrolled', window.scrollY > 50);
  if (backToTopBtn) backToTopBtn.hidden = window.scrollY < 480;
  if (window.scrollY < 80) setActiveNav('introduction');

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
  if (scrollProgress) scrollProgress.style.width = `${pct.toFixed(1)}%`;
  if (backToTopBtn) backToTopBtn.style.setProperty('--scroll-pct', `${pct.toFixed(1)}%`);

  if (careerTimeline && timelineProgress) {
    const rect = careerTimeline.getBoundingClientRect();
    const totalTrack = Math.max(1, rect.height - 56);
    const passed = window.innerHeight * 0.62 - (rect.top + 28);
    const fillPx = Math.max(0, Math.min(totalTrack, passed));
    timelineProgress.style.height = `${fillPx.toFixed(0)}px`;
  }
};
window.addEventListener('scroll', updateScrollState, { passive: true });

if (backToTopBtn) {
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if ('IntersectionObserver' in window && sections.length > 0) {
  const navObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visible.length > 0) setActiveNav(visible[0].target.id);
  }, { rootMargin: '-25% 0px -55% 0px', threshold: [0.1, 0.4] });
  sections.forEach(section => navObserver.observe(section));
}
updateScrollState();

// Theme & Accent customization persisted in localStorage
const themeToggle = document.getElementById('themeToggle');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const accentSwitcher = document.getElementById('accentSwitcher');
const accentButtons = accentSwitcher ? Array.from(accentSwitcher.querySelectorAll('button[data-accent]')) : [];
const ACCENTS = ['rust', 'cobalt', 'teal', 'plum'];
let refreshCanvasPalette = () => {};
let refreshVesperCurve = () => {};

function applyTheme(theme, announce = false) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  if (themeMeta) themeMeta.content = isDark ? '#161513' : '#f5f4f1';
  if (themeToggle) {
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  if (announce) {
    try { localStorage.setItem('ejg-theme', theme); } catch {}
    showToast(`Switched to ${theme} mode`);
  }
  refreshCanvasPalette();
  refreshVesperCurve();
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme, true);
}

function applyAccent(accent, announce = false) {
  const normalized = ACCENTS.includes(accent) ? accent : 'rust';
  if (normalized === 'rust') {
    delete document.documentElement.dataset.accent;
  } else {
    document.documentElement.dataset.accent = normalized;
  }
  accentButtons.forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.accent === normalized));
  });
  if (announce) {
    try { localStorage.setItem('ejg-accent', normalized); } catch {}
    showToast(`Accent updated: ${normalized.charAt(0).toUpperCase() + normalized.slice(1)}`);
  }
  refreshCanvasPalette();
  refreshVesperCurve();
}

if (themeToggle) {
  themeToggle.hidden = false;
  const savedTheme = (() => {
    try { return localStorage.getItem('ejg-theme'); } catch { return null; }
  })();
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  themeToggle.addEventListener('click', toggleTheme);
}

if (accentSwitcher && accentButtons.length > 0) {
  accentSwitcher.hidden = false;
  const savedAccent = (() => {
    try { return localStorage.getItem('ejg-accent'); } catch { return null; }
  })();
  applyAccent(savedAccent || 'rust', false);
  accentButtons.forEach(btn => {
    btn.addEventListener('click', () => applyAccent(btn.dataset.accent, true));
  });
}

// Live Quezon City local time badge (Asia/Manila)
const localTimeEl = document.getElementById('localTime');
if (localTimeEl && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const updateClock = () => {
    localTimeEl.textContent = `${formatter.format(new Date())} PHT`;
    localTimeEl.hidden = false;
  };
  updateClock();
  setInterval(updateClock, 30000);
}

// Role-tailored hero bio switcher
const bioSwitcher = document.getElementById('bioSwitcher');
const heroBio = document.getElementById('heroBio');
const bioCopy = {
  overview: 'I build practical, user-friendly web experiences and systems, backed by hands-on IT support and AI data annotation experience in Quezon City.',
  dev: 'Frontend-focused IT graduate crafting fast, accessible interfaces in HTML5, CSS3, JavaScript, React, and Tailwind CSS — from restaurant websites to custom hardware storefronts.',
  support: 'Detail-oriented Data Service Specialist at RWS and former DepEd NCR IT Support Intern experienced in multimodal AI data QA, troubleshooting, hardware diagnostics, and SAP workflows.'
};

if (bioSwitcher && heroBio) {
  bioSwitcher.hidden = false;
  const bioTabs = Array.from(bioSwitcher.querySelectorAll('button[data-bio]'));
  let bioSwapTimer = null;
  bioTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.bio;
      if (!bioCopy[key] || tab.getAttribute('aria-selected') === 'true') return;
      bioTabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
      heroBio.classList.add('is-switching');
      clearTimeout(bioSwapTimer);
      bioSwapTimer = setTimeout(() => {
        heroBio.textContent = bioCopy[key];
        heroBio.classList.remove('is-switching');
      }, 130);
    });
  });
}

// Responsive mobile/tablet navigation toggle
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const mobileQuery = window.matchMedia('(max-width: 840px)');

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

const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

// Reactive Hero Dot-Matrix Canvas (pointer proximity glow, constellation links & click ripples)
function initHeroCanvas() {
  const heroBand = document.querySelector('.hero-band');
  const canvas = document.getElementById('heroCanvas');
  if (!heroBand || !canvas || typeof canvas.getContext !== 'function' || reducedMotionQuery.matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  heroBand.classList.add('has-canvas');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let dotColor = '#d6d0c5';
  let accentColor = '#b74700';
  let isVisible = true;
  let rafId = null;
  const pointer = { x: -9999, y: -9999, active: false };
  const ripples = [];

  refreshCanvasPalette = () => {
    const styles = getComputedStyle(document.documentElement);
    dotColor = styles.getPropertyValue('--dot').trim() || '#d6d0c5';
    accentColor = styles.getPropertyValue('--accent').trim() || '#b74700';
    drawFrame();
  };

  function resize() {
    const rect = heroBand.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame();
  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);
    const now = performance.now();
    for (let i = ripples.length - 1; i >= 0; i--) {
      if (now - ripples[i].t > 950) ripples.splice(i, 1);
    }

    const gap = 24;
    const cols = Math.ceil(width / gap) + 1;
    const rows = Math.ceil(height / gap) + 1;
    const hotDots = [];

    for (let r = 0; r < rows; r++) {
      const y = r * gap + 12;
      for (let c = 0; c < cols; c++) {
        const x = c * gap + 12;
        let energy = 0;
        if (pointer.active) {
          const dist = Math.hypot(x - pointer.x, y - pointer.y);
          if (dist < 135) energy = Math.max(energy, 1 - dist / 135);
        }
        for (const rip of ripples) {
          const age = (now - rip.t) / 950;
          const radius = age * 280;
          const band = Math.abs(Math.hypot(x - rip.x, y - rip.y) - radius);
          if (band < 34) energy = Math.max(energy, (1 - band / 34) * (1 - age));
        }

        if (energy > 0.05) {
          ctx.globalAlpha = 0.25 + energy * 0.7;
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(x, y, 1.2 + energy * 2.2, 0, Math.PI * 2);
          ctx.fill();
          if (energy > 0.55) hotDots.push({ x, y, energy });
        } else {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(x, y, 1.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (hotDots.length > 1) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < hotDots.length; i++) {
        for (let j = i + 1; j < hotDots.length && j < i + 5; j++) {
          const d = Math.hypot(hotDots[i].x - hotDots[j].x, hotDots[i].y - hotDots[j].y);
          if (d < 42) {
            ctx.globalAlpha = Math.min(hotDots[i].energy, hotDots[j].energy) * 0.26;
            ctx.beginPath();
            ctx.moveTo(hotDots[i].x, hotDots[i].y);
            ctx.lineTo(hotDots[j].x, hotDots[j].y);
            ctx.stroke();
          }
        }
      }
    }
    ctx.globalAlpha = 1;

    if ((pointer.active || ripples.length > 0) && isVisible) {
      rafId = requestAnimationFrame(drawFrame);
    } else {
      rafId = null;
    }
  }

  function schedule() {
    if (!rafId && isVisible) rafId = requestAnimationFrame(drawFrame);
  }

  heroBand.addEventListener('pointermove', event => {
    const rect = heroBand.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
    schedule();
  });

  heroBand.addEventListener('pointerleave', () => {
    pointer.active = false;
    schedule();
  });

  heroBand.addEventListener('pointerdown', event => {
    const rect = heroBand.getBoundingClientRect();
    ripples.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, t: performance.now() });
    schedule();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      isVisible = entries[0]?.isIntersecting ?? true;
      if (isVisible) schedule();
    }, { threshold: 0.01 }).observe(heroBand);
  }

  window.addEventListener('resize', resize);
  refreshCanvasPalette();
  resize();
}

// Subtle 3D perspective tilt & specular sheen on portrait and browser frames
function initTiltTargets() {
  if (!finePointerQuery.matches || reducedMotionQuery.matches) return;
  document.querySelectorAll('.tilt-target').forEach(el => {
    el.addEventListener('pointermove', event => {
      if (event.target.closest('.browser-chrome') || el.classList.contains('is-blueprint')) {
        el.style.transform = '';
        return;
      }
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * 6;
      const ry = (px - 0.5) * 6;
      el.style.setProperty('--tilt-x', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--tilt-y', `${(py * 100).toFixed(1)}%`);
      el.style.transform = `perspective(950px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });
}

initHeroCanvas();
initTiltTargets();

// Hero interactive role typewriter cycler (click to cycle focus & sync bio)
const roleCycler = document.getElementById('roleCycler');
const roleTyped = document.getElementById('roleTyped');
if (roleCycler && roleTyped) {
  roleCycler.hidden = false;
  const roles = [
    { label: 'Frontend Web Development', bio: 'dev' },
    { label: 'AI Data QA & Annotation', bio: 'support' },
    { label: 'IT Support & Troubleshooting', bio: 'support' },
    { label: 'Full-Stack Portfolio Craft', bio: 'overview' }
  ];
  let roleIdx = 0;
  let charIdx = roles[0].label.length;
  let deleting = false;
  let paused = false;

  const syncBioToRole = targetBio => {
    const btn = bioSwitcher?.querySelector(`button[data-bio="${targetBio}"]`);
    btn?.click();
  };

  if (!reducedMotionQuery.matches) {
    const stepTyping = () => {
      if (paused) {
        setTimeout(stepTyping, 300);
        return;
      }
      const targetText = roles[roleIdx].label;
      if (!deleting) {
        if (charIdx < targetText.length) {
          charIdx++;
          roleTyped.textContent = targetText.slice(0, charIdx);
          setTimeout(stepTyping, 55);
        } else {
          deleting = true;
          setTimeout(stepTyping, 2200);
        }
      } else if (charIdx > 0) {
        charIdx--;
        roleTyped.textContent = targetText.slice(0, charIdx);
        setTimeout(stepTyping, 28);
      } else {
        deleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
        setTimeout(stepTyping, 240);
      }
    };
    setTimeout(() => {
      deleting = true;
      stepTyping();
    }, 2400);
  }

  roleCycler.addEventListener('pointerenter', () => { paused = true; });
  roleCycler.addEventListener('pointerleave', () => { paused = false; });
  roleCycler.addEventListener('click', () => {
    roleIdx = (roleIdx + 1) % roles.length;
    deleting = false;
    charIdx = roles[roleIdx].label.length;
    roleTyped.textContent = roles[roleIdx].label;
    syncBioToRole(roles[roleIdx].bio);
  });
}

// Interactive cursor ring, magnetic buttons & click ripple (desktop fine pointer)
const cursorRing = document.getElementById('cursorRing');
if (cursorRing && finePointerQuery.matches && !reducedMotionQuery.matches) {
  let targetX = -100;
  let targetY = -100;
  let ringX = -100;
  let ringY = -100;
  let ringRaf = null;

  const tickRing = () => {
    ringX += (targetX - ringX) * 0.22;
    ringY += (targetY - ringY) * 0.22;
    cursorRing.style.left = `${ringX.toFixed(1)}px`;
    cursorRing.style.top = `${ringY.toFixed(1)}px`;
    if (Math.abs(targetX - ringX) > 0.25 || Math.abs(targetY - ringY) > 0.25) {
      ringRaf = requestAnimationFrame(tickRing);
    } else {
      ringRaf = null;
    }
  };

  document.addEventListener('pointermove', event => {
    targetX = event.clientX;
    targetY = event.clientY;
    cursorRing.classList.add('is-visible');
    const interactive = Boolean(event.target.closest('a, button, input, textarea, [role="tab"]'));
    cursorRing.classList.toggle('is-hover', interactive);
    if (!ringRaf) ringRaf = requestAnimationFrame(tickRing);
  });
  document.addEventListener('pointerleave', () => cursorRing.classList.remove('is-visible'));
  document.addEventListener('pointerdown', () => cursorRing.classList.add('is-down'));
  document.addEventListener('pointerup', () => cursorRing.classList.remove('is-down'));
}

// Button click ripple & subtle magnetic pull on .button CTAs
document.querySelectorAll('.button').forEach(btn => {
  btn.addEventListener('click', event => {
    if (reducedMotionQuery.matches) return;
    const rect = btn.getBoundingClientRect();
    const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    btn.append(ripple);
    setTimeout(() => ripple.remove(), 580);
  });

  if (finePointerQuery.matches && !reducedMotionQuery.matches) {
    btn.addEventListener('pointermove', event => {
      const rect = btn.getBoundingClientRect();
      const dx = (event.clientX - rect.left - rect.width / 2) * 0.14;
      const dy = (event.clientY - rect.top - rect.height / 2) * 0.14;
      btn.style.transform = `translate(${dx.toFixed(1)}px, ${(dy - 2).toFixed(1)}px)`;
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = '';
    });
  }
});

// Accent confetti burst overlay helper
function launchConfetti(sourceEl) {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas || typeof canvas.getContext !== 'function' || reducedMotionQuery.matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const rect = sourceEl ? sourceEl.getBoundingClientRect() : null;
  const ox = rect ? rect.left + rect.width / 2 : w / 2;
  const oy = rect ? rect.top + rect.height / 2 : h * 0.35;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#b74700';
  const palette = [accent, '#16a34a', '#2563eb', '#f59e0b', '#f2efe9'];

  const pieces = Array.from({ length: 34 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 34 + (Math.random() - 0.5) * 0.3;
    const speed = 3 + Math.random() * 5.5;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      size: 4 + Math.random() * 4,
      color: palette[i % palette.length],
      life: 1
    };
  });

  const step = () => {
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of pieces) {
      if (p.life <= 0.02) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.vx *= 0.985;
      p.life -= 0.018;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size * 0.7);
    }
    ctx.globalAlpha = 1;
    if (alive) {
      requestAnimationFrame(step);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  };
  requestAnimationFrame(step);
}

// Cursor spotlight glow across cards (fine-pointer devices only)
if (finePointerQuery.matches && !reducedMotionQuery.matches) {
  document.querySelectorAll('.spotlight-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
    });
  });
}
// Expandable & filterable career timeline
const toggleTimeline = document.getElementById('toggleTimeline');
const expFilters = document.getElementById('expFilters');
const timelineItems = Array.from(document.querySelectorAll('.timeline-item'));
const extraRoles = Array.from(document.querySelectorAll('.extra-role'));
let timelineExpanded = false;
let activeExpTrack = 'all';

function applyExperienceFilter(track) {
  activeExpTrack = track || 'all';
  if (expFilters) {
    expFilters.querySelectorAll('[data-track]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.track === activeExpTrack));
    });
  }
  timelineItems.forEach(item => {
    if (activeExpTrack === 'all') {
      item.hidden = item.classList.contains('extra-role') && !timelineExpanded;
    } else {
      item.hidden = item.dataset.track !== activeExpTrack;
    }
  });
  if (toggleTimeline) {
    toggleTimeline.hidden = activeExpTrack !== 'all';
  }
}

if (toggleTimeline && extraRoles.length > 0) {
  toggleTimeline.hidden = false;
  toggleTimeline.addEventListener('click', () => {
    timelineExpanded = !timelineExpanded;
    applyExperienceFilter('all');
    toggleTimeline.setAttribute('aria-expanded', String(timelineExpanded));
    toggleTimeline.textContent = timelineExpanded ? 'Hide earlier experience' : `Show earlier experience (${extraRoles.length} more)`;
  });
}

if (expFilters) {
  expFilters.hidden = false;
  expFilters.querySelectorAll('[data-track]').forEach(btn => {
    btn.addEventListener('click', () => applyExperienceFilter(btn.dataset.track));
  });
}

// Clickable role focus chip expanders inside career cards
document.querySelectorAll('.timeline-item').forEach(card => {
  const btn = card.querySelector('.role-detail-btn');
  const chips = card.querySelector('.role-chips');
  if (!btn || !chips) return;
  btn.hidden = false;
  btn.addEventListener('click', () => {
    const nextOpen = chips.hidden;
    chips.hidden = !nextOpen;
    btn.setAttribute('aria-expanded', String(nextOpen));
    btn.textContent = nextOpen ? '− Hide Focus' : '+ Key Focus';
  });
});

// Shared accessible dialog wiring helper
function openDialog(dialogEl, returnFocusEl) {
  if (!dialogEl || typeof dialogEl.showModal !== 'function') return;
  dialogEl._returnFocus = returnFocusEl || document.activeElement;
  dialogEl.showModal();
  document.body.classList.add('modal-open');
}

function wireDialogDismiss(dialogEl, closeEl) {
  if (!dialogEl || !closeEl) return;
  closeEl.addEventListener('click', () => dialogEl.close());
  let pointerStartedOutside = false;
  const outside = event => {
    const rect = dialogEl.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialogEl.addEventListener('pointerdown', event => { pointerStartedOutside = outside(event); });
  dialogEl.addEventListener('click', event => {
    if (event.target === dialogEl && pointerStartedOutside && outside(event)) dialogEl.close();
  });
  dialogEl.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (dialogEl._returnFocus && typeof dialogEl._returnFocus.focus === 'function') {
      dialogEl._returnFocus.focus();
    }
  });
}

// CV Preview modal
const cvModal = document.getElementById('cvModal');
const previewButton = document.getElementById('previewButton');
wireDialogDismiss(cvModal, document.getElementById('closeCV'));
if (cvModal && previewButton) {
  previewButton.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const frame = cvModal.querySelector('iframe');
    if (frame && !frame.getAttribute('src')) frame.src = frame.dataset.src;
    openDialog(cvModal, previewButton);
  });
}

// Project data powering shared Lightbox & Case Study modals
const projectCatalog = {
  simotsarap: {
    title: 'Simot Sarap — Live Website Preview',
    img: 'project-simotsarap.webp',
    alt: 'Full desktop preview of Simot Sarap Chicken Wings website',
    liveUrl: 'https://zetsume-simotsarap.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/simotsarap',
    eyebrow: '01 / WEB DEVELOPMENT & DEPLOYMENT',
    caseTitle: 'Case Study — Simot Sarap Chicken Wings',
    tags: ['React', 'Tailwind CSS', 'JavaScript', 'Lucide Icons', 'Google Maps Embed', 'Vercel'],
    blocks: [
      {
        heading: 'Challenge',
        text: 'Present a local Quezon City wing spot clearly online with fast menu browsing, authentic photography, customer reviews, and accurate branch directions on mobile and desktop.'
      },
      {
        heading: 'Architecture & Stack',
        text: 'Built with React, Tailwind CSS, and reusable UI components featuring instant client-side filtering across 9 food and beverage categories.'
      },
      {
        heading: 'Reliability & Branch Integration',
        text: 'Replaced expiring external image URLs with 13 locally bundled high-resolution photos (HTTP 200 served from Vercel) and pinned exact Fairview coordinates (14.6878125, 121.0920177) in the embedded map.'
      }
    ]
  },
  vesper: {
    title: 'Vesper Audio — Studio Storefront Preview',
    img: 'project-vesper.webp',
    alt: 'Full desktop preview of Vesper Audio hardware storefront',
    liveUrl: 'https://vesper-audio.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/vesper-audio',
    eyebrow: '02 / INTERACTIVE UI & WEB AUDIO',
    caseTitle: 'Case Study — Vesper Audio Storefront',
    tags: ['HTML5', 'CSS3', 'Vanilla JS', 'Canvas API', 'Web Audio API', 'localStorage'],
    blocks: [
      {
        heading: 'Challenge',
        text: 'Design a responsive product storefront for studio reference audio hardware without frameworks or build tools — staying interactive even offline.'
      },
      {
        heading: 'Hardware Customizer & DSP Canvas',
        text: 'Engineered a live VA-01 monitor finish customizer (Matte Obsidian, Brushed Silver, Signal Orange, Warm Bone) paired with a HiDPI HTML5 Canvas frequency curve visualizer and Web Audio API BiquadFilterNode synth.'
      },
      {
        heading: 'Persistent Studio Bag & Theming',
        text: 'Added slide-over cart state saved in localStorage (with promo code support), accessible quick-view specs modals, and dual Light/Dark Swiss grid themes.'
      }
    ]
  },
  labelgrid: {
    title: 'LabelGrid — Multimodal AI Annotation Workbench',
    img: 'project-labelgrid.webp',
    alt: 'LabelGrid multimodal AI data annotation workbench',
    liveUrl: 'https://labelgrid.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/labelgrid',
    eyebrow: 'AI & DATA QUALITY TOOLING',
    caseTitle: 'App Overview — LabelGrid',
    tags: ['HTML5 Canvas', 'Pointer Events', 'NER Tagging', 'COCO / YOLO / JSONL', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'A zero-dependency browser annotation studio bridging computer vision bounding boxes, NER text span tagging, and consensus QA workflows.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Switch across Street Traffic, Warehouse Robotics, and PCB Inspection frames to draw/move bounding boxes, tag UTF-16 entity offsets, adjust confidence thresholds, and export COCO JSON, YOLO .txt, or JSONL payloads.'
      }
    ]
  },
  foliovault: {
    title: 'FolioVault — Document Scanner & Archival Vault',
    img: 'project-foliovault.webp',
    alt: 'FolioVault physical document scanner and IndexedDB vault',
    liveUrl: 'https://foliovault-gamma.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/foliovault',
    eyebrow: 'DOCUMENT CAPTURE & INDEXEDDB',
    caseTitle: 'App Overview — FolioVault',
    tags: ['IndexedDB', 'HTML5 Canvas', 'OCR Metadata', 'Vanilla JS', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Client-side physical document scanner and local-first filing cabinet designed for digitizing receipts, contracts, and forms right in the browser.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Includes real-time Canvas whitening/B&W ink filters, -15° to +15° deskewing, 90° rotation, sample crooked-photo testing, folder filtering, OCR keyword search, and IndexedDB storage.'
      }
    ]
  },
  cutoutStudio: {
    title: 'Cutout Studio — Client-Side Background Remover',
    img: 'project-cutout-studio.webp',
    alt: 'Cutout Studio image background removal workspace',
    liveUrl: 'https://cutout-studio-navy.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/cutout-studio',
    eyebrow: 'PIXEL-LEVEL CANVAS EDITING',
    caseTitle: 'App Overview — Cutout Studio',
    tags: ['HTML5 Canvas', 'ImageData', 'Flood Fill', 'Magic Wand', 'PNG Export'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Zero-dependency browser background remover allowing fast edge-sampling matte extraction without server uploads.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Combines automatic perimeter flood-fill with feather/tolerance sliders, Magic Wand color keying, erase/restore brushes with 20-step Undo, before/after split divider, and composited PNG export.'
      }
    ]
  },
  restbench: {
    title: 'RestBench — In-Browser REST API Playground',
    img: 'project-restbench.webp',
    alt: 'RestBench REST API client and inspector',
    liveUrl: 'https://restbench.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/restbench',
    eyebrow: 'DEVELOPER API CLIENT',
    caseTitle: 'App Overview — RestBench',
    tags: ['Fetch API', 'Stateful Mock CRUD', 'JSON Inspector', 'cURL / Python Codegen', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Fast in-browser API testbed for inspecting HTTP requests, status codes, headers, and response payloads immediately.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Ships with stateful mock CRUD endpoints alongside live CORS fetch() execution, JSON syntax highlighting, header/body editors, and one-click cURL, fetch(), and Python requests snippets.'
      }
    ]
  },
  pathcraft: {
    title: 'PathCraft — A* & Graph Algorithm Visualizer',
    img: 'project-pathcraft.webp',
    alt: 'PathCraft pathfinding algorithm grid visualizer',
    liveUrl: 'https://pathcraft-inky.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/pathcraft',
    eyebrow: 'ALGORITHMS & DATA STRUCTURES',
    caseTitle: 'App Overview — PathCraft',
    tags: ['A* Search', 'Dijkstra / BFS / DFS', 'HTML5 Canvas', 'Benchmark Metrics', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Interactive computer-science visualizer comparing shortest-path heuristics and traversal tradeoffs in real time.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Supports A* (Manhattan & Euclidean), Dijkstra, BFS, Greedy Best-First, and DFS over drawable walls and 5x weighted swamp terrain with maze presets, step-by-step scrubbing, and compute-time logs.'
      }
    ]
  },
  chromalab: {
    title: 'ChromaLab — WCAG Contrast & Token Foundry',
    img: 'project-chromalab.webp',
    alt: 'ChromaLab WCAG contrast scale and design token foundry',
    liveUrl: 'https://chromalab-three.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/chromalab',
    eyebrow: 'ACCESSIBILITY & DESIGN SYSTEMS',
    caseTitle: 'App Overview — ChromaLab',
    tags: ['WCAG 2.1', 'CSS Custom Properties', 'Tailwind @theme', 'SVG Color Filters', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Design-token generator focused on accessible contrast compliance across 50–950 UI color ramps.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Computes real-time AA/AAA luminance ratios, offers one-click Auto-Fix to AA, simulates four types of color-vision deficiency via SVG matrices, and exports CSS, Tailwind, and W3C JSON tokens.'
      }
    ]
  },
  folioNotes: {
    title: 'Folio Notes — Markdown Notebook & Knowledge Graph',
    img: 'project-folio-notes.webp',
    alt: 'Folio Notes Markdown workspace and interactive force graph',
    liveUrl: 'https://folio-notes-puce.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/folio-notes',
    eyebrow: 'LOCAL-FIRST NOTEBOOK',
    caseTitle: 'App Overview — Folio Notes',
    tags: ['IndexedDB', 'Canvas Force Graph', 'Markdown Parser', 'Wiki Links', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Bi-directional Markdown note-taking workspace storing documents and graph links privately inside IndexedDB.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Features XSS-safe split Markdown rendering with task checkboxes, [[Wiki Link]] auto-creation, an interactive draggable force-directed node graph, .md export, and JSON vault backups.'
      }
    ]
  },
  ledgerflow: {
    title: 'LedgerFlow — SaaS Revenue & Cashflow Analytics',
    img: 'project-ledgerflow.webp',
    alt: 'LedgerFlow B2B SaaS financial dashboard',
    liveUrl: 'https://ledgerflow-sooty.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/ledgerflow',
    eyebrow: 'FINTECH DASHBOARD',
    caseTitle: 'App Overview — LedgerFlow',
    tags: ['HiDPI Canvas Charts', 'Invoice Ledger', 'CSV Export', 'Ctrl+K Palette', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Interactive B2B SaaS financial overview tracking recurring revenue, expenses, plan segments, and invoice settlement status.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Provides 3M/6M/12M horizon and plan-tier filters, interactive crosshair tooltips on Canvas charts, sortable localStorage invoice tables, manual invoice creation, and CSV export.'
      }
    ]
  },
  sprintdeck: {
    title: 'SprintDeck — Kanban Sprint & Issue Workspace',
    img: 'project-sprintdeck.webp',
    alt: 'SprintDeck drag-and-drop Kanban sprint board',
    liveUrl: 'https://sprintdeck-delta.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/sprintdeck',
    eyebrow: 'AGILE PRODUCTIVITY',
    caseTitle: 'App Overview — SprintDeck',
    tags: ['HTML5 Drag & Drop', 'Kanban / List Views', 'Story Points', 'localStorage', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Fast, keyboard-friendly sprint board for managing engineering backlogs and tracking sprint velocity.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Supports native drag-and-drop across 4 workflow columns, board/list view switching, multi-criteria priority/tag filters, full issue editing drawers, and localStorage state persistence.'
      }
    ]
  },
  meridianSync: {
    title: 'Meridian Sync — Remote Team Time-Zone Planner',
    img: 'project-meridian-sync.webp',
    alt: 'Meridian Sync DST-accurate timezone overlap grid',
    liveUrl: 'https://meridian-sync.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/meridian-sync',
    eyebrow: 'DISTRIBUTED SCHEDULING',
    caseTitle: 'App Overview — Meridian Sync',
    tags: ['Intl.DateTimeFormat', 'DST-Aware', '24h Overlap Grid', 'localStorage', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Coordination planner built on native browser Intl time-zone tables so distributed teammates can spot ideal meeting windows quickly.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Renders synchronized 24h core/flex/sleep timelines across global cities, evaluates 48 half-hour overlap slots automatically, toggles 12h/24h formats, and copies formatted multi-zone invites.'
      }
    ]
  },
  pulsegrid: {
    title: 'PulseGrid — 16-Step Drum Sequencer & Synth',
    img: 'project-pulsegrid.webp',
    alt: 'PulseGrid Web Audio 16-step drum sequencer',
    liveUrl: 'https://pulsegrid-gilt.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/pulsegrid',
    eyebrow: 'WEB AUDIO INSTRUMENT',
    caseTitle: 'App Overview — PulseGrid',
    tags: ['Web Audio API', '5-Voice Synth', 'Oscilloscope Canvas', 'JSON Export', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Zero-asset browser rhythm machine synthesizing Kick, Snare, Hi-Hat, Bass Synth, and Chord Stabs entirely with Web Audio oscillators and filters.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Features lookahead step scheduling, Shift-click accents, track Mute/Solo, Tempo/Swing/Cutoff/Drive controls, a live waveform oscilloscope Canvas, preset grooves, and JSON pattern export.'
      }
    ]
  },
  kotoCabin: {
    title: 'Koto Cabin — Architectural Retreat Showcase',
    img: 'project-koto-cabin.webp',
    alt: 'Koto Cabin architectural stay collection and reservation showcase',
    liveUrl: 'https://koto-cabin.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: 'https://github.com/aintzetsu/koto-cabin',
    eyebrow: 'EDITORIAL HOSPITALITY UI',
    caseTitle: 'App Overview — Koto Cabin',
    tags: ['HTML5 / CSS3', 'Custom SVG', 'Stay Calculator', 'localStorage', 'Vercel'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Architectural cabin booking showcase pairing custom SVG elevations with transparent stay pricing.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Includes landscape filters (Forest, Alpine, Lakeside, Private Sauna), nightly rate and add-on calculation, and instant localStorage itinerary reservations.'
      }
    ]
  },
  relay: {
    title: 'Relay — Workflow Automation & Webhook Studio',
    img: 'project-relay.webp',
    alt: 'Relay workflow automation and webhook studio dashboard',
    liveUrl: 'https://relay-pi-rust.vercel.app/',
    liveLabel: 'Visit Live Site ↗',
    repoUrl: null,
    eyebrow: 'WORKFLOW AUTOMATION STUDIO',
    caseTitle: 'App Overview — Relay',
    flow: ['Better Auth', 'Next.js API', 'Condition & Secrets', 'Neon Postgres'],
    tags: ['Next.js 16', 'React 19', 'Tailwind CSS', 'Better Auth', 'Neon Postgres', 'Vercel Schedules'],
    blocks: [
      {
        heading: 'Purpose',
        text: 'Full-stack workflow automation platform where users authenticate with isolated accounts to connect webhooks, recurring schedules, and team notifications.'
      },
      {
        heading: 'Interactive Capabilities',
        text: 'Chains multi-step HTTP requests, condition gates, and Discord/Slack webhook dispatches with AES-256-GCM encrypted secrets, live webhook URLs, recurring cron triggers, and redacted run logs.'
      }
    ]
  }
};

function syncModalActionLinks(liveEl, repoEl, item) {
  if (liveEl) {
    if (item.liveUrl) {
      liveEl.href = item.liveUrl;
      liveEl.textContent = item.liveLabel || 'Visit Live Site ↗';
      liveEl.hidden = false;
    } else {
      liveEl.hidden = true;
    }
  }
  if (repoEl) {
    if (item.repoUrl) {
      repoEl.href = item.repoUrl;
      repoEl.hidden = false;
    } else {
      repoEl.hidden = true;
    }
  }
}

const flowByCatalogKey = {
  simotsarap: ['Menu UI (React)', 'Category Filters', 'Static Media Bundle', 'Maps Embed'],
  vesper: ['Finish Customizer', 'DSP Biquad Synth', 'Canvas Visualizer', 'localStorage + Relay'],
  labelgrid: ['Canvas Box Engine', 'UTF-16 NER Spans', 'COCO / YOLO / JSONL', 'Relay Cloud Sync'],
  foliovault: ['Canvas Enhancer', 'Deskew & Filters', 'OCR Metadata Index', 'IndexedDB + Relay'],
  cutoutStudio: ['Perimeter Sampling', 'Flood-Fill Matte', '20-Step Undo', 'PNG + Relay Sync'],
  restbench: ['Request Builder', 'Mock CRUD Engine', 'Live fetch() Runner', 'Codegen + Relay'],
  pathcraft: ['Grid & Weights', 'Heuristic Stepper', '60fps Canvas Draw', 'Metrics + Relay'],
  chromalab: ['Color Scale Engine', 'WCAG AA/AAA Audit', 'CVD SVG Matrices', 'Tokens + Relay'],
  folioNotes: ['Markdown Parser', '[[Wiki Links]]', 'Force Graph Canvas', 'IndexedDB + Relay'],
  ledgerflow: ['Horizon Filters', 'HiDPI Canvas Charts', 'Sortable Ledger', 'CSV + Relay Sync'],
  sprintdeck: ['Drag & Drop Board', 'Story Point Metrics', 'Priority Filters', 'localStorage + Relay'],
  meridianSync: ['Intl.DateTimeFormat', '24h Overlap Matrix', 'DST Slot Scorer', 'Relay Cloud Sync'],
  pulsegrid: ['Lookahead Clock', '5-Voice Web Audio', 'Oscilloscope Canvas', 'JSON + Relay Sync'],
  kotoCabin: ['SVG Elevations', 'Landscape Filters', 'Rate Calculator', 'Itinerary + Relay'],
  relay: ['Better Auth', 'Webhook & Cron', 'AES-256-GCM Secrets', 'Neon Postgres']
};

function createArchFlowEl(key, fallbackTags = []) {
  const steps = flowByCatalogKey[key] || fallbackTags.slice(0, 4);
  const wrap = document.createElement('div');
  wrap.className = 'arch-flow';
  wrap.setAttribute('aria-label', 'Architecture data flow');
  steps.forEach((step, idx) => {
    if (idx > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'arch-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      wrap.append(arrow);
    }
    const node = document.createElement('span');
    node.className = 'arch-node';
    node.textContent = step;
    wrap.append(node);
  });
  return wrap;
}

const imageModal = document.getElementById('imageModal');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxLiveLink = document.getElementById('lightboxLiveLink');
const lightboxRepoLink = document.getElementById('lightboxRepoLink');
wireDialogDismiss(imageModal, document.getElementById('closeLightbox'));

document.querySelectorAll('[data-preview]').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = projectCatalog[trigger.dataset.preview];
    if (!item || !imageModal) return;
    lightboxTitle.textContent = item.title;
    lightboxImg.hidden = false;
    lightboxImg.src = item.img;
    lightboxImg.alt = item.alt;
    syncModalActionLinks(lightboxLiveLink, lightboxRepoLink, item);
    openDialog(imageModal, trigger);
  });
});

const caseStudyModal = document.getElementById('caseStudyModal');
const caseStudyTitle = document.getElementById('caseStudyTitle');
const caseStudyEyebrow = document.getElementById('caseStudyEyebrow');
const caseStudyBlocks = document.getElementById('caseStudyBlocks');
const caseStudyTags = document.getElementById('caseStudyTags');
const caseStudyLiveLink = document.getElementById('caseStudyLiveLink');
const caseStudyRepoLink = document.getElementById('caseStudyRepoLink');
wireDialogDismiss(caseStudyModal, document.getElementById('closeCaseStudy'));

function openCaseStudy(key, triggerEl) {
  const item = projectCatalog[key];
  if (!item || !caseStudyModal) return;
  caseStudyTitle.textContent = item.caseTitle;
  caseStudyEyebrow.textContent = item.eyebrow;

  caseStudyBlocks.replaceChildren(
    ...item.blocks.map(block => {
      const div = document.createElement('div');
      div.className = 'case-block';
      const h3 = document.createElement('h3');
      h3.textContent = block.heading;
      const p = document.createElement('p');
      p.textContent = block.text;
      div.append(h3, p);
      return div;
    })
  );

  caseStudyBlocks.append(createArchFlowEl(key, item.tags));

  caseStudyTags.replaceChildren(
    ...item.tags.map(tag => {
      const li = document.createElement('li');
      li.textContent = tag;
      return li;
    })
  );

  syncModalActionLinks(caseStudyLiveLink, caseStudyRepoLink, item);
  openDialog(caseStudyModal, triggerEl);
}

// Interactive category filter, layout switcher, search & Show More collapse across all 15 Featured Projects
const projectControls = document.getElementById('projectControls');
const projectSearch = document.getElementById('projectSearch');
const projectViewToggle = document.getElementById('projectViewToggle');
const featuredProjectList = document.getElementById('featuredProjectList');
const featuredProjectCards = Array.from(document.querySelectorAll('#featuredProjectList .project-card'));
const projectsEmpty = document.getElementById('projectsEmpty');
const projectsToggleWrap = document.getElementById('projectsToggleWrap');
const toggleProjects = document.getElementById('toggleProjects');
const INITIAL_PROJECTS_SHOWN = 3;
let activeProjCat = 'all';
let projectView = 'stack';
let projectsExpanded = false;

function updateFeaturedProjects() {
  const query = (projectSearch ? projectSearch.value : '').trim().toLowerCase();
  const isFiltered = activeProjCat !== 'all' || Boolean(query);
  const showAllMatches = isFiltered || projectsExpanded || projectView === 'grid';

  if (featuredProjectList) {
    featuredProjectList.classList.toggle('is-grid', projectView === 'grid');
  }
  if (projectViewToggle) {
    projectViewToggle.querySelectorAll('[data-proj-view]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.projView === projectView));
    });
  }
  if (projectControls) {
    projectControls.querySelectorAll('[data-proj-cat]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.projCat === activeProjCat));
    });
  }

  let matchedCount = 0;
  featuredProjectCards.forEach(card => {
    const matchesCat = activeProjCat === 'all' || card.dataset.projCat === activeProjCat;
    const searchable = `${card.dataset.projKeywords || ''} ${card.textContent.toLowerCase()}`;
    const matchesQuery = !query || searchable.includes(query);
    const matches = matchesCat && matchesQuery;
    if (matches) matchedCount++;
    const show = matches && (showAllMatches || matchedCount <= INITIAL_PROJECTS_SHOWN);
    card.hidden = !show;
  });

  if (projectsEmpty) projectsEmpty.hidden = matchedCount > 0;

  if (projectsToggleWrap && toggleProjects) {
    const canCollapse = projectView === 'stack' && !isFiltered && matchedCount > INITIAL_PROJECTS_SHOWN;
    projectsToggleWrap.hidden = !canCollapse;
    if (canCollapse) {
      const hiddenCount = matchedCount - INITIAL_PROJECTS_SHOWN;
      toggleProjects.setAttribute('aria-expanded', String(projectsExpanded));
      toggleProjects.textContent = projectsExpanded
        ? 'Show fewer projects'
        : `Show more projects (${hiddenCount} more)`;
    }
  }
}

if (toggleProjects) {
  toggleProjects.addEventListener('click', () => {
    projectsExpanded = !projectsExpanded;
    updateFeaturedProjects();
    if (!projectsExpanded) {
      document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

function revealProjectCardIfNeeded(cardOrId) {
  const card = typeof cardOrId === 'string' ? document.querySelector(cardOrId) : cardOrId;
  if (card && card.classList.contains('project-card') && card.hidden) {
    activeProjCat = 'all';
    if (projectSearch) projectSearch.value = '';
    projectsExpanded = true;
    updateFeaturedProjects();
  }
}

document.addEventListener('click', event => {
  const anchor = event.target.closest('a[href^="#project-"]');
  if (anchor) revealProjectCardIfNeeded(anchor.getAttribute('href'));
});

window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#project-')) revealProjectCardIfNeeded(location.hash);
});
if (location.hash.startsWith('#project-')) revealProjectCardIfNeeded(location.hash);

if (projectControls && featuredProjectCards.length > 0) {
  projectControls.hidden = false;
  updateFeaturedProjects();
  projectControls.querySelectorAll('[data-proj-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeProjCat = btn.dataset.projCat;
      updateFeaturedProjects();
    });
  });
  if (projectViewToggle) {
    projectViewToggle.querySelectorAll('[data-proj-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        projectView = btn.dataset.projView === 'grid' ? 'grid' : 'stack';
        updateFeaturedProjects();
      });
    });
  }
  if (projectSearch) {
    projectSearch.addEventListener('input', updateFeaturedProjects);
  }
}

// Populate Blueprint views for cards referencing projectCatalog so all 15 Featured cards share one template
document.querySelectorAll('.project-card[data-catalog]').forEach(card => {
  const key = card.dataset.catalog;
  const item = projectCatalog[key];
  const blueprintEl = card.querySelector('.browser-blueprint');
  if (!item || !blueprintEl || blueprintEl.childElementCount > 0) return;

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'ARCHITECTURE BLUEPRINT';

  const list = document.createElement('ul');
  list.className = 'blueprint-list';
  item.blocks.forEach(block => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = block.heading;
    const span = document.createElement('span');
    span.textContent = block.text;
    li.append(strong, span);
    list.append(li);
  });

  const stackLi = document.createElement('li');
  const stackTitle = document.createElement('strong');
  stackTitle.textContent = 'Stack';
  const stackText = document.createElement('span');
  stackText.textContent = item.tags.join(' · ');
  stackLi.append(stackTitle, stackText);
  list.append(stackLi);

  const actions = document.createElement('div');
  actions.className = 'blueprint-actions';
  const caseBtn = document.createElement('button');
  caseBtn.type = 'button';
  caseBtn.className = 'copy-button';
  caseBtn.dataset.casestudy = key;
  caseBtn.textContent = 'Open Case Study';
  actions.append(caseBtn);

  blueprintEl.append(eyebrow, list, createArchFlowEl(key, item.tags), actions);
});

document.querySelectorAll('[data-casestudy]').forEach(btn => {
  btn.addEventListener('click', () => openCaseStudy(btn.dataset.casestudy, btn));
});

// Interactive Preview vs Blueprint vs Live Lab switcher inside project browser mockups
let openVesperLab = () => {};
document.querySelectorAll('.browser-frame').forEach(frame => {
  const modeBar = frame.querySelector('.browser-mode-switch');
  const previewBtn = frame.querySelector('.media-preview-trigger');
  const blueprintEl = frame.querySelector('.browser-blueprint');
  const labEl = frame.querySelector('.browser-lab');
  if (!modeBar || !previewBtn || !blueprintEl) return;

  modeBar.hidden = false;
  const tabs = Array.from(modeBar.querySelectorAll('button[data-frame-mode]'));
  const setMode = mode => {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.frameMode === mode)));
    previewBtn.hidden = mode !== 'visual';
    blueprintEl.hidden = mode !== 'blueprint';
    if (labEl) labEl.hidden = mode !== 'lab';
    const isInteractivePanel = mode !== 'visual';
    frame.classList.toggle('is-blueprint', isInteractivePanel);
    if (isInteractivePanel) frame.style.transform = '';
    if (mode === 'lab' && labEl && labEl.id === 'vesperLab') {
      requestAnimationFrame(drawVesperCurve);
    }
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.frameMode));
  });

  if (labEl && labEl.id === 'vesperLab') {
    openVesperLab = () => setMode('lab');
  }
});

// Simot Sarap Live Menu Filter Demo (authentic items from simotsarap mock.js)
const simotMenuItems = [
  { name: 'Classic Wings (6pcs)', price: '₱149', cat: 'wings' },
  { name: 'Spicy Buffalo Wings (6pcs)', price: '₱159', cat: 'wings' },
  { name: 'Honey Garlic Wings (6pcs)', price: '₱159', cat: 'wings' },
  { name: 'Chicken Wings Rice Bowl', price: '₱129', cat: 'rice meals' },
  { name: 'Chicken Teriyaki Rice', price: '₱149', cat: 'rice meals' },
  { name: 'Classic Chicken Poppers', price: '₱99', cat: 'poppers' },
  { name: 'Poppers Bucket (30pcs)', price: '₱249', cat: 'poppers' },
  { name: 'Chicken Japchae', price: '₱149', cat: 'japchae' }
];
const simotMenuTabs = document.getElementById('simotMenuTabs');
const simotMenuList = document.getElementById('simotMenuList');
const simotLabCount = document.getElementById('simotLabCount');

function renderSimotLab(cat) {
  if (!simotMenuList) return;
  const filtered = cat === 'all' ? simotMenuItems : simotMenuItems.filter(item => item.cat === cat);
  if (simotMenuTabs) {
    simotMenuTabs.querySelectorAll('[data-simot-cat]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.simotCat === cat));
    });
  }
  if (simotLabCount) {
    simotLabCount.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;
  }
  simotMenuList.replaceChildren(
    ...filtered.map(item => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = item.name;
      const price = document.createElement('span');
      price.textContent = item.price;
      li.append(strong, price);
      return li;
    })
  );
}

if (simotMenuTabs && simotMenuList) {
  renderSimotLab('all');
  simotMenuTabs.querySelectorAll('[data-simot-cat]').forEach(btn => {
    btn.addEventListener('click', () => renderSimotLab(btn.dataset.simotCat));
  });
}

// Vesper Audio Mini Hardware & Live DSP Canvas Lab + shared Web Audio synth helper
const vesperFinishes = {
  obsidian: 'Matte Obsidian',
  silver: 'Brushed Silver',
  orange: 'Signal Orange',
  bone: 'Warm Bone'
};
const vesperUnitBox = document.getElementById('vesperUnitBox');
const vesperFinishLabel = document.getElementById('vesperFinishLabel');
const vesperFinishBtns = document.getElementById('vesperFinishBtns');
const vesperLowSlider = document.getElementById('vesperLowSlider');
const vesperHighSlider = document.getElementById('vesperHighSlider');
const lowGainVal = document.getElementById('lowGainVal');
const highGainVal = document.getElementById('highGainVal');
const vesperDspCanvas = document.getElementById('vesperDspCanvas');

function drawVesperCurve() {
  if (!vesperDspCanvas || typeof vesperDspCanvas.getContext !== 'function') return;
  const ctx = vesperDspCanvas.getContext('2d');
  if (!ctx) return;

  const rect = vesperDspCanvas.getBoundingClientRect();
  const w = Math.max(240, Math.floor(rect.width || 420));
  const h = Math.max(70, Math.floor(rect.height || 82));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (vesperDspCanvas.width !== w * dpr || vesperDspCanvas.height !== h * dpr) {
    vesperDspCanvas.width = w * dpr;
    vesperDspCanvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const lowDb = Number(vesperLowSlider?.value || 0);
  const highDb = Number(vesperHighSlider?.value || 0);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff5c28';

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  const midY = h / 2;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(w, midY);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const t = x / w;
    const lowWeight = 1 / (1 + Math.exp((t - 0.28) * 14));
    const highWeight = 1 / (1 + Math.exp(-(t - 0.68) * 14));
    const gain = lowDb * lowWeight + highDb * highWeight;
    const y = midY - gain * (h * 0.048);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
refreshVesperCurve = drawVesperCurve;

if (vesperFinishBtns && vesperUnitBox) {
  vesperFinishBtns.querySelectorAll('[data-vesper-finish]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.vesperFinish;
      vesperUnitBox.dataset.finish = key;
      if (vesperFinishLabel) vesperFinishLabel.textContent = vesperFinishes[key] || key;
      vesperFinishBtns.querySelectorAll('[data-vesper-finish]').forEach(b => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
    });
  });
}

[vesperLowSlider, vesperHighSlider].forEach(slider => {
  if (!slider) return;
  slider.addEventListener('input', () => {
    if (lowGainVal && vesperLowSlider) {
      const v = Number(vesperLowSlider.value);
      lowGainVal.textContent = `${v > 0 ? '+' + v : v} dB`;
    }
    if (highGainVal && vesperHighSlider) {
      const v = Number(vesperHighSlider.value);
      highGainVal.textContent = `${v > 0 ? '+' + v : v} dB`;
    }
    drawVesperCurve();
  });
});

let activeAudioCtx = null;
function playVesperTone(btnEl, defaultLabel, lowDb = 0, highDb = 0) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    showToast('Web Audio API unavailable in this browser');
    return;
  }
  try {
    if (!activeAudioCtx) activeAudioCtx = new AudioCtx();
    if (activeAudioCtx.state === 'suspended') activeAudioCtx.resume();
    const now = activeAudioCtx.currentTime;
    const gain = activeAudioCtx.createGain();
    const shelfLow = activeAudioCtx.createBiquadFilter();
    shelfLow.type = 'lowshelf';
    shelfLow.frequency.setValueAtTime(220, now);
    shelfLow.gain.setValueAtTime(lowDb, now);

    const shelfHigh = activeAudioCtx.createBiquadFilter();
    shelfHigh.type = 'highshelf';
    shelfHigh.frequency.setValueAtTime(1800, now);
    shelfHigh.gain.setValueAtTime(highDb, now);

    const filter = activeAudioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(520, now + 0.7);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    [440, 659.25].forEach(freq => {
      const osc = activeAudioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(shelfLow);
      osc.start(now);
      osc.stop(now + 0.75);
    });

    shelfLow.connect(shelfHigh);
    shelfHigh.connect(filter);
    filter.connect(gain);
    gain.connect(activeAudioCtx.destination);

    if (btnEl) {
      btnEl.textContent = 'Playing 440Hz Reference...';
      btnEl.disabled = true;
      setTimeout(() => {
        btnEl.textContent = defaultLabel;
        btnEl.disabled = false;
      }, 760);
    }
    showToast(`Vesper Audio synth (${lowDb >= 0 ? '+' + lowDb : lowDb} / ${highDb >= 0 ? '+' + highDb : highDb} dB)`);
  } catch {
    showToast('Unable to play reference tone');
  }
}

const vesperAudioTest = document.getElementById('vesperAudioTest');
if (vesperAudioTest) {
  vesperAudioTest.addEventListener('click', () => {
    playVesperTone(vesperAudioTest, 'Play Studio Reference Tone', 0, 0);
  });
}

const vesperLabToneBtn = document.getElementById('vesperLabToneBtn');
if (vesperLabToneBtn) {
  vesperLabToneBtn.addEventListener('click', () => {
    playVesperTone(
      vesperLabToneBtn,
      'Play Calibrated Sweep',
      Number(vesperLowSlider?.value || 0),
      Number(vesperHighSlider?.value || 0)
    );
  });
}

// Interactive Skill-to-Proof Linking
const skillProofMap = {
  annotation: { title: 'Data Annotation', text: 'Used daily at RWS and Innodata evaluating multimodal AI training datasets.', target: '#role-rws', label: 'View RWS & Innodata roles →' },
  validation: { title: 'Data Validation', text: 'Performed systematic dataset validation and guideline consistency checks at RWS and Innodata.', target: '#role-innodata', label: 'View Innodata role →' },
  qa: { title: 'Quality Assurance', text: 'Reviewed and audited annotation outputs to maintain accuracy and quality standards.', target: '#role-rws', label: 'View QA experience →' },
  multimedia: { title: 'Audio, Text & Multimedia Review', text: 'Evaluated audio, text, and visual content for AI model training at RWS and Innodata.', target: '#role-rws', label: 'View experience →' },
  react: { title: 'React', text: 'Built the responsive Simot Sarap frontend with interactive menu category filters.', target: '#project-simotsarap', label: 'Jump to Simot Sarap →' },
  tailwind: { title: 'Tailwind CSS', text: 'Styled responsive sections, cards, and mobile navigation on Simot Sarap.', target: '#project-simotsarap', label: 'Jump to Simot Sarap →' },
  javascript: { title: 'JavaScript', text: 'Powers Vesper Audio, Simot Sarap, LabelGrid, RestBench, Relay, PulseGrid, PathCraft, and all 15 featured projects.', target: '#projects', label: 'Jump to Featured Projects →' },
  htmlcss: { title: 'HTML & CSS', text: 'Modular CSS tokens & responsive grids across Vesper Audio, ChromaLab, Koto Cabin, this portfolio, and DepEd web updates.', target: '#project-vesper', label: 'Jump to Vesper Audio →' },
  php: { title: 'PHP', text: 'Server-side web programming studied and practiced during BSIT coursework at STI College Fairview.', target: '#experience', label: 'View education →' },
  python: { title: 'Python', text: 'Scripting and programming fundamentals developed in IT coursework and automation tasks.', target: '#experience', label: 'View education →' },
  java: { title: 'Java', text: 'Object-oriented programming applied during BSIT studies at STI College Fairview.', target: '#experience', label: 'View education →' },
  csharp: { title: 'C#', text: 'Application programming language from BSIT coursework at STI College Fairview.', target: '#experience', label: 'View education →' },
  cpp: { title: 'C++', text: 'Foundational systems and algorithmic programming from BSIT studies.', target: '#experience', label: 'View education →' },
  sql: { title: 'SQL', text: 'Relational querying and structured data management across IT coursework and reporting.', target: '#experience', label: 'View education →' },
  mysql: { title: 'MySQL', text: 'Relational database schema design and data management practiced during BSIT studies.', target: '#experience', label: 'View education →' },
  sap: { title: 'SAP Software', text: 'Practiced inventory, sales, purchasing, finance, and reporting during STI SAP Systems Practicum.', target: '#role-sap', label: 'View SAP practicum →' },
  support: { title: 'IT Support & Troubleshooting', text: 'Supported users, system maintenance, and office records as IT Support Intern at DepEd NCR HRDD–NEAP.', target: '#role-deped', label: 'View DepEd NCR internship →' },
  hardware: { title: 'Hardware Diagnostics', text: 'Assembled PC units and diagnosed hardware issues as Computer System Servicing Trainee at SLDM College.', target: '#role-sldm', label: 'View SLDM training →' },
  networking: { title: 'Networking', text: 'Covered networking fundamentals and maintenance through System Administration certification at STI.', target: '#experience', label: 'View certification →' },
  sysadmin: { title: 'System Administration', text: 'Certified in System Administration at STI College Fairview and practiced at DepEd NCR.', target: '#experience', label: 'View certification →' },
  git: { title: 'Git & GitHub', text: 'Version control and public source hosting for Vesper Audio, Simot Sarap, and this portfolio.', target: '#githubSnapshot', label: 'View GitHub repositories →' },
  vercel: { title: 'Vercel', text: 'Production deployment across all 15 featured projects (Simot Sarap, Vesper Audio, LabelGrid, FolioVault, RestBench, Relay, etc.) plus this portfolio.', target: '#projects', label: 'Jump to Featured Projects →' },
  design: { title: 'Graphic Design', text: 'Digital design production honed as Freelance Embroidery Designer at Wilcom Embroidery Studio.', target: '#role-wilcom', label: 'View design experience →' }
};

const skillButtons = Array.from(document.querySelectorAll('.skill-tag'));
const proofBox = document.getElementById('skillProofBox');
const proofTitle = document.getElementById('skillProofTitle');
const proofText = document.getElementById('skillProofText');
const proofLink = document.getElementById('skillProofLink');
const clearProofBtn = document.getElementById('clearSkillProof');
let activeSkillKey = null;

function clearSkillProof() {
  activeSkillKey = null;
  skillButtons.forEach(btn => btn.setAttribute('aria-pressed', 'false'));
  document.querySelectorAll('.is-proof-highlight').forEach(el => el.classList.remove('is-proof-highlight'));
  if (proofBox) proofBox.hidden = true;
}

function selectSkillProof(key) {
  if (activeSkillKey === key) {
    clearSkillProof();
    return;
  }
  const info = skillProofMap[key];
  if (!info || !proofBox) return;
  activeSkillKey = key;
  skillButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.skill === key)));
  document.querySelectorAll('.is-proof-highlight').forEach(el => el.classList.remove('is-proof-highlight'));

  proofTitle.textContent = info.title;
  proofText.textContent = info.text;
  proofLink.href = info.target;
  proofLink.textContent = info.label;
  proofBox.hidden = false;

  const targetEl = document.querySelector(info.target);
  if (targetEl) {
    if (targetEl.classList.contains('timeline-item') && activeExpTrack !== 'all') {
      applyExperienceFilter('all');
    }
    if (targetEl.classList.contains('extra-role') && targetEl.hidden && toggleTimeline) {
      toggleTimeline.click();
    }
    if (targetEl.classList.contains('project-card') && targetEl.hidden) {
      revealProjectCardIfNeeded(targetEl);
    }
    targetEl.classList.add('is-proof-highlight');
  }
}

skillButtons.forEach(btn => {
  btn.addEventListener('click', () => selectSkillProof(btn.dataset.skill));
});
if (clearProofBtn) clearProofBtn.addEventListener('click', clearSkillProof);

const skillRibbon = document.getElementById('skillRibbon');
if (skillRibbon) {
  skillRibbon.addEventListener('click', event => {
    const btn = event.target.closest('[data-skill]');
    if (!btn) return;
    if (activeSkillKey === btn.dataset.skill) {
      document.getElementById('skillProofBox')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    selectSkillProof(btn.dataset.skill);
    document.getElementById('skillProofBox')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// Interactive skill category filter and keyword search
const skillsControls = document.getElementById('skillsControls');
const skillFilterInput = document.getElementById('skillFilterInput');
const skillsGrid = document.querySelector('.skills-grid');
const skillGroups = Array.from(document.querySelectorAll('.skill-group[data-cat]'));
const skillsEmpty = document.getElementById('skillsEmpty');
let activeSkillCat = 'all';

function updateSkillsFilter() {
  const query = (skillFilterInput ? skillFilterInput.value : '').trim().toLowerCase();
  const catBtns = skillsControls ? Array.from(skillsControls.querySelectorAll('[data-skill-cat]')) : [];
  catBtns.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.skillCat === activeSkillCat)));

  let shownCount = 0;
  skillGroups.forEach(group => {
    const matchesCat = activeSkillCat === 'all' || group.dataset.cat === activeSkillCat;
    const chips = Array.from(group.querySelectorAll('.skill-tag'));
    let hasQueryMatch = false;

    chips.forEach(chip => {
      const label = chip.textContent.toLowerCase();
      const key = (chip.dataset.skill || '').toLowerCase();
      const hit = !query || label.includes(query) || key.includes(query);
      if (hit) hasQueryMatch = true;
      chip.classList.toggle('is-match', Boolean(query) && hit && matchesCat);
      chip.hidden = Boolean(query) && !hit;
    });

    const visibleGroup = matchesCat && (!query || hasQueryMatch);
    group.hidden = !visibleGroup;
    if (visibleGroup) shownCount++;
  });

  if (skillsGrid) skillsGrid.classList.toggle('is-single', shownCount === 1);
  if (skillsEmpty) skillsEmpty.hidden = shownCount > 0;
}

if (skillsControls) {
  skillsControls.hidden = false;
  skillsControls.querySelectorAll('[data-skill-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSkillCat = btn.dataset.skillCat;
      updateSkillsFilter();
    });
  });
  if (skillFilterInput) {
    skillFilterInput.addEventListener('input', updateSkillsFilter);
  }
}

// Command Palette (Ctrl+K / Cmd+K)
const commandModal = document.getElementById('commandModal');
const openPaletteBtn = document.getElementById('openPalette');
const openTerminalBtn = document.getElementById('openTerminal');
const closePaletteBtn = document.getElementById('closePalette');
const paletteInput = document.getElementById('paletteInput');
const paletteList = document.getElementById('paletteList');

const copyEmailAddress = async () => {
  const copyBtn = document.getElementById('copyEmail');
  try {
    await navigator.clipboard.writeText('gaudicosmedisonjr@gmail.com');
    if (copyBtn) {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    }
    showToast('Email copied: gaudicosmedisonjr@gmail.com');
  } catch {
    showToast('Unable to copy email automatically');
  }
};

const paletteActions = [
  { title: 'Leave a Like / Appreciate Portfolio', hint: 'Like ❤️', run: () => { togglePortfolioLike(openPaletteBtn); } },
  { title: 'Open Interactive Terminal (> _)', hint: 'Shortcut `', run: () => { if (openTerminalBtn) openTerminalBtn.click(); } },
  { title: 'Launch Vesper Audio DSP Live Lab', hint: 'Interactive', run: () => { openVesperLab(); document.getElementById('project-vesper')?.scrollIntoView({ behavior: 'smooth' }); } },
  { title: 'Trigger Accent Confetti Burst', hint: 'Fun', run: () => launchConfetti(null) },
  { title: 'Jump to Introduction', hint: '#introduction', run: () => { location.hash = '#introduction'; } },
  { title: 'Jump to Experience & Education', hint: '#experience', run: () => { location.hash = '#experience'; } },
  { title: 'Jump to Featured Projects (15)', hint: '#projects', run: () => { location.hash = '#projects'; } },
  { title: 'Toggle Projects Layout (Stack / Grid)', hint: 'Layout', run: () => { projectView = projectView === 'grid' ? 'stack' : 'grid'; updateFeaturedProjects(); location.hash = '#projects'; } },
  { title: 'Inspect LabelGrid (AI Annotation App)', hint: 'Featured 03', run: () => openCaseStudy('labelgrid', openPaletteBtn) },
  { title: 'Read Simot Sarap Case Study', hint: 'Modal', run: () => openCaseStudy('simotsarap', openPaletteBtn) },
  { title: 'Read Vesper Audio Case Study', hint: 'Modal', run: () => openCaseStudy('vesper', openPaletteBtn) },
  { title: 'Jump to Skills', hint: '#skills', run: () => { location.hash = '#skills'; } },
  { title: 'Jump to Contact', hint: '#contact', run: () => { location.hash = '#contact'; } },
  { title: 'Preview CV (PDF)', hint: 'Dialog', run: () => { if (previewButton) previewButton.click(); } },
  { title: 'Toggle Light / Dark Theme', hint: 'Theme', run: toggleTheme },
  { title: 'Switch Accent: Cobalt Blue', hint: 'Accent', run: () => applyAccent('cobalt', true) },
  { title: 'Switch Accent: Emerald Teal', hint: 'Accent', run: () => applyAccent('teal', true) },
  { title: 'Switch Accent: Studio Plum', hint: 'Accent', run: () => applyAccent('plum', true) },
  { title: 'Switch Accent: Rust Orange', hint: 'Accent', run: () => applyAccent('rust', true) },
  { title: 'Copy Email Address', hint: 'Clipboard', run: copyEmailAddress },
  { title: 'Open GitHub Profile (@aintzetsu)', hint: 'External ↗', run: () => window.open('https://github.com/aintzetsu', '_blank', 'noopener,noreferrer') }
];

let paletteIndex = 0;
let filteredActions = [...paletteActions];

function renderPalette(query) {
  if (!paletteList) return;
  const q = (query || '').trim().toLowerCase();
  filteredActions = paletteActions.filter(a => a.title.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q));
  paletteIndex = 0;

  if (filteredActions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'palette-item';
    empty.textContent = 'No matching commands';
    paletteList.replaceChildren(empty);
    return;
  }

  paletteList.replaceChildren(
    ...filteredActions.map((action, idx) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `palette-item${idx === paletteIndex ? ' is-focused' : ''}`;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', String(idx === paletteIndex));
      const span = document.createElement('span');
      span.textContent = action.title;
      const small = document.createElement('small');
      small.textContent = action.hint;
      btn.append(span, small);
      btn.addEventListener('click', () => {
        commandModal.close();
        action.run();
      });
      li.append(btn);
      return li;
    })
  );
}

function openCommandPalette() {
  if (!commandModal || typeof commandModal.showModal !== 'function') return;
  renderPalette('');
  if (paletteInput) paletteInput.value = '';
  openDialog(commandModal, openPaletteBtn);
  if (paletteInput) paletteInput.focus();
}

if (openPaletteBtn && commandModal) {
  openPaletteBtn.hidden = false;
  openPaletteBtn.addEventListener('click', openCommandPalette);
  wireDialogDismiss(commandModal, closePaletteBtn);
  if (paletteInput) {
    paletteInput.addEventListener('input', () => renderPalette(paletteInput.value));
    paletteInput.addEventListener('keydown', event => {
      if (filteredActions.length === 0) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        paletteIndex = (paletteIndex + (event.key === 'ArrowDown' ? 1 : -1) + filteredActions.length) % filteredActions.length;
        Array.from(paletteList.querySelectorAll('.palette-item')).forEach((el, idx) => {
          el.classList.toggle('is-focused', idx === paletteIndex);
          el.setAttribute('aria-selected', String(idx === paletteIndex));
        });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const chosen = filteredActions[paletteIndex];
        commandModal.close();
        if (chosen) chosen.run();
      }
    });
  }
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (commandModal.open) {
        commandModal.close();
      } else {
        openCommandPalette();
      }
    }
  });
}

// Interactive Portfolio Terminal (>_ button or backtick shortcut)
const terminalModal = document.getElementById('terminalModal');
const closeTerminalBtn = document.getElementById('closeTerminal');
const terminalOutput = document.getElementById('terminalOutput');
const terminalForm = document.getElementById('terminalForm');
const terminalInput = document.getElementById('terminalInput');

function appendTermLine(text, className = '') {
  if (!terminalOutput) return;
  const line = document.createElement('p');
  line.className = `term-line${className ? ' ' + className : ''}`;
  line.textContent = text;
  terminalOutput.append(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function appendTermAction(label, onClick) {
  if (!terminalOutput) return;
  const line = document.createElement('p');
  line.className = 'term-line';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'term-action';
  btn.textContent = `→ ${label}`;
  btn.addEventListener('click', onClick);
  line.append(btn);
  terminalOutput.append(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function printTerminalWelcome() {
  if (!terminalOutput || terminalOutput.childElementCount > 0) return;
  appendTermLine('Edison Gaudicos Interactive Portfolio Shell v2.0', 'is-muted');
  appendTermLine('Type "help" or click any suggestion chip above to inspect experience, projects, skills, or theme live.', 'is-muted');
}

function runTerminalCommand(rawInput) {
  const cleaned = rawInput.trim();
  if (!cleaned) return;
  appendTermLine(`ejg@qc:~$ ${cleaned}`, 'is-cmd');

  const [cmdRaw, ...rest] = cleaned.split(/\s+/);
  const cmd = cmdRaw.toLowerCase();
  const arg = rest.join(' ').trim().toLowerCase();

  if (cmd === 'clear') {
    terminalOutput.replaceChildren();
    return;
  }
  if (cmd === 'exit' || cmd === 'close') {
    terminalModal.close();
    return;
  }
  if (cmd === 'help') {
    appendTermLine('Commands: whoami | apps | lab | like | experience [qa|systems|all] | projects | skills <keyword> | theme [light|dark|toggle] | accent [rust|cobalt|teal|plum] | confetti | status | cv | contact | clear | exit');
    return;
  }
  if (cmd === 'like' || cmd === 'love') {
    const alreadyLiked = likedTargets.has('portfolio');
    submitLikeAction('portfolio', 'like', terminalModal).then(res => {
      const count = res?.likes ?? (likeCounts.portfolio || 0);
      appendTermLine(alreadyLiked
        ? `Portfolio already liked (${count} total portfolio ${count === 1 ? 'like' : 'likes'}).`
        : `Appreciation saved to Neon Postgres! Portfolio likes: ${count}`);
      appendTermAction('Jump to Visitor Appreciation section', () => {
        terminalModal.close();
        document.getElementById('appreciate')?.scrollIntoView({ behavior: 'smooth' });
      });
    });
    return;
  }
  if (cmd === 'apps' || cmd === 'vercel') {
    appendTermLine('All 15 Featured Web Apps (alongside ejg-portfolio):');
    appendTermLine('• Simot Sarap, Vesper Audio, LabelGrid, FolioVault, Cutout Studio, RestBench, PathCraft, ChromaLab, Folio Notes, LedgerFlow, SprintDeck, Meridian Sync, PulseGrid, Koto Cabin, Relay');
    appendTermAction('Jump to All 15 Featured Projects', () => {
      terminalModal.close();
      location.hash = '#projects';
    });
    return;
  }
  if (cmd === 'lab') {
    terminalModal.close();
    openVesperLab();
    document.getElementById('project-vesper')?.scrollIntoView({ behavior: 'smooth' });
    showToast('Opened Vesper Audio VA-01 Interactive Lab');
    return;
  }
  if (cmd === 'confetti') {
    terminalModal.close();
    launchConfetti(null);
    showToast('Confetti burst!');
    return;
  }
  if (cmd === 'whoami') {
    appendTermLine('Edison Jr. Magparoc Gaudicos — Quezon City, PH');
    appendTermLine('Current: Data Service Specialist @ RWS (June 2026 – Present)');
    appendTermLine('Degree: BS Information Technology, STI College Fairview (2021–2025) · System Administration Certificate');
    return;
  }
  if (cmd === 'status') {
    const themeNow = document.documentElement.dataset.theme || 'light';
    const accentNow = document.documentElement.dataset.accent || 'rust';
    const phtNow = localTimeEl && localTimeEl.textContent ? localTimeEl.textContent : 'Asia/Manila';
    appendTermLine(`Time: ${phtNow} | Theme: ${themeNow} | Accent: ${accentNow} | Viewport: ${window.innerWidth}x${window.innerHeight}`);
    return;
  }
  if (cmd === 'experience' || cmd === 'exp') {
    const roles = [
      { track: 'qa', text: '2026–Present · Data Service Specialist @ RWS' },
      { track: 'qa', text: '2025–2026 · Data Annotator @ Innodata' },
      { track: 'systems', text: 'Jan–Jun 2025 · IT Support Intern @ DepEd NCR HRDD-NEAP' },
      { track: 'systems', text: 'Jan–Jun 2024 · SAP Systems Practicum @ STI College Fairview' },
      { track: 'design', text: '2021–2023 · Freelance Embroidery Designer @ Wilcom' },
      { track: 'systems', text: 'Mar–Jul 2020 · Computer System Servicing Trainee @ SLDM College' }
    ].filter(r => !arg || arg === 'all' || r.track === arg);

    if (roles.length === 0) {
      appendTermLine(`No track named "${arg}". Try: experience qa, experience systems, or experience all.`, 'is-muted');
      return;
    }
    roles.forEach(r => appendTermLine(`• ${r.text}`));
    appendTermAction('Jump to & filter Experience section', () => {
      terminalModal.close();
      applyExperienceFilter(['qa', 'systems', 'design'].includes(arg) ? arg : 'all');
      location.hash = '#experience';
    });
    return;
  }
  if (cmd === 'projects') {
    appendTermLine('1) Simot Sarap — zetsume-simotsarap.vercel.app');
    appendTermLine('2) Vesper Audio — vesper-audio.vercel.app (GitHub: aintzetsu/vesper-audio)');
    appendTermLine('+ 13 more live Vercel web apps including Relay (run "apps" to list all).');
    appendTermAction('Inspect Featured Projects', () => {
      terminalModal.close();
      location.hash = '#projects';
    });
    return;
  }
  if (cmd === 'skills' || cmd === 'skill') {
    const entries = Object.entries(skillProofMap).filter(([k, v]) => (
      !arg || k.includes(arg) || v.title.toLowerCase().includes(arg) || v.text.toLowerCase().includes(arg)
    ));
    if (entries.length === 0) {
      appendTermLine(`No matching skill found for "${arg}". Try: skills react, skills sap, or skills sql.`, 'is-muted');
      return;
    }
    entries.slice(0, 6).forEach(([, info]) => appendTermLine(`• ${info.title}: ${info.text}`));
    const [firstKey, firstInfo] = entries[0];
    appendTermAction(`Highlight "${firstInfo.title}" on page`, () => {
      terminalModal.close();
      selectSkillProof(firstKey);
      document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth' });
    });
    return;
  }
  if (cmd === 'theme') {
    if (arg === 'light' || arg === 'dark') {
      applyTheme(arg, true);
    } else {
      toggleTheme();
    }
    appendTermLine(`Theme is now "${document.documentElement.dataset.theme || 'light'}".`);
    return;
  }
  if (cmd === 'accent') {
    if (!ACCENTS.includes(arg)) {
      appendTermLine(`Available accents: ${ACCENTS.join(', ')}`, 'is-muted');
      return;
    }
    applyAccent(arg, true);
    appendTermLine(`Accent palette switched to "${arg}".`);
    return;
  }
  if (cmd === 'cv') {
    appendTermAction('Open CV Preview Modal', () => {
      terminalModal.close();
      previewButton?.click();
    });
    return;
  }
  if (cmd === 'contact') {
    appendTermLine('Email: gaudicosmedisonjr@gmail.com | GitHub: @aintzetsu');
    appendTermAction('Jump to Contact Form', () => {
      terminalModal.close();
      location.hash = '#contact';
    });
    return;
  }
  appendTermLine(`Unknown command "${cmd}". Type "help" for supported commands.`, 'is-muted');
}

function openTerminal() {
  if (!terminalModal || typeof terminalModal.showModal !== 'function') return;
  printTerminalWelcome();
  openDialog(terminalModal, openTerminalBtn);
  terminalInput?.focus();
}

if (openTerminalBtn && terminalModal) {
  openTerminalBtn.hidden = false;
  openTerminalBtn.addEventListener('click', openTerminal);
  wireDialogDismiss(terminalModal, closeTerminalBtn);
  if (terminalForm && terminalInput) {
    terminalForm.addEventListener('submit', event => {
      event.preventDefault();
      runTerminalCommand(terminalInput.value);
      terminalInput.value = '';
    });
  }
  terminalModal.querySelectorAll('.term-chip[data-cmd]').forEach(chip => {
    chip.addEventListener('click', () => {
      runTerminalCommand(chip.dataset.cmd);
      terminalInput?.focus();
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== '`' || event.ctrlKey || event.metaKey || event.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (document.querySelector('dialog[open]') && !terminalModal.open) return;
    event.preventDefault();
    if (terminalModal.open) {
      terminalModal.close();
    } else {
      openTerminal();
    }
  });
}

// Live GitHub snapshot enhancement (safe public unauthenticated endpoint with static fallback)
const githubReposContainer = document.getElementById('githubRepos');
if (githubReposContainer && typeof fetch === 'function') {
  fetch('https://api.github.com/users/aintzetsu/repos?sort=updated&per_page=8', {
    headers: { Accept: 'application/vnd.github+json' }
  })
    .then(res => (res.ok ? res.json() : null))
    .then(repos => {
      if (!Array.isArray(repos) || repos.length === 0) return;
      const publicRepos = repos.filter(repo => !repo.private && repo.name !== 'aintzetsu').slice(0, 6);
      if (publicRepos.length === 0) return;
      githubReposContainer.replaceChildren(
        ...publicRepos.map(repo => {
          const link = document.createElement('a');
          link.className = 'repo-mini';
          link.href = repo.html_url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';

          const title = document.createElement('strong');
          title.textContent = `${repo.name} ↗`;

          const meta = document.createElement('span');
          const lang = repo.language || 'Code';
          const desc = repo.description ? `${repo.description} · ` : '';
          meta.textContent = `${desc}${lang}`;

          link.append(title, meta);
          return link;
        })
      );
    })
    .catch(() => {
      // Static fallback repositories remain intact.
    });
}

// Contact form handling (supports Gmail, mailto app, and one-click draft copy)
const copyEmailButton = document.getElementById('copyEmail');
if (copyEmailButton) {
  copyEmailButton.addEventListener('click', copyEmailAddress);
}

const contactForm = document.getElementById('contactForm');
const mailtoButton = document.getElementById('mailtoButton');
const copyDraftButton = document.getElementById('copyDraftButton');
const formFeedback = document.getElementById('formFeedback');
const topicStarters = document.getElementById('topicStarters');
const messageField = document.getElementById('message');
const msgCounter = document.getElementById('msgCounter');

const topicTemplates = {
  role: 'Hi Edison, I came across your portfolio and would like to connect regarding an IT / Developer opportunity.',
  web: 'Hi Edison, I liked Simot Sarap and Vesper Audio and would love to discuss building a responsive website or UI.',
  qa: 'Hi Edison, we are looking for an AI Data QA / Annotation specialist and wanted to discuss your experience at RWS and Innodata.',
  hi: 'Hi Edison! I wanted to reach out and connect about your work.'
};

function updateMessageCounter() {
  if (!msgCounter || !messageField) return;
  msgCounter.textContent = `${messageField.value.length} / ${messageField.maxLength || 5000}`;
}

if (topicStarters && messageField) {
  topicStarters.hidden = false;
  topicStarters.querySelectorAll('button[data-topic]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.topic;
      if (!topicTemplates[key]) return;
      topicStarters.querySelectorAll('button[data-topic]').forEach(b => b.classList.toggle('is-chosen', b === btn));
      messageField.value = topicTemplates[key];
      updateMessageCounter();
      messageField.focus();
      showToast('Added quick inquiry template');
    });
  });
}

if (msgCounter && messageField) {
  msgCounter.hidden = false;
  updateMessageCounter();
  messageField.addEventListener('input', updateMessageCounter);
}

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
  showToast(text);
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
    launchConfetti(contactForm.querySelector('button[type="submit"]'));
  });
}

if (mailtoButton && contactForm) {
  mailtoButton.addEventListener('click', () => {
    if (!contactForm.reportValidity()) return;
    const { subject, body } = getFormMessageData();
    const mailtoUrl = `mailto:gaudicosmedisonjr@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    showFeedback('Opened draft in your email app.');
    launchConfetti(mailtoButton);
  });
}

if (copyDraftButton && contactForm) {
  copyDraftButton.addEventListener('click', async () => {
    if (!contactForm.reportValidity()) return;
    const { subject, body } = getFormMessageData();
    try {
      await navigator.clipboard.writeText(`To: gaudicosmedisonjr@gmail.com\nSubject: ${subject}\n\n${body}`);
      showFeedback('Formatted inquiry copied to clipboard.');
      launchConfetti(copyDraftButton);
    } catch {
      showFeedback('Could not copy automatically.');
    }
  });
}

// Shared Persistent Visitor Likes & Site Metrics (Neon Postgres via /api/likes)
const likeCounts = Object.create(null);
const likedTargets = new Set();
const pendingLikeTargets = new Set();
const projectTitlesById = Object.create(null);
const siteMetrics = { visits: 0, cvDownloads: 0 };
const appreciateStatsEl = document.getElementById('appreciateStats');
const appreciateProjectsSummaryEl = document.getElementById('appreciateProjectsSummary');

function syncSiteMetrics() {
  document.querySelectorAll('[data-metric]').forEach(el => {
    const key = el.dataset.metric;
    if (key === 'visits' || key === 'cvDownloads') {
      el.textContent = String(Math.max(0, Number(siteMetrics[key]) || 0));
    }
  });
}

function persistLocalMetrics() {
  try {
    localStorage.setItem('ejg-metrics-cache', JSON.stringify(siteMetrics));
  } catch {}
}

async function recordSiteMetric(action) {
  if (action === 'cv_download') {
    siteMetrics.cvDownloads++;
    syncSiteMetrics();
    persistLocalMetrics();
    showToast('Downloading CV...');
  }
  try {
    const resp = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      keepalive: true,
      body: JSON.stringify({ target: 'site', visitorId: getVisitorId(), action }),
    });
    const data = await resp.json().catch(() => null);
    if (resp.ok && data?.ok && data.metrics) {
      siteMetrics.visits = Math.max(0, Number(data.metrics.visits) || 0);
      siteMetrics.cvDownloads = Math.max(0, Number(data.metrics.cvDownloads) || 0);
      persistLocalMetrics();
      syncSiteMetrics();
    }
  } catch {
    // Silent fallback when offline
  }
}

function initHoverPreviewReels() {
  document.querySelectorAll('.project-card').forEach(card => {
    const trigger = card.querySelector('.media-preview-trigger');
    const frame = card.querySelector('.browser-frame');
    if (!trigger || !frame || trigger.querySelector('.preview-reel')) return;

    const key = trigger.dataset.preview || card.dataset.catalog;
    const fallbackSteps = Array.from(card.querySelectorAll('.tags li')).map(li => li.textContent.trim()).slice(0, 4);
    const steps = (key && flowByCatalogKey[key]) || fallbackSteps;
    if (!steps || steps.length === 0) return;

    const reel = document.createElement('div');
    reel.className = 'preview-reel';
    reel.setAttribute('aria-hidden', 'true');

    const dot = document.createElement('span');
    dot.className = 'preview-reel-dot';

    const label = document.createElement('span');
    label.className = 'preview-reel-text';
    label.textContent = `1/${steps.length} · ${steps[0]}`;

    const bar = document.createElement('span');
    bar.className = 'preview-reel-bar';

    reel.append(dot, label, bar);
    trigger.append(reel);

    let stepIdx = 0;
    let timer = null;

    const startReel = () => {
      frame.classList.add('is-previewing');
      if (reducedMotionQuery.matches || timer || steps.length <= 1) return;
      timer = setInterval(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        label.textContent = `${stepIdx + 1}/${steps.length} · ${steps[stepIdx]}`;
      }, 1400);
    };

    const stopReel = () => {
      frame.classList.remove('is-previewing');
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      stepIdx = 0;
      label.textContent = `1/${steps.length} · ${steps[0]}`;
    };

    trigger.addEventListener('pointerenter', startReel);
    trigger.addEventListener('pointerleave', stopReel);
    trigger.addEventListener('focus', startReel);
    trigger.addEventListener('blur', stopReel);
  });
}

function getVisitorId() {
  try {
    const existing = localStorage.getItem('ejg-visitor-id');
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
    const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `v_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`
      : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem('ejg-visitor-id', generated);
    return generated;
  } catch {
    return 'v_anon_fallback_001';
  }
}

function createHeartSvg() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ui-icon heart-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z');
  svg.append(path);
  return svg;
}

function injectProjectLikeButtons() {
  featuredProjectCards.forEach(card => {
    const target = card.id;
    const linksRow = card.querySelector('.project-links');
    const heading = card.querySelector('h3');
    if (!target || !linksRow || linksRow.querySelector('[data-like-btn]')) return;
    const title = heading ? heading.textContent.trim() : target;
    projectTitlesById[target] = title;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'project-like-btn';
    btn.dataset.likeBtn = '';
    btn.dataset.likeTarget = target;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', `Like ${title}`);

    const countSpan = document.createElement('span');
    countSpan.className = 'like-count';
    countSpan.dataset.likeCount = target;
    countSpan.textContent = '0';

    btn.append(createHeartSvg(), countSpan);
    linksRow.append(btn);
  });
}

function renderLikeSummary() {
  const portfolioTotal = Math.max(0, Number(likeCounts.portfolio) || 0);
  const projectLikes = Object.entries(likeCounts)
    .filter(([key, val]) => key.startsWith('project-') && Number(val) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const totalProjectLikes = projectLikes.reduce((acc, [, val]) => acc + Number(val), 0);

  if (appreciateStatsEl) {
    if (portfolioTotal === 0 && totalProjectLikes === 0) {
      appreciateStatsEl.textContent = 'Be the first visitor to leave a like on this portfolio.';
    } else {
      const visitorLabel = `${portfolioTotal} ${portfolioTotal === 1 ? 'visitor has' : 'visitors have'} liked this portfolio`;
      const projectPart = totalProjectLikes > 0
        ? ` · ${totalProjectLikes} project ${totalProjectLikes === 1 ? 'like' : 'likes'}`
        : '';
      appreciateStatsEl.textContent = `${visitorLabel}${projectPart}.`;
    }
  }

  if (appreciateProjectsSummaryEl) {
    if (projectLikes.length > 0) {
      const topList = projectLikes
        .slice(0, 3)
        .map(([key, count]) => `${projectTitlesById[key] || key.replace('project-', '')} (${count})`)
        .join(' · ');
      appreciateProjectsSummaryEl.textContent = `Top liked projects: ${topList}`;
      appreciateProjectsSummaryEl.hidden = false;
    } else {
      appreciateProjectsSummaryEl.hidden = true;
    }
  }

  document.querySelectorAll('.favorite-crown').forEach(el => el.remove());
  projectLikes.slice(0, 3).forEach(([targetId]) => {
    const eyebrow = document.querySelector(`#${targetId} .project-details .eyebrow`);
    if (!eyebrow) return;
    const crown = document.createElement('span');
    crown.className = 'favorite-crown';
    crown.textContent = '★ Top Liked';
    eyebrow.append(crown);
  });
}

function syncLikeButtons() {
  document.querySelectorAll('[data-like-btn][data-like-target]').forEach(btn => {
    const target = btn.dataset.likeTarget;
    const isLiked = likedTargets.has(target);
    btn.classList.toggle('is-liked', isLiked);
    btn.setAttribute('aria-pressed', String(isLiked));
    const labelEl = btn.querySelector('.like-label');
    if (labelEl) {
      if (btn.id === 'mainLikeBtn') {
        labelEl.textContent = isLiked ? 'Liked · Thank you!' : 'Leave a Like';
      } else {
        labelEl.textContent = isLiked ? 'Liked' : 'Like';
      }
    }
  });

  document.querySelectorAll('[data-like-count]').forEach(el => {
    const target = el.dataset.likeCount;
    el.textContent = String(Math.max(0, Number(likeCounts[target]) || 0));
  });

  renderLikeSummary();
}

function persistLocalLikes() {
  try {
    localStorage.setItem('ejg-liked-targets', JSON.stringify(Array.from(likedTargets)));
    localStorage.setItem('ejg-like-counts-cache', JSON.stringify(likeCounts));
  } catch {}
}

function triggerHeartPop(target) {
  document.querySelectorAll(`[data-like-btn][data-like-target="${target}"]`).forEach(btn => {
    btn.classList.remove('is-popping');
    void btn.offsetWidth;
    btn.classList.add('is-popping');
  });
}

async function submitLikeAction(target, action, originEl) {
  if (!target || pendingLikeTargets.has(target)) return null;
  pendingLikeTargets.add(target);

  const prevCount = Math.max(0, Number(likeCounts[target]) || 0);
  const wasLiked = likedTargets.has(target);

  if (action === 'like' && !wasLiked) {
    likedTargets.add(target);
    likeCounts[target] = prevCount + 1;
    triggerHeartPop(target);
    if (originEl) launchConfetti(originEl);
  } else if (action === 'unlike' && wasLiked) {
    likedTargets.delete(target);
    likeCounts[target] = Math.max(0, prevCount - 1);
  }
  syncLikeButtons();

  try {
    const resp = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ target, visitorId: getVisitorId(), action }),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      throw new Error(data?.error || `HTTP ${resp.status}`);
    }

    likeCounts[target] = Math.max(0, Number(data.likes) || 0);
    if (data.liked) {
      likedTargets.add(target);
    } else {
      likedTargets.delete(target);
    }
    persistLocalLikes();
    syncLikeButtons();

    const targetLabel = target === 'portfolio' ? 'portfolio' : (projectTitlesById[target] || 'project');
    showToast(data.liked ? `Thanks! Liked ${targetLabel} (${data.likes}).` : `Removed like from ${targetLabel}.`);
    return data;
  } catch {
    likeCounts[target] = prevCount;
    if (wasLiked) likedTargets.add(target);
    else likedTargets.delete(target);
    syncLikeButtons();
    showToast('Could not save like right now. Please try again.');
    return null;
  } finally {
    pendingLikeTargets.delete(target);
  }
}

function togglePortfolioLike(originEl) {
  const targetEl = document.getElementById('appreciate');
  if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const action = likedTargets.has('portfolio') ? 'unlike' : 'like';
  return submitLikeAction('portfolio', action, originEl || document.getElementById('mainLikeBtn'));
}

async function initVisitorLikes() {
  injectProjectLikeButtons();
  initHoverPreviewReels();

  try {
    const cachedCounts = JSON.parse(localStorage.getItem('ejg-like-counts-cache') || '{}');
    if (cachedCounts && typeof cachedCounts === 'object') {
      Object.entries(cachedCounts).forEach(([k, v]) => { likeCounts[k] = Math.max(0, Number(v) || 0); });
    }
    const cachedLiked = JSON.parse(localStorage.getItem('ejg-liked-targets') || '[]');
    if (Array.isArray(cachedLiked)) cachedLiked.forEach(t => likedTargets.add(t));
    const cachedMetrics = JSON.parse(localStorage.getItem('ejg-metrics-cache') || '{}');
    if (cachedMetrics && typeof cachedMetrics === 'object') {
      siteMetrics.visits = Math.max(0, Number(cachedMetrics.visits) || 0);
      siteMetrics.cvDownloads = Math.max(0, Number(cachedMetrics.cvDownloads) || 0);
    }
  } catch {}
  syncLikeButtons();
  syncSiteMetrics();

  const downloadCvBtn = document.getElementById('downloadCvBtn');
  if (downloadCvBtn) {
    downloadCvBtn.addEventListener('click', () => {
      recordSiteMetric('cv_download');
    });
  }

  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-like-btn][data-like-target]');
    if (!btn) return;
    const target = btn.dataset.likeTarget;
    const action = likedTargets.has(target) ? 'unlike' : 'like';
    submitLikeAction(target, action, btn);
  });

  try {
    const visitorId = encodeURIComponent(getVisitorId());
    const resp = await fetch(`/api/likes?visitorId=${visitorId}`, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data && data.ok && data.counts) {
      Object.entries(data.counts).forEach(([k, v]) => {
        likeCounts[k] = Math.max(0, Number(v) || 0);
      });
      likedTargets.clear();
      if (Array.isArray(data.liked)) {
        data.liked.forEach(t => likedTargets.add(t));
      }
      if (data.metrics) {
        siteMetrics.visits = Math.max(0, Number(data.metrics.visits) || 0);
        siteMetrics.cvDownloads = Math.max(0, Number(data.metrics.cvDownloads) || 0);
        persistLocalMetrics();
        syncSiteMetrics();
      }
      persistLocalLikes();
      syncLikeButtons();
    }
  } catch {
    if (appreciateStatsEl && (Number(likeCounts.portfolio) || 0) === 0) {
      appreciateStatsEl.textContent = 'Tap Leave a Like to show appreciation.';
    }
  }

  try {
    if (!sessionStorage.getItem('ejg-visit-recorded')) {
      sessionStorage.setItem('ejg-visit-recorded', '1');
      recordSiteMetric('visit');
    }
  } catch {}
}

initVisitorLikes();

const footerPaletteBtn = document.getElementById('footerPaletteBtn');
if (footerPaletteBtn && commandModal) {
  footerPaletteBtn.hidden = false;
  footerPaletteBtn.addEventListener('click', openCommandPalette);
}

const footerTermBtn = document.getElementById('footerTermBtn');
if (footerTermBtn && openTerminalBtn) {
  footerTermBtn.hidden = false;
  footerTermBtn.addEventListener('click', () => openTerminalBtn.click());
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
