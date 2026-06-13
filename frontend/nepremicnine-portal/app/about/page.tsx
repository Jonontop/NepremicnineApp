"use client";

import Link from 'next/link';
import { useLanguage } from '../LanguageContext';

const translations = {
  sl: {
    back: '← Nazaj na začetno stran',
    title: 'O portalu Vesta.si',
    intro: `Iskanje novega doma ali investicijske priložnosti je pogosto dolgotrajen postopek, razpršen med desetinami različnih spletnih oglasnikov in agencijskih strani. Portal Vesta.si je nastal z enim preprostim ciljem: združiti celoten slovenski nepremičninski trg na enem mestu.`,
    whatIsTitle: 'Kaj je Vesta.si?',
    whatIs: `Vesta.si ni nepremičninska agencija, temveč napreden informacijski iskalnik in agregator nepremičninskih oglasov. S pomočjo avtomatizirane tehnologije redno indeksiramo javno dostopne oglase z različnih virov po vsej Sloveniji. Uporabnikom omogočamo hitro filtriranje, primerjavo cen in vizualni pregled ponudbe brez potrebe po dolgotrajnem brskanju po različnih portalih.`,
    speed: '🚀 Hitrost in učinkovitost',
    speedDesc: 'Vsi aktualni oglasi na enem mestu, osveženi in pripravljeni na napredno iskanje.',
    privacy: '🔒 Brez registracije',
    privacyDesc: 'Spoštujemo vašo zasebnost. Iskalnik lahko uporabljate povsem anonimno.',
    visionTitle: 'Naša vizija',
    vision: 'Želimo prinesti večjo transparentnost in tehnološko dovršenost na področje nepremičnin v Sloveniji. Zavedamo se pomembnosti točnih podatkov, zato se nenehno trudimo izboljševati naše algoritme za prepoznavanje lokacij, analizo cenovnih trendov in odstranjevanje podvojenih oglasov.',
    howTitle: 'Kako delujemo?',
    how: 'Ko na našem portalu kliknete na posamezen oglas, vas sistem preusmeri neposredno na izvorno spletno stran ponudnika (agencije ali zasebnega oglaševalca). Verjamemo, da na ta način izvornim oglaševalcem prinašamo dragocen in ciljno usmerjen promet, kupcem pa najhitrejšo pot do kontakta s prodajalcem.',
    contactLabel: 'Imate vprašanje, predlog ali želite sodelovati?',
    contactSub: 'Pišite nam na naš uradni elektronski naslov:',
  },
  en: {
    back: '← Back to home',
    title: 'About Vesta.si',
    intro: `Finding a new home or investment opportunity is often a lengthy process scattered across dozens of listing sites and agency pages. The Vesta.si portal was created with one simple goal: to bring the entire Slovenian real-estate market together in one place.`,
    whatIsTitle: 'What is Vesta.si?',
    whatIs: `Vesta.si is not a real-estate agency but an advanced information search engine and listing aggregator. Using automated technology, we regularly index publicly available listings from various sources across Slovenia. We allow users to quickly filter, compare prices and visually browse the offer without the need to scroll through different portals.`,
    speed: '🚀 Speed & Efficiency',
    speedDesc: 'All current listings in one place, refreshed and ready for advanced search.',
    privacy: '🔒 No registration',
    privacyDesc: 'We respect your privacy. You can use the search engine completely anonymously.',
    visionTitle: 'Our vision',
    vision: 'We want to bring greater transparency and technological excellence to the real-estate sector in Slovenia. We are aware of the importance of accurate data, so we continuously strive to improve our algorithms for location recognition, price-trend analysis and duplicate removal.',
    howTitle: 'How we work',
    how: 'When you click on a listing on our portal, the system redirects you directly to the original website of the provider (agency or private advertiser). We believe that this way we bring valuable and targeted traffic to the original advertisers, and the fastest path to contact with the seller to buyers.',
    contactLabel: 'Have a question, suggestion or want to collaborate?',
    contactSub: 'Write to us at our official email address:',
  },
};

export default function AboutUs() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 transition-colors duration-300">
        
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          {t.back}
        </Link>
        
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-4 mb-6">
          {t.title}
        </h1>

        <div className="space-y-6 text-sm leading-relaxed">
          <p>{t.intro}</p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">{t.whatIsTitle}</h2>
          <p>{t.whatIs}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t.speed}</h3>
              <p className="text-xs text-gray-600 dark:text-slate-400">{t.speedDesc}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t.privacy}</h3>
              <p className="text-xs text-gray-600 dark:text-slate-400">{t.privacyDesc}</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">{t.visionTitle}</h2>
          <p>{t.vision}</p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">{t.howTitle}</h2>
          <p>{t.how}</p>

          <hr className="border-gray-200 dark:border-slate-800 my-6" />

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-4 rounded-xl text-center">
            <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">{t.contactLabel}</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">{t.contactSub}</p>
            <a href="mailto:info@vesta.si" className="text-blue-600 dark:text-blue-400 font-bold hover:underline block mt-1">info@vesta.si</a>
          </div>
        </div>

      </div>
    </div>
  );
}