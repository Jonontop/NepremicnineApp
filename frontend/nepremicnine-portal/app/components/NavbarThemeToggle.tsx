"use client";

import { useTheme } from '../ThemeProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

export default function NavbarThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme} 
      type="button"
      title={theme === 'dark' ? 'Preklopi na svetlo temo' : 'Preklopi na temno temo'}
      className="w-10 h-10 flex items-center justify-center rounded-xl text-base border transition-all duration-300 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-amber-400 dark:hover:bg-slate-700"
    >
      {theme === 'dark' ? (
        <FontAwesomeIcon icon={faSun} className="w-4 h-4" />
      ) : (
        <FontAwesomeIcon icon={faMoon} className="w-4 h-4" />
      )}
    </button>
  );
}