import { Plus_Jakarta_Sans, Urbanist } from 'next/font/google'

// Polices de la landing uniquement (titres Urbanist, texte Plus Jakarta Sans) — le reste de l'app garde Product Sans.
const urbanist = Urbanist({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--nf-urbanist', display: 'swap' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--nf-jakarta', display: 'swap' })

/** À poser sur la racine de la landing ET sur tout contenu rendu hors de celle-ci (portails) : polices + styles de base scopés (cf. home.css). */
export const HOME_ROOT_CLASS = `home-root ${urbanist.variable} ${jakarta.variable}`
