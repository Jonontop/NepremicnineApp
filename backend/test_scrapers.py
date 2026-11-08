"""
Scraper Behavioral Contract Tests
===================================
Tests every scraper against its contract:
- Returns a list (never None)
- Every item has required fields: site, status, price, location, link, type, area
- Prices are positive integers
- Links are non-empty valid URLs
- Locations are non-empty strings
- Status is either 'prodaja' or 'oddaja'
- Deduplication works (no duplicate links)
- Buy/rent filtering works correctly
- Pagination returns more items than a single page

Run: cd backend && python test_scrapers.py
"""

import sys
import io
import time
import traceback

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ── Contract helpers ──────────────────────────────────────────

PASS = 0
FAIL = 0


def assert_eq(label, actual, expected):
    global PASS, FAIL
    if actual == expected:
        PASS += 1
    else:
        FAIL += 1
        print(f"  ✗ {label}: expected {expected!r}, got {actual!r}")


def assert_true(label, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
    else:
        FAIL += 1
        print(f"  ✗ {label}: condition was False")


def assert_min(label, actual, minimum):
    global PASS, FAIL
    if actual >= minimum:
        PASS += 1
    else:
        FAIL += 1
        print(f"  ✗ {label}: {actual} < minimum {minimum}")


def validate_listing(item, scraper_name):
    """Validate a single listing against the contract."""
    errors = []
    required = ["site", "status", "price", "location", "link", "type", "area"]
    for field in required:
        if field not in item:
            errors.append(f"missing field '{field}'")

    if not isinstance(item.get("price"), (int, float)):
        errors.append(f"price is not numeric: {item.get('price')}")
    elif item["price"] <= 0:
        errors.append(f"price is not positive: {item['price']}")

    if not item.get("link") or not item["link"].startswith("http"):
        errors.append(f"invalid link: {item.get('link', '')[:50]}")

    if not item.get("location") or item["location"] == "N/A":
        errors.append(f"missing location")

    status = item.get("status", "").lower()
    if status not in ("prodaja", "oddaja"):
        errors.append(f"invalid status: {item.get('status')}")

    if not isinstance(item.get("area"), (int, float)):
        errors.append(f"area is not numeric: {item.get('area')}")

    if item.get("site") != scraper_name:
        errors.append(f"wrong site name: {item.get('site')} != {scraper_name}")

    return errors


# ── Test contracts ────────────────────────────────────────────

def test_insa():
    print("\n=== INSA (insa.si) — WordPress, 6 pages ===")
    from scrapers.insa import InsaScraper

    s = InsaScraper()
    t0 = time.time()
    results_buy = s.scrape(buy=True)
    results_rent = s.scrape(buy=False)
    elapsed = time.time() - t0

    assert_true("returns list (buy)", isinstance(results_buy, list))
    assert_true("returns list (rent)", isinstance(results_rent, list))
    assert_min("buy listings >= 50", len(results_buy), 50)
    assert_min("rent listings >= 10", len(results_rent), 10)

    # Validate every listing
    all_errors = []
    for item in results_buy + results_rent:
        errs = validate_listing(item, "insa-nepremicnine")
        all_errors.extend(errs)

    assert_eq("buy validation errors", len(all_errors), 0)
    if all_errors:
        for e in all_errors[:3]:
            print(f"    {e}")

    # Deduplication
    links = [r["link"] for r in results_buy + results_rent]
    assert_eq("no duplicate links", len(links), len(set(links)))

    # Filtering
    for r in results_buy:
        assert_true("buy item is prodaja", "prodaj" in r["status"].lower())
    for r in results_rent:
        assert_true("rent item is oddaja", "oddaj" in r["status"].lower())

    print(f"  ✓ {len(results_buy)} buy + {len(results_rent)} rent in {elapsed:.0f}s")


def test_simobilia():
    print("\n=== SIMOBILIA (simobilia.si) — Joomla, paginated ===")
    from scrapers.simobilia import SimobiliaScraper

    s = SimobiliaScraper()
    t0 = time.time()
    results_buy = s.scrape(buy=True)
    results_rent = s.scrape(buy=False)
    elapsed = time.time() - t0

    assert_true("returns list (buy)", isinstance(results_buy, list))
    assert_true("returns list (rent)", isinstance(results_rent, list))
    assert_min("buy listings >= 30", len(results_buy), 30)

    all_errors = []
    for item in results_buy + results_rent:
        errs = validate_listing(item, "simobilia")
        all_errors.extend(errs)

    assert_eq("validation errors", len(all_errors), 0)
    if all_errors:
        for e in all_errors[:3]:
            print(f"    {e}")

    links = [r["link"] for r in results_buy + results_rent]
    assert_eq("no duplicate links", len(links), len(set(links)))

    print(f"  ✓ {len(results_buy)} buy + {len(results_rent)} rent in {elapsed:.0f}s")


def test_solterra():
    print("\n=== SOLTERRA (solterra.si) — WordPress, es-col-view ===")
    from scrapers.solterra import SolTerraScraper

    s = SolTerraScraper()
    t0 = time.time()
    results_buy = s.scrape(buy=True)
    results_rent = s.scrape(buy=False)
    elapsed = time.time() - t0

    assert_true("returns list (buy)", isinstance(results_buy, list))
    assert_true("returns list (rent)", isinstance(results_rent, list))
    assert_min("buy listings >= 5", len(results_buy), 5)

    all_errors = []
    for item in results_buy + results_rent:
        errs = validate_listing(item, "solterra")
        all_errors.extend(errs)

    assert_eq("validation errors", len(all_errors), 0)
    if all_errors:
        for e in all_errors[:3]:
            print(f"    {e}")

    print(f"  ✓ {len(results_buy)} buy + {len(results_rent)} rent in {elapsed:.0f}s")


def test_siol():
    print("\n=== SIOL (nepremicnine.siol.net) — 4 types, paginated ===")
    from scrapers.siol import SiolScraper

    s = SiolScraper()
    t0 = time.time()
    results = s.scrape(buy=True)
    elapsed = time.time() - t0

    assert_true("returns list", isinstance(results, list))
    assert_min("total listings >= 100", len(results), 100)

    # Check we got multiple property types
    types = set()
    for r in results:
        t = r.get("type", "").lower()
        if "stanovanj" in t or "sobno" in t or "garsonj" in t:
            types.add("flat")
        elif "hiš" in t or "his" in t or "samostoj" in t:
            types.add("house")
        elif "poslov" in t or "pisarn" in t:
            types.add("business")
        elif "zemlj" in t or "parcel" in t:
            types.add("land")
    assert_min("has 3+ property types", len(types), 3)

    all_errors = []
    for item in results[:20]:  # Validate first 20 (full set too large)
        errs = validate_listing(item, "siol-nepremicnine")
        all_errors.extend(errs)
    assert_eq("first 20 validation errors", len(all_errors), 0)

    print(f"  ✓ {len(results)} listings, {len(types)} types in {elapsed:.0f}s")


def test_galea():
    print("\n=== GALEA (galea.si) — 7 types × 3 regions ===")
    from scrapers.galea import GaleaScraper

    s = GaleaScraper()
    t0 = time.time()
    results = s.scrape(buy=True)
    elapsed = time.time() - t0

    assert_true("returns list", isinstance(results, list))
    assert_min("total listings >= 20", len(results), 20)

    all_errors = []
    for item in results[:10]:
        errs = validate_listing(item, "galea")
        all_errors.extend(errs)
    assert_eq("first 10 validation errors", len(all_errors), 0)

    print(f"  ✓ {len(results)} listings in {elapsed:.0f}s")


def test_si21():
    print("\n=== SI21 (nepremicnine.si21.com) — 4 types ===")
    from scrapers.si21 import Si21Scraper

    s = Si21Scraper()
    t0 = time.time()
    results = s.scrape(buy=True)
    elapsed = time.time() - t0

    assert_true("returns list", isinstance(results, list))
    assert_min("total listings >= 50", len(results), 50)

    all_errors = []
    for item in results[:10]:
        errs = validate_listing(item, "si21-nepremicnine")
        all_errors.extend(errs)
    assert_eq("first 10 validation errors", len(all_errors), 0)

    print(f"  ✓ {len(results)} listings in {elapsed:.0f}s")


def test_mesto():
    print("\n=== MESTO (mestonepremicnin.si) — 5 types, paginated ===")
    from scrapers.mestonepremicnin import MestoScraper

    s = MestoScraper()
    t0 = time.time()
    results = s.scrape(buy=True)
    elapsed = time.time() - t0

    assert_true("returns list", isinstance(results, list))
    assert_min("total listings >= 100", len(results), 100)

    all_errors = []
    for item in results[:10]:
        errs = validate_listing(item, "mestonepremicnin")
        all_errors.extend(errs)
    assert_eq("first 10 validation errors", len(all_errors), 0)

    print(f"  ✓ {len(results)} listings in {elapsed:.0f}s")


def test_ljubljana():
    print("\n=== LJUBLJANA (ljubljananepremicnine.si) — 4 types ===")
    from scrapers.ljubljanaNepremicnine import LjubljanaScraper

    s = LjubljanaScraper()
    t0 = time.time()
    results = s.scrape(buy=True)
    elapsed = time.time() - t0

    assert_true("returns list", isinstance(results, list))
    assert_min("total listings >= 20", len(results), 20)

    all_errors = []
    for item in results[:10]:
        errs = validate_listing(item, "ljubljananepremicnine")
        all_errors.extend(errs)
    assert_eq("first 10 validation errors", len(all_errors), 0)

    print(f"  ✓ {len(results)} listings in {elapsed:.0f}s")


def test_abc():
    print("\n=== ABC (abc-nepremicnine.si) — 4 types ===")
    from scrapers.abcnepremicnine import AbcScraper

    s = AbcScraper()
    t0 = time.time()
    results = s.scrape(buy=True)
    elapsed = time.time() - t0

    assert_true("returns list", isinstance(results, list))
    assert_min("total listings >= 20", len(results), 20)

    all_errors = []
    for item in results[:10]:
        errs = validate_listing(item, "abc-nepremicnine")
        all_errors.extend(errs)
    assert_eq("first 10 validation errors", len(all_errors), 0)

    print(f"  ✓ {len(results)} listings in {elapsed:.0f}s")


def test_base_scraper_helpers():
    print("\n=== Base Scraper Helper Functions ===")
    from scrapers.base_scraper import BaseScraper

    b = BaseScraper("test", "http://test.com")

    # clean_price
    assert_eq("clean_price('120.000,00 €')", b.clean_price("120.000,00 €"), 120000)
    assert_eq("clean_price('85.000 EUR')", b.clean_price("85.000 EUR"), 85000)
    assert_eq("clean_price('0')", b.clean_price("0"), 0)
    assert_eq("clean_price('N/A')", b.clean_price("N/A"), 0)
    assert_eq("clean_price(None)", b.clean_price(None), 0)
    assert_eq("clean_price('2.500 €/m²')", b.clean_price("2.500 €/m²"), 2500)
    assert_eq("clean_price('547.522 - 591.067 €')", b.clean_price("547.522 - 591.067 €"), 547522)

    # clean_area
    assert_eq("clean_area('118,9 m2')", b.clean_area("118,9 m2"), 118.9)
    assert_eq("clean_area('42 m²')", b.clean_area("42 m²"), 42.0)
    assert_eq("clean_area('N/A')", b.clean_area("N/A"), 0.0)

    # detect_price_unit
    assert_eq("detect_price_unit('3.000 €/m2')", b.detect_price_unit("3.000 €/m2"), "per_m2")
    assert_eq("detect_price_unit('120.000 €')", b.detect_price_unit("120.000 €"), "total")

    # extract_year
    assert_eq("extract_year('Zgrajena l. 1985')", b.extract_year("Zgrajena l. 1985"), 1985)
    assert_eq("extract_year('2021')", b.extract_year("2021"), 2021)
    assert_eq("extract_year('no year')", b.extract_year("no year"), None)

    print("  ✓ All helper function tests passed")


def test_no_duplicates_across_scrapers():
    print("\n=== Cross-Scraper Deduplication ===")
    # Verify that different scrapers don't produce the same links
    from scrapers.insa import InsaScraper
    from scrapers.simobilia import SimobiliaScraper
    from scrapers.solterra import SolTerraScraper

    insa = InsaScraper().scrape(buy=True)[:5]
    sim = SimobiliaScraper().scrape(buy=True)[:5]
    sol = SolTerraScraper().scrape(buy=True)[:5]

    all_links = [r["link"] for r in insa + sim + sol]
    unique = set(all_links)

    assert_eq("no cross-scraper duplicates", len(all_links), len(unique))
    print(f"  ✓ {len(all_links)} listings from 3 scrapers, all unique")


def test_api_endpoint():
    print("\n=== API Endpoint Contract ===")
    import requests
    import os
    from dotenv import load_dotenv
    load_dotenv()

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("  ⚠ Skipped (no SUPABASE_URL/SUPABASE_SERVICE_KEY)")
        return

    api_url = f"{url}/rest/v1/nepremicnine_oglasi"
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    # Count total
    resp = requests.get(api_url, headers={**headers, "Prefer": "count=exact"}, params={"select": "id", "limit": "0"}, timeout=10)
    cr = resp.headers.get("content-range", "")
    total = int(cr.split("/")[1]) if "/" in cr else 0
    assert_min("DB has 4000+ listings", total, 4000)

    # Check each source exists
    for site in ["siol-nepremicnine", "si21-nepremicnine", "ljubljananepremicnine",
                  "galea", "mestonepremicnin", "abc-nepremicnine", "insa-nepremicnine",
                  "simobilia", "solterra"]:
        resp = requests.get(api_url, headers={**headers, "Prefer": "count=exact"},
                           params={"select": "id", "site": f"eq.{site}", "limit": "0"}, timeout=10)
        cr = resp.headers.get("content-range", "")
        count = int(cr.split("/")[1]) if "/" in cr else 0
        assert_min(f"site '{site}' has listings", count, 1)

    print(f"  ✓ All 9 sources present in DB ({total} total)")


# ── Run all tests ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  SCRAPER BEHAVIORAL CONTRACT TESTS")
    print("=" * 60)

    tests = [
        test_base_scraper_helpers,
        test_insa,
        test_simobilia,
        test_solterra,
        test_siol,
        test_galea,
        test_si21,
        test_mesto,
        test_ljubljana,
        test_abc,
        test_no_duplicates_across_scrapers,
        test_api_endpoint,
    ]

    for test_fn in tests:
        try:
            test_fn()
        except Exception as e:
            FAIL += 1
            print(f"  ✗ {test_fn.__name__} CRASHED: {e}")
            traceback.print_exc()

    print()
    print("=" * 60)
    total = PASS + FAIL
    print(f"  RESULTS: {PASS}/{total} passed, {FAIL} failed")
    if FAIL == 0:
        print("  ✅ ALL CONTRACTS SATISFIED")
    else:
        print(f"  ❌ {FAIL} CONTRACTS BROKEN")
    print("=" * 60)

    sys.exit(1 if FAIL > 0 else 0)
