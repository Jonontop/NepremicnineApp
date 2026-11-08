"use client";

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from './LanguageContext';

const translations = {
  sl: {
    title: 'Stran ne obstaja',
    desc: 'Opa! Iskana nepremičninska podstran je verjetno potekla, bila umaknjena ali pa je vnešen napačen URL naslov.',
    back: 'Nazaj na prvo stran',
  },
  en: {
    title: 'Page not found',
    desc: 'Oops! The property page you are looking for has likely expired, been removed, or the URL address is incorrect.',
    back: 'Back to home',
  },
};

export default function NotFound() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-950 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 max-w-md">
        
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 animate-bounce">
          <FontAwesomeIcon icon={faExclamationTriangle} />
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">{t.title}</h2>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {t.desc}
        </p>

        <Link 
          href="/" 
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl px-6 py-3 transition shadow-md shadow-blue-200 dark:shadow-none w-full justify-center"
        >
          <FontAwesomeIcon icon={faHome} /> {t.back}
        </Link>
      </div>
    </div>
  );
}