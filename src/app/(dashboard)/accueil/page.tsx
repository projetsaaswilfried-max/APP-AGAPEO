"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, GraduationCap, Heart, MapPin, Quote } from "lucide-react";
import { useSession } from "@/core/providers/session-provider";
import { discoverService } from "@/domain/services/discover.service";
import { feedService } from "@/domain/services/feed.service";
import type { RecommendedProfileItem } from "@/domain/types/discover";
import type { FeedPublication } from "@/domain/types/feed";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/domain/badges";
import { cn, maskForPreview } from "@/lib/utils";

// Mêmes critères par défaut que Découvrir : la sélection du jour est le tirage
// "Recommandée pour vous", et le classement préparé ici sert aussi à Découvrir
// (même clé de cache côté serveur, cf. /api/discover).
const DEFAULT_DISCOVER_FILTERS = { ageMin: 20, ageMax: 50, status: "ALL" as const };

/** Une pensée par jour (même pour tout le monde ce jour-là), tirée de cette liste. */
const DAILY_VERSES = [
  { text: "L'amour est patient, il est plein de bonté.", reference: "1 Corinthiens 13:4" },
  { text: "Par-dessus tout, revêtez-vous de l'amour, qui est le lien de la perfection.", reference: "Colossiens 3:14" },
  { text: "Fais de l'Éternel tes délices, et il te donnera ce que ton cœur désire.", reference: "Psaume 37:4" },
  { text: "Il y a un temps pour tout, un temps pour toute chose sous les cieux.", reference: "Ecclésiaste 3:1" },
  { text: "La corde à trois fils ne se rompt pas facilement.", reference: "Ecclésiaste 4:12" },
  { text: "Nous aimons, parce qu'il nous a aimés le premier.", reference: "1 Jean 4:19" },
  { text: "Celui qui trouve une femme trouve le bonheur ; c'est une grâce qu'il obtient de l'Éternel.", reference: "Proverbes 18:22" }
];

/**
 * Dernières données affichées, gardées en mémoire le temps de la session de
 * navigation (module client) : revenir sur l'Accueil depuis une autre page
 * affiche tout immédiatement, puis rafraîchit en arrière-plan — seule la
 * toute première visite passe par les emplacements de chargement.
 */
let homeCache: {
  userId: string;
  selection: RecommendedProfileItem[];
  likesCount: number;
  likers: RecommendedProfileItem[];
  teaching: FeedPublication | null;
} | null = null;

/**
 * Accueil de l'espace membre (le fil d'actualité vit sur /feed) : tourné vers
 * la rencontre — sélection du jour, qui s'intéresse à toi — puis une pensée
 * du jour et le dernier enseignement.
 */
export default function AccueilPage() {
  const { profile } = useSession();
  const canSeeDetails = profile.photo_verification_status === "VERIFIED" || profile.subscription_status === "ACTIVE" || profile.is_staff;
  const canSeeWhoLikes = profile.subscription_status === "ACTIVE" || profile.is_staff;

  const cached = homeCache?.userId === profile.id ? homeCache : null;
  const [selection, setSelection] = useState<RecommendedProfileItem[] | null>(cached?.selection ?? null);
  const [likesCount, setLikesCount] = useState<number | null>(cached?.likesCount ?? null);
  const [likers, setLikers] = useState<RecommendedProfileItem[]>(cached?.likers ?? []);
  const [teaching, setTeaching] = useState<FeedPublication | null | undefined>(cached ? cached.teaching : undefined);
  const [verse, setVerse] = useState(DAILY_VERSES[0]);

  useEffect(() => {
    // Calculé côté navigateur (jour local), jamais pendant le rendu serveur.
    const start = new Date(new Date().getFullYear(), 0, 0).getTime();
    const dayOfYear = Math.floor((Date.now() - start) / 86_400_000);
    setVerse(DAILY_VERSES[dayOfYear % DAILY_VERSES.length]);

    discoverService
      .getDiscoverPage(DEFAULT_DISCOVER_FILTERS, 1, 1)
      .then((data) => setSelection(data.recommended))
      .catch(() => setSelection([]));

    // L'identité des personnes intéressées n'est servie qu'aux abonnés (cf. getWhoLikesMe) :
    // inutile de la demander pour un compte gratuit, le nombre suffit.
    Promise.all([discoverService.getWhoLikesMeCount(), canSeeWhoLikes ? discoverService.getWhoLikesMe() : Promise.resolve([])])
      .then(([count, detail]) => {
        setLikesCount(count);
        setLikers(detail);
      })
      .catch(() => setLikesCount(0));

    feedService
      .getMoreRecentPublications("TEACHING", 0, 1)
      .then(({ items }) => setTeaching(items[0] ?? null))
      .catch(() => setTeaching(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mémorise le dernier état complet pour le prochain retour sur la page.
  useEffect(() => {
    if (selection === null || likesCount === null || teaching === undefined) return;
    homeCache = { userId: profile.id, selection, likesCount, likers, teaching };
  }, [profile.id, selection, likesCount, likers, teaching]);

  return (
    <div className="w-full max-w-3xl mx-auto pb-16 select-none space-y-8">
      {/* Salutation : photo + prénom, main qui salue */}
      <div className="flex items-center gap-4">
        <Avatar size="lg" src={profile.avatar_url ?? undefined} fallback={getInitials(profile.first_name, profile.last_name)} />
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground truncate">
            Salut <span className="wave-hand" role="img" aria-label="main qui salue">👋</span> {profile.first_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ta rencontre commence peut-être aujourd&apos;hui.</p>
        </div>
      </div>

      {/* Sélection du jour */}
      <section className="space-y-3">
        <SectionTitle title="Ta sélection du jour" href="/discover" linkLabel="Découvrir" />
        {selection === null ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-3/4 w-full rounded-[18px]" />
            ))}
          </div>
        ) : selection.length === 0 ? (
          <EmptyCard>De nouveaux profils arrivent chaque jour : reviens bientôt ou explore Découvrir.</EmptyCard>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {selection.slice(0, 3).map(({ profile: p }) => (
              <Link
                key={p.id}
                href="/discover"
                className="relative aspect-3/4 rounded-[18px] overflow-hidden bg-secondary active:scale-[0.98] transition-transform"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.avatarUrl || undefined} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(20,14,24,0.8) 100%)" }} />
                <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 text-white">
                  <p className="text-sm sm:text-base font-semibold tracking-tight truncate">
                    {canSeeDetails ? p.firstName : maskForPreview(p.firstName, 2)}, {canSeeDetails ? p.age : "**"}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] sm:text-xs text-white/80 truncate">
                    <MapPin size={11} className="shrink-0" /> {canSeeDetails ? p.country : maskForPreview(p.country)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Qui s'intéresse à toi */}
      <section className="space-y-3">
        <SectionTitle title="Ils s'intéressent à toi" />
        <Link
          href={canSeeWhoLikes ? "/profile?tab=who-likes-me" : likesCount ? "/premium" : "/profile"}
          className="flex items-center gap-3.5 rounded-[16px] bg-card border border-border/50 p-4 transition-colors hover:bg-secondary/40"
        >
          {likesCount === null ? (
            <Skeleton className="h-10 w-full rounded-[12px]" />
          ) : (
            <>
              <LikerStack count={likesCount} likers={likers} blurred={!canSeeWhoLikes} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {likesCount === 0 ? "Pas encore de like" : `${likesCount} personne${likesCount > 1 ? "s ont" : " a"} aimé ton profil`}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {likesCount === 0
                    ? "Une belle photo et une présentation sincère attirent l'attention."
                    : canSeeWhoLikes
                      ? "Découvre qui, et fais le premier pas."
                      : "Passe Premium pour découvrir qui."}
                </span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
            </>
          )}
        </Link>
      </section>

      {/* Pensée du jour */}
      <section className="rounded-[18px] bg-accent-subtle p-5 space-y-2.5">
        <Quote size={18} className="text-primary" />
        <p className="text-base text-foreground leading-relaxed font-medium">{verse.text}</p>
        <p className="text-xs font-semibold text-primary">{verse.reference}</p>
      </section>

      {/* Dernier enseignement */}
      <section className="space-y-3">
        <SectionTitle title="Dernier enseignement" href="/feed" linkLabel="Le fil" />
        {teaching === undefined ? (
          <Skeleton className="h-24 w-full rounded-[16px]" />
        ) : teaching === null ? (
          <EmptyCard>Les prochains enseignements de l&apos;équipe apparaîtront ici.</EmptyCard>
        ) : (
          <Link
            href={`/feed#post-${teaching.id}`}
            className="block rounded-[16px] bg-card border border-border/50 p-4 space-y-1.5 transition-colors hover:bg-secondary/40"
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <GraduationCap size={13} /> {teaching.categoryLabel}
            </span>
            {teaching.title && <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{teaching.title}</p>}
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{teaching.content}</p>
          </Link>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          {linkLabel} <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[16px] bg-card border border-border/50 p-4 text-sm text-muted-foreground">{children}</div>;
}

/** Pastilles des personnes qui ont aimé le profil — floutées tant que le membre n'est pas Premium. */
function LikerStack({ count, likers, blurred }: { count: number; likers: RecommendedProfileItem[]; blurred: boolean }) {
  if (count === 0) {
    return (
      <span className="w-10 h-10 rounded-full bg-accent-subtle text-primary flex items-center justify-center shrink-0">
        <Heart size={18} />
      </span>
    );
  }
  const shown = Math.min(count, 3);
  return (
    <span className="flex -space-x-2.5 shrink-0">
      {Array.from({ length: shown }).map((_, i) => {
        const liker = likers[i];
        return (
          <span key={i} className="w-9 h-9 rounded-full border-2 border-card overflow-hidden bg-accent-subtle flex items-center justify-center">
            {liker && !blurred ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={liker.profile.avatarUrl || undefined} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className={cn("w-full h-full bg-linear-to-br from-primary/60 to-accent-subtle", blurred && "blur-[2px]")} />
            )}
          </span>
        );
      })}
    </span>
  );
}
