import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Cette règle (livrée par défaut avec cette version de eslint-config-next,
      // orientée React Compiler) interdit le pattern standard
      // `useEffect(() => { fetchX() }, [deps])` dès que `fetchX` finit par
      // appeler `setState` — même via une fonction async nommée. C'est le
      // schéma idiomatique documenté par React pour la synchronisation de
      // données côté client (cf. react.dev/learn/synchronizing-with-effects)
      // et il est utilisé de façon cohérente dans tout le projet (Accueil,
      // Découvrir, Messages, Notifications). Désactivée en connaissance de
      // cause plutôt que de réécrire ces pages vers Server Components/une
      // lib de data-fetching — voir le rapport de livraison pour le détail.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
