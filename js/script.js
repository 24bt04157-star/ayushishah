document.addEventListener("DOMContentLoaded", () => {
  initAnimations();
  initActiveNav();
  initMobileNav();
  initHeaderScroll();
  initStatsCounter();
  initTerminalTyping();
  initFaqAccordion();
  initContactForm();
  initChatbot();
});

/* =====================
   Scroll reveal animations
   ===================== */
function initAnimations() {
  const animateElements = document.querySelectorAll(".section-title, .card, .stat, .stats-bar");

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
   Header shrink on scroll
   ===================== */
function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  if (!header) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 30) header.style.boxShadow = "0 24px 60px rgba(18, 80, 143, 0.2)";
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
   ===================== */
function initStatsCounter() {
  const statsBar = document.getElementById("statsBar");
  if (!statsBar) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let played = false;

  function animateCounters() {
    if (played) return;
    played = true;

    statsBar.querySelectorAll(".stat-value").forEach(el => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimal || "0", 10);
      const suffix = el.dataset.suffix || "";

      if (reduceMotion) {
        el.textContent = target.toFixed(decimals) + suffix;
        return;
      }

      const duration = 1400;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = value.toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
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
   Hero "live assistant" typing demo
   ===================== */
function initTerminalTyping() {
  const body = document.getElementById("terminalBody");
  if (!body) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const script = [
    { type: "bot", text: "Hi! I'm the BluePeakAI assistant. Ask me anything." },
    { type: "user", text: "Do you build websites for salons?" },
    { type: "bot", text: "Yes — with online booking, a price list, and gallery." },
    { type: "user", text: "How fast can it go live?" },
    { type: "bot", text: "Typically 7–14 days, start to finish." }
  ];

  if (reduceMotion) {
    body.innerHTML = script
      .map(line => `<div class="term-line ${line.type}"><div class="term-bubble">${line.text}</div></div>`)
      .join("");
    return;
  }

  let i = 0;

  function typeLine() {
    if (i >= script.length) {
      setTimeout(() => {
        body.innerHTML = "";
        i = 0;
        typeLine();
      }, 3200);
      return;
    }

    const line = script[i];
    const row = document.createElement("div");
    row.className = `term-line ${line.type}`;
    const bubble = document.createElement("div");
    bubble.className = "term-bubble";
    row.appendChild(bubble);
    body.appendChild(row);

    let charIndex = 0;
    const speed = line.type === "user" ? 34 : 22;

    function typeChar() {
      if (charIndex <= line.text.length) {
        bubble.innerHTML = line.text.slice(0, charIndex) + '<span class="term-cursor"></span>';
        charIndex++;
        setTimeout(typeChar, speed);
      } else {
        bubble.innerHTML = line.text;
        i++;
        setTimeout(typeLine, 550);
      }
    }
    typeChar();
  }

  typeLine();
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
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
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