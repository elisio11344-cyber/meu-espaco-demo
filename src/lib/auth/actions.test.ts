import { beforeEach, describe, expect, it, vi } from "vitest";
const { auth } = vi.hoisted(() => ({ auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn() } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth })) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { login, register, logout } from "./actions";
function form(values: Record<string, string>) { const data = new FormData(); Object.entries(values).forEach(([key, value]) => data.set(key, value)); return data; }
const credentials = { email: "user@example.com", password: "password123", confirmPassword: "password123" };
beforeEach(() => vi.resetAllMocks());
describe("authentication actions", () => {
  it("rejects invalid inputs before calling Supabase", async () => { expect((await login({}, form({ email: "invalid", password: "" }))).fieldErrors?.email).toBeDefined(); expect(auth.signInWithPassword).not.toHaveBeenCalled(); });
  it("translates rejected credentials", async () => { auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } }); expect((await login({}, form(credentials))).error).toBe("E-mail ou senha incorretos."); });
  it("redirects after login", async () => { auth.signInWithPassword.mockResolvedValue({ error: null }); await expect(login({}, form(credentials))).rejects.toThrow("REDIRECT:/dashboard"); });
  it("explains confirmation when signup returns no session", async () => { auth.signUp.mockResolvedValue({ data: { session: null }, error: null }); expect((await register({}, form(credentials))).success).toContain("e-mail de confirmação"); });
  it("redirects after signup with a session", async () => { auth.signUp.mockResolvedValue({ data: { session: {} }, error: null }); await expect(register({}, form(credentials))).rejects.toThrow("REDIRECT:/dashboard"); });
  it("returns a localized connectivity error", async () => { auth.signInWithPassword.mockRejectedValue(new Error("network")); expect((await login({}, form(credentials))).error).toContain("Não foi possível conectar"); });
  it("signs out the current session before redirecting", async () => { auth.signOut.mockResolvedValue({ error: null }); await expect(logout()).rejects.toThrow("REDIRECT:/login"); expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" }); });
  it("does not claim logout succeeded if the provider fails", async () => { auth.signOut.mockResolvedValue({ error: { code: "error" } }); expect((await logout()).error).toBeDefined(); });
});
