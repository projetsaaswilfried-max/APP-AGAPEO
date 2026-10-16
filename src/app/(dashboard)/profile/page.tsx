import { requireMemberViewSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";
import { ProfilePageClient } from "@/components/features/profile/profile-page-client";

export default async function ProfilePage() {
  const { user, profile: profileRow } = await requireMemberViewSession();
  const supabase = await createClient();

  // L'abonnement vient du profil de session (déjà fusionné avec profile_restricted) plutôt que d'une
  // relecture de la table : c'est lui qui porte le mode aperçu de l'équipe.
  const [{ data: photos }, { data: privateData }] = await Promise.all([
    supabase.from("profile_photos").select("*").eq("profile_id", profileRow.id).order("position", { ascending: true }),
    supabase.from("profile_private").select("phone, phone_country_code").eq("id", profileRow.id).single()
  ]);

  const profile = mapProfileRowToUserProfile(profileRow, photos ?? [], {
    email: user.email,
    phone: privateData?.phone ?? undefined,
    phoneCountryCode: privateData?.phone_country_code ?? undefined,
    subscriptionStatus: profileRow.subscription_status,
    subscriptionCurrentPeriodEnd: profileRow.subscription_current_period_end ?? undefined
  });

  return <ProfilePageClient initialProfile={profile} initialPhotos={photos ?? []} />;
}
