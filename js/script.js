document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  initHeroScene(reduceMotion);
  initBgParticles(reduceMotion);
  initScrollProgress();
  initAnimations();
  initTiltCards(reduceMotion);
  initActiveNav();
  initMobileNav();
  initHeaderScroll();
  initStatsCounter(reduceMotion);
  initTimelineFill();
  initFaqAccordion();
  initContactForm();
  initChatbot();
});

/* =====================
   HERO — Three.js AI-core scene
   A wireframe icosahedron core, two orbiting particle "network" shells,
   and connector lines that draw themselves in on load, then pulse.
   Tilts toward the cursor and nudges with scroll position.
   ===================== */
function initHeroScene(reduceMotion) {
  const canvas = document.getElementById("heroCanvas");
  const wrap = document.querySelector(".hero-scene-wrap");
  if (!canvas || !wrap || typeof THREE === "undefined") {
    if (wrap) wrap.style.display = "none";
    return;
  }

  // Low-power device check: fewer particles / lines, no antialiasing.
  // Keeps the hero smooth on budget phones instead of just relying on reduceMotion.
  const isLowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || window.innerWidth < 480;

  let width = wrap.clientWidth;
  let height = wrap.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(0, 0, 9);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isLowPower });
  } catch (e) {
    wrap.style.display = "none";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPower ? 1.5 : 2));
  renderer.setSize(width, height);

  const group = new THREE.Group();
  scene.add(group);

  // core wireframe icosahedron
  const coreGeo = new THREE.IcosahedronGeometry(1.65, 1);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x6de0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.5
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // inner faint solid glow sphere
  const glowGeo = new THREE.IcosahedronGeometry(1.45, 1);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x2f8fe0,
    transparent: true,
    opacity: 0.06
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  group.add(glowMesh);

  // soft circular sprite texture generated on a canvas, so points render as glowing dots
  const spriteCanvas = document.createElement("canvas");
  spriteCanvas.width = 64;
  spriteCanvas.height = 64;
  const ctx = spriteCanvas.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(109,224,255,0.9)");
  grad.addColorStop(1, "rgba(109,224,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const spriteTexture = new THREE.CanvasTexture(spriteCanvas);

  // ---- helper: build one orbiting particle shell ----
  // Particles carry a per-point "size" attribute derived from z-depth so
  // ones nearer the camera read as bigger/brighter — fakes depth-of-field
  // without a custom shader.
  function buildParticleShell(count, radius, sizeBase, opacity) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const basePositions = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = radius * (0.75 + Math.random() * 0.5);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      // z ranges roughly [-r, r]; map to a size multiplier so closer (larger z) = bigger
      const depthFactor = 0.6 + ((z / r) + 1) / 2 * 0.8;
      sizes[i] = sizeBase * depthFactor;
      basePositions.push({ x, y, z, phase: Math.random() * Math.PI * 2 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: sizeBase,
      map: spriteTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    return { points, basePositions, mat };
  }

  const PARTICLE_COUNT = isLowPower ? 70 : 140;
  const shellA = buildParticleShell(PARTICLE_COUNT, 2.9, 0.13, 0.8);
  group.add(shellA.points);

  // second, sparser outer ring — slower, larger radius, gives a layered "system" feel
  const OUTER_COUNT = isLowPower ? 26 : 46;
  const shellB = buildParticleShell(OUTER_COUNT, 4.2, 0.08, 0.38);
  group.add(shellB.points);

  // connector lines from core to a few particles on the inner shell.
  // Each line "draws in" over the first ~1.6s (scale-based reveal), then settles
  // into the original pulsing-opacity behavior.
  const LINE_COUNT = isLowPower ? 8 : 13;
  const lineGroup = new THREE.Group();
  const lines = [];
  for (let i = 0; i < LINE_COUNT; i++) {
    const target = shellA.basePositions[Math.floor(Math.random() * PARTICLE_COUNT)];
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(target.x, target.y, target.z)
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x6de0ff,
      transparent: true,
      opacity: 0
    });
    const line = new THREE.Line(lineGeo, lineMat);
    line.scale.set(0.001, 0.001, 0.001);
    lineGroup.add(line);
    lines.push({ mesh: line, phase: Math.random() * Math.PI * 2, drawDelay: i * 0.06 });
  }
  group.add(lineGroup);

  // mouse parallax target
  let targetRotX = 0;
  let targetRotY = 0;
  let curRotX = 0;
  let curRotY = 0;

  function onPointerMove(e) {
    const rect = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    targetRotY = x * 0.35;
    targetRotX = y * 0.2;
  }
  window.addEventListener("mousemove", onPointerMove, { passive: true });

  // scroll-linked rotation nudge — ties a slice of the core's spin to how far
  // the visitor has scrolled through the hero, so it doesn't feel like a
  // decorative loop that ignores the page.
  let scrollRot = 0;
  function onScroll() {
    const heroEl = wrap.closest("section") || wrap;
    const rect = heroEl.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)));
    scrollRot = progress * 0.9;
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  function onResize() {
    width = wrap.clientWidth;
    height = wrap.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener("resize", onResize);

  if (reduceMotion) {
    // render a single static, gently-lit frame — no continuous animation loop
    lines.forEach(l => {
      l.mesh.scale.set(1, 1, 1);
      l.mesh.material.opacity = 0.16;
    });
    group.rotation.set(0.3, -0.4, 0);
    renderer.render(scene, camera);
    return;
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    core.rotation.y = t * 0.12 + scrollRot;
    core.rotation.x = t * 0.06;
    glowMesh.rotation.y = -t * 0.08;
    shellA.points.rotation.y = t * 0.05 + scrollRot * 0.4;
    shellB.points.rotation.y = -t * 0.025 - scrollRot * 0.2;
    shellB.points.rotation.x = t * 0.015;

    lines.forEach(l => {
      const drawT = Math.min(1, Math.max(0, (t - l.drawDelay) / 1.0));
      const eased = 1 - Math.pow(1 - drawT, 3);
      l.mesh.scale.set(eased, eased, eased);
      if (drawT >= 1) {
        l.mesh.material.opacity = 0.04 + Math.abs(Math.sin(t * 0.6 + l.phase)) * 0.14;
      } else {
        l.mesh.material.opacity = eased * 0.2;
      }
    });

    curRotX += (targetRotX - curRotX) * 0.04;
    curRotY += (targetRotY - curRotY) * 0.04;
    group.rotation.x = curRotX;
    group.rotation.z = curRotY * 0.15;

    renderer.render(scene, camera);
  }
  animate();
}

