"""Fast contract tests for small/fast scrapers only."""
import sys, io, time, traceback
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

PASS = 0
FAIL = 0

def assert_eq(label, actual, expected):
    global PASS, FAIL
    if actual == expected: PASS += 1
    else: FAIL += 1; print(f"  ✗ {label}: expected {expected!r}, got {actual!r}")

def assert_true(label, cond):
    global PASS, FAIL
    if cond: PASS += 1
    else: FAIL += 1; print(f"  ✗ {label}: False")

def assert_min(label, actual, minimum):
    global PASS, FAIL
    if actual >= minimum: PASS += 1
    else: FAIL += 1; print(f"  ✗ {label}: {actual} < {minimum}")

def validate(item, site_name):
    errs = []
    for f in ["site","status","price","location","link","type","area"]:
        if f not in item: errs.append(f"missing {f}")
    if not isinstance(item.get("price"),(int,float)) or item["price"]<=0: errs.append(f"bad price: {item.get('price')}")
    if not item.get("link","").startswith("http"): errs.append(f"bad link")
    if not item.get("location") or item["location"]=="N/A": errs.append(f"no location")
    if item.get("status","").lower() not in ("prodaja","oddaja"): errs.append(f"bad status: {item.get('status')}")
    return errs

print("=" * 60)
print("  FAST CONTRACT TESTS (small scrapers)")
print("=" * 60)

# ── Base helpers ──
print("\n=== Base Scraper Helpers ===")
from scrapers.base_scraper import BaseScraper
b = BaseScraper("test","http://x.com")
assert_eq("clean_price('120.000,00 €')", b.clean_price("120.000,00 €"), 120000)
assert_eq("clean_price('85.000 EUR')", b.clean_price("85.000 EUR"), 85000)
assert_eq("clean_price('0')", b.clean_price("0"), 0)
assert_eq("clean_price('N/A')", b.clean_price("N/A"), 0)
assert_eq("clean_price('2.500 €/m²')", b.clean_price("2.500 €/m²"), 2500)
assert_eq("clean_area('118,9 m2')", b.clean_area("118,9 m2"), 118.9)
assert_eq("clean_area('42 m²')", b.clean_area("42 m²"), 42.0)
assert_eq("detect_price_unit('3.000 €/m2')", b.detect_price_unit("3.000 €/m2"), "per_m2")
assert_eq("extract_year('1985')", b.extract_year("1985"), 1985)
assert_eq("extract_year(None)", b.extract_year(None), None)
print("  ✓ All helpers OK")

# ── INSA ──
print("\n=== INSA ===")
t0 = time.time()
from scrapers.insa import InsaScraper
s = InsaScraper()
buy = s.scrape(buy=True)
rent = s.scrape(buy=False)
t = time.time()-t0
assert_true("buy is list", isinstance(buy,list))
assert_true("rent is list", isinstance(rent,list))
assert_min("buy>=50", len(buy), 50)
assert_min("rent>=10", len(rent), 10)
errs = [e for item in buy+rent for e in validate(item,"insa-nepremicnine")]
assert_eq("validation errors", len(errs), 0)
for r in buy: assert_true("buy=prodaja", "prodaj" in r["status"].lower())
for r in rent: assert_true("rent=oddaja", "oddaj" in r["status"].lower())
links = [r["link"] for r in buy+rent]
assert_eq("no dupes", len(links), len(set(links)))
print(f"  ✓ {len(buy)}+{len(rent)} in {t:.0f}s")

# ── SIMOBILIA ──
print("\n=== SIMOBILIA ===")
t0 = time.time()
from scrapers.simobilia import SimobiliaScraper
s = SimobiliaScraper()
buy = s.scrape(buy=True)
rent = s.scrape(buy=False)
t = time.time()-t0
assert_true("buy is list", isinstance(buy,list))
assert_min("buy>=30", len(buy), 30)
errs = [e for item in buy+rent for e in validate(item,"simobilia")]
assert_eq("validation errors", len(errs), 0)
links = [r["link"] for r in buy+rent]
assert_eq("no dupes", len(links), len(set(links)))
print(f"  ✓ {len(buy)}+{len(rent)} in {t:.0f}s")

