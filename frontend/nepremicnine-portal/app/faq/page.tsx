"use client";

import Link from 'next/link';
import { useLanguage } from '../LanguageContext';

const faqData = {
  sl: [
    {
      q: "Kaj je Vesta.si in kako deluje?",
      a: "Vesta.si je nepremičninski iskalnik in agregator oglasov. Naš sistem samodejno pregleduje javno dostopne nepremičninske oglase v Sloveniji in jih združuje v enoten, pregleden iskalnik. Ko najdete nepremičnino, ki vas zanima, vas s klikom preusmerimo na izvorno stran, kjer stopite v stik s prodajalcem ali agencijo."
    },
    {
      q: "Ali je uporaba portala plačljiva ali zahteva registracijo?",
      a: "Ne. Uporaba portala Vesta.si je za iskalce nepremičnin popolnoma brezplačna in ne zahteva nikakršne registracije ali vnosa osebnih podatkov."
    },
    {
      q: "Ali Vesta.si posreduje pri prodaji ali oddaji nepremičnin?",
      a: "Ne, Vesta.si ni nepremičninska agencija in ne opravlja storitev posredovanja. Smo izključno tehnološka platforma (iskalnik). Za vsa vprašanja glede ogledov, cen in nakupa se morate obrniti neposredno na izvornega ponudnika oglasa preko povezave na naši strani."
    },
    {
      q: "Podatki v oglasu (cena, kvadratura) niso točni. Zakaj?",
      a: "Ker se vsi podatki osvežujejo avtomatsko iz zunanjih javnih virov, lahko pride do zamika pri posodobitvi ali napake na izvorni strani. Vesta.si ne jamči za stoodstotno točnost teh podatkov. Svetujemo vam, da točne informacije vedno preverite neposredno na spletni strani izvornega oglaševalca."
    },
    {
      q: "Sem lastnik nepremičnine ali agent in želim odstraniti svoj oglas z Vesta.si. Kako?",
      a: "Popolnoma spoštujemo vašo željo. Če ne želite, da se vaši oglasi prikazujejo v našem iskalniku, nam preprosto pišite na info@vesta.si z lenkom do oglasa ali virom. Vaše podatke oziroma oglase bomo prednostno odstranili v roku 48 ur."
    },
    {
      q: "Kako pogosto osvežujete podatke o oglasih?",
      a: "Naši algoritmi pregledujejo in osvežujejo oglasne vire večkrat dnevno, s čimer zagotavljamo, da so novi oglasi hitro vidni, potekli ali umaknjeni oglasi pa čim prej odstranjeni iz naših rezultatov iskanja."
    }
  ],
  en: [
    {
      q: "What is Vesta.si and how does it work?",
      a: "Vesta.si is a real-estate search engine and listing aggregator. Our system automatically scans publicly available property listings in Slovenia and combines them into a single, clear search engine. Once you find a property you're interested in, a click redirects you to the original page where you can contact the seller or agency."
    },
    {
      q: "Is the portal free or does it require registration?",
      a: "No. Using Vesta.si is completely free for property seekers and requires no registration or personal data."
    },
    {
      q: "Does Vesta.si act as an intermediary in property sales or rentals?",
      a: "No, Vesta.si is not a real-estate agency and does not provide brokerage services. We are exclusively a technology platform (search engine). For all questions regarding viewings, prices and purchases you must contact the original listing provider directly via the link on our site."
    },
    {
      q: "The data in the listing (price, area) is not accurate. Why?",
      a: "Because all data is refreshed automatically from external public sources, there may be a delay in updates or an error on the source page. Vesta.si does not guarantee 100% accuracy of this data. We advise you to always verify accurate information directly on the original advertiser's website."
    },
    {
      q: "I am a property owner or agent and want to remove my listing from Vesta.si. How?",
      a: "We fully respect your request. If you do not want your listings to appear in our search engine, simply write to us at info@vesta.si with a link to the listing or source. We will prioritise the removal of your data or listings within 48 hours."
    },
    {
      q: "How often do you refresh listing data?",
      a: "Our algorithms review and refresh listing sources multiple times a day, ensuring new listings become visible quickly and expired or removed listings are cleared from our search results as soon as possible."
    }
  ],
};

const uiText = {
  sl: {
    back: '← Nazaj na začetno stran',
    title: 'Pogosta vprašanja (FAQ)',
    subtitle: 'Poiščite hitre odgovore o delovanju portala Vesta.si.',
    contact: 'Niste našli odgovora na svoje vprašanje? Pišite nam na',
    contactEnd: 'in z veseljem vam bomo pomagali.',
  },
  en: {
    back: '← Back to home',
    title: 'Frequently Asked Questions (FAQ)',
    subtitle: 'Find quick answers about how Vesta.si works.',
    contact: "Didn't find the answer to your question? Write to us at",
    contactEnd: 'and we will be happy to help.',
  },
};

export default function FAQ() {
  const { language } = useLanguage();
  const faqs = faqData[language];
  const ui = uiText[language];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 transition-colors duration-300">
        
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          {ui.back}
        </Link>
        
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-4 mb-2">
          {ui.title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-500 mb-8">
          {ui.subtitle}
        </p>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details 
              key={index} 
              className="group border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50/50 dark:bg-slate-800/30 open:bg-white dark:open:bg-slate-900 transition-all duration-200"
            >
              <summary className="flex justify-between items-center font-semibold text-gray-900 dark:text-white p-4 cursor-pointer list-none select-none text-sm sm:text-base">
                <span>{faq.q}</span>
                
                <svg 
                  className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform duration-200 ml-2 shrink-0" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2.5} 
                    d="M19 9l-7 7-7-7" 
                  />
                </svg>
              </summary>
              
              <div className="p-4 pt-0 text-sm text-gray-600 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800/50 mt-2 leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-10 p-5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-center">
          <p className="text-sm text-amber-900 dark:text-amber-300">
            {ui.contact} <a href="mailto:info@vesta.si" className="font-bold underline hover:text-amber-700 dark:hover:text-amber-100">info@vesta.si</a> {ui.contactEnd}
          </p>
        </div>

      </div>
    </div>
  );
}