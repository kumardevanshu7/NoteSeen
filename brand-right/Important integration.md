# Important integration — Arigato Labs legal & contact pages

**Who this is for:** any AI agent or developer who finds a `brand-right` folder in a project.

**Trigger phrase (user may say):**  
> “Read the `brand-right` folder and put Arigato Labs branding + legal pages on my site.”

**You must:** read **all** markdown files in `brand-right/`, then implement Explore branding **and** the pages below so every Arigato Labs app feels like one company.

**Related files:**

| File | Use for |
|------|---------|
| `ARIGATO_BRANDING_SETUP.md` | Logos, Explore page, sidebar “Explore Arigato Labs” |
| `ARIGATO_LABS_LICENSE.md` | Copyright / brand license + registration notes |
| `PROJECT_README_BLUEPRINT.md` | New-repo README template |
| `Important integration.md` | **This file** — Privacy, Terms, Disclaimer, About, Contact |

**Constants (do not invent different company details):**

- **Company:** Arigato Labs  
- **Founder:** Kumar Devanshu  
- **Year:** 2026  
- **Contact email:** `kumardevanshu3001@gmail.com`  
- **App name:** replace `[APP_NAME]` with the real product name  

---

## 0. Hard rules for agents

1. Create **real routes/pages** in the app (not only markdown in `brand-right`). Match the project’s router (React Router, Astro pages, Next.js `app/`, etc.).
2. Match the **existing visual language** of the host app (fonts, colors, spacing). Do not invent a second purple/generic AI theme.
3. Link Privacy, Terms, Disclaimer, About, and Contact from the **site footer** and/or Settings / Explore.
4. Contact must be able to **deliver a message to** `kumardevanshu3001@gmail.com` (see §5). Do not fake a dead form.
5. Keep copy accurate: productivity / tools company; no false “certified”, “insured”, or “government licensed” claims unless the founder adds them later.
6. After implementing, leave `brand-right/` in the repo as the source of truth for future apps.

---

## 1. Pages to create (minimum set)

| Page | Suggested path | Purpose |
|------|----------------|---------|
| About | `/about` | Company + founder + this product |
| Privacy Policy | `/privacy` | What data you collect and why |
| Terms & Conditions | `/terms` | Rules for using the app |
| Disclaimer | `/disclaimer` | Limits of liability / “as is” |
| Contact | `/contact` | Message form → founder email |

Optional but recommended: link the same five from Explore footer.

---

## 2. About page — required content

Structure (one column, clean, no heavy card chrome unless the app already uses cards for content):

1. **Title:** About Arigato Labs  
2. **Product line:** `[APP_NAME]` is a product of **Arigato Labs**.  
3. **Founder:** Built by **Kumar Devanshu**, founder of Arigato Labs (2026).  
4. **Mission (use this or shorten slightly):**  
   We build sleek, modern, high-performance tools that help people get things done with clarity and calm. Software should feel fast, natural, and carefully designed.  
5. **Link:** Contact → `/contact`  
6. **Footer line:** `Copyright © 2026 Arigato Labs. All Rights Reserved.`

---

## 3. Privacy Policy — required sections

Write in plain language. Adapt bullets to **what this app actually stores** (Firebase Auth, Firestore, localStorage, analytics, AI APIs, etc.). If unsure, inspect the codebase and list only real data flows.

### Template sections (keep headings)

1. **Who we are** — Arigato Labs; product `[APP_NAME]`; contact `kumardevanshu3001@gmail.com`.  
2. **What we collect** — e.g. account email/name (Google Auth), app content the user creates, device/basic logs if any.  
3. **How we use data** — provide the product, sync across devices, security, improve reliability.  
4. **Third parties** — name real ones used (e.g. Firebase/Google, Vercel, OpenRouter). Say we don’t sell personal data.  
5. **Storage & retention** — cloud vs on-device; user can delete account data where the product supports it.  
6. **Security** — reasonable safeguards; no system is perfect.  
7. **Children** — not directed at children under 13 (or 16 if you prefer EU-style).  
8. **Changes** — policy may update; continued use means acceptance of the new version.  
9. **Contact** — `kumardevanshu3001@gmail.com`.

Add last-updated date (build date or “2026”).

---

## 4. Terms & Conditions — required sections

