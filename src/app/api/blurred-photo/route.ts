import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

const SUPABASE_AVATARS_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`;

/**
 * Proxy de floutage réel (pixels, pas CSS) pour les photos d'un profil ayant
 * activé "Flouter mes photos pour le grand public". Le mapper ne renvoie
 * jamais l'URL brute à un autre membre quand ce réglage est actif — cette
 * route reçoit l'URL d'origine, vérifie qu'elle appartient bien au
 * propriétaire déclaré, confirme via RLS que l'appelant a le droit de voir
 * ce profil, puis applique un flou serveur avant de répondre.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const owner = request.nextUrl.searchParams.get("owner");
  if (!url || !owner) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (!url.startsWith(`${SUPABASE_AVATARS_PREFIX}${owner}/`)) {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Session expirée" }, { status: 401 });
  }

  // RLS `profiles_select` referme l'accès si `owner` a bloqué l'appelant ou
  // est en profil invisible — la même règle s'applique donc ici pour la photo.
  const { data: ownerProfile } = await supabase.from("profiles").select("is_photo_blurred").eq("id", owner).maybeSingle();
  if (!ownerProfile) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  if (owner === user.id || !ownerProfile.is_photo_blurred) {
    return NextResponse.redirect(url);
  }

  const imageRes = await fetch(url);
  if (!imageRes.ok) {
    return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
  }
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const blurred = await sharp(buffer).resize({ width: 600, withoutEnlargement: true }).blur(35).jpeg({ quality: 70 }).toBuffer();

  return new NextResponse(blurred, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600"
    }
  });
}
