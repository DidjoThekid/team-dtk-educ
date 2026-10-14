import './globals.css';
export const metadata = { title: 'Espace scolaire', description: 'Site hébergé sur Vercel' };
export default function RootLayout({ children }) {
  return (<html lang="fr"><body>{children}</body></html>);
}
