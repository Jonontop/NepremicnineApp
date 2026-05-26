import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-gray-700">
        <Link href="/" className="text-sm text-blue-600 hover:underline font-medium">← Nazaj na začetno stran</Link>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mt-4 mb-6">Politika zasebnosti (Privacy Policy)</h1>
        <p className="text-sm text-gray-500 mb-6">Zadnja posodobitev: {new Date().toLocaleDateString('sl-SI')}</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Zbiranje osebnih podatkov</h2>
            <p className="text-sm leading-relaxed">
              Platforma SmartNepremičnine v trenutni fazi delovanja <strong>ne zbira</strong> in ne shranjuje osebnih podatkov obiskovalcev (kot so ime, e-pošta ali telefonska številka), saj za uporabo iskalnika registracija ni potrebna.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Piškotki in lokalno shranjevanje</h2>
            <p className="text-sm leading-relaxed">
              Aplikacija lahko uporablja tehnologijo <code>localStorage</code> znotraj vašega brskalnika za shranjevanje vaših priljubljenih oglasov. Ti podatki ostanejo izključno na vaši napravi in se ne prenašajo na naše strežnike.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Zunanji ponudniki</h2>
            <p className="text-sm leading-relaxed">
              Naša baza podatkov gostuje na storitvi Supabase, ki zagotavlja visoke standarde varnosti in zaščite podatkov v skladu z evropsko zakonodajo (GDPR).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}