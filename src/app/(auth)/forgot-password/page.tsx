"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type FormState } from "@/lib/actions/auth.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, MailCheck } from "lucide-react";

const initialState: FormState = undefined;

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  if (state?.message === "RESET_EMAIL_SENT") {
    return (
      <div className="w-full max-w-md mx-auto py-6">
        <Card variant="base">
          <CardContent className="flex flex-col items-center text-center gap-4 py-10">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <MailCheck size={28} />
            </div>
            <div>
              <h2 className="text-base font-display font-semibold text-foreground">E-mail envoyé</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Si un compte existe avec cette adresse, un lien de réinitialisation vient d&apos;être envoyé.
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
    <div className="w-full max-w-md mx-auto py-6">
      <Card variant="base">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>Reçois un lien pour réinitialiser ton mot de passe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={action} className="space-y-4">
            <Input
              name="email"
              type="email"
              label="Adresse e-mail"
              leftIcon={<Mail size={16} />}
              error={state?.errors?.email?.[0]}
              required
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={pending}>
              Envoyer le lien
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground pt-2">
            <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
