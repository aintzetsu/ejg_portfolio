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

// Highlight active navigation link based on visible section
const navLinks = Array.from(document.querySelectorAll('#mainNav a[href^="#"]'));
const sections = navLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

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
}

const updateScrollState = () => {
  header.classList.toggle('scrolled', window.scrollY > 50);
  if (backToTopBtn) backToTopBtn.hidden = window.scrollY < 480;
  if (window.scrollY < 80) setActiveNav('introduction');
  if (scrollProgress) {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    scrollProgress.style.width = `${pct.toFixed(1)}%`;
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

// Theme toggle (light/dark) persisted in localStorage
const themeToggle = document.getElementById('themeToggle');
const themeMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  if (themeMeta) themeMeta.content = isDark ? '#161513' : '#f5f4f1';
  if (themeToggle) {
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  try { localStorage.setItem('ejg-theme', nextTheme); } catch {}
  showToast(`Switched to ${nextTheme} mode`);
}

if (themeToggle) {
  themeToggle.hidden = false;
  const savedTheme = (() => {
    try { return localStorage.getItem('ejg-theme'); } catch { return null; }
  })();
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  themeToggle.addEventListener('click', toggleTheme);
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
  bioTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.bio;
      if (!bioCopy[key]) return;
      heroBio.textContent = bioCopy[key];
      bioTabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
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

// Cursor spotlight glow across cards (fine-pointer devices only)
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.spotlight-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
    });
  });
}

// Expandable earlier career timeline
const toggleTimeline = document.getElementById('toggleTimeline');
const extraRoles = Array.from(document.querySelectorAll('.extra-role'));
if (toggleTimeline && extraRoles.length > 0) {
  toggleTimeline.hidden = false;
  let expanded = false;
  toggleTimeline.addEventListener('click', () => {
    expanded = !expanded;
    extraRoles.forEach(role => { role.hidden = !expanded; });
    toggleTimeline.setAttribute('aria-expanded', String(expanded));
    toggleTimeline.textContent = expanded ? 'Hide earlier experience' : `Show earlier experience (${extraRoles.length} more)`;
  });
}

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
    liveUrl: '',
    liveLabel: '',
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
  }
};

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
    lightboxImg.src = item.img;
    lightboxImg.alt = item.alt;
    if (item.liveUrl) {
      lightboxLiveLink.href = item.liveUrl;
      lightboxLiveLink.textContent = item.liveLabel;
      lightboxLiveLink.hidden = false;
    } else {
      lightboxLiveLink.hidden = true;
    }
    lightboxRepoLink.href = item.repoUrl;
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

  caseStudyTags.replaceChildren(
    ...item.tags.map(tag => {
      const li = document.createElement('li');
      li.textContent = tag;
      return li;
    })
  );

  if (item.liveUrl) {
    caseStudyLiveLink.href = item.liveUrl;
    caseStudyLiveLink.textContent = item.liveLabel;
    caseStudyLiveLink.hidden = false;
  } else {
    caseStudyLiveLink.hidden = true;
  }
  caseStudyRepoLink.href = item.repoUrl;
  openDialog(caseStudyModal, triggerEl);
}

document.querySelectorAll('[data-casestudy]').forEach(btn => {
  btn.addEventListener('click', () => openCaseStudy(btn.dataset.casestudy, btn));
});

// Interactive Skill-to-Proof Linking
const skillProofMap = {
  annotation: { title: 'Data Annotation', text: 'Used daily at RWS and Innodata evaluating multimodal AI training datasets.', target: '#role-rws', label: 'View RWS & Innodata roles →' },
  validation: { title: 'Data Validation', text: 'Performed systematic dataset validation and guideline consistency checks at RWS and Innodata.', target: '#role-innodata', label: 'View Innodata role →' },
  qa: { title: 'Quality Assurance', text: 'Reviewed and audited annotation outputs to maintain accuracy and quality standards.', target: '#role-rws', label: 'View QA experience →' },
  multimedia: { title: 'Audio, Text & Multimedia Review', text: 'Evaluated audio, text, and visual content for AI model training at RWS and Innodata.', target: '#role-rws', label: 'View experience →' },
  react: { title: 'React', text: 'Built the responsive Simot Sarap restaurant frontend with interactive menu category filters.', target: '#project-simotsarap', label: 'Jump to Simot Sarap →' },
  tailwind: { title: 'Tailwind CSS', text: 'Styled responsive sections, cards, and mobile navigation on Simot Sarap.', target: '#project-simotsarap', label: 'Jump to Simot Sarap →' },
  javascript: { title: 'JavaScript', text: 'Powers Vesper Audio (Canvas visualizer, Web Audio synth, cart state), Simot Sarap, and this portfolio.', target: '#project-vesper', label: 'Jump to Vesper Audio →' },
  htmlcss: { title: 'HTML & CSS', text: 'Modular CSS tokens & responsive grids in Vesper Audio, this portfolio, and DepEd web updates.', target: '#project-vesper', label: 'Jump to Vesper Audio →' },
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
  vercel: { title: 'Vercel', text: 'Continuous production deployment for Simot Sarap and ejg-portfolio.vercel.app.', target: '#project-simotsarap', label: 'Jump to Simot Sarap →' },
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
    if (targetEl.classList.contains('extra-role') && targetEl.hidden && toggleTimeline) {
      toggleTimeline.click();
    }
    targetEl.classList.add('is-proof-highlight');
  }
}

skillButtons.forEach(btn => {
  btn.addEventListener('click', () => selectSkillProof(btn.dataset.skill));
});
if (clearProofBtn) clearProofBtn.addEventListener('click', clearSkillProof);

// Command Palette (Ctrl+K / Cmd+K)
const commandModal = document.getElementById('commandModal');
const openPaletteBtn = document.getElementById('openPalette');
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
  { title: 'Jump to Introduction', hint: '#introduction', run: () => { location.hash = '#introduction'; } },
  { title: 'Jump to Experience & Education', hint: '#experience', run: () => { location.hash = '#experience'; } },
  { title: 'Jump to Featured Projects', hint: '#projects', run: () => { location.hash = '#projects'; } },
  { title: 'Read Simot Sarap Case Study', hint: 'Modal', run: () => openCaseStudy('simotsarap', openPaletteBtn) },
  { title: 'Read Vesper Audio Case Study', hint: 'Modal', run: () => openCaseStudy('vesper', openPaletteBtn) },
  { title: 'Jump to Skills', hint: '#skills', run: () => { location.hash = '#skills'; } },
  { title: 'Jump to Contact', hint: '#contact', run: () => { location.hash = '#contact'; } },
  { title: 'Preview CV (PDF)', hint: 'Dialog', run: () => { if (previewButton) previewButton.click(); } },
  { title: 'Toggle Light / Dark Theme', hint: 'Theme', run: toggleTheme },
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

// Live GitHub snapshot enhancement (safe public unauthenticated endpoint with static fallback)
const githubReposContainer = document.getElementById('githubRepos');
if (githubReposContainer && typeof fetch === 'function') {
  fetch('https://api.github.com/users/aintzetsu/repos?sort=updated&per_page=3', {
    headers: { Accept: 'application/vnd.github+json' }
  })
    .then(res => (res.ok ? res.json() : null))
    .then(repos => {
      if (!Array.isArray(repos) || repos.length === 0) return;
      const publicRepos = repos.filter(repo => !repo.private).slice(0, 3);
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

if (copyDraftButton && contactForm) {
  copyDraftButton.addEventListener('click', async () => {
    if (!contactForm.reportValidity()) return;
    const { subject, body } = getFormMessageData();
    try {
      await navigator.clipboard.writeText(`To: gaudicosmedisonjr@gmail.com\nSubject: ${subject}\n\n${body}`);
      showFeedback('Formatted inquiry copied to clipboard.');
    } catch {
      showFeedback('Could not copy automatically.');
    }
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
