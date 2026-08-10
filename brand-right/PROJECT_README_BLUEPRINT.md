# Project README Blueprint (Arigato Labs)

Use this as a **copy-paste template** when starting a new Arigato Labs app.
Replace every `[PLACEHOLDER]` with that project's details. Keep the step order the same — only the names, URLs, and feature list change.

For Explore page / logos / sidebar branding, also follow: [`ARIGATO_BRANDING_SETUP.md`](./ARIGATO_BRANDING_SETUP.md).

---

## How to use this blueprint

1. Copy this file (or the filled README block below) into the new repo as `README.md`.
2. Swap placeholders (app name, clone URL, features, env vars if different).
3. Keep Firebase + Vercel steps unless the stack changes.
4. Add the Arigato Labs note and footer line so every product looks consistent.

---

## Template → paste into `README.md`

```markdown
# [APP_NAME]

<div align="center">
  <h3>[ONE_LINE_TAGLINE]</h3>
  <p>[SHORT_DESCRIPTION — what the app does in 1–2 sentences.]</p>
</div>

---

> **Note**: This project falls under **Arigato Labs**.

## 🚀 Features

- **[FEATURE_1]**: [Short explanation]
- **[FEATURE_2]**: [Short explanation]
- **[FEATURE_3]**: [Short explanation]
- **[FEATURE_4]**: [Short explanation]

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build/) + [React](https://react.dev/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore, Auth)
- **Styling**: Custom CSS (match the product aesthetic)
- **State Management**: [Nano Stores](https://github.com/nanostores/nanostores)
<!-- Or replace this stack section if the new project uses something else -->

## 📦 Run on your own computer (Bit-by-Bit Guide)

Follow these exact steps if you want to run **[APP_NAME]** on your local machine:

### Step 1: Prerequisites
Before you begin, make sure you have installed:
1. [Node.js](https://nodejs.org/) (Download and install the latest LTS version)
2. [Git](https://git-scm.com/downloads) (To clone the repository)

### Step 2: Clone the Code
Open your terminal (or Command Prompt / PowerShell) and run:
```bash
git clone https://github.com/[GITHUB_USERNAME]/[REPO_NAME].git
cd [REPO_NAME]
```
*(Replace `[GITHUB_USERNAME]` / `[REPO_NAME]` with the real GitHub path.)*

### Step 3: Install Dependencies
Now that you are inside the `[REPO_NAME]` folder, install all the required packages:
```bash
npm install
```
*Wait a minute or two for this to finish.*

### Step 4: Setup Firebase (Database & Auth)
[APP_NAME] uses Firebase for storing data and Google Login.
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"** and create a new project (e.g., `[APP_NAME]-local`).
3. Once created, click on the **Web icon (`</>`)** to register an app.
4. Firebase will give you a configuration object with keys like `apiKey`, `authDomain`, etc. Keep this tab open!
5. In the Firebase sidebar, go to **Authentication** > Get Started > Sign-in method > Enable **Google**.
6. Go to **Firestore Database** > Create Database > Start in **Test Mode** (or update rules later).

### Step 5: Configure Environment Variables
1. In your code editor, create a new file named exactly `.env` in the root folder of the project.
2. Copy the following template into the file and replace the values with the ones Firebase gave you in Step 4:
```env
PUBLIC_FIREBASE_API_KEY=your_api_key_here
PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your_project_id
PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
PUBLIC_FIREBASE_APP_ID=your_app_id
PUBLIC_SUPER_ADMIN_UID=your_firebase_uid_here
```
<!-- Drop PUBLIC_SUPER_ADMIN_UID if this project has no admin role. Add extra PUBLIC_* vars only if needed. -->

### Step 6: Start the Server!
Finally, run the app:
```bash
npm run dev
```
Open your browser and go to **[http://localhost:4321](http://localhost:4321)**. You will see [APP_NAME] running locally!
<!-- Change port if the framework default is different. -->

## 🚀 Deploying to Vercel

This project is fully optimized for **Vercel** deployments.

1. Push your code to a GitHub repository.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
3. Import your GitHub repository.
4. Expand **Environment Variables** and paste in all the variables from your local `.env` file.
5. Click **Deploy**. Vercel will automatically detect the Astro framework and build the project.
6. After deploy: open Firebase Console → **Authentication** → **Settings** → **Authorized domains** → add your Vercel domain (e.g. `[APP_NAME].vercel.app`). Without this, Google login fails with `auth/unauthorized-domain`.

---
*Created as part of Arigato Labs.*
```

---

## Checklist (same process, every new project)

| # | Step | What usually changes |
|---|------|----------------------|
| 1 | Prerequisites (Node + Git) | Nothing |
| 2 | Clone repo | GitHub URL + folder name |
| 3 | `npm install` | Nothing (or package manager) |
| 4 | Firebase project + Google Auth + Firestore | Project name only |
| 5 | `.env` from Firebase config | App-specific env keys if any |
| 6 | `npm run dev` | Port / start script if not Astro |
| 7 | Push → Vercel → env vars → Deploy | Project name / domain |
| 8 | Add Vercel domain to Firebase Authorized domains | Domain string |
| 9 | Arigato branding (`brand-right` → Explore + sidebar + legal pages) | `[App Name]` text only — see `ARIGATO_BRANDING_SETUP.md` + `Important integration.md` |

---

## Placeholders quick list

| Placeholder | Example (JobSeen) |
|-------------|-------------------|
| `[APP_NAME]` | JobSeen |
| `[ONE_LINE_TAGLINE]` | A modern, sleek job tracking and management platform. |
| `[SHORT_DESCRIPTION]` | Track applications, switch layouts, connect with peers… |
| `[GITHUB_USERNAME]` / `[REPO_NAME]` | `kumardevanshu7` / `Job-Seen` |
| Features / Tech | Whatever that product actually ships |
| Extra env vars | e.g. `PUBLIC_SUPER_ADMIN_UID` only if needed |

---

## Related files in this folder

| File | Purpose |
|------|---------|
| `arigato-labs-logo.png` | Large Explore-page logo → copy to `public/` |
| `arigato-single-logo.png` | Sidebar / nav icon → copy to `public/` |
| `ARIGATO_BRANDING_SETUP.md` | Explore page, nav item, legal footer steps |
| `ARIGATO_LABS_LICENSE.md` | Company/brand license + registration notes |
| `Important integration.md` | Privacy, Terms, Disclaimer, About, Contact (agent playbook) |
| `PROJECT_README_BLUEPRINT.md` | This file — README + setup process template |
