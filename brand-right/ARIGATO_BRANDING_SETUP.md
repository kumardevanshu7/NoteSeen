# Arigato Labs - Standard Branding Setup Guide

This guide outlines the standard steps to implement the **Arigato Labs** branding (Explore page, logos, and sidebar navigation) across any new application. You can refer to this document whenever you create a new app under the Arigato Labs umbrella.

---

## 1. Required Assets

Before starting, create a folder named `brand-right` in the root of your project and ensure it contains the following two files:
- `arigato-labs-logo.png` (Used for the main large display on the Explore page)
- `arigato-single-logo.png` (Used as the small icon for the Sidebar/Navigation)

**Step:** Copy these files from the `brand-right` folder into your app's `public/` directory so they are accessible via URL:
- `/public/arigato-labs-logo.png`
- `/public/arigato-single-logo.png`

---

## 2. Navigation / Sidebar Setup

Add a new navigation item for "Explore Arigato Labs" in your app's Sidebar or Navigation bar.

**Label:** `Explore Arigato Labs`  
**Icon:** Use the `arigato-single-logo.png` image with a width and height of about `17px`.

### Example React/JSX Implementation:
```tsx
// 1. Add to your navigation data array
{ 
  href: "/explore", 
  label: "Explore Arigato Labs", 
  icon: "image" 
}

// 2. In your rendering logic, handle the custom image icon:
<span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
  <img 
    src="/arigato-single-logo.png" 
    alt="Arigato Labs" 
    style={{ 
      width: 17, 
      height: 17, 
      objectFit: "contain",
      // Optional: Add grayscale/opacity for inactive states
      // filter: isActive ? "none" : "grayscale(100%) opacity(0.6)" 
    }} 
  />
</span>
```

---

## 3. The "Explore" Page

Create a dedicated page (e.g., `/explore`) that showcases the company. 
**Design Rules:**
- The design should be clean and native to the app's theme.
- **Do not** use heavy box containers, drop shadows, or distinct background colors. Let the content sit naturally on the app's native background.
- Make the typography large, bold, and professional.

### Page Structure & Content (HTML/JSX Structure)

```html
<header style="text-align: center;">
  <h1>Our Company</h1>
  <p>Redefining productivity and job tracking for the modern era.</p>
</header>

<div class="image-section" style="text-align: center;">
  <!-- Note: Apply negative margins in CSS if the logo PNG has extra built-in whitespace -->
  <img src="/arigato-labs-logo.png" alt="Arigato Labs Logo" style="max-width: 650px; width: 100%;" />
</div>

<div class="text-section" style="text-align: center;">
  <div class="founder-badge">
    ✓ Verified Founder
  </div>
  
  <p class="founder-text">
    <strong>[App Name]</strong> is proudly developed by <strong>Kumar Devanshu</strong>, the founder of <strong>Arigato Labs</strong> in 2026.
  </p>
  
  <p class="mission-text">
    Our mission is to build sleek, modern, and high-performance tools that empower individuals and teams to achieve their goals with elegance and ease. We believe software should feel natural, fast, and distinctly beautiful.
  </p>
</div>
```

---

## 4. Legal Footer

Always include the standard Arigato Labs notice at the bottom of the Explore page. It should look symmetrical and use slightly muted text.

Also wire Privacy / Terms / Disclaimer / About / Contact from [`Important integration.md`](./Important%20integration.md).

```html
<footer style="text-align: center; margin-top: 50px; border-top: 1px solid #eee; padding-top: 40px;">
  <h4>ARIGATO LABS</h4>
  <p>Copyright © 2026 Arigato Labs. All Rights Reserved.</p>
  <p>
    <strong>[App Name]</strong> is a product of Arigato Labs, founded by Kumar Devanshu.
    Brand name and logos may not be reused outside Arigato Labs apps without permission.
  </p>
  <p style="opacity: 0.7; font-size: 0.85em;">
    See Privacy, Terms, and Disclaimer in this app. Contact: kumardevanshu3001@gmail.com
  </p>
</footer>
```

Full company license: [`ARIGATO_LABS_LICENSE.md`](./ARIGATO_LABS_LICENSE.md).

*Note: Remember to replace `[App Name]` with the actual name of the application whenever you copy this layout.*
