import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminUserRow } from "@/components/features/admin/admin-users-table";
import { ADMIN_USERS_PAGE_SIZE } from "@/domain/admin-users";

interface AdminUserRpcRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: AdminUserRow["gender"];
  is_test_account: boolean;
  country: string;
  created_at: string;
  last_active_at: string;
  photo_verification_status: AdminUserRow["photoVerificationStatus"];
  role: AdminUserRow["role"];
  is_suspended: boolean;
  is_premium: boolean;
  subscription_plan: string | null;
}

function mapAdminUserRows(rows: AdminUserRpcRow[]): AdminUserRow[] {
  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    role: r.role,
    gender: r.gender,
    isTestAccount: r.is_test_account,
    isSuspended: r.is_suspended,
    isPremium: r.is_premium,
    subscriptionPlan: r.subscription_plan,
    photoVerificationStatus: r.photo_verification_status,
    country: r.country,
    createdAt: r.created_at,
    lastActiveAt: r.last_active_at
  }));
}

/**
 * Trié par récence de vérification (profils récemment validés/refusés en
 * premier, jamais soumis tout en bas) plutôt que par date d'inscription —
 * demandé pour retrouver en priorité les dossiers dont l'équipe vient de
 * s'occuper. Réservé au service_role côté base (cf. la migration) : la
 * fonction lit `auth.users` directement pour résoudre l'email, ce qui ne
 * doit jamais être exposé à un client authentifié normal.
 */
export async function fetchAdminUsersPage(admin: SupabaseClient, offset: number): Promise<AdminUserRow[]> {
  const { data, error } = await admin.rpc("admin_list_users_by_verification_recency", {
    p_limit: ADMIN_USERS_PAGE_SIZE,
    p_offset: offset
  });
  if (error) throw new Error(error.message);

  return mapAdminUserRows((data ?? []) as AdminUserRpcRow[]);
}

/**
 * Recherche sur TOUTE la base (prénom, nom, email, pays) — indépendamment
 * des lots déjà chargés côté client, pour qu'un profil existant ressorte
 * même s'il n'a pas encore été chargé par la pagination.
 */
export async function searchAdminUsers(admin: SupabaseClient, query: string): Promise<AdminUserRow[]> {
  const { data, error } = await admin.rpc("admin_search_users", { p_query: query, p_limit: 50 });
  if (error) throw new Error(error.message);

  return mapAdminUserRows((data ?? []) as AdminUserRpcRow[]);
}