1. **Agreement** — using `[APP_NAME]` means you accept these terms.  
2. **The service** — `[APP_NAME]` is provided by Arigato Labs for personal / intended use described in the app.  
3. **Accounts** — you are responsible for your login and content you add.  
4. **Acceptable use** — no abuse, scraping that harms the service, illegal content, or attempts to break security.  
5. **Intellectual property** — Arigato Labs name, logos, and brand assets are owned by Arigato Labs (see `ARIGATO_LABS_LICENSE.md`). Product UI/code rights as stated in the project README.  
6. **AI / automated features** (if the app has AI) — outputs may be wrong; user must verify important decisions.  
7. **Availability** — service may change, break, or stop; no uptime guarantee.  
8. **Termination** — we may suspend abuse; you may stop using the app anytime.  
9. **Governing note** — disputes handled under applicable law in the founder’s jurisdiction (India unless later specified).  
10. **Contact** — `kumardevanshu3001@gmail.com`.

---

## 5. Disclaimer — required content

Keep this page short and firm:

- `[APP_NAME]` and Arigato Labs materials are provided **“as is”** without warranties of any kind.  
- Arigato Labs is **not liable** for loss of data, profits, or damages arising from use or inability to use the app, to the maximum extent allowed by law.  
- Productivity / planning / AI suggestions are **helpers**, not professional legal, medical, or financial advice.  
- Third-party services (Google, Firebase, hosts, model providers) have their own terms.  
- Copyright © 2026 Arigato Labs. All Rights Reserved.

---

## 6. Contact page — required UX + email delivery

### UI

- Title: Contact Arigato Labs  
- Short line: Questions about `[APP_NAME]` or Arigato Labs? Send a message — it goes to the founder.  
- Fields (all required unless noted):  
  - **Name**  
  - **Email** (reply-to)  
  - **Subject**  
  - **Message** (textarea)  
- Primary button: **Send message**  
- Success state: calm confirmation (“Message sent — we’ll get back to you by email.”)  
- Error state: clear retry text  
- Show public address as text too: `kumardevanshu3001@gmail.com`

### Delivery (pick one that fits the stack; prefer no custom backend)

**Option A — Web3Forms (recommended default)**  
1. Register at [web3forms.com](https://web3forms.com) with `kumardevanshu3001@gmail.com`.  
2. Put access key in env, e.g. `PUBLIC_WEB3FORMS_KEY` / `VITE_WEB3FORMS_KEY`.  
3. `POST https://api.web3forms.com/submit` with JSON including the key + fields.  
4. Set `from_name` to `Arigato Labs · [APP_NAME]`.

**Option B — Formspree**  
Same idea: form `action` / fetch to Formspree endpoint tied to that Gmail.

**Option C — EmailJS**  
Only if the project already uses it.

**Do not** rely on `mailto:` alone as the only submission path (broken on many phones). `mailto` link as a **secondary** fallback is OK.

### Beautiful email body (what the founder should receive)

When submitting, send a structured payload so the inbox message is readable. Prefer HTML `message` / template fields when the provider supports them; otherwise a clean plain-text block:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ARIGATO LABS · CONTACT
  Product: [APP_NAME]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

From:     {name}
Email:    {email}
Subject:  {subject}

Message
-------
{message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sent from [APP_NAME] contact form
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If HTML email is supported, use a simple single-column layout: brand title, product name, labeled rows, message in a muted box — no spammy colors.

### Env example

```env
# Contact form → kumardevanshu3001@gmail.com
PUBLIC_WEB3FORMS_KEY=your_access_key_here
```

Document the env var in the project README when you add Contact.

---

## 7. Footer links (every app)

Add a compact legal row (Explore page and/or global footer):

```text
About · Privacy · Terms · Disclaimer · Contact
Copyright © 2026 Arigato Labs. All Rights Reserved.
```

---

## 8. Implementation checklist (agent)

Copy this and tick mentally before finishing:

- [ ] Read all `brand-right` markdown files  
- [ ] Logos copied to `public/` + Explore + sidebar per branding setup  
- [ ] `/about` `/privacy` `/terms` `/disclaimer` `/contact` exist and match app design  
- [ ] Copy uses Arigato Labs + Kumar Devanshu + 2026 + real app data practices  
- [ ] Contact posts to Web3Forms/Formspree (or equivalent) → `kumardevanshu3001@gmail.com`  
- [ ] Email body is structured and readable  
- [ ] Footer links wired  
- [ ] Env var documented  
- [ ] License short notice shown (All Rights Reserved)

---

## 9. Prompt the user can reuse on any new project

```text
Read the brand-right folder in this repo (all md files).
Apply Arigato Labs branding from ARIGATO_BRANDING_SETUP.md
and create About, Privacy, Terms, Disclaimer, and Contact pages
exactly as Important integration.md describes.
Contact must email kumardevanshu3001@gmail.com with a clean formatted message.
Match this app’s existing design system.
```

---

*Arigato Labs · Important integration · 2026*
