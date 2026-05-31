# Web
 - [x] Filtri (tip posla, vrsta nepremičnine, lokacija, cena)
 - [x] UI (premium dizajn, dark/light tema)
 - [x] Filter -> kraj (dropdown menu z regionalnim grupiranjem: Osrednjeslovenska, Gorenjska, itd.)
 - [x] if price == n/a || kraj == n/a dont display && report to admin (mail to admin – backend + frontend filter)
 - [x] better location grouping, more filters (real estate type dropdown added)
 - [x] fix mainpage search box && add real ads from db to mainpage (redirects to /search?type=...&location=...&minPrice=...&maxPrice=...)
 - [ ] change money icon: <FontAwesomeIcon icon={byPrefixAndName.fal['money-bill']} />
 - [x] add map (minimizable, not available on mobile/narrow screens – desktop only via Leaflet CDN)
 - [x] fix prices siol (rent now correctly classified as Oddaja in siol.py scraper)
 - [x] make footer bigger (15% – pt-24, pb-12, larger gaps)
 - [x] ETN integration (collapsible widget with market value estimate, DTT 2%, notary ~0.5%, agent 3%)
 - [x] limit to 30 ads per page (pagination with numbered page buttons)
 - [x] auto sort based of weight (razvrstitev: Priporočeno – default sort is weight_desc then newest)
 - [x] cena -> slider (range slider 0–1.5M € with "Brez omejitve" at max)
 - [x] remove iskalnik box in search tab (nav)
 - [x] remove arrow in search tab (nav)
 - [x] remove table name: Tabela: public.nepremicnine_oglasi
 - [x] theme changer: icon of sun move to far right (☀️/🌙 icon button in navbar far-right)
 - [x] price can be different types (per squre meter or full price), add check that checks for that and implenets unit in search
 - [x] make slider so the user can move min pointer and max pointer to get the range
 - [x] order selection font color change to normal and to orange(so what is now) when dark theme is applied
 - [x] use sessionstorage or some sort of storing the theme user selected if user just endtered the webstace use devices preset theme
 - animation:
    - [x] theme change (when clicked it animates the transition from sun to moon)
    - hide show card button
 - dark theme rework
 - change ETN calculator design(leave out for now)
 - [x] global nav bar
    - buttons:
        - realestate
        - realstate offers (drop down for types of realestate)
        - new builds
        - home 
        - about
        - faq
 - [x] layout button
 - [x] change dropdrown for buy or lease to 2 buttons with nice switch animation

# API
 - [x] Siol - cena, kvadratura (scraper improvements)
 - [x] Dodaj novogradnja bool v pb
 - [x] dodaj vrstico leto izgradnje
 - [x] Parse rooms from type text ("2-sobno", "garsonjera") in route.ts
 - [x] Parse year from features[] array via regex in route.ts
 - [x] Filter invalid listings (price 0/null or location N/A/empty) in API route
 - if ad doesn't exist on website remove from db

# Additional Scrapers
 - [ ] https://www.urbanistika.si/
 - [ ] https://www.k2finance.si/oglasi
 - [ ] https://stan.si/nepremicnine
 - [ ] https://24nep.si/oglasi
 - [ ] https://www.mreza.com/Nepremicnine/prodaja.k1/hisa.v2/Slovenija.d194/
 - [ ] https://c21.si/nepremicnine/prodaja.html
 - [ ] https://www.novogradnje.com/novogradnje (novogradnja=true)


# Extensions
- [ ] table for sellers (collect data about seller for future expansion && put id(or name unique) of seller in main table in db)
- [ ] market statistics (remove anything connected for now from site)
- [ ] prettify cards in search tab



# FIX
- language change
- upper price limit
