// app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chess Trainer',
    short_name: 'Chess Trainer',
    description: 'Entraîneur d\'ouvertures d\'échecs',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/apple-icon.png', // 🎯 Lit le fichier apple-icon.png de ton dossier public
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png', // 🎯 Lit le même fichier pour le format standard
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png', // 🎯 Et pour le format grand écran
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
