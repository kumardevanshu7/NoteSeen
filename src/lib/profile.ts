import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

export type Profession = "job" | "student" | "freelancer" | "solo_entrepreneur";
export type Gender = "male" | "female" | "other" | "prefer_not";

export interface UserProfile {
  username: string;
  fullName: string;
  profession: Profession;
  gender: Gender;
  age: number;
  onboardedAt: number;
}

export const PROFESSIONS: { id: Profession; label: string }[] = [
  { id: "job", label: "Job" },
  { id: "student", label: "Student" },
  { id: "freelancer", label: "Freelancer" },
  { id: "solo_entrepreneur", label: "Solo entrepreneur" },
];

export const GENDERS: { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
  { id: "prefer_not", label: "Prefer not to say" },
];

export function isProfileComplete(data: Partial<UserProfile> | null | undefined): data is UserProfile {
  if (!data) return false;
  return (
    typeof data.username === "string" &&
    data.username.trim().length >= 3 &&
    typeof data.fullName === "string" &&
    data.fullName.trim().length >= 2 &&
    typeof data.profession === "string" &&
    PROFESSIONS.some((p) => p.id === data.profession) &&
    typeof data.gender === "string" &&
    GENDERS.some((g) => g.id === data.gender) &&
    typeof data.age === "number" &&
    data.age >= 13 &&
    data.age <= 120
  );
}

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<UserProfile>;
  if (!isProfileComplete(data)) return null;
  return {
    username: data.username.trim(),
    fullName: data.fullName.trim(),
    profession: data.profession,
    gender: data.gender,
    age: data.age,
    onboardedAt: typeof data.onboardedAt === "number" ? data.onboardedAt : Date.now(),
  };
}

export async function saveUserProfile(profile: Omit<UserProfile, "onboardedAt"> & { onboardedAt?: number }) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");

  const username = normalizeUsername(profile.username);
  const fullName = profile.fullName.trim();
  const payload: UserProfile = {
    username,
    fullName,
    profession: profile.profession,
    gender: profile.gender,
    age: Math.round(profile.age),
    onboardedAt: profile.onboardedAt ?? Date.now(),
  };

  if (!isProfileComplete(payload)) {
    throw new Error("Incomplete profile");
  }

  await setDoc(
    doc(getFirebaseDb(), "users", user.uid),
    {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      ...payload,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  return payload;
}
