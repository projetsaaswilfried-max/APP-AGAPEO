import { requireSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/features/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const { profile } = await requireSession();
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("profile_id", profile.id)
    .order("position", { ascending: true });

  return <OnboardingWizard profile={profile} initialPhotos={photos ?? []} />;
}
