import pytest

from scrapers import registry
from scrapers.base_scraper import BaseScraper


def test_keys_are_unique():
    keys = [spec.key for spec in registry.specs()]
    assert len(keys) == len(set(keys))


def test_every_enabled_source_builds():
    scrapers = registry.build_all(enabled_only=True)
    assert scrapers, "register ne sme biti prazen"
    for scraper in scrapers:
        assert isinstance(scraper, BaseScraper)
        assert scraper.name
        assert scraper.base_url.startswith("http")


def test_realinvest_is_documented_but_disabled():
    spec = registry.get_spec("realinvest")
    assert not spec.enabled
    assert "realinvest" not in {s.key for s in registry.specs(enabled_only=True)}
    assert "realinvest" in {s.key for s in registry.specs()}


def test_every_enabled_source_does_a_full_scrape():
    # Vir, ki bere samo prvo stran, mora imeti bulk=False in opombo.
    enabled = registry.specs(enabled_only=True)
    assert all(spec.bulk for spec in enabled)
    assert {spec.key for spec in registry.specs(bulk_only=True)} == {s.key for s in enabled}


def test_unknown_source_is_a_clear_error():
    with pytest.raises(KeyError) as excinfo:
        registry.get_spec("nepremicnine-ki-ne-obstajajo")
    assert "Znani viri" in str(excinfo.value)


def test_get_spec_is_case_insensitive():
    assert registry.get_spec("  SI21 ").key == "si21"


def test_run_source_reports_error_instead_of_raising(monkeypatch):
    class Broken(BaseScraper):
        def scrape(self, buy=True, **kwargs):
            raise RuntimeError("vir ne odgovarja")

    spec = registry.get_spec("galea")
    monkeypatch.setattr(spec.__class__, "build", lambda self: Broken("galea", "https://x.si"))

    result = registry.run_source("galea")
    assert not result.ok
    assert "RuntimeError" in result.error
