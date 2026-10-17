import { describe, expect, it } from "vitest";
import { emailChangeSchema, passwordChangeSchema, profileSchema } from "./schema";

describe("account validation", () => {
  it("validates profile fields", () => {
    expect(profileSchema.safeParse({ displayName: "A", timezone: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "Elisio Junior", timezone: "Australia/Sydney" }).success).toBe(true);
  });

  it("normalizes the new email", () => {
    expect(emailChangeSchema.parse({ email: " USER@EXAMPLE.COM " })).toEqual({ email: "user@example.com" });
  });

  it("requires a different, confirmed password", () => {
    expect(passwordChangeSchema.safeParse({ currentPassword: "password123", newPassword: "password123", confirmPassword: "password123" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ currentPassword: "password123", newPassword: "new-password-123", confirmPassword: "different" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ currentPassword: "password123", newPassword: "new-password-123", confirmPassword: "new-password-123" }).success).toBe(true);
  });
});
