import Script from 'next/script';
import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDatabase, 
  faCodeBranch, 
  faEnvelope 
} from '@fortawesome/free-solid-svg-icons';
import { ThemeProvider } from './ThemeProvider';
import { LanguageProvider } from './LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://smartnepremicnine.si'),
  title: {
    default: 'vesta.si - Nepremičninski oglasi v Sloveniji',
    template: '%s | vesta.si',
  },
  description:
    'Pametni agregator nepremičninskih oglasov v Sloveniji. Primerjajte prodajo in oddajo stanovanj, hiš ter poslovnih prostorov na enem mestu.',
  keywords: [
    'nepremičnine',
    'oglasi nepremičnin',
    'stanovanja Slovenija',
    'hiše Slovenija',
    'oddaja stanovanj',
    'prodaja nepremičnin',
  ],
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sl" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <Script id="theme-initializer" strategy="beforeInteractive">
        {`
          try {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch (_) {}
        `}
      </Script>
      </head>
      <body 
        suppressHydrationWarning 
        className={`${manrope.className} bg-slate-50 text-slate-800 dark:bg-[#0f172a] dark:text-slate-100 min-h-screen flex flex-col justify-between`}
        style={{ fontSize: '115%' }}
      >
        <ThemeProvider>
          <LanguageProvider>
            {/* DINAMIČNI INTERAKTIVNI NAVBAR */}
            <Navbar />

            {/* Glavna vsebina (Landing ali Iskalnik) */}
            <div className="grow">
              {children}
            </div>

            {/* FOOTER */}
            <Footer />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}