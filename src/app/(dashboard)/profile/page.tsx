import { requireSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";
import { ProfilePageClient } from "@/components/features/profile/profile-page-client";

export default async function ProfilePage() {
  const { user, profile: profileRow } = await requireSession();
  const supabase = await createClient();

  const [{ data: photos }, { data: privateData }, { data: restrictedData }] = await Promise.all([
    supabase.from("profile_photos").select("*").eq("profile_id", profileRow.id).order("position", { ascending: true }),
    supabase.from("profile_private").select("phone, phone_country_code").eq("id", profileRow.id).single(),
    supabase.from("profile_restricted").select("subscription_status, subscription_current_period_end").eq("id", profileRow.id).single()
  ]);

  const profile = mapProfileRowToUserProfile(profileRow, photos ?? [], {
    email: user.email,
    phone: privateData?.phone ?? undefined,
    phoneCountryCode: privateData?.phone_country_code ?? undefined,
    subscriptionStatus: restrictedData?.subscription_status,
    subscriptionCurrentPeriodEnd: restrictedData?.subscription_current_period_end ?? undefined
  });

  return <ProfilePageClient initialProfile={profile} initialPhotos={photos ?? []} />;
}
