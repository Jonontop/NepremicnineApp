import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-gray-700">
        <Link href="/" className="text-sm text-blue-600 hover:underline font-medium">← Nazaj na začetno stran</Link>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mt-4 mb-6">Splošni pogoji uporabe (TOS)</h1>
        <p className="text-sm text-gray-500 mb-6">Zadnja posodobitev: {new Date().toLocaleDateString('sl-SI')}</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Opis storitve</h2>
            <p className="text-sm leading-relaxed">
              SmartNepremičnine deluje kot avtomatiziran agregator javno dostopnih nepremičninskih oglasov v Sloveniji. Uporabnikom omogočamo iskanje in primerjavo podatkov na enem mestu.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Omejitev odgovornosti</h2>
            <p className="text-sm leading-relaxed text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              ⚠️ <strong>Pomembno opozorilo:</strong> Vsi podatki (cene, kvadrature, slike, opisi), prikazani na tej platformi, so pridobljeni iz tretjih virov s pomočjo avtomatiziranega strganja spleta (web scraping). SmartNepremičnine ne jamči za točnost, ažurnost ali verodostojnost teh podatkov. Za uradne informacije vedno obiščite izvorni oglas ponudnika.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Avtorske pravice in viri</h2>
            <p className="text-sm leading-relaxed">
              Vse avtorske pravice nad slikami in besedilom oglasov pripadajo njihovim izvornim avtorjem oziroma portalom, kjer so bili objavljeni. Naša platforma zgolj indeksira in povezuje do originalnih vsebin v informativne namene.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}