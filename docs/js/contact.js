// Contact form with client-side validation. There is no backend: sending is simulated.
// Test hook: an email ending in "@error.test" makes the simulated server fail.

const SEND_DELAY_MS = 900;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RULES = {
  name: (v) => {
    const value = v.trim();
    if (!value) return 'Enter your full name.';
    if (value.length < 2) return 'Name must be at least 2 characters.';
    if (value.length > 60) return 'Name must be 60 characters or fewer.';
    return '';
  },
  email: (v) => {
    const value = v.trim();
    if (!value) return 'Enter your work email.';
    if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email, like name@company.com.';
    return '';
  },
  company: (v) => (v.trim().length > 80 ? 'Company must be 80 characters or fewer.' : ''),
  topic: (v) => (v ? '' : 'Choose a topic.'),
  message: (v) => {
    const value = v.trim();
    if (!value) return 'Enter a message.';
    if (value.length < 20) return 'Message must be at least 20 characters.';
    if (value.length > 500) return 'Message must be 500 characters or fewer.';
    return '';
  },
  consent: (_v, field) => (field.checked ? '' : 'You must agree before we can contact you.'),
};

const LABELS = { name: 'Full name', email: 'Work email', company: 'Company', topic: 'Topic', message: 'Message', consent: 'Consent' };

function referenceId() {
  return `GI-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function initContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const summary = document.getElementById('error-summary');
  const submit = document.getElementById('contact-submit');
  const formError = document.getElementById('form-error');
  const success = document.getElementById('contact-success');
  const message = document.getElementById('message');
  const count = document.getElementById('message-count');
  const touched = new Set();

  const validateField = (name) => {
    const field = form.elements[name];
    const error = RULES[name](field.value, field);
    const errorEl = document.getElementById(`${name}-error`);
    errorEl.textContent = error;
    if (error) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return error;
  };

  for (const name of Object.keys(RULES)) {
    const field = form.elements[name];
    field.addEventListener('blur', () => {
      touched.add(name);
      validateField(name);
    });
    field.addEventListener(field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (touched.has(name)) validateField(name);
    });
  }

  message.addEventListener('input', () => {
    count.textContent = String(message.value.length);
  });

  document.addEventListener('apply-for-role', (event) => {
    form.elements.topic.value = 'other';
    if (!message.value.trim()) {
      message.value = `Hi, I'd like to apply for the ${event.detail.title} role.`;
      count.textContent = String(message.value.length);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.hidden = true;
    const errors = Object.keys(RULES)
      .map((name) => {
        touched.add(name);
        return { name, error: validateField(name) };
      })
      .filter((item) => item.error);

    if (errors.length) {
      summary.innerHTML = `<p>Please fix ${errors.length} ${errors.length === 1 ? 'field' : 'fields'}.</p><ul>${errors
        .map(({ name, error }) => `<li><a href="#${name}">${LABELS[name]}: ${error}</a></li>`)
        .join('')}</ul>`;
      summary.hidden = false;
      summary.focus();
      return;
    }
    summary.hidden = true;

    submit.disabled = true;
    submit.textContent = 'Sending…';
    await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
    submit.disabled = false;
    submit.textContent = 'Send message';

    const email = form.elements.email.value.trim();
    if (email.toLowerCase().endsWith('@error.test')) {
      formError.textContent = 'Something went wrong and your message was not sent. Please try again.';
      formError.hidden = false;
      return;
    }

    const firstName = form.elements.name.value.trim().split(/\s+/)[0];
    document.getElementById('success-text').textContent = `Thanks, ${firstName}! We'll reply to ${email} within two business days.`;
    document.getElementById('reference-id').textContent = referenceId();
    form.hidden = true;
    success.hidden = false;
    success.focus();
  });

  document.getElementById('contact-reset').addEventListener('click', () => {
    form.reset();
    touched.clear();
    count.textContent = '0';
    for (const name of Object.keys(RULES)) {
      form.elements[name].removeAttribute('aria-invalid');
      document.getElementById(`${name}-error`).textContent = '';
    }
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
}
