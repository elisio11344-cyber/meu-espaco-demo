import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./schema";
import { authErrorMessage } from "./errors";
describe("auth validation", () => {
  it("rejects invalid email and blank password", () => { expect(loginSchema.safeParse({ email: "invalid", password: "" }).success).toBe(false); });
  it("accepts existing passwords shorter than registration minimum", () => { expect(loginSchema.safeParse({ email: "user@example.com", password: "short" }).success).toBe(true); });
  it("requires eight characters and matching passwords for registration", () => {
    expect(registerSchema.safeParse({ email: "user@example.com", password: "short", confirmPassword: "short" }).success).toBe(false);
    const result = registerSchema.safeParse({ email: "user@example.com", password: "password123", confirmPassword: "different" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.confirmPassword).toEqual(["As senhas não coincidem."]);
  });
  it("normalizes email without modifying passwords", () => { expect(loginSchema.parse({ email: "USER@example.com", password: " pass " })).toEqual({ email: "user@example.com", password: " pass " }); });
  it("never exposes raw provider errors", () => { expect(authErrorMessage("invalid_credentials")).toBe("E-mail ou senha incorretos."); expect(authErrorMessage("internal_error")).toBe("Não foi possível concluir a solicitação. Tente novamente."); });
});
