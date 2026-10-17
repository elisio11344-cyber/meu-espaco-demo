import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, upsert } = vi.hoisted(() => ({
  auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), updateUser: vi.fn() },
  upsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({
  auth,
  from: vi.fn(() => ({ upsert })),
})) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateEmail, updatePassword, updateProfile } from "./actions";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.com" } }, error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signInWithPassword.mockResolvedValue({ error: null });
  upsert.mockResolvedValue({ error: null });
});

describe("account actions", () => {
  it("saves only the authenticated user's profile", async () => {
    const result = await updateProfile({}, form({ displayName: "Elisio Junior", timezone: "Australia/Sydney" }));
    expect(result.success).toBeDefined();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", display_name: "Elisio Junior" }), { onConflict: "user_id" });
  });

  it("requests confirmation for a new email", async () => {
    const result = await updateEmail({}, form({ email: "new@example.com" }));
    expect(result.success).toContain("Confirme");
    expect(auth.updateUser).toHaveBeenCalledWith({ email: "new@example.com" });
  });

  it("verifies the current password before changing it", async () => {
    const result = await updatePassword({}, form({ currentPassword: "password123", newPassword: "new-password-123", confirmPassword: "new-password-123" }));
    expect(result.success).toContain("Senha alterada");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "user@example.com", password: "password123" });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password-123" });
  });

  it("does not change the password when reauthentication fails", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    const result = await updatePassword({}, form({ currentPassword: "wrong-password", newPassword: "new-password-123", confirmPassword: "new-password-123" }));
    expect(result.error).toBe("A senha atual está incorreta.");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
