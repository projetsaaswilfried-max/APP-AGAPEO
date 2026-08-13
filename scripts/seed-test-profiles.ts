/**
 * Crée des profils fictifs (marqués is_test_account = true) pour tester
 * Découvrir, la messagerie (texte + note vocale réelle) et l'algorithme de
 * compatibilité en conditions réelles.
 *
 * Usage : npx tsx scripts/seed-test-profiles.ts
 * Nécessite SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_URL (lus depuis .env.local).
 *
 * Pour tout supprimer avant le lancement réel : npx tsx scripts/delete-test-profiles.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface TestProfileSeed {
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  country: string;
  city: string;
  profession: string;
  bio: string;
  quote: string;
  churchDenomination: string;
  faithEngagementLevel: string;
  faithDescription: string;
  favoriteVerse: string;
  baptized: boolean;
  personalityTraits: string[];
  passions: string[];
  hobbies: string[];
  qualities: string[];
  whyMarriage: string;
  coupleVision: string;
  marriageTimeline: string;
  desiredChildrenCount: string;
  relocationReady: boolean;
  coreValues: string[];
  desiredAgeMin: number;
  desiredAgeMax: number;
  desiredCountries: string[];
  photoVerification: "VERIFIED" | "PENDING";
  avatarSeed: number;
  extraPhotoSeeds: number[];
}

const TEST_PROFILES: TestProfileSeed[] = [
  {
    email: "test.marie.grace@agape-demo.invalid",
    firstName: "Marie-Grace",
    lastName: "Adjovi",
    birthDate: "1999-03-14",
    country: "Bénin",
    city: "Cotonou",
    profession: "Institutrice",
    bio: "Passionnée de louange et de service, je crois que Dieu a un plan magnifique pour chaque union bâtie sur Lui.",
    quote: "Que tout ce que vous faites soit fait avec amour. — 1 Corinthiens 16:14",
    churchDenomination: "Évangélique",
    faithEngagementLevel: "Très engagée",
    faithDescription: "Active dans le groupe de louange de mon église depuis 6 ans.",
    favoriteVerse: "Jérémie 29:11",
    baptized: true,
    personalityTraits: ["Joyeuse", "Attentionnée", "Déterminée"],
    passions: ["Musique", "Lecture", "Voyages"],
    hobbies: ["Chant", "Cuisine"],
    qualities: ["Patience", "Écoute", "Fidélité"],
    whyMarriage: "Le mariage est pour moi une alliance sacrée, un espace pour grandir ensemble dans la foi et servir Dieu à deux.",
    coupleVision: "Un foyer où la prière et le rire ont autant leur place l'un que l'autre.",
    marriageTimeline: "Dans l'année",
    desiredChildrenCount: "2 à 3 enfants",
    relocationReady: true,
    coreValues: ["Foi", "Famille", "Honnêteté"],
    desiredAgeMin: 24,
    desiredAgeMax: 34,
    desiredCountries: ["Bénin", "Togo"],
    photoVerification: "VERIFIED",
    avatarSeed: 44,
    extraPhotoSeeds: [65]
  },
  {
    email: "test.esther.kouassi@agape-demo.invalid",
    firstName: "Esther",
    lastName: "Kouassi",
    birthDate: "1998-07-22",
    country: "Côte d'Ivoire",
    city: "Abidjan",
    profession: "Entrepreneure",
    bio: "Femme d'affaires et fille de Dieu — je cherche un compagnon qui bâtit avec ambition et humilité.",
    quote: "C'est de Lui que je tiens toute ma force. — Philippiens 4:13",
    churchDenomination: "Baptiste",
    faithEngagementLevel: "Engagée",
    faithDescription: "Sert dans le ministère d'accueil de son église locale.",
    favoriteVerse: "Philippiens 4:13",
    baptized: true,
    personalityTraits: ["Ambitieuse", "Généreuse", "Directe"],
    passions: ["Entrepreneuriat", "Sport", "Cuisine"],
    hobbies: ["Course à pied", "Pâtisserie"],
    qualities: ["Persévérance", "Loyauté"],
    whyMarriage: "Je veux construire une famille solide, fondée sur le respect mutuel et la foi partagée.",
    coupleVision: "Deux partenaires qui s'élèvent mutuellement, spirituellement et professionnellement.",
    marriageTimeline: "1 à 2 ans",
    desiredChildrenCount: "3 enfants ou plus",
    relocationReady: true,
    coreValues: ["Respect", "Foi", "Persévérance"],
    desiredAgeMin: 26,
    desiredAgeMax: 38,
    desiredCountries: ["Côte d'Ivoire", "Bénin", "France"],
    photoVerification: "VERIFIED",
    avatarSeed: 68,
    extraPhotoSeeds: [21]
  },
  {
    email: "test.ruth.agboton@agape-demo.invalid",
    firstName: "Ruth",
    lastName: "Agboton",
    birthDate: "2001-11-05",
    country: "Bénin",
    city: "Porto-Novo",
    profession: "Infirmière",
    bio: "Douce et pleine de vie, je sers les malades le jour et je loue le Seigneur le soir.",
    quote: "Servez-vous les uns les autres par amour. — Galates 5:13",
    churchDenomination: "Pentecôtiste",
    faithEngagementLevel: "Très engagée",
    faithDescription: "Membre de la chorale et de l'équipe d'intercession.",
    favoriteVerse: "Psaume 23",
    baptized: true,
    personalityTraits: ["Douce", "Patiente", "Sensible"],
    passions: ["Louange", "Lecture", "Nature"],
    hobbies: ["Randonnée", "Chant"],
    qualities: ["Compassion", "Douceur"],
    whyMarriage: "Je vois le mariage comme un ministère à deux, où l'on s'encourage à devenir plus proche de Dieu chaque jour.",
    coupleVision: "Un couple qui prie ensemble avant chaque décision importante.",
    marriageTimeline: "Dans l'année",
    desiredChildrenCount: "2 enfants",
    relocationReady: false,
    coreValues: ["Foi", "Famille", "Service"],
    desiredAgeMin: 23,
    desiredAgeMax: 30,
    desiredCountries: ["Bénin"],
    photoVerification: "VERIFIED",
    avatarSeed: 52,
    extraPhotoSeeds: [9]
  },
  {
    email: "test.naomi.dossou@agape-demo.invalid",
    firstName: "Naomi",
    lastName: "Dossou",
    birthDate: "1997-02-18",
    country: "Togo",
    city: "Lomé",
    profession: "Architecte d'intérieur",
    bio: "Créative et enracinée dans mes valeurs, je crois en un amour patient qui prend le temps de bien se connaître.",
    quote: "L'amour est patient, l'amour est plein de bonté. — 1 Corinthiens 13:4",
    churchDenomination: "Catholique",
    faithEngagementLevel: "Engagée",
    faithDescription: "Pratiquante régulière, engagée dans la pastorale des jeunes.",
    favoriteVerse: "1 Corinthiens 13:4",
    baptized: true,
    personalityTraits: ["Créative", "Calme", "Réfléchie"],
    passions: ["Danse", "Art", "Voyages"],
    hobbies: ["Peinture", "Décoration"],
    qualities: ["Fidélité", "Sens esthétique"],
    whyMarriage: "Pour moi, le mariage est un engagement durable, construit pas à pas sur la confiance et la tradition familiale.",
    coupleVision: "Une maison chaleureuse où la famille élargie a toujours sa place.",
    marriageTimeline: "2 à 3 ans",
    desiredChildrenCount: "1 à 2 enfants",
    relocationReady: true,
    coreValues: ["Fidélité", "Famille", "Tradition"],
    desiredAgeMin: 27,
    desiredAgeMax: 40,
    desiredCountries: ["Togo", "Bénin", "Ghana"],
    photoVerification: "PENDING",
    avatarSeed: 12,
    extraPhotoSeeds: [30]
  },
  {
    email: "test.deborah.hounsou@agape-demo.invalid",
    firstName: "Deborah",
    lastName: "Hounsou",
    birthDate: "1996-09-30",
    country: "France",
    city: "Paris",
    profession: "Consultante RH",
    bio: "Béninoise de la diaspora, je garde mes racines et ma foi au centre de tout, même à des milliers de km.",
    quote: "Je peux tout par celui qui me fortifie. — Philippiens 4:13",
    churchDenomination: "Protestante évangélique",
    faithEngagementLevel: "Engagée",
    faithDescription: "Fréquente une église de la diaspora africaine à Paris.",
    favoriteVerse: "Josué 1:9",
    baptized: true,
    personalityTraits: ["Indépendante", "Chaleureuse", "Curieuse"],
    passions: ["Voyages", "Photographie", "Musique"],
    hobbies: ["Photographie", "Cuisine du monde"],
    qualities: ["Ouverture d'esprit", "Ambition"],
    whyMarriage: "Je veux un partenaire prêt à bâtir un foyer entre deux continents, uni par la même foi.",
    coupleVision: "Un couple qui reste connecté à ses racines tout en avançant ensemble vers l'avenir.",
    marriageTimeline: "Pas pressée",
    desiredChildrenCount: "2 à 3 enfants",
    relocationReady: true,
    coreValues: ["Foi", "Ambition", "Authenticité"],
    desiredAgeMin: 28,
    desiredAgeMax: 42,
    desiredCountries: ["Bénin", "France", "Canada"],
    photoVerification: "VERIFIED",
    avatarSeed: 22,
    extraPhotoSeeds: [47]
  },
  {
    email: "test.sarah.mensah@agape-demo.invalid",
    firstName: "Sarah",
    lastName: "Mensah",
    birthDate: "2000-05-09",
    country: "Canada",
    city: "Montréal",
    profession: "Étudiante en médecine",
    bio: "Étudiante sérieuse, fille d'église depuis toujours, je cherche un compagnon de vie et de foi.",
    quote: "Confie-toi en l'Éternel de tout ton cœur. — Proverbes 3:5",
    churchDenomination: "Chrétienne évangélique",
    faithEngagementLevel: "Très engagée",
    faithDescription: "Responsable du groupe de jeunes adultes de son église.",
    favoriteVerse: "Proverbes 3:5-6",
    baptized: true,
    personalityTraits: ["Studieuse", "Fidèle", "Réservée"],
    passions: ["Lecture", "Cinéma", "Bénévolat"],
    hobbies: ["Bénévolat", "Cinéma"],
    qualities: ["Sérieux", "Bienveillance"],
    whyMarriage: "Je veux un mariage qui reflète l'amour du Christ pour l'Église : sacrifice, patience et engagement.",
    coupleVision: "Un partenariat où chacun pousse l'autre à devenir la meilleure version de lui-même.",
    marriageTimeline: "Dans l'année",
    desiredChildrenCount: "2 enfants",
    relocationReady: true,
    coreValues: ["Foi", "Croissance personnelle", "Famille"],
    desiredAgeMin: 24,
    desiredAgeMax: 32,
    desiredCountries: ["Canada", "Bénin", "France"],
    photoVerification: "VERIFIED",
    avatarSeed: 33,
    extraPhotoSeeds: [58]
  }
];

function photoUrl(seed: number) {
  return `https://randomuser.me/api/portraits/women/${seed}.jpg`;
}

/** Génère un vrai fichier WAV (tonalité sinusoïdale, PCM 16 bits) — pas un fichier factice. */
function generateSineWav(durationSeconds: number, frequency = 440, sampleRate = 22050): Buffer {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeOut = Math.min(1, (numSamples - i) / (sampleRate * 0.1));
    const fadeIn = Math.min(1, i / (sampleRate * 0.05));
    const amplitude = 0.3 * Math.sin(2 * Math.PI * frequency * t) * fadeIn * fadeOut;
    buffer.writeInt16LE(Math.round(amplitude * 32767), 44 + i * 2);
  }

  return buffer;
}

async function main() {
  console.log("Recherche du/des compte(s) réel(s)...");
  const { data: realProfiles, error: realErr } = await admin
    .from("profiles")
    .select("id, first_name, gender")
    .eq("is_test_account", false);
  if (realErr) throw realErr;
  console.log(`Comptes réels trouvés : ${realProfiles?.map((p) => p.first_name).join(", ") || "aucun"}`);

  const createdIds: string[] = [];

  for (const seed of TEST_PROFILES) {
    console.log(`\n--- Création de ${seed.firstName} ${seed.lastName} ---`);

    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const already = existing?.users.find((u) => u.email === seed.email);
    let userId: string;

    if (already) {
      console.log("  déjà existant, réutilisation de l'utilisateur");
      userId = already.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: seed.email,
        password: `Agape-Demo-${Math.random().toString(36).slice(2)}!`,
        email_confirm: true,
        user_metadata: {
          first_name: seed.firstName,
          last_name: seed.lastName,
          gender: "FEMALE",
          birth_date: seed.birthDate,
          country: seed.country
        }
      });
      if (createErr || !created.user) {
        console.error("  ÉCHEC création auth user:", createErr?.message);
        continue;
      }
      userId = created.user.id;
      console.log(`  utilisateur auth créé : ${userId}`);
    }

    createdIds.push(userId);

    const { error: updateErr } = await admin
      .from("profiles")
      .update({
        is_test_account: true,
        city: seed.city,
        profession: seed.profession,
        avatar_url: photoUrl(seed.avatarSeed),
        bio: seed.bio,
        quote: seed.quote,
        church_denomination: seed.churchDenomination,
        faith_engagement_level: seed.faithEngagementLevel,
        faith_description: seed.faithDescription,
        favorite_verse: seed.favoriteVerse,
        baptized: seed.baptized,
        personality_traits: seed.personalityTraits,
        passions: seed.passions,
        hobbies: seed.hobbies,
        qualities: seed.qualities,
        why_marriage: seed.whyMarriage,
        couple_vision: seed.coupleVision,
        marriage_timeline: seed.marriageTimeline,
        desired_children_count: seed.desiredChildrenCount,
        relocation_ready: seed.relocationReady,
        core_values: seed.coreValues,
        desired_age_min: seed.desiredAgeMin,
        desired_age_max: seed.desiredAgeMax,
        desired_countries: seed.desiredCountries,
        photo_verification_status: seed.photoVerification,
        onboarding_completed: true,
        onboarding_step: 5,
        email_verified: true,
        last_active_at: new Date().toISOString()
      })
      .eq("id", userId);
    if (updateErr) {
      console.error("  ÉCHEC mise à jour profil:", updateErr.message);
      continue;
    }
    console.log("  profil enrichi");

    await admin.from("profile_photos").delete().eq("profile_id", userId);
    const photoRows = [seed.avatarSeed, ...seed.extraPhotoSeeds].map((s, i) => ({
      profile_id: userId,
      url: photoUrl(s),
      storage_path: `external/${userId}/${s}.jpg`,
      is_primary: i === 0,
      position: i
    }));
    const { error: photoErr } = await admin.from("profile_photos").insert(photoRows);
    if (photoErr) console.error("  ÉCHEC insertion photos:", photoErr.message);
    else console.log(`  ${photoRows.length} photo(s) ajoutée(s)`);
  }

  // Conversation de démonstration avec le premier vrai compte trouvé
  const realUser = realProfiles?.[0];
  if (realUser && createdIds.length > 0) {
    const firstTestId = createdIds[0];
    console.log(`\n--- Conversation de démonstration : ${realUser.first_name} <-> ${TEST_PROFILES[0].firstName} ---`);

    const { data: existingConv } = await admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", firstTestId);

    let conversationId: string | null = null;
    if (existingConv && existingConv.length > 0) {
      for (const c of existingConv) {
        const { data: participants } = await admin
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", c.conversation_id);
        if (participants?.some((p) => p.user_id === realUser.id)) {
          conversationId = c.conversation_id;
          break;
        }
      }
    }

    if (!conversationId) {
      const { data: conv, error: convErr } = await admin.from("conversations").insert({}).select().single();
      if (convErr || !conv) {
        console.error("  ÉCHEC création conversation:", convErr?.message);
      } else {
        conversationId = conv.id;
        await admin.from("conversation_participants").insert([
          { conversation_id: conversationId, user_id: realUser.id },
          { conversation_id: conversationId, user_id: firstTestId }
        ]);
        console.log(`  conversation créée : ${conversationId}`);
      }
    } else {
      console.log("  conversation déjà existante, réutilisation");
    }

    if (conversationId) {
      const { count } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId);

      if (!count || count === 0) {
        const messages = [
          { sender_id: firstTestId, type: "TEXT", content: "Bonjour ! J'ai vu que nous étions recommandés l'un à l'autre, quelle joie de vous découvrir 😊" },
          { sender_id: realUser.id, type: "TEXT", content: "Bonjour Marie-Grace, merci pour votre message ! Je suis ravi d'échanger avec vous." },
          { sender_id: firstTestId, type: "TEXT", content: "Dites-moi, qu'est-ce qui vous a le plus marqué dans votre marche avec le Seigneur ces derniers temps ?" },
          { sender_id: realUser.id, type: "TEXT", content: "Beaucoup de choses ! Je suis encore en train de compléter mon profil, mais j'ai hâte de vous en dire plus." }
        ];

        for (const m of messages) {
          await admin.from("messages").insert({ conversation_id: conversationId, ...m });
        }
        console.log(`  ${messages.length} messages texte insérés`);

        const { data: voiceMessage, error: voiceMsgErr } = await admin
          .from("messages")
          .insert({ conversation_id: conversationId, sender_id: firstTestId, type: "VOICE", content: null })
          .select()
          .single();

        if (voiceMsgErr || !voiceMessage) {
          console.error("  ÉCHEC création message vocal:", voiceMsgErr?.message);
        } else {
          const durationSeconds = 4;
          const wavBuffer = generateSineWav(durationSeconds);
          const storagePath = `${conversationId}/${Date.now()}-voice-demo.wav`;

          const { error: uploadErr } = await admin.storage
            .from("message-attachments")
            .upload(storagePath, wavBuffer, { contentType: "audio/wav", upsert: true });

          if (uploadErr) {
            console.error("  ÉCHEC upload note vocale:", uploadErr.message);
          } else {
            await admin.from("message_attachments").insert({
              message_id: voiceMessage.id,
              type: "AUDIO",
              storage_path: storagePath,
              file_name: "note-vocale-demo.wav",
              size_bytes: wavBuffer.length,
              duration_seconds: durationSeconds,
              mime_type: "audio/wav"
            });
            console.log("  note vocale réelle (fichier WAV généré et uploadé dans Supabase Storage) attachée");
          }
        }

        await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      } else {
        console.log("  des messages existent déjà, aucun ajout");
      }
    }
  }

  console.log(`\nTerminé. ${createdIds.length} profil(s) fictif(s) prêt(s) pour les tests.`);
  console.log("Pour tout supprimer avant le lancement réel : npx tsx scripts/delete-test-profiles.ts");
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