# ── SOLTERRA ──
print("\n=== SOLTERRA ===")
t0 = time.time()
from scrapers.solterra import SolTerraScraper
s = SolTerraScraper()
buy = s.scrape(buy=True)
rent = s.scrape(buy=False)
t = time.time()-t0
assert_true("buy is list", isinstance(buy,list))
assert_min("buy>=5", len(buy), 5)
errs = [e for item in buy+rent for e in validate(item,"solterra")]
assert_eq("validation errors", len(errs), 0)
print(f"  ✓ {len(buy)}+{len(rent)} in {t:.0f}s")

# ── ABC ──
print("\n=== ABC ===")
t0 = time.time()
from scrapers.abcnepremicnine import AbcScraper
s = AbcScraper()
buy = s.scrape(buy=True)
rent = s.scrape(buy=False)
t = time.time()-t0
assert_true("buy is list", isinstance(buy,list))
assert_min("buy>=20", len(buy), 20)
errs = [e for item in buy+rent for e in validate(item,"abc-nepremicnine")]
assert_eq("validation errors", len(errs), 0)
print(f"  ✓ {len(buy)}+{len(rent)} in {t:.0f}s")

# ── LJUBLJANA ──
print("\n=== LJUBLJANA ===")
t0 = time.time()
from scrapers.ljubljanaNepremicnine import LjubljanaScraper
s = LjubljanaScraper()
buy = s.scrape(buy=True)
rent = s.scrape(buy=False)
t = time.time()-t0
assert_true("buy is list", isinstance(buy,list))
assert_min("buy>=20", len(buy), 20)
errs = [e for item in buy+rent for e in validate(item,"ljubljananepremicnine")]
assert_eq("validation errors", len(errs), 0)
print(f"  ✓ {len(buy)}+{len(rent)} in {t:.0f}s")

# ── Cross-scraper dedup ──
print("\n=== Cross-Scraper Dedup ===")
all_links = []
for Cls, site in [(InsaScraper,"insa"),(SimobiliaScraper,"simobilia"),(SolTerraScraper,"solterra")]:
    r = Cls().scrape(buy=True)[:3]
    all_links.extend([x["link"] for x in r])
assert_eq("no cross-dupes", len(all_links), len(set(all_links)))
print(f"  ✓ {len(all_links)} listings, all unique")

# ── API contract ──
print("\n=== DB API Contract ===")
import requests, os
from dotenv import load_dotenv
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
if url and key:
    api = f"{url}/rest/v1/nepremicnine_oglasi"
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    resp = requests.get(api, headers={**h, "Prefer": "count=exact"}, params={"select":"id","limit":"0"}, timeout=10)
    cr = resp.headers.get("content-range","")
    total = int(cr.split("/")[1]) if "/" in cr else 0
    assert_min("DB total>=4000", total, 4000)
    for site in ["siol-nepremicnine","si21-nepremicnine","ljubljananepremicnine",
                  "galea","mestonepremicnin","abc-nepremicnine","insa-nepremicnine",
                  "simobilia","solterra"]:
        resp = requests.get(api, headers={**h, "Prefer": "count=exact"},
                           params={"select":"id","site":f"eq.{site}","limit":"0"}, timeout=10)
        cr = resp.headers.get("content-range","")
        count = int(cr.split("/")[1]) if "/" in cr else 0
        assert_min(f"site '{site}'", count, 1)
    print(f"  ✓ All 9 sources in DB ({total} total)")
else:
    print("  ⚠ Skipped (no DB credentials)")

print()
print("=" * 60)
total = PASS + FAIL
print(f"  RESULTS: {PASS}/{total} passed, {FAIL} failed")
if FAIL == 0: print("  ✅ ALL CONTRACTS SATISFIED")
else: print(f"  ❌ {FAIL} BROKEN")
print("=" * 60)
sys.exit(1 if FAIL > 0 else 0)
