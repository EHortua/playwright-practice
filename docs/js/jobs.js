// Open roles: loaded from data/jobs.json, filtered in the browser.
// Filter state lives in the URL (?q=&dept=&loc=&remote=1), so a filtered view can be shared or deep-linked.

const DATA_URL = 'data/jobs.json';
const SEARCH_DEBOUNCE_MS = 250;

let allJobs = [];

const els = {};

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function readFilters() {
  const params = new URLSearchParams(location.search);
  return {
    q: params.get('q') ?? '',
    dept: params.get('dept') ?? '',
    loc: params.get('loc') ?? '',
    remote: params.get('remote') === '1',
  };
}

function writeFilters(filters) {
  const params = new URLSearchParams(location.search);
  const set = (key, value) => (value ? params.set(key, value) : params.delete(key));
  set('q', filters.q.trim());
  set('dept', filters.dept);
  set('loc', filters.loc);
  set('remote', filters.remote ? '1' : '');
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
}

function currentFilters() {
  return {
    q: els.search.value,
    dept: els.dept.value,
    loc: els.loc.value,
    remote: els.remote.checked,
  };
}

function matches(job, { q, dept, loc, remote }) {
  const term = q.trim().toLowerCase();
  if (term) {
    const haystack = [job.title, job.department, job.location, job.summary, ...job.skills].join(' ').toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  if (dept && job.department !== dept) return false;
  if (loc && job.location !== loc) return false;
  if (remote && !job.remote) return false;
  return true;
}

function fillOptions(select, values) {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

function renderJob(job) {
  const li = document.createElement('li');
  li.className = 'job';
  li.dataset.testid = 'job-card';
  li.dataset.jobId = job.id;
  const detailsId = `job-details-${job.id}`;
  li.innerHTML = `
    <article aria-labelledby="job-title-${job.id}">
      <div class="job-head">
        <div>
          <h3 id="job-title-${job.id}">${escapeHtml(job.title)}</h3>
          <ul class="job-meta" aria-label="Role details">
            <li>${escapeHtml(job.department)}</li>
            <li>${escapeHtml(job.location)}</li>
            <li>${escapeHtml(job.level)}</li>
            ${job.remote ? '<li>Remote-friendly</li>' : ''}
          </ul>
        </div>
        <button type="button" class="job-toggle" aria-expanded="false" aria-controls="${detailsId}">Details</button>
      </div>
      <div class="job-details" id="${detailsId}" hidden>
        <p>${escapeHtml(job.summary)}</p>
        <p><strong>Skills:</strong> ${job.skills.map(escapeHtml).join(', ')}</p>
        <a class="btn btn-primary" href="#contact" data-apply="${escapeHtml(job.title)}">Apply for this role</a>
      </div>
    </article>`;
  const toggle = li.querySelector('.job-toggle');
  const details = li.querySelector('.job-details');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Hide details' : 'Details';
    details.hidden = !open;
  });
  li.querySelector('[data-apply]').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('apply-for-role', { detail: { title: job.title } }));
  });
  return li;
}

function setState(html, { error = false } = {}) {
  els.state.innerHTML = html;
  els.state.classList.toggle('is-error', error);
}

function render() {
  const filters = currentFilters();
  writeFilters(filters);
  const visible = allJobs.filter((job) => matches(job, filters));
  els.list.replaceChildren(...visible.map(renderJob));
  els.count.textContent = `Showing ${visible.length} of ${allJobs.length} roles`;
  if (visible.length === 0) {
    setState('<p>No roles match your filters.</p><button type="button" class="btn btn-ghost" id="clear-filters">Clear filters</button>');
    els.state.querySelector('#clear-filters').addEventListener('click', clearFilters);
  } else {
    setState('');
  }
}

function clearFilters() {
  els.search.value = '';
  els.dept.value = '';
  els.loc.value = '';
  els.remote.checked = false;
  render();
  els.search.focus();
}

function applyFilters(filters) {
  els.search.value = filters.q;
  els.dept.value = [...els.dept.options].some((o) => o.value === filters.dept) ? filters.dept : '';
  els.loc.value = [...els.loc.options].some((o) => o.value === filters.loc) ? filters.loc : '';
  els.remote.checked = filters.remote;
}

async function load() {
  els.list.replaceChildren();
  els.count.textContent = '';
  setState('<p>Loading roles…</p>');
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Unexpected data format');
    allJobs = data;
  } catch (error) {
    setState('<p>We couldn\'t load the open roles. Please try again.</p><button type="button" class="btn btn-ghost" id="retry-jobs">Retry</button>', { error: true });
    els.state.querySelector('#retry-jobs').addEventListener('click', load);
    return;
  }
  els.dept.length = 1;
  els.loc.length = 1;
  fillOptions(els.dept, [...new Set(allJobs.map((j) => j.department))].sort());
  fillOptions(els.loc, [...new Set(allJobs.map((j) => j.location))].sort());
  applyFilters(readFilters());
  render();
}

export function initJobs() {
  els.form = document.getElementById('job-filters');
  if (!els.form) return;
  els.search = document.getElementById('job-search');
  els.dept = document.getElementById('job-department');
  els.loc = document.getElementById('job-location');
  els.remote = document.getElementById('job-remote');
  els.list = document.getElementById('jobs-list');
  els.count = document.querySelector('[data-testid="results-count"]');
  els.state = document.getElementById('jobs-state');

  let timer;
  els.search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, SEARCH_DEBOUNCE_MS);
  });
  els.dept.addEventListener('change', render);
  els.loc.addEventListener('change', render);
  els.remote.addEventListener('change', render);
  els.form.addEventListener('submit', (event) => event.preventDefault());

  load();
}

export function getJobs() {
  return allJobs;
}
