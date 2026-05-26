import requests
from bs4 import BeautifulSoup
import json

def scrape_mestonepremicnin(limit=5, buy=True, type="flat", location="koroska"):
    base_url = "https://www.mestonepremicnin.si"

    vrsta = {
        "flat": "/stanovanje.v1",
        "house": "/hisa.v2",
        "business": "/poslovni-prostor.v3",
        "land": "/zemljisce.v5",
        "vacation": "/pocitniski-objekt.v9",
        "commercial": "/gospodarski-objekt.v8",
        "other": "/drugi-objekti.v4"
    }

    regija = {
        "podravska": "/Podravska.r12",
        "pomurska": "/Pomurska.r13",
        "koroska": "/Koroska.r7"
    }

    # Osnovni URL za vse nepremičnine
    search_url = f"{base_url}/sl/nepremicnine/{"prodaja" if buy else "oddaja"}"#{vrsta.get(type, '')}{regija.get(location, '')}" 
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(search_url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Poiščemo vse posamezne kartice oglasov
        # Na Galea.si so posamezni oglasi običajno v <div class="box"> ali <div class="property-item">
        listings = soup.find_all('div', class_="group") 
        data = []  

        for item in listings[:limit]:
            # --- Title (Status: Prodamo/Oddamo) ---
            title = item.find_all('p')
            print(title[1].get_text(strip=True) if title else "N/A")

            # --- Price ---
            price = item.find("span", class_="price").get_text(strip=True) if item.find("span", class_="price") else "N/A"

            # --- Location & Description ---
            loc_tag = item.find('span', class_='location')
            location_str = loc_tag.get_text(strip=True) if loc_tag else "N/A"

            # --- Features (Area and Other details) ---
            features_arr = []
            area = "N/A"
            features_tag = item.find('div', class_="features")
            
            # --- Image ---
            link = item.find("a", class_="overlay-link")['href'] if item.find("a", class_="overlay-link") else ""


            """
            data.append({
                    "site": "mestonepremicnin",
                    "status": title,
                    "description": description,
                    "price": price,
                    "location": location_str,
                    "area": area,
                    "features": features_arr,
                    "link": base_url + link if link else "",
                    "image": "https:" + img_tag if img_tag else ""
                })
                """
        return data

    except Exception as e:
        return {"error": f"Napaka: {str(e)}"}

if __name__ == "__main__":
    results = scrape_mestonepremicnin(limit=5)
    print(json.dumps(results, indent=4, ensure_ascii=False))