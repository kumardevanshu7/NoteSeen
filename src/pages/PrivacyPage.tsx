import { BrandShell } from "@/components/BrandShell";

export function PrivacyPage() {
  return (
    <BrandShell title="Privacy Policy">
      <p className="ns-micro text-muted">Last updated: 2026</p>

      <h2>Who we are</h2>
      <p>
        NoteSeen is a product of Arigato Labs. Contact:{" "}
        <a href="mailto:kumardevanshu3001@gmail.com">kumardevanshu3001@gmail.com</a>.
      </p>

      <h2>What we collect</h2>
      <p>
        When you sign in with Google we receive your account name, email, and profile photo. Notes
        and prompts you create are stored on this device (IndexedDB) and, when you are signed in, in
        your private Firestore documents. Optional analytics may record basic usage events.
      </p>

      <h2>How we use data</h2>
      <p>
        We use this information to provide NoteSeen, sync your notes across devices, keep your
        account secure, and improve reliability.
      </p>

      <h2>Third parties</h2>
      <p>
        We use Google Firebase (Authentication, Firestore, Analytics) and your browser&apos;s local
        storage. We do not sell personal data.
      </p>

      <h2>Storage & retention</h2>
      <p>
        Local notes remain on your device until you delete them. Cloud notes stay in your Firebase
        account until you remove them or delete the account data. A vault answer is hashed and stored
        only on this device.
      </p>

      <h2>Security</h2>
      <p>We use reasonable safeguards; no system is perfect. Protect your Google account.</p>

      <h2>Children</h2>
      <p>NoteSeen is not directed at children under 13.</p>

      <h2>Changes</h2>
      <p>We may update this policy. Continued use means you accept the updated version.</p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:kumardevanshu3001@gmail.com">kumardevanshu3001@gmail.com</a>
      </p>
    </BrandShell>
  );
}
