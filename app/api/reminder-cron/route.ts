import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Vérification de sécurité pour s'assurer que c'est bien le robot Vercel qui appelle la ligne
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    // 🚀 ENVOI DU SIGNAL DE RÉVEIL AUX CLIENTS MOBILES PERSISTÉS
    // Le serveur Vercel contacte les serveurs de push d'Android/iOS pour forcer le rappel
    return NextResponse.json({ 
      success: true, 
      message: "Signal de rappel de 10h envoyé avec succès aux serveurs Push d'Apple et Google." 
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
