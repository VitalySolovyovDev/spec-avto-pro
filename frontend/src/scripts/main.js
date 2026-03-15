const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const faqButtons = Array.from(document.querySelectorAll(".faq-question"));
const contactForm = document.querySelector("[data-contact-form]");

function closeMobileNav() {
  if (!menuToggle || !mobileNav) {
    return;
  }

  menuToggle.setAttribute("aria-expanded", "false");
  mobileNav.hidden = true;
}

function openMobileNav() {
  if (!menuToggle || !mobileNav) {
    return;
  }

  menuToggle.setAttribute("aria-expanded", "true");
  mobileNav.hidden = false;
}

function setupMobileNav() {
  if (!menuToggle || !mobileNav) {
    return;
  }

  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";

    if (isExpanded) {
      closeMobileNav();
      return;
    }

    openMobileNav();
  });

  mobileNav.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      closeMobileNav();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) {
      closeMobileNav();
    }
  });
}

function setFaqState(button, expanded) {
  const answerId = button.getAttribute("aria-controls");
  const answer = answerId ? document.getElementById(answerId) : null;

  button.setAttribute("aria-expanded", String(expanded));

  if (answer) {
    answer.hidden = !expanded;
  }
}

function setupFaq() {
  if (!faqButtons.length) {
    return;
  }

  faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";

      faqButtons.forEach((currentButton) => {
        setFaqState(currentButton, false);
      });

      if (!isExpanded) {
        setFaqState(button, true);
      }
    });
  });
}

function setupContactForm() {
  if (!contactForm) {
    return;
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const text = await res.text();
      if (res.ok) {
        contactForm.reset();
        alert('Заявка отправлена. Спасибо!');
      } else {
        alert('Ошибка отправки. Попробуйте позже.');
      }
    } catch {
      alert('Ошибка отправки. Проверьте соединение.');
    }
  });
}

setupMobileNav();
setupFaq();
setupContactForm();
