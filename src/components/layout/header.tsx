"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Search01Icon,
  Notification01Icon,
  Menu01Icon,
  UserIcon,
  Settings01Icon,
  Logout01Icon,
  SecurityValidationIcon,
  HelpCircleIcon,
  ArrowDown01Icon,
  Crown02Icon
} from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { MAIN_NAVIGATION } from "@/config/navigation";
import { useSession } from "@/core/providers/session-provider";
import { getInitials } from "@/domain/badges";
import { signOutAction } from "@/lib/actions/auth.actions";
import { useUnreadCounts } from "@/core/hooks/use-unread-counts";
import { saveScrollForCurrentPage } from "@/core/hooks/use-scroll-memory";

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, profile } = useSession();
  const initials = getInitials(profile.first_name, profile.last_name);
  const { unreadNotifications } = useUnreadCounts();

  // Le menu de profil est rendu dans un portail (document.body) avec
  // position: fixed calculée manuellement — sinon il reste piégé dans le
  // contexte d'empilement du <motion.div> de transition de page (AppShell),
  // qui peut le faire passer derrière le bandeau interne d'une conversation
  // (Messagerie) malgré son z-index local élevé.
  const profileTriggerRef = useRef<HTMLDivElement>(null);
  const [profileMenuPosition, setProfileMenuPosition] = useState({ top: 0, right: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isProfileMenuOpen && profileTriggerRef.current) {
      const rect = profileTriggerRef.current.getBoundingClientRect();
      setProfileMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isProfileMenuOpen]);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    router.push(trimmed ? `/discover?search=${encodeURIComponent(trimmed)}` : "/discover");
  };

  // Titre dynamique selon la route
  const currentNavItem = MAIN_NAVIGATION.find((item) =>
    item.isExact ? pathname === item.href : pathname.startsWith(item.href)
  );

  const pageTitle = currentNavItem ? currentNavItem.title : "Tableau de Bord";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 md:px-6 bg-card/85 backdrop-blur-xl border-b border-border/40 select-none md:rounded-bl-[30px]">
      {/* Zone Gauche : Mobile Toggle + Titre de Vue */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground md:hidden rounded-full hover:bg-secondary transition-colors"
          aria-label="Ouvrir le menu"
        >
          <HugeIcon icon={Menu01Icon} size={20} />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span>Agapeo</span>
            <span>/</span>
            <span className="text-foreground font-semibold">{pageTitle}</span>
          </div>
        </div>
      </div>

      {/* Zone Centrale : recherche de profils (redirige vers Découvrir avec le filtre appliqué) */}
      <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-md mx-6">
        <div className="w-full flex items-center gap-2.5 px-4 py-2 bg-secondary/60 focus-within:bg-card border border-border/40 focus-within:ring-2 focus-within:ring-ring rounded-full transition-all duration-200">
          <HugeIcon icon={Search01Icon} size={15} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un membre dans Découvrir…"
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </form>

      {/* Zone Droite : Notifications & Profil Utilisateur */}
      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          onClick={saveScrollForCurrentPage}
          className="relative w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground bg-secondary/80 hover:bg-secondary rounded-full transition-all"
          title="Notifications"
          aria-label="Notifications"
        >
          <HugeIcon icon={Notification01Icon} size={18} />
          {unreadNotifications > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-card" />}
        </Link>

        {/* User Menu Dropdown Trigger */}
        <div className="relative" ref={profileTriggerRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-secondary border border-transparent hover:border-border/40 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-dark-control text-dark-control-foreground font-semibold text-xs flex items-center justify-center shadow-2xs overflow-hidden">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.first_name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <HugeIcon icon={ArrowDown01Icon} size={14} className="text-muted-foreground hidden sm:inline" />
          </button>

          {/* User Dropdown Menu — portail vers document.body : passe toujours
              au-dessus de tout (bandeau de conversation dans Messagerie
              inclus), voir le commentaire sur profileTriggerRef plus haut. */}
          {isMounted && isProfileMenuOpen && createPortal(
            <>
              <div
                className="fixed inset-0 z-[100]"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div
                style={{ top: profileMenuPosition.top, right: profileMenuPosition.right }}
                className="fixed w-60 p-2 bg-card border border-border/50 rounded-3xl shadow-soft z-[101] animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="text-xs font-semibold text-foreground">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <HugeIcon icon={UserIcon} size={14} className="text-muted-foreground" />
                    <span>Mon Profil</span>
                  </Link>
                  <Link
                    href="/premium"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <HugeIcon icon={Crown02Icon} size={14} className="text-primary" />
                    <span>Mon Plan</span>
                  </Link>
                  <Link
                    href="/profile?tab=privacy"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <HugeIcon icon={Settings01Icon} size={14} className="text-muted-foreground" />
                    <span>Préférences</span>
                  </Link>
                  <Link
                    href="/charter"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <HugeIcon icon={SecurityValidationIcon} size={14} className="text-muted-foreground" />
                    <span>Charte d&apos;Éthique</span>
                  </Link>
                  <Link
                    href="/support"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <HugeIcon icon={HelpCircleIcon} size={14} className="text-muted-foreground" />
                    <span>Support</span>
                  </Link>
                  {profile.role !== "USER" && (
                    <Link
                      href="/admin"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      <HugeIcon icon={SecurityValidationIcon} size={14} className="text-primary" />
                      <span>{profile.role === "MODERATOR" ? "Modération" : "Administration"}</span>
                    </Link>
                  )}
                </div>
                <div className="pt-1 border-t border-border/60">
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <HugeIcon icon={Logout01Icon} size={14} />
                      <span>Déconnexion</span>
                    </button>
                  </form>
                </div>
              </div>
            </>,
            document.body
          )}
        </div>
      </div>
    </header>
  );
}
