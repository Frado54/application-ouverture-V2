import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fraunces, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

// Initialisation de tes deux familles de polices d'origines
const fraunces = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-fraunces' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-mono' })

export const metadata: Metadata = {
  title: 'Répertoire — Entraînement aux ouvertures',
  description:
    "Entraînement quotidien aux ouvertures d'échecs par répétition espacée : révisez vos études Lichess, chapitre par chapitre.",
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0B0B0C',
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`dark bg-background ${fraunces.variable} ${plexMono.variable}`}>
      <body className="bg-background font-sans antialiased">
        {children}
        <Toaster theme="dark" />
        {process.env.NODE_ENV === 'production' && <Analytics />}

        {/* 🚀 SCRIPTER SUPRÊME : Enregistrement sécurisé du Service Worker direct dans le HTML */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('♟️ Chess-Trainer SW enregistré avec succès ! Portée :', reg.scope);
                    })
                    .catch(function(err) {
                      console.error('❌ Échec de l’enregistrement du Service Worker :', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
