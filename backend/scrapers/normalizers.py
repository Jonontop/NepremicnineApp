"""Čiste funkcije za normalizacijo podatkov iz oglasov.

Tu ni nobenega omrežnega ali bazičnega klica, zato so te funkcije hitro
testirane (glej `tests/test_normalizers.py`). Scraperji jih kličejo prek
`BaseScraper`, kjer ostajajo na voljo tudi kot metode za združljivost.
"""

from __future__ import annotations

import re
from urllib.parse import urljoin

# Cene nad to mejo so skoraj vedno napaka pri branju (npr. telefon ali šifra).
MAX_SANE_PRICE = 50_000_000

MISSING_MARKERS = {
    "",
    "-",
    "n/a",
    "na",
    "neznano",
    "nepoznano",
    "ni podatka",
    "brez",
    "0",
}

STATUS_SALE = "prodaja"
STATUS_RENT = "oddaja"
STATUS_OTHER = "drugo"

PROPERTY_TYPES = ("flat", "house", "business", "land", "garage", "other")

_TYPE_ALIASES = {
    "flat": "flat",
    "stanovanje": "flat",
    "stanovanja": "flat",
    "apartment": "flat",
    "garsonjera": "flat",
    "house": "house",
    "hisa": "house",
    "hiša": "house",
    "hise": "house",
    "hiše": "house",
    "stanovanjska hisa": "house",
    "vila": "house",
    "business": "business",
    "poslovni prostor": "business",
    "poslovni-prostor": "business",
    "poslovna stavba": "business",
    "office": "business",
    "land": "land",
    "zemljisce": "land",
    "zemljišče": "land",
    "parcela": "land",
    "kmetijsko zemljisce": "land",
    "garage": "garage",
    "garaza": "garage",
    "garaža": "garage",
    "garazaparkirno-mesto": "garage",
    "parkirno mesto": "garage",
}


def is_missing(value) -> bool:
    """True, kadar vrednosti ni ali je zapisana kot 'N/A', '-', 'neznano' ipd."""
    if value is None:
        return True
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value == 0
    text = str(value).strip().lower()
    return text in MISSING_MARKERS


def join_url(base_url: str, href) -> str:
    """Sestavi absolutni URL brez podvajanja predpone.

    Absolutne povezave pustimo pri miru (prej so se podvojile v
    ``https://portal/https://portal/...``), protocol-relative dopolnimo,
    relativne pa pripnemo na ``base_url``.
    """
    if not href:
        return ""
    href = str(href).strip()
    if not href:
        return ""
    if href.startswith(("http://", "https://")):
        return href
    if href.startswith("//"):
        return "https:" + href
    return urljoin(base_url.rstrip("/") + "/", href.lstrip("/"))


def clean_price(value) -> int:
    """Pretvori tekstualno ceno v celo število.

    Razpon (``547.522 - 591.067 €``) skrčimo na spodnjo mejo, decimalke
    zavržemo, nerealne vrednosti vrnemo kot 0.
    """
    if is_missing(value):
        return 0
    if isinstance(value, int) and not isinstance(value, bool):
        return value if 0 <= value <= MAX_SANE_PRICE else 0
    if isinstance(value, float):
        price = int(value)
        return price if 0 <= price <= MAX_SANE_PRICE else 0

    price_str = str(value).strip()

    # Razpon: vzamemo prvo (najnižjo) ceno.
    for separator in ("-", "–", "—"):
        if separator in price_str:
            price_str = price_str.split(separator)[0].strip()
            break

    # Enota €/m2 ne sme prispevati dvojke h ceni.
    price_str = re.sub(r"/\s*m[²2]", "", price_str)

    # Decimalke za vejico (npr. "2.500,00 €") niso del cele cene.
    if "," in price_str:
        parts = price_str.split(",")
        if len(parts) > 1 and len(parts[1].strip().split()[0]) == 2:
            price_str = parts[0]

    digits = re.sub(r"[^0-9]", "", price_str)
    price = int(digits) if digits else 0
    return price if 0 <= price <= MAX_SANE_PRICE else 0


def clean_area(value) -> float:
    """Pretvori tekstualno kvadraturo v float (0.0, kadar ni podatka)."""
    if is_missing(value):
        return 0.0
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    text = str(value).replace(",", ".")
    match = re.search(r"[-+]?\d*\.\d+|\d+", text)
    return float(match.group()) if match else 0.0


def detect_price_unit(value) -> str:
    """Vrne 'per_m2', kadar je cena zapisana kot cena na kvadratni meter.

    Najemnine (``1.200 €/mesec``) niso cene na m², čeprav vsebujejo "€/m".
    """
    text = str(value or "").lower().replace(" ", "")
    if any(marker in text for marker in ("/mesec", "/mes", "mesečno", "month")):
        return "total"
    markers = ("€/m2", "€/m²", "eur/m2", "eur/m²", "/m2", "/m²", "nam2", "nam²")
    return "per_m2" if any(marker in text for marker in markers) else "total"


def extract_year(value) -> int | None:
    """Poišče realistično letnico gradnje v besedilu."""
    if is_missing(value):
        return None
    match = re.search(r"\b(18[5-9]\d|19\d{2}|20[0-3]\d)\b", str(value))
    return int(match.group(1)) if match else None


def normalize_status(raw) -> str:
    """Preslika poljuben zapis v eno od vrednosti, ki jih pozna baza.

    Poleg običajnih zapisov prepozna tudi razmaknjene črke, ki jih uporabljajo
    nekatere strani (``P R O D A J A``).
    """
    if is_missing(raw):
        return STATUS_OTHER
    text = str(raw).lower().strip()
    # Razmaknjene črke: preveri še različico brez presledkov.
    for candidate in (text, re.sub(r"\s+", "", text)):
        if any(word in candidate for word in ("prod", "offer", "nakup", "sale")):
            return STATUS_SALE
        if any(word in candidate for word in ("odd", "najem", "rent")):
            return STATUS_RENT
    return STATUS_OTHER


def normalize_property_type(raw) -> str:
    """Preslika zapis tipa nepremičnine v kanonično vrednost."""
    if is_missing(raw):
        return "other"
    text = str(raw).strip().lower().replace("_", " ")
    if text in _TYPE_ALIASES:
        return _TYPE_ALIASES[text]
    if "stanovanj" in text or "apartma" in text:
        return "flat"
    if "hiš" in text or "his" in text or "vila" in text:
        return "house"
    if "poslov" in text or "office" in text:
        return "business"
    if "zemlji" in text or "parcel" in text:
        return "land"
    if "garaž" in text or "garaz" in text or "parkir" in text:
        return "garage"
    return "other"
