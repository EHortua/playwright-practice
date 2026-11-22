# playwright-practice

A small landing page for a **fictional** applied-AI studio, *Gears & Ink*, built as a target for test-automation practice: a UI to test with Playwright, data to validate, a simulated AI assistant, and CI to wire up.

**Live site:** https://ehortua.github.io/playwright-practice/

> Gears & Ink is a fictional company. The site is not affiliated with any real company.

## Run it locally

The site is plain HTML, CSS and JavaScript in [`docs/`](docs/) (GitHub Pages serves that folder). It uses ES modules and `fetch`, so open it through a local server, not as a file:

```bash
python3 -m http.server 8000 -d docs
# then open http://localhost:8000
```

## What there is to test

| Area | Behaviour |
|------|-----------|
| **Announcement bar** | Dismiss with ✕; stays dismissed after reload (`localStorage`). |
| **Navigation** | On narrow screens a **Menu** button toggles the nav (`aria-expanded`). |
| **Open roles** | Loaded from [`docs/data/jobs.json`](docs/data/jobs.json) (12 roles). Search (debounced 250 ms), department, location and "Remote only" filters. Filters are kept in the URL (`?q=&dept=&loc=&remote=1`), so a filtered view can be deep-linked. Loading, empty ("Clear filters") and error ("Retry") states. Each card has a **Details** toggle and an **Apply** link that pre-fills the contact form. |
| **Inky, the assistant** | **Simulated** — no AI model is called. Answers vary between runs, take 0.5–1.5 s with a "typing" indicator, and carry metadata. Guardrails: prompt-injection refusal, personal-data warning, off-topic fallback. Max 280 characters; **Send** is disabled for empty input. |
| **Contact form** | Client-side validation on blur and on submit, an error summary, a character counter, a simulated send (~0.9 s, button disabled) and a success panel with a reference id. |

### Validation rules (contact form)

| Field | Rule |
|-------|------|
| Full name | Required, 2–60 characters (spaces are trimmed) |
| Work email | Required, valid format |
| Company | Optional, max 80 characters |
| Topic | Required |
| Message | Required, 20–500 characters |
| Consent | Must be checked |

### Test hooks

| Hook | What it does |
|------|--------------|
| `?seed=<number>` | Makes the assistant's phrasing and delays reproducible. |
| `data-intent` on assistant messages | `greeting`, `services`, `open_roles`, `offices`, `contact`, `about`, `refusal`, `pii`, `fallback`, `error` — assert the intent, not the exact wording. |
| `data-testid` | `results-count`, `jobs-state`, `job-card` (with `data-job-id`), `chat`, `user-message`, `assistant-message`, `message-source`, `reference-id`. |
| Email ending in `@error.test` | The simulated send fails and shows an error. |
| `docs/data/jobs.json` | Intercept it with `page.route()` to test the loading, error and empty states. |

Most elements have accessible names, so prefer `getByRole` and `getByLabel`; the test ids cover the rest.

## Practice roadmap

- [ ] Set up Playwright with TypeScript (`npm init playwright@latest`) and a first smoke test
- [ ] Config: `baseURL` from an environment variable, retries and trace on CI
- [ ] Page objects and fixtures for the jobs list, the chat and the contact form
- [ ] Data-driven tests for the form's validation rules (boundaries: 1, 2, 60, 61 characters…)
- [ ] Network mocking with `page.route()` for the jobs states
- [ ] AI-style tests for Inky: assert intents, sources and guardrails, run cases several times
- [ ] GitHub Actions: run the suite on every pull request and upload the HTML report
- [ ] Gherkin scenarios for one flow (optional)
