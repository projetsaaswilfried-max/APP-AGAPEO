"use client";

import { useActionState } from "react";
import { updatePasswordAction, type FormState } from "@/lib/actions/auth.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, AlertCircle } from "lucide-react";

const initialState: FormState = undefined;

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <Card variant="base">
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>Choisis un mot de passe robuste d&apos;au moins 8 caractères.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-4">
          <Input
            name="password"
            type="password"
            label="Nouveau mot de passe"
            leftIcon={<Lock size={16} />}
            error={state?.errors?.password?.[0]}
            autoComplete="new-password"
            required
          />
          <Input
            name="confirmPassword"
            type="password"
            label="Confirmer le mot de passe"
            leftIcon={<Lock size={16} />}
            error={state?.errors?.confirmPassword?.[0]}
            autoComplete="new-password"
            required
          />

          {state?.message && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              <AlertCircle size={15} className="shrink-0" />
              {state.message}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={pending}>
            Mettre à jour le mot de passe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
