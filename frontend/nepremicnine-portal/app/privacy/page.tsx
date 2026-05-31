import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    // Zunanje ozadje: svetlo siva -> temno modra
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Kartica: bela -> skrilavca siva, robovi prilagojeni */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 transition-colors duration-300">
        
        {/* Povezava: modra -> svetleje modra za kontrast */}
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          ← Nazaj na začetno stran
        </Link>
        
        {/* Glavni naslov: črn -> bel */}
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-4 mb-2">
          Pravilnik o zasebnosti (Privacy Policy)
        </h1>
        {/* Datum: siva -> ugasnjena siva */}
        <p className="text-sm text-gray-500 dark:text-slate-500 mb-6">
          Zadnja posodobitev: {new Date().toLocaleDateString('sl-SI')}
        </p>

        <section className="space-y-6">
          {/* 1. Splošno */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Splošne informacije</h2>
            <p className="text-sm leading-relaxed">
              Upravljavec spletnega mesta <strong>Vesta.si</strong> (v nadaljevanju: "Portal") spoštuje vašo zasebnost in se zavezuje k varovanju osebnih podatkov v skladu s slovensko zakonodajo (ZVOP-2) and Splošno uredbo EU o varstvu podatkov (GDPR). Ta pravilnik pojasnjuje, kako Portal ravna s podatki med vašim obiskom.
            </p>
          </div>

          {/* 2. Katere podatke zbiramo */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. Katere podatke zbiramo in zakaj?</h2>
            <p className="text-sm leading-relaxed mb-3">
              Vesta.si deluje kot informacijski iskalnik in **ne zahteva registracije uporabnikov**. To pomeni, da med obiskom ne zbiramo vašega imena, priimka, telefonske številke, domačega naslova ali elektronske pošte.
            </p>
            {/* Sivi okvir: prilagoditev ozadja, robu in besedila */}
            <div className="text-sm leading-relaxed bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
              <p className="font-semibold text-gray-900 dark:text-white">Zbiramo le naslednje tehnične podatke:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-slate-400">
                <li><strong>Log datoteke strežnika:</strong> IP naslov (anonimiziran), vrsta brskalnika, operacijski sistem, čas dostopa in podstrani, ki jih obiščete. Ti podatki se zbirajo avtomatsko za zagotavljanje varnosti strežnika in preprečevanje zlorab (npr. DDoS napadov).</li>
                <li><strong>Anonimna analitika:</strong> Spremljamo splošno obiskanost spletne strani (npr. koliko ljudi si ogleda določeno regijo), pri čemer so vsi podatki popolnoma združeni (agregirani) in vas ni mogoče osebno identificirati.</li>
              </ul>
            </div>
          </div>

          {/* 3. Podatki v oglasih */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Osebni podatki znotraj nepremičninskih oglasov</h2>
            <p className="text-sm leading-relaxed mb-2">
              Ker Portal avtomatizirano indeksira javno dostopne nepremičninske oglase, se lahko v opisih oglasov ali kontaktnih podatkih pojavijo imena, telefonske številke ali elektronski naslovi kontaktnih oseb oziroma agentov, ki so jih **oglaševalci sami javno objavili** na izvornih straneh.
            </p>
            {/* Jantaren okvir (Info): Prilagoditev barv za temni način, da ostane opozorilno a berljivo */}
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
              ℹ️ <strong>Pomembno:</strong> Portal teh podatkov ne uporablja za lastne namene, jih ne obdeluje, ne shranjuje v samostojne zbirke osebnih podatkov in jih ne posreduje tretjim osebam. Prikazani so izključno z namenom pravilne preusmeritve kupca k izvornemu ponudniku oglasov.
            </p>
          </div>

          {/* 4. Piškotki */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Piškotki (Cookies)</h2>
            <p className="text-sm leading-relaxed">
              Portal uporablja le nujno potrebne sistemske piškotke, ki so potrebni za nemoteno tehnično delovanje spletnega mesta (npr. shranjevanje vaše izbire med temnim in svetlim načinom ali filtrirnih nastavitev za čas trajanja seje). Ne uporabljamo invazivnih piškotkov za sledenje vašim navadam na drugih spletnih straneh ali za ciljano oglaševanje tretjih oseb.
            </p>
          </div>

          {/* 5. Vaše pravice */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">5. Vaše pravice (GDPR)</h2>
            <p className="text-sm leading-relaxed mb-2">
              Skladno z GDPR imate pravico do dostopa, popravka, izbrisa ali omejitve obdelave podatkov. 
            </p>
            {/* Poudarjen sivi okvir */}
            <p className="text-sm leading-relaxed font-medium bg-gray-100 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
              Če ste nepremičninski agent ali zasebni oglaševalec in opazite, da so vaši kontaktni podatki (ki so bili prepisani iz javnega oglasa) prikazani na našem Portalu, vi pa tega ne želite, nam pišite na: <span className="text-blue-600 dark:text-blue-400 underline font-semibold">info@vesta.si</span>. Vaše kontaktne podatke ali oglas bomo nemudoma in trajno izbrisali iz našega sistema.
            </p>
          </div>

          {/* 6. Spremembe */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">6. Spremembe pravilnika o zasebnosti</h2>
            <p className="text-sm leading-relaxed">
              Upravljavec si pridržuje pravico do posodobitve tega Pravilnika o zasebnosti. Vsaka sprememba bo objavljena na tej podstrani z navedbo datuma zadnje posodobitve.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}