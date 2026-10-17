import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { getUser, createServerClient } = vi.hoisted(() => ({ getUser: vi.fn(), createServerClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
import { updateSession } from "./middleware";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  createServerClient.mockReturnValue({ auth: { getUser } });
  getUser.mockResolvedValue({ data: { user: null }, error: null });
});
describe("route protection", () => {
  it.each(["/dashboard", "/habitos", "/notas", "/metas", "/financas", "/notas/nested", "/future-module"])("redirects anonymous visitors from %s", async (path) => {
    const response = await updateSession(new NextRequest(`http://localhost:3000${path}`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });
  it.each(["/login", "/registro", "/auth/confirm"])("keeps %s public", async (path) => { expect((await updateSession(new NextRequest(`http://localhost:3000${path}`))).status).toBe(200); });
  it("allows a verified user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-id" } }, error: null });
    const response = await updateSession(new NextRequest("http://localhost:3000/dashboard"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("denies a failed validation even when user data exists", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-id" } }, error: { message: "invalid" } });
    expect((await updateSession(new NextRequest("http://localhost:3000/dashboard"))).status).toBe(307);
  });
  it("preserves refreshed cookies when redirecting", async () => {
    createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll([{ name: "sb-session", value: "refreshed", options: { httpOnly: true, path: "/" } }]);
      return { auth: { getUser } };
    });
    const response = await updateSession(new NextRequest("http://localhost:3000/dashboard"));
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });
});
