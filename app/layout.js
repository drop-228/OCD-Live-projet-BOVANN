import './globals.css'
import {Bricolage_Grotesque,DM_Sans} from 'next/font/google'
import Preloader from '@/components/Preloader'
const d=Bricolage_Grotesque({subsets:['latin'],variable:'--font-display',display:'swap'})
const s=DM_Sans({subsets:['latin'],variable:'--font-sans',display:'swap'})
export const metadata={title:'OCD Live – Studio de lives de vente à Lomé',description:'Réserve ton live de vente en présentiel à Lomé ou à distance.'}
export default function RootLayout({children}){return <html lang="fr" className={`${d.variable} ${s.variable}`}><body><Preloader/> {children}</body></html>}