/* =====================
   Ambient full-page particle field (2D canvas, cheap & subtle)
   ===================== */
function initBgParticles(reduceMotion) {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let w, h, dpr;
  let particles = [];
  const COUNT = 70;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticles() {
    particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      a: Math.random() * 0.5 + 0.15
    }));
  }

  resize();
  makeParticles();
  window.addEventListener("resize", () => { resize(); });

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(109, 224, 255, ${p.a * 0.5})`;
      ctx.fill();
    });
  }

  if (reduceMotion) {
    drawStatic();
    return;
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(109, 224, 255, ${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  tick();
}

/* =====================
   Scroll progress rail
   ===================== */
function initScrollProgress() {
  const fill = document.getElementById("progressFill");
  if (!fill) return;
  function update() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    fill.style.width = pct + "%";
  }
  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* =====================
   Scroll reveal animations
   ===================== */
function initAnimations() {
  const animateElements = document.querySelectorAll(".section-title, .card, .stats-bar");

  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.top < viewportHeight * 0.92 && rect.bottom > 0;
  }

  function handleScrollAnimations() {
    animateElements.forEach(el => {
      if (isElementInViewport(el)) el.classList.add("visible");
    });
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScrollAnimations();
        updateActiveNav();
        ticking = false;
      });
      ticking = true;
    }
  });

  window.addEventListener("resize", handleScrollAnimations);
  handleScrollAnimations();
}

/* =====================
   3D tilt-on-hover for cards (services, portfolio, pricing, testimonials)
   ===================== */
function initTiltCards(reduceMotion) {
  if (reduceMotion) return;
  const supportsHover = window.matchMedia("(hover: hover)").matches;
  if (!supportsHover) return;

  const cards = document.querySelectorAll(".tilt-card");
  const MAX_TILT = 7;

  cards.forEach(card => {
    card.style.perspective = "900px";

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const rotateY = (x - 0.5) * MAX_TILT * 2;
      const rotateX = (0.5 - y) * MAX_TILT * 2;

      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      card.style.setProperty("--glow-x", `${x * 100}%`);
      card.style.setProperty("--glow-y", `${y * 100}%`);
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* =====================
   Header shrink on scroll
   ===================== */
function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  if (!header) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 30) header.style.boxShadow = "0 24px 70px rgba(0,0,0,0.55)";
    else header.style.boxShadow = "";
  });
}

/* =====================
   Active nav highlighting
   ===================== */
function initActiveNav() { updateActiveNav(); }

function updateActiveNav() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a[href^='#']");

  let current = "";
  sections.forEach(section => {
    const top = section.offsetTop - 160;
    if (window.pageYOffset >= top) current = section.getAttribute("id");
  });

  navLinks.forEach(link => {
    link.classList.remove("active");
    if (link.getAttribute("href") === "#" + current) link.classList.add("active");
  });
}

/* =====================
   Mobile nav toggle
   ===================== */
function initMobileNav() {
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (e) => {
    if (!navLinks.classList.contains("open")) return;
    if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

/* =====================
   Animated stat counters
   Adds a "counted" class on finish so the .stat-tick underline (see CSS)
   animates in as a small completion flourish.
   ===================== */
function initStatsCounter(reduceMotion) {
  const statsBar = document.getElementById("statsBar");
  if (!statsBar) return;

  let played = false;

  function animateCounters() {
    if (played) return;
    played = true;

    statsBar.querySelectorAll(".stat-value").forEach(el => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimal || "0", 10);
      const suffix = el.dataset.suffix || "";
      const statEl = el.closest(".stat");

      if (reduceMotion) {
        el.textContent = target.toFixed(decimals) + suffix;
        if (statEl) statEl.classList.add("counted");
        return;
      }

      const duration = 1400;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = value.toFixed(decimals) + suffix;
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else if (statEl) {
          statEl.classList.add("counted");
        }
      }
      requestAnimationFrame(tick);
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) animateCounters();
    });
  }, { threshold: 0.4 });

  observer.observe(statsBar);
}

/* =====================
   Process timeline fill — glows in as you scroll past it
   ===================== */
function initTimelineFill() {
  const timeline = document.querySelector(".timeline");
  const fill = document.getElementById("timelineFill");
  if (!timeline || !fill) return;

  function update() {
    const rect = timeline.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const start = viewportHeight * 0.85;
    const total = rect.height + viewportHeight * 0.3;
    const progressed = start - rect.top;
    const pct = Math.max(0, Math.min(100, (progressed / total) * 100));
    fill.style.height = pct + "%";
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* =====================
   FAQ accordion
   ===================== */
function initFaqAccordion() {
  const items = document.querySelectorAll(".faq-item");
  items.forEach(item => {
    const button = item.querySelector(".faq-question");
    if (!button) return;

    button.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");

      items.forEach(other => {
        other.classList.remove("open");
        const otherButton = other.querySelector(".faq-question");
        if (otherButton) otherButton.setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        item.classList.add("open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/* =====================
   Contact form
   ===================== */
function initContactForm() {
  const contactForm = document.getElementById("contactForm");
  const successMessage = document.getElementById("formSuccessMessage");
  const submitButton = document.getElementById("submitBtn");

  if (!contactForm || !successMessage || !submitButton) return;

  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nameField = document.getElementById("name");
    const emailField = document.getElementById("email");
    const phoneField = document.getElementById("phone");

    const name = nameField.value.trim();
    const email = emailField.value.trim();
    const business = document.getElementById("business").value.trim();
    const phone = phoneField.value.trim();
    const message = document.getElementById("message").value.trim();

    [nameField, emailField, phoneField].forEach(el => el.classList.remove("error"));

    if (!name || !email || !business || !phone || !message) {
      showError("Please fill in all required fields before sending.");
      return;
    }

    if (!isValidEmail(email)) {
      emailField.classList.add("error");
      showError("Please enter a valid email address.");
      return;
    }

    if (!isValidPhone(phone)) {
      phoneField.classList.add("error");
      showError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    const formData = { name, email, business, phone, message };

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spa tile-icon"></i> Sending...';
    successMessage.style.display = "none";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbwCnucbZE8Gz4h3JQdaEUpSHsiWDnCHj2l_lIVXJoWbLwRDFVJLdeOaSpfZ7EERPi7g/exec",
        {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      successMessage.className = "";
      successMessage.textContent = "Your enquiry has been sent successfully. We'll call you within 24 hours.";
      successMessage.style.display = "block";

      contactForm.reset();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(error);
      showError("Something went wrong while sending. Please try again or call us directly.");
    } finally {
      setTimeout(() => {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Enquiry';
      }, 500);
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ""));
}

function showError(message) {
  const successMessage = document.getElementById("formSuccessMessage");
  if (!successMessage) return;
  successMessage.className = "error";
  successMessage.textContent = message;
  successMessage.style.display = "block";
}

/* =====================
   Mini chatbot widget
   ===================== */
function initChatbot() {
  const miniChatbot = document.getElementById("miniChatbot");
  if (!miniChatbot) return;

  if (!document.querySelector(".chatbot-toggle")) {
    const chatbotToggle = document.createElement("button");
    chatbotToggle.className = "chatbot-toggle";
    chatbotToggle.innerHTML = '<i class="fa-solid fa-comment"></i> Chat';
    document.body.appendChild(chatbotToggle);
  }
  const chatbotToggle = document.querySelector(".chatbot-toggle");

  chatbotToggle.addEventListener("click", () => {
    miniChatbot.style.display = miniChatbot.style.display === "flex" ? "none" : "flex";
  });

  const miniClose = document.querySelector(".mini-close");
  if (miniClose) {
    miniClose.addEventListener("click", () => {
      miniChatbot.style.display = "none";
    });
  }

  const miniMessages = document.querySelector(".mini-messages");
  const miniInput = document.querySelector(".mini-input input");
  const miniSend = document.querySelector(".mini-input .mini-send");
  const quickButtons = document.querySelectorAll(".quick-btn");

  if (!miniMessages || !miniInput || !miniSend) return;

  function addMessage(text, type) {
    const div = document.createElement("div");
    div.className = `msg ${type}`;
    div.innerHTML = text;
    miniMessages.appendChild(div);
    miniMessages.scrollTop = miniMessages.scrollHeight;
  }

  function addTypingIndicator() {
    const div = document.createElement("div");
    div.className = "msg bot typing";
    div.textContent = "…";
    miniMessages.appendChild(div);
    miniMessages.scrollTop = miniMessages.scrollHeight;
    return div;
  }

  function getReply(question) {
    const q = question.toLowerCase();

    const knowledge = [
      {
        keywords: ["hi", "hello", "hey", "good morning", "good evening"],
        answer: `👋 <b>Welcome to BluePeakAI!</b><br><br>Your AI Department for Business Growth.<br><br>I can help you with:<br>🌐 Website Development<br>🤖 AI Chatbots<br>⚙ Business Automation<br>💰 Pricing<br>📞 Free Consultation`
      },
      {
        keywords: ["website", "web", "landing page", "business website", "portfolio"],
        answer: `🌐 <b>Professional Website Development</b><br><br>We create modern websites that are:<br>✅ Mobile Responsive<br>✅ Fast Loading<br>✅ SEO Optimized<br>✅ AI Ready<br>✅ Conversion Focused<br><br>Every website is custom designed for your business.`
      },
      {
        keywords: ["price", "pricing", "cost", "package", "charges", "budget"],
        answer: `💰 <b>Our Packages</b><br><br>Starter → ₹25,000+<br>Standard → ₹35,000+<br>Premium → ₹45,000+<br><br>Final pricing depends on the number of pages, features and integrations required.`
      },
      {
        keywords: ["chatbot", "ai", "assistant", "bot"],
        answer: `🤖 <b>AI Chatbots</b><br><br>Our chatbots can:<br>• Answer FAQs<br>• Capture Leads<br>• Book Appointments<br>• Qualify Customers<br>• Work 24/7<br>• Connect with WhatsApp<br>• Save your team's time.`
      },
      {
        keywords: ["automation", "workflow", "crm", "google sheets"],
        answer: `⚙ <b>Business Automation</b><br><br>We automate:<br>• WhatsApp<br>• Lead Collection<br>• Google Sheets<br>• CRM<br>• Appointment Booking<br>• Emails<br>• Daily Workflows`
      },
      {
        keywords: ["restaurant", "cafe", "hotel"],
        answer: `🍽 Restaurant Websites<br><br>✔ Digital Menu<br>✔ Table Booking<br>✔ Google Maps<br>✔ Reviews<br>✔ AI Chatbot<br>✔ WhatsApp Orders`
      },
      {
        keywords: ["salon", "beauty", "spa"],
        answer: `💇 Salon Websites<br><br>✔ Appointment Booking<br>✔ Services<br>✔ Price List<br>✔ Gallery<br>✔ AI Assistant<br>✔ WhatsApp Booking`
      },
      {
        keywords: ["clinic", "hospital", "doctor", "dentist"],
        answer: `🏥 Medical Websites<br><br>✔ Appointment Booking<br>✔ Doctor Profiles<br>✔ AI Assistant<br>✔ Contact<br>✔ Google Maps<br>✔ Patient Enquiries`
      },
      {
        keywords: ["real estate", "property", "builder", "estate"],
        answer: `🏡 Real Estate Websites<br><br>✔ Property Listings<br>✔ Lead Capture<br>✔ AI Chatbot<br>✔ Contact Forms<br>✔ Google Maps<br>✔ Property Gallery`
      },
      {
        keywords: ["contact", "phone", "email", "meeting", "consultation"],
        answer: `📞 We'd love to work with you!<br><br>Use our Contact Form<br>or WhatsApp us directly.<br><br>We provide FREE consultations.`
      }
    ];

    for (const item of knowledge) {
      if (item.keywords.some(keyword => q.includes(keyword))) return item.answer;
    }

    return `😊 Sorry, I couldn't understand that.<br><br>Try asking about:<br>🌐 Website<br>🤖 Chatbot<br>⚙ Automation<br>💰 Pricing<br>🏥 Clinic Website<br>💇 Salon Website<br>🍽 Restaurant Website<br>🏡 Real Estate Website`;
  }

  miniSend.addEventListener("click", () => {
    const text = miniInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    miniInput.value = "";

    const typing = addTypingIndicator();

    setTimeout(() => {
      typing.remove();
      addMessage(getReply(text), "bot");
    }, 350);
  });

  miniInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") miniSend.click();
  });

  quickButtons.forEach(button => {
    button.addEventListener("click", () => {
      miniInput.value = button.innerText;
      miniSend.click();
    });
  });

  addMessage("Hi! I'm the BluePeakAI assistant. Ask me about pricing, turnaround time, or hosting.", "bot");
}