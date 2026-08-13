export interface NavigationItem {
  id: string;
  title: string;
  href: string;
  iconName: string;
  badgeCount?: number;
  isExact?: boolean;
}

export const MAIN_NAVIGATION: NavigationItem[] = [
  {
    id: "feed",
    title: "Accueil",
    href: "/",
    iconName: "Home",
    isExact: true
  },
  {
    id: "discover",
    title: "Découvrir",
    href: "/discover",
    iconName: "Users"
  },
  {
    id: "messages",
    title: "Messages",
    href: "/messages",
    iconName: "MessageSquare"
  },
  {
    id: "notifications",
    title: "Notifications",
    href: "/notifications",
    iconName: "Bell"
  },
  {
    id: "premium",
    title: "Premium",
    href: "/premium",
    iconName: "Crown"
  },
  {
    id: "profile",
    title: "Mon Profil",
    href: "/profile",
    iconName: "User"
  }
];

/** Injecte les compteurs réels (messages / notifications non lus) dans la navigation. */
export function withUnreadBadges(unreadMessages: number, unreadNotifications: number): NavigationItem[] {
  return MAIN_NAVIGATION.map((item) => {
    if (item.id === "messages") return { ...item, badgeCount: unreadMessages || undefined };
    if (item.id === "notifications") return { ...item, badgeCount: unreadNotifications || undefined };
    return item;
  });
}
