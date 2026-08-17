import { AgapeoLogo } from "@/components/ui/logo";
import { SITE_CONFIG } from "@/config/site";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Découvrir", href: "#decouvrir" },
      { label: "Enseignements", href: "#enseignements" },
      { label: "Comment ça marche", href: "#comment-ca-marche" },
      { label: "Sécurité", href: "#securite" }
    ]
  },
  {
    title: "Compte",
    links: [
      { label: "Créer mon profil", href: "/register" },
      { label: "Se connecter", href: "/login" }
    ]
  }
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 py-14">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid sm:grid-cols-3 gap-10">
          <div className="sm:col-span-1">
            <AgapeoLogo href="/" size="sm" />
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed max-w-[16rem]">{SITE_CONFIG.description}</p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-3.5">{column.title}</h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border/50 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE_CONFIG.name} — {SITE_CONFIG.fullName}
        </div>
      </div>
    </footer>
  );
}
