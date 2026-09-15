"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { adminSignInAction, type AdminAuthState } from "@/lib/actions/admin-auth.actions";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const initialState: AdminAuthState = undefined;

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminSignInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-4 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-neutral-300 pl-1">Adresse e-mail</label>
        <div className="relative flex items-center">
          <Mail size={16} className="absolute left-4 text-neutral-500 pointer-events-none" />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ton@email.com"
            className="w-full h-12 rounded-2xl border border-neutral-700 bg-neutral-950 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-neutral-300 pl-1">Mot de passe</label>
        <div className="relative flex items-center">
          <Lock size={16} className="absolute left-4 text-neutral-500 pointer-events-none" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full h-12 rounded-2xl border border-neutral-700 bg-neutral-950 pl-11 pr-11 text-sm text-white placeholder:text-neutral-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 text-neutral-500 hover:text-neutral-300 transition-colors"
            title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {state?.message && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          {state.message}
        </div>
      )}

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors font-medium">
          Mot de passe oublié ?
        </Link>
      </div>

      <Button type="submit" variant="primary" size="lg" isLoading={pending} className="w-full h-12 rounded-2xl text-sm font-semibold">
        Se connecter
      </Button>
    </form>
  );
}
