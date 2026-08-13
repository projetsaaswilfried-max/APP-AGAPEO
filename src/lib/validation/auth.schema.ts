import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .regex(/[a-zA-Z]/, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.");

export const RegisterSchema = z
  .object({
    firstName: z.string().trim().min(2, "Le prénom doit contenir au moins 2 caractères."),
    lastName: z.string().trim().optional().default(""),
    email: z.string().trim().email("Adresse e-mail invalide."),
    password: passwordSchema,
    confirmPassword: z.string(),
    gender: z.enum(["MALE", "FEMALE"], { message: "Sélectionne ton genre." }),
    birthDate: z
      .string()
      .refine((val) => !Number.isNaN(Date.parse(val)), "Date de naissance invalide.")
      .refine((val) => {
        const age = (Date.now() - new Date(val).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return age >= 18;
      }, "Tu dois avoir au moins 18 ans pour t'inscrire."),
    country: z.string().trim().min(2, "Sélectionne ton pays de résidence."),
    acceptTerms: z
      .union([z.literal("on"), z.literal(true)])
      .refine((val) => val === "on" || val === true, "Tu dois accepter les conditions d'utilisation.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"]
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est requis.")
});

export const RequestPasswordResetSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide.")
});

export const UpdatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"]
  });

export const ChangeEmailSchema = z.object({
  newEmail: z.string().trim().email("Adresse e-mail invalide.")
});
