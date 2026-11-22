// Inky: a SIMULATED assistant. No AI model is called.
// It behaves like one on purpose, so you can practise testing AI features:
//   - answers vary between runs (several phrasings per intent)
//   - replies take a random 0.5–1.5 s, with a "typing" indicator
//   - guardrails: prompt-injection refusal, personal-data warning, off-topic fallback
//   - every reply carries structured metadata: data-intent="..." and a source link
// Add ?seed=<number> to the URL to make phrasing and delays reproducible.

import { getJobs } from './jobs.js';

const MAX_LENGTH = 280;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seedParam = new URLSearchParams(location.search).get('seed');
const random = seedParam !== null && !Number.isNaN(Number(seedParam)) ? mulberry32(Number(seedParam)) : Math.random;

const pick = (items) => items[Math.floor(random() * items.length)];

async function loadJobs() {
  const loaded = getJobs();
  if (loaded.length) return loaded;
  const response = await fetch('data/jobs.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const INJECTION = /(ignore|disregard|forget)\b.{0,30}\b(instructions|rules|prompt)|system prompt|you are now|act as (?!a candidate)|developer mode|jailbreak/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;

const INTENTS = [
  {
    intent: 'services',
    keywords: ['service', 'offer', 'do you do', 'help with', 'what do you', 'sprint'],
    source: { label: 'Services', href: '#services' },
    answers: [
      'We offer four services: the AI Readiness Sprint, AI assistants and agents, cloud modernization, and quality engineering.',
      'Our services are the AI Readiness Sprint, building AI assistants and agents, cloud modernization and quality engineering.',
      'There are four ways we help: an AI Readiness Sprint, AI assistants and agents, cloud modernization, and quality engineering.',
    ],
  },
  {
    intent: 'open_roles',
    keywords: ['role', 'job', 'vacanc', 'hiring', 'position', 'career', 'opening', 'work for you', 'qa', 'testing'],
    source: { label: 'Careers', href: '#careers' },
    async answer() {
      const jobs = await loadJobs();
      const quality = jobs.filter((job) => job.department === 'Quality').length;
      return pick([
        `We have ${jobs.length} open roles right now, ${quality} of them in Quality.`,
        `Right now there are ${jobs.length} open roles. ${quality} are in the Quality team.`,
        `There are ${jobs.length} roles open at the moment, including ${quality} in Quality.`,
      ]);
    },
  },
  {
    intent: 'offices',
    keywords: ['office', 'where are you', 'location', 'located', 'city', 'cities', 'based'],
    source: { label: 'Footer', href: '#top' },
    answers: [
      'We have hubs in Bogotá, Toronto and Lviv, and many people work remotely.',
      'Our teams work from Bogotá, Toronto and Lviv, plus remote team members.',
      'You can find us in Bogotá, Toronto and Lviv. Plenty of us are remote, too.',
    ],
  },
  {
    intent: 'contact',
    keywords: ['contact', 'reach', 'talk to', 'email you', 'get in touch', 'call'],
    source: { label: 'Contact', href: '#contact' },
    answers: [
      'The best way to reach us is the contact form at the bottom of this page. We reply within two business days.',
      'Please use the contact form below. Someone from the team replies within two business days.',
    ],
  },
  {
    intent: 'about',
    keywords: ['who are you', 'about you', 'about the company', 'your company', 'gears'],
    source: { label: 'Home', href: '#top' },
    answers: [
      'Gears & Ink is an applied AI studio: senior engineers and designers who take AI assistants from pilot to production.',
      'We are an applied AI engineering studio that pairs engineers with designers to ship AI that works for real people.',
    ],
  },
];

const REFUSAL = {
  intent: 'refusal',
  text: "I can't change my instructions, but I'm happy to answer questions about Gears & Ink.",
};
const PII = {
  intent: 'pii',
  text: "Please don't share personal data like emails or phone numbers here. Use the contact form instead.",
  source: { label: 'Contact', href: '#contact' },
};
const FALLBACK = {
  intent: 'fallback',
  texts: [
    'I can only help with questions about Gears & Ink: our services, open roles, offices, or how to contact us.',
    "That's outside what I know. Try asking about our services, open roles, offices or how to contact us.",
  ],
};
const ERROR_REPLY = {
  intent: 'error',
  text: "Sorry, I couldn't look that up right now. Please try again in a moment.",
};

async function reply(message) {
  const text = message.trim();
  if (INJECTION.test(text)) return { intent: REFUSAL.intent, text: REFUSAL.text };
  if (EMAIL.test(text) || PHONE.test(text)) return { intent: PII.intent, text: PII.text, source: PII.source };

  const lower = text.toLowerCase();
  const match = INTENTS.find((item) => item.keywords.some((keyword) => lower.includes(keyword)));
  if (!match) return { intent: FALLBACK.intent, text: pick(FALLBACK.texts) };

  try {
    const answer = match.answer ? await match.answer() : pick(match.answers);
    return { intent: match.intent, text: answer, source: match.source };
  } catch {
    return { intent: ERROR_REPLY.intent, text: ERROR_REPLY.text };
  }
}

export function initAssistant() {
  const log = document.getElementById('chat-log');
  const form = document.getElementById('chat-form');
  if (!log || !form) return;
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const typing = document.getElementById('chat-typing');
  const counter = document.getElementById('chat-counter');
  let busy = false;

  const updateControls = () => {
    counter.textContent = `${input.value.length} / ${MAX_LENGTH}`;
    send.disabled = busy || input.value.trim().length === 0;
  };

  const addMessage = (role, text, meta = {}) => {
    const bubble = document.createElement('div');
    bubble.className = `msg msg-${role}`;
    bubble.dataset.testid = `${role}-message`;
    if (meta.intent) bubble.dataset.intent = meta.intent;
    const p = document.createElement('p');
    p.textContent = text;
    bubble.appendChild(p);
    if (meta.source) {
      const source = document.createElement('span');
      source.className = 'msg-source';
      source.dataset.testid = 'message-source';
      source.append('Source: ');
      const link = document.createElement('a');
      link.href = meta.source.href;
      link.textContent = meta.source.label;
      source.appendChild(link);
      bubble.appendChild(source);
    }
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
  };

  const greet = () => addMessage('assistant', "Hi, I'm Inky. Ask me about our services, open roles, offices or how to contact us.", { intent: 'greeting' });

  const ask = async (question) => {
    const text = question.trim();
    if (!text || busy) return;
    busy = true;
    addMessage('user', text);
    input.value = '';
    updateControls();
    typing.hidden = false;
    const delay = 500 + Math.floor(random() * 1000);
    const [answer] = await Promise.all([reply(text), new Promise((resolve) => setTimeout(resolve, delay))]);
    typing.hidden = true;
    addMessage('assistant', answer.text, answer);
    busy = false;
    updateControls();
    input.focus();
  };

  input.addEventListener('input', updateControls);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(input.value);
  });
  document.querySelectorAll('.chip[data-question]').forEach((chip) => {
    chip.addEventListener('click', () => ask(chip.dataset.question));
  });
  document.getElementById('chat-clear').addEventListener('click', () => {
    if (busy) return;
    log.replaceChildren();
    greet();
  });

  greet();
  updateControls();
}
