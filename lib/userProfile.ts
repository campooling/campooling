export const USER_PROFILE_KEY = "campoolingUserProfile";

export type UserRole = "KATUSA" | "USA_ARMY";

export type UserProfile = {
  nickname: string;
  role: UserRole;
};

export function roleLabel(role: UserRole): string {
  if (role === "USA_ARMY") return "U.S. Army";
  return "KATUSA";
}

export function loadUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed?.nickname?.trim() || !parsed?.role) return null;
    if (parsed.role !== "KATUSA" && parsed.role !== "USA_ARMY") return null;
    return parsed;
  } catch {
    return null;
  }
}
