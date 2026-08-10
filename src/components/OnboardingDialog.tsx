import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GENDERS,
  PROFESSIONS,
  normalizeUsername,
  type Gender,
  type Profession,
} from "@/lib/profile";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

export function OnboardingDialog() {
  const user = useAuth((state) => state.user);
  const profile = useAuth((state) => state.profile);
  const profileReady = useAuth((state) => state.profileReady);
  const saveProfile = useAuth((state) => state.saveProfile);

  const open = Boolean(user && profileReady && !profile);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [profession, setProfession] = useState<Profession | "">("");
  const [gender, setGender] = useState<Gender | "">("");
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user?.displayName && !fullName) {
      setFullName(user.displayName);
    }
  }, [open, user?.displayName, fullName]);

  const onSave = async () => {
    setError(null);
    const cleanUser = normalizeUsername(username);
    const cleanName = fullName.trim();
    const ageNum = Number(age);

    if (cleanUser.length < 3) {
      setError("Username needs at least 3 letters or numbers.");
      return;
    }
    if (cleanName.length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (!profession) {
      setError("Pick a profession.");
      return;
    }
    if (!gender) {
      setError("Pick a gender option.");
      return;
    }
    if (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 120) {
      setError("Enter a valid age (13–120).");
      return;
    }

    setSaving(true);
    const ok = await saveProfile({
      username: cleanUser,
      fullName: cleanName,
      profession,
      gender,
      age: ageNum,
    });
    setSaving(false);
    if (!ok) setError("Save failed. Check your connection and try again.");
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showClose={false}
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Set up your profile</DialogTitle>
          <DialogDescription>
            One quick step so NoteSeen knows how to address you. You can keep writing notes after
            this.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <Field label="Username">
            <Input
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              placeholder="devanshu"
              autoComplete="username"
              maxLength={24}
            />
          </Field>

          <Field label="Full name">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Kumar Devanshu"
              autoComplete="name"
            />
          </Field>

          <Field label="Profession">
            <div className="grid grid-cols-2 gap-2">
              {PROFESSIONS.map((option) => (
                <Choice
                  key={option.id}
                  active={profession === option.id}
                  label={option.label}
                  onClick={() => setProfession(option.id)}
                />
              ))}
            </div>
          </Field>

          <Field label="Gender">
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((option) => (
                <Choice
                  key={option.id}
                  active={gender === option.id}
                  label={option.label}
                  onClick={() => setGender(option.id)}
                />
              ))}
            </div>
          </Field>

          <Field label="Age">
            <Input
              type="number"
              inputMode="numeric"
              min={13}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="21"
            />
          </Field>

          {error ? <p className="text-[13px] text-error">{error}</p> : null}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="ns-caption text-ink">{label}</span>
      {children}
    </label>
  );
}

function Choice({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-sm border px-3 py-2 text-left text-[13px] transition-colors",
        active
          ? "border-primary bg-primary text-primary-ink"
          : "border-hairline bg-surface text-ink hover:bg-stone",
      )}
    >
      {label}
    </button>
  );
}
