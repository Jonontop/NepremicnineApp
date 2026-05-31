import Link from 'next/link';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 transition-colors duration-300">
        
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          ← Nazaj na začetno stran
        </Link>
        
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-4 mb-6">
          O portalu Vesta.si
        </h1>

        <div className="space-y-6 text-sm leading-relaxed">
          <p>
            Iskanje novega doma ali investicijske priložnosti je pogosto dolgotrajen postopek, razpršen med desetinami različnih spletnih oglasnikov in agencijskih strani. Portal <strong>Vesta.si</strong> je nastal z enim preprostim ciljem: **združiti celoten slovenski nepremičninski trg na enem mestu**.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">Kaj je Vesta.si?</h2>
          <p>
            Vesta.si ni nepremičninska agencija, temveč **napreden informacijski iskalnik in agregator nepremičninskih oglasov**. S pomočjo avtomatizirane tehnologije redno indeksiramo javno dostopne oglase z različnih virov po vsej Sloveniji. Uporabnikom omogočamo hitro filtriranje, primerjavo cen in vizualni pregled ponudbe brez potrebe po dolgotrajnem brskanju po različnih portalih.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">🚀 Hitrost in učinkovitost</h3>
              <p className="text-xs text-gray-600 dark:text-slate-400">Vsi aktualni oglasi na enem mestu, osveženi in pripravljeni na napredno iskanje.</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">🔒 Brez registracije</h3>
              <p className="text-xs text-gray-600 dark:text-slate-400">Spoštujemo vašo zasebnost. Iskalnik lahko uporabljate povsem anonimno.</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">Naša vizija</h2>
          <p>
            Želimo prinesti večjo transparentnost in tehnološko dovršenost na področje nepremičnin v Sloveniji. Zavedamo se pomembnosti točnih podatkov, zato se nenehno trudimo izboljševati naše algoritme za prepoznavanje lokacij, analizo cenovnih trendov in odstranjevanje podvojenih oglasov.
          </p>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">Kako delujemo?</h2>
          <p>
            Ko na našem portalu kliknete na posamezen oglas, vas sistem preusmeri neposredno na **izvorno spletno stran ponudnika** (agencije ali zasebnega oglaševalca). Verjamemo, da na ta način izvornim oglaševalcem prinašamo dragocen in ciljno usmerjen promet, kupcem pa najhitrejšo pot do kontakta s prodajalcem.
          </p>

          <hr className="border-gray-200 dark:border-slate-800 my-6" />

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-4 rounded-xl text-center">
            <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">Imate vprašanje, predlog ali želite sodelovati?</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">Pišite nam na naš uradni elektronski naslov:</p>
            <a href="mailto:info@vesta.si" className="text-blue-600 dark:text-blue-400 font-bold hover:underline block mt-1">info@vesta.si</a>
          </div>
        </div>

      </div>
    </div>
  );
}