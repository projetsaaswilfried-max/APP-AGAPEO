import { UserProfile } from "../types/user";
import { createClient } from "@/lib/supabase/client";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";
import type { ProfileRow } from "@/lib/supabase/database.types";

export interface IUserService {
  getCurrentUser(): Promise<UserProfile>;
  getUserById(id: string): Promise<UserProfile | null>;
  updateProfile(id: string, data: Partial<UserProfile>): Promise<UserProfile>;
}

async function fetchProfileWithPhotos(supabase: ReturnType<typeof createClient>, id: string) {
  const [{ data: profile, error }, { data: photos }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("profile_photos").select("*").eq("profile_id", id).order("position", { ascending: true })
  ]);

  if (error || !profile) return null;
  return { profile: profile as ProfileRow, photos: photos ?? [] };
}

class UserServiceSupabase implements IUserService {
  async getCurrentUser(): Promise<UserProfile> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Aucune session active.");

    const result = await fetchProfileWithPhotos(supabase, user.id);
    if (!result) throw new Error("Profil introuvable.");

    const { data: privateData } = await supabase.from("profile_private").select("phone").eq("id", user.id).single();

    return mapProfileRowToUserProfile(result.profile, result.photos, {
      email: user.email,
      phone: privateData?.phone ?? undefined
    });
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const supabase = createClient();
    const result = await fetchProfileWithPhotos(supabase, id);
    if (!result) return null;
    return mapProfileRowToUserProfile(result.profile, result.photos);
  }

  /** Utilisé pour les mises à jour ponctuelles hors formulaire (ex : bascule rapide de statut). */
  async updateProfile(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const supabase = createClient();
    const patch: Record<string, unknown> = {};
    if (data.bio !== undefined) patch.bio = data.bio;
    if (data.quote !== undefined) patch.quote = data.quote;
    if (data.status !== undefined) patch.status = data.status;

    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    const updated = await this.getUserById(id);
    if (!updated) throw new Error("Profil introuvable après mise à jour.");
    return updated;
  }
}

export const userService = new UserServiceSupabase();
