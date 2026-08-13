"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAction, type FormState } from "@/lib/actions/auth.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GoogleAuthButton } from "@/components/features/auth/google-auth-button";
import { SUPPORTED_COUNTRIES } from "@/config/countries";
import { Mail, Lock, User, AlertCircle, MailCheck } from "lucide-react";

const initialState: FormState = undefined;

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signUpAction, initialState);
  const [acceptTerms, setAcceptTerms] = useState(false);

  if (state?.message === "CHECK_EMAIL") {
    return (
      <div className="w-full max-w-xl mx-auto py-6">
        <Card variant="base">
          <CardContent className="flex flex-col items-center text-center gap-4 py-10">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <MailCheck size={28} />
            </div>
            <div>
              <h2 className="text-base font-display font-semibold text-foreground">Vérifie ta boîte mail</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Nous t&apos;avons envoyé un lien de confirmation. Clique dessus pour activer ton compte et commencer
                ton profil.
              </p>
            </div>
            <Link href="/login" className="text-xs text-foreground font-medium underline-offset-4 hover:underline">
              Retour à la connexion
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto py-6">
      <Card variant="base">
        <CardHeader>
          <CardTitle>Créer un compte</CardTitle>
          <CardDescription>Rejoins une communauté sérieuse orientée vers le mariage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={action} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="firstName"
                label="Prénom"
                leftIcon={<User size={16} />}
                error={state?.errors?.firstName?.[0]}
                required
              />
              <Input name="lastName" label="Nom (optionnel)" error={state?.errors?.lastName?.[0]} />
            </div>

            <Input
              name="email"
              type="email"
              label="Adresse e-mail"
              leftIcon={<Mail size={16} />}
              error={state?.errors?.email?.[0]}
              autoComplete="email"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                name="password"
                type="password"
                label="Mot de passe"
                leftIcon={<Lock size={16} />}
                error={state?.errors?.password?.[0]}
                autoComplete="new-password"
                required
              />
              <Input
                name="confirmPassword"
                type="password"
                label="Confirmer"
                leftIcon={<Lock size={16} />}
                error={state?.errors?.confirmPassword?.[0]}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Genre</label>
                <select
                  name="gender"
                  required
                  className="w-full h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Sélectionner</option>
                  <option value="FEMALE">Femme</option>
                  <option value="MALE">Homme</option>
                </select>
                {state?.errors?.gender?.[0] && (
                  <p className="text-xs text-destructive font-medium pl-1">{state.errors.gender[0]}</p>
                )}
              </div>

              <Input
                name="birthDate"
                type="date"
                label="Date de naissance"
                error={state?.errors?.birthDate?.[0]}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Pays de résidence</label>
              <select
                name="country"
                required
                defaultValue=""
                className="w-full h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Sélectionner un pays
                </option>
                {SUPPORTED_COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {state?.errors?.country?.[0] && (
                <p className="text-xs text-destructive font-medium pl-1">{state.errors.country[0]}</p>
              )}
            </div>

            <Checkbox
              name="acceptTerms"
              checked={acceptTerms}
              onCheckedChange={setAcceptTerms}
              label="J'accepte les conditions d'utilisation et la charte éthique"
            />
            {state?.errors?.acceptTerms?.[0] && (
              <p className="text-xs text-destructive font-medium pl-1">{state.errors.acceptTerms[0]}</p>
            )}

            {state?.message && state.message !== "CHECK_EMAIL" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                <AlertCircle size={15} className="shrink-0" />
                {state.message}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={pending}>
              Créer mon compte
            </Button>
          </form>

          <div className="relative flex items-center justify-center py-1">
            <div className="w-full border-t border-border/60" />
            <span className="absolute bg-card px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ou</span>
          </div>

          <GoogleAuthButton label="S'inscrire avec Google" />

          <p className="text-xs text-center text-muted-foreground pt-2">
            Déjà inscrit(e) ?{" "}
            <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
