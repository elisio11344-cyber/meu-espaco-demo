import { z } from "zod";
const email = z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."));
export const loginSchema = z.object({ email, password: z.string().min(1, "Informe sua senha.") });
export const registerSchema = z.object({ email, password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."), confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });
export type AuthState = { error?: string; success?: string; fieldErrors?: Record<string, string[] | undefined> };
