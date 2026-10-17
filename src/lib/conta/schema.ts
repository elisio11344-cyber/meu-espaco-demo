import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(80, "O nome deve ter no máximo 80 caracteres."),
  timezone: z.string().trim().min(1, "Selecione seu fuso horário.").max(64, "Fuso horário inválido."),
});

export const emailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual."),
  newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "As senhas não coincidem.",
}).refine((data) => data.currentPassword !== data.newPassword, {
  path: ["newPassword"],
  message: "A nova senha deve ser diferente da senha atual.",
});

export type AccountState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
