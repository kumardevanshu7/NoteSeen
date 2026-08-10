import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { BrandShell } from "@/components/BrandShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CONTACT_EMAIL = "kumardevanshu3001@gmail.com";
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);

    const body = [
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "  ARIGATO LABS · CONTACT",
      "  Product: NoteSeen",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      `From:     ${name}`,
      `Email:    ${email}`,
      `Subject:  ${subject}`,
      "",
      "Message",
      "-------",
      message,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "Sent from NoteSeen contact form",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ].join("\n");

    try {
      if (WEB3FORMS_KEY) {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            from_name: "Arigato Labs · NoteSeen",
            subject: `[NoteSeen] ${subject}`,
            name,
            email,
            message: body,
          }),
        });
        if (!res.ok) throw new Error("Send failed");
        setSent(true);
        toast.success("Message sent");
      } else {
        const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[NoteSeen] ${subject}`)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        toast("Opening your email app", {
          description: "Add VITE_WEB3FORMS_KEY for in-app delivery.",
        });
      }
    } catch {
      toast.error("Could not send — try emailing us directly.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BrandShell title="Contact Arigato Labs">
      <p>
        Questions about NoteSeen or Arigato Labs? Send a message — it goes to the founder.
      </p>
      <p>
        Public address:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      {sent ? (
        <p className="rounded-sm border border-hairline bg-pale-green px-4 py-4 text-ink">
          Message sent — we&apos;ll get back to you by email.
        </p>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4 text-left">
          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Subject</span>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              className="w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-focus"
            />
          </label>
          <Button type="submit" variant="primary" disabled={busy}>
            Send message
          </Button>
        </form>
      )}
    </BrandShell>
  );
}
