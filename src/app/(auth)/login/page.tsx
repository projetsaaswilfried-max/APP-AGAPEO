"use client";

import { useActionState, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction, resendConfirmationAction, type FormState } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { AuthSlider } from "@/components/features/auth/auth-slider";
import { AgapeoLogo } from "@/components/ui/logo";
import { GoogleAuthButton } from "@/components/features/auth/google-auth-button";
import { SITE_CONFIG } from "@/config/site";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, MailWarning } from "lucide-react";

const initialState: FormState = undefined;

function ResendConfirmation({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmationAction, initialState);

  if (state?.message === "CONFIRMATION_RESENT") {
    return (
      <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
        E-mail de confirmation renvoyé — vérifie ta boîte de réception.
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-400">
      <input type="hidden" name="email" value={email} />
      <div className="flex items-center gap-2">
        <MailWarning size={16} className="shrink-0 text-amber-500" />
        Ton adresse e-mail n&apos;est pas encore confirmée.
      </div>
      <Button type="submit" variant="outline" size="sm" isLoading={pending} className="w-fit mt-1 rounded-full text-xs">
        Renvoyer l&apos;e-mail de confirmation
      </Button>
    </form>
  );
}

function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initialState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const passwordUpdated = searchParams.get("passwordUpdated") === "1";
  
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full h-full flex flex-col justify-between p-6 sm:p-8 lg:p-10">
      {/* Centered Logo Symbol in a White Circle */}
      <div className="flex items-center justify-center pt-2">
        <Link
          href="/"
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center shadow-md p-3.5 border border-border/40 hover:scale-105 transition-transform duration-200"
          title="Accueil AGAPEO"
        >
          <AgapeoLogo size="lg" iconOnly />
        </Link>
      </div>

      {/* Main Form Center Content */}
      <div className="my-auto py-6 space-y-6 max-w-md mx-auto w-full">
        {/* Title & Subtitle */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display text-foreground">
            Bienvenue sur Agapeo
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Commence ton expérience sur Agapeo en te connectant ou en créant un compte.
          </p>
        </div>

        {/* Pill Segmented Toggle Switch (Matching Reference Image) */}
        <div className="p-1.5 rounded-full bg-secondary/80 border border-border/50 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            className="flex-1 py-2.5 px-4 rounded-full text-xs font-semibold text-foreground bg-card shadow-sm border border-border/40 transition-all duration-200 text-center"
          >
            Se connecter
          </button>
          <Link
            href="/register"
            className="flex-1 py-2.5 px-4 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200 text-center"
          >
            S&apos;inscrire
          </Link>
        </div>

        {/* Status Alerts */}
        {passwordUpdated && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            Mot de passe mis à jour. Connecte-toi avec ton nouveau mot de passe.
          </div>
        )}

        {/* Auth Form */}
        <form action={action} className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/90 pl-1">
              Adresse e-mail <span className="text-primary">*</span>
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-4 text-muted-foreground pointer-events-none" />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Entrez votre adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 rounded-2xl border border-border/70 bg-secondary/50 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/90 pl-1">
              Mot de passe <span className="text-primary">*</span>
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-4 text-muted-foreground pointer-events-none" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Entrez votre mot de passe"
                className="w-full h-12 rounded-2xl border border-border/70 bg-secondary/50 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-muted-foreground hover:text-foreground transition-colors"
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error / Resend Handling */}
          {state?.message === "EMAIL_NOT_CONFIRMED" ? (
            <ResendConfirmation email={email} />
          ) : (
            state?.message && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                <AlertCircle size={16} className="shrink-0" />
                {state.message}
              </div>
            )
          )}

          {/* Forgot Password Link */}
          <div className="flex justify-end pt-0.5">
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={pending}
            className="w-full h-12 rounded-2xl text-sm font-semibold shadow-accent-glow"
          >
            Se connecter
          </Button>
        </form>

        {/* Social Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="w-full border-t border-border/60" />
          <span className="absolute bg-card px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Ou continuer avec
          </span>
        </div>

        {/* Connexion Google */}
        <GoogleAuthButton />
      </div>

      {/* Footer Legal Notice (Matching Reference Image) */}
      <div className="pt-4 text-center border-t border-border/40 text-[11px] text-muted-foreground">
        <p>
          Copyright © {new Date().getFullYear()} {SITE_CONFIG.name}, Tous droits réservés |{" "}
          <Link href={SITE_CONFIG.links.terms} className="hover:text-foreground underline-offset-4 hover:underline">
            Conditions d&apos;utilisation
          </Link>{" "}
          |{" "}
          <Link href={SITE_CONFIG.links.privacy} className="hover:text-foreground underline-offset-4 hover:underline">
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-7xl mx-auto rounded-[2.5rem] bg-card border border-border/80 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[720px] p-2 sm:p-4 lg:p-5 gap-6">
      {/* Left Column: Redesigned Auth Form */}
      <div className="lg:col-span-6 flex flex-col">
        <Suspense fallback={<div className="h-96 animate-pulse bg-secondary/30 rounded-2xl" />}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Right Column: Inspired Visual Showcase Slider */}
      <div className="hidden lg:block lg:col-span-6">
        <AuthSlider />
      </div>
    </div>
  );
}
