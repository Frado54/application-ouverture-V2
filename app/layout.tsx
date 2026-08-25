import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fraunces, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

// Two families total: Fraunces for headings (font-serif), IBM Plex Mono for
// everything else (font-sans / font-mono) to match the "chess database" feel.
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
      </body>
    </html>
  )
}
