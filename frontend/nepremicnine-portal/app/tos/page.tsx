import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-gray-700">
        <Link href="/" className="text-sm text-blue-600 hover:underline font-medium">
          ← Nazaj na začetno stran
        </Link>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mt-4 mb-2">
          Splošni pogoji uporabe (TOS)
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Zadnja posodobitev: {new Date().toLocaleDateString('sl-SI')}
        </p>

        <section className="space-y-6">
          {/* 1. Splošne določbe in opis */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Splošne določbe in opis storitve</h2>
            <p className="text-sm leading-relaxed mb-2">
              Spletno mesto <strong>Vesta.si</strong> (v nadaljevanju: "Portal") deluje izključno kot tehnološki ponudnik in informacijski agregator nepremičninskih oglasov v Sloveniji. Uporabnikom omogočamo iskanje, pregled in primerjavo javno dostopnih podatkov na enem mestu.
            </p>
            <p className="text-sm leading-relaxed">
              Z uporabo tega Portala uporabnik potrjuje, da je seznanjen s temi Splošnimi pogoji, se z njimi strinja in jih v celoti sprejema.
            </p>
          </div>

          {/* 2. Omejitev odgovornosti */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Omejitev odgovornosti (ZURE)</h2>
            <div className="text-sm leading-relaxed text-amber-800 bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2">
              <p>
                ⚠️ <strong>Pomembno opozorilo:</strong> Vesta.si ni nepremičninska družba, ne opravlja storitev nepremičninskega posredovanja in ne nastopa kot posrednik pri prometu z nepremičninami.
              </p>
              <p>
                Vsi podatki (cene, kvadrature, lokacije, opisi in energetski kazalniki skladno z ZURE), prikazani na tej platformi, so pridobljeni iz tretjih virov s pomočjo avtomatiziranega indeksiranja javno dostopnih spletnih mest. 
              </p>
              <p>
                Portal ne jamči za točnost, resničnost, ažurnost ali zakonitost teh podatkov. Vse informacije so zgolj informativne narave. Za uradne informacije in preverjanje podatkov pred sklenitvijo pravnih poslov vedno obiščite izvorni oglas ponudnika.
              </p>
            </div>
          </div>

          {/* 3. Preusmerjanje uporabnikov */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Preusmerjanje uporabnikov in zunanje povezave</h2>
            <p className="text-sm leading-relaxed">
              Za zagotavljanje celovitih informacij in generiranje prometa izvornim oglaševalcem Portal uporabnike preko zunanjih povezav preusmerja neposredno na spletna mesta izvornih ponudnikov oglasov. Upravljavec nima vpliva na vsebino, dostopnost ali varnost zunanjih spletnih mest in zanjo ne odgovarja.
            </p>
          </div>

          {/* 4. Avtorske pravice in viri */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Avtorske pravice in intelektualna lastnina</h2>
            <p className="text-sm leading-relaxed mb-2">
              Vse blagovne znamke, logotipi, opisi oglasov ter slikovno gradivo, ki so indeksirani iz zunanjih virov, ostajajo v izključni lasti njihovih zakonitih lastnikov (nepremičninskih agencij, portalov oziroma fizičnih oseb).
            </p>
            <p className="text-sm leading-relaxed">
              Portal ne shranjuje slikovnega gradiva na lastnih strežnikih, temveč le tehnično prikazuje povezave (hotlinking) do izvornih slik z namenom izboljšanja uporabniške izkušnje. Kakršnokoli kopiranje ali nadaljnja komercialna uporaba teh podatkov s strani tretjih oseb je strogo prepovedana.
            </p>
          </div>

          {/* 5. Notice and Take-Down */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Protokol za odstranitev vsebine (Notice and Take-Down)</h2>
            <p className="text-sm leading-relaxed mb-2">
              Upravljavec Portala deluje v dobri veri in spoštuje pravice intelektualne lastnine ter poslovne interese vseh nepremičninskih družb. 
            </p>
            <p className="text-sm leading-relaxed font-medium bg-gray-100 p-3 rounded-lg border border-gray-200">
              Če ste lastnik avtorskih pravic ali zakoniti zastopnik nepremičninske družbe in ne želite, da se vaši javni oglasni viri indeksirajo na Portalu Vesta.si, nam pišite na elektronski naslov: <span className="text-blue-600 underline">info@vesta.si</span>. 
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Upravljavec se zavezuje, da bo upravičene zahteve obravnaval prednostno in sporne oglase oziroma celotne vire odstranil iz sistema najkasneje v roku 48 ur od prejema obvestila.
            </p>
          </div>

          {/* 6. Varstvo podatkov in končne določbe */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Varstvo podatkov in veljavno pravo</h2>
            <p className="text-sm leading-relaxed mb-2">
              Portal Vesta.si ne zbira in ne obdeluje osebnih podatkov obiskovalcev, razen anonimnih tehničnih podatkov za delovanje seje in analitiko obiska.
            </p>
            <p className="text-sm leading-relaxed">
              Za vse spore, ki bi izvirali iz uporabe tega Portala, se uporablja slovensko pravo, za reševanje morebitnih sporov pa je pristojno sodišče v Republiki Sloveniji.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}