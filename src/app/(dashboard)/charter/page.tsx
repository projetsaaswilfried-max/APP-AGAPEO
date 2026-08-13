import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PRINCIPLES = [
  {
    title: "Sérieux d'intention",
    body: "Cette plateforme s'adresse à des célibataires chrétiens qui recherchent sincèrement le mariage, pas une consommation de profils."
  },
  {
    title: "Respect et dignité",
    body: "Chaque membre mérite d'être traité avec respect, dans ses échanges comme dans la manière dont son profil est présenté."
  },
  {
    title: "Honnêteté du profil",
    body: "Les informations partagées (identité, foi, vision du mariage) doivent refléter la réalité. Les vérifications existent pour protéger la communauté."
  },
  {
    title: "Sécurité des données",
    body: "Les données de foi et de vie privée sont sensibles : elles ne sont jamais partagées au-delà de ce qui est strictement nécessaire au fonctionnement du service."
  },
  {
    title: "Signalement et modération",
    body: "Tout comportement irrespectueux peut être signalé. La modération agit pour préserver un espace sain pour tous les membres."
  }
];

export default function CharterPage() {
  return (
    <div className="space-y-6 w-full pb-16 select-none">
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Charte d&apos;Éthique</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Les principes qui encadrent l&apos;utilisation de la plateforme par tous ses membres.
        </p>
      </div>

      <div className="space-y-4">
        {PRINCIPLES.map((principle) => (
          <Card key={principle.title} variant="base">
            <CardHeader>
              <CardTitle className="text-sm">{principle.title}</CardTitle>
              <CardDescription>{principle.body}</CardDescription>
            </CardHeader>
            <CardContent className="hidden" />
          </Card>
        ))}
      </div>
    </div>
  );
}
