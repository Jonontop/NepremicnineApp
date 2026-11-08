"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";

type SiteStats = {
  site: string;
  total: number;
  prodaja: number;
  oddaja: number;
  priceZero: number;
  noImage: number;
  noLocation: number;
  lastUpdated: string | null;
  avgPrice: number;
};

type HealthData = {
  totalListings: number;
  activeListings: number;
  expiredListings: number;
  sites: SiteStats[];
  lastFullRun: string | null;
  dataQuality: {
    withPrice: number;
    withImage: number;
    withLocation: number;
    total: number;
  };
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getHealthColor(
  total: number,
  priceZero: number,
  noImage: number
): string {
  if (total === 0) return "text-slate-400";
  const errorRate = (priceZero + noImage) / total;
  if (errorRate < 0.05) return "text-emerald-500";
  if (errorRate < 0.15) return "text-amber-500";
  return "text-red-500";
}

function getHealthDot(
  total: number,
  priceZero: number,
  noImage: number
): string {
  if (total === 0) return "bg-slate-400";
  const errorRate = (priceZero + noImage) / total;
  if (errorRate < 0.05) return "bg-emerald-500";
  if (errorRate < 0.15) return "bg-amber-500";
  return "bg-red-500";
}

const SITE_DISPLAY_NAMES: Record<string, string> = {
  galea: "Galea",
  "si21-nepremicnine": "Si21",
  "siol-nepremicnine": "SiOL",
  ljubljananepremicnine: "Ljubljana",
  mestonepremicnin: "Mesto",
  "abc-nepremicnine": "ABC",
  "insa-nepremicnine": "INSA",
  simobilia: "Simobilia",
  solterra: "SolTerra",
  "ABC Nepremičnine": "ABC (old)",
};

export default function DashboardContent() {
  const { language } = useLanguage();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scraper-health")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const t =
    language === "sl"
      ? {
          title: "Nadzorna plošča scraperjev",
          subtitle: "Pregled zdravja in podatkov scraperjev nepremičnin",
          lastRun: "Zadnji zagon",
          totalListings: "Vsi oglasi",
          activeListings: "Aktivni oglasi",
          expiredListings: "Potečeni oglasi",
          dataQuality: "Kakovost podatkov",
          sourceBreakdown: "Oglasi po viru",
          scraperHealth: "Zdravje scraperjev",
          withPrice: "S ceno",
          withImage: "S sliko",
          withLocation: "Z lokacijo",
          listings: "oglasov",
          prodaja: "Prodaja",
          oddaja: "Oddaja",
          errors: "Napake",
          lastUpdated: "Nazadnje osveženo",
          noData: "Ni podatkov",
          site: "Vir",
          total: "Skupaj",
          avgPrice: "Povp. cena",
          priceErrors: "Cena = 0",
          missingImages: "Brez slike",
          missingLocation: "Brez lokacije",
        }
      : {
          title: "Scraper Health Dashboard",
          subtitle: "Overview of real estate scraper health and data",
          lastRun: "Last Full Run",
          totalListings: "Total Listings",
          activeListings: "Active Listings",
          expiredListings: "Expired Listings",
          dataQuality: "Data Quality",
          sourceBreakdown: "Listings by Source",
          scraperHealth: "Scraper Health",
          withPrice: "With Price",
          withImage: "With Image",
          withLocation: "With Location",
          listings: "listings",
          prodaja: "Sale",
          oddaja: "Rent",
          errors: "Errors",
          lastUpdated: "Last Updated",
          noData: "No data",
          site: "Source",
          total: "Total",
          avgPrice: "Avg Price",
          priceErrors: "Price = 0",
          missingImages: "No Image",
          missingLocation: "No Location",
        };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {language === "sl" ? "Nalagam podatke..." : "Loading data..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {language === "sl" ? "Napaka pri nalaganju" : "Failed to load"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const qualityPercent = (field: number) =>
    data.dataQuality.total > 0
      ? Math.round((field / data.dataQuality.total) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1a] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            {t.subtitle}
          </p>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatCard
            label={t.totalListings}
            value={data.totalListings.toLocaleString()}
            icon="📊"
            color="slate"
          />
          <StatCard
            label={t.activeListings}
            value={data.activeListings.toLocaleString()}
            icon="✅"
            color="emerald"
          />
          <StatCard
            label={t.expiredListings}
            value={data.expiredListings.toLocaleString()}
            icon="⏰"
            color="amber"
          />
          <StatCard
            label={t.lastRun}
            value={formatRelativeTime(data.lastFullRun)}
            icon="🔄"
            color="blue"
          />
        </div>

        {/* Data Quality */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-10 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
            {t.dataQuality}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <QualityBar
              label={t.withPrice}
              count={data.dataQuality.withPrice}
              total={data.dataQuality.total}
              percent={qualityPercent(data.dataQuality.withPrice)}
            />
            <QualityBar
              label={t.withImage}
              count={data.dataQuality.withImage}
              total={data.dataQuality.total}
              percent={qualityPercent(data.dataQuality.withImage)}
            />
            <QualityBar
              label={t.withLocation}
              count={data.dataQuality.withLocation}
              total={data.dataQuality.total}
              percent={qualityPercent(data.dataQuality.withLocation)}
            />
          </div>
        </div>

        {/* Source Breakdown Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.sourceBreakdown}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">
                    {t.scraperHealth}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">
                    {t.site}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">
                    {t.total}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                    {t.prodaja}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                    {t.oddaja}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {t.avgPrice}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {t.priceErrors}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {t.missingImages}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                    {t.missingLocation}
                  </th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">
                    {t.lastUpdated}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.sites.map((site) => (
                  <tr
                    key={site.site}
                    className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div
                        className={`w-3 h-3 rounded-full ${getHealthDot(site.total, site.priceZero, site.noImage)}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {SITE_DISPLAY_NAMES[site.site] || site.site}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {site.site}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {site.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-emerald-600 dark:text-emerald-400 hidden sm:table-cell">
                      {site.prodaja.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-blue-600 dark:text-blue-400 hidden sm:table-cell">
                      {site.oddaja.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300 hidden md:table-cell">
                      {site.avgPrice > 0
                        ? `${site.avgPrice.toLocaleString()} €`
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-right hidden md:table-cell">
                      <span
                        className={
                          site.priceZero > 0
                            ? "text-amber-600 dark:text-amber-400 font-medium"
                            : "text-slate-400"
                        }
                      >
                        {site.priceZero}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right hidden md:table-cell">
                      <span
                        className={
                          site.noImage > 0
                            ? "text-amber-600 dark:text-amber-400 font-medium"
                            : "text-slate-400"
                        }
                      >
                        {site.noImage}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right hidden lg:table-cell">
                      <span
                        className={
                          site.noLocation > 0
                            ? "text-amber-600 dark:text-amber-400 font-medium"
                            : "text-slate-400"
                        }
                      >
                        {site.noLocation}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-xs font-medium ${getHealthColor(site.total, site.priceZero, site.noImage)}`}
                      >
                        {formatRelativeTime(site.lastUpdated)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.sites.length === 0 && (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
              {t.noData}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    slate: "bg-slate-100 dark:bg-slate-800",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20",
    amber: "bg-amber-50 dark:bg-amber-900/20",
    blue: "bg-blue-50 dark:bg-blue-900/20",
  };
  return (
    <div
      className={`${colorMap[color] || colorMap.slate} rounded-2xl p-5 border border-slate-100 dark:border-slate-800`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function QualityBar({
  label,
  count,
  total,
  percent,
}: {
  label: string;
  count: number;
  total: number;
  percent: number;
}) {
  const barColor =
    percent >= 90
      ? "bg-emerald-500"
      : percent >= 70
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {count.toLocaleString()} / {total.toLocaleString()} ({percent}%)
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
