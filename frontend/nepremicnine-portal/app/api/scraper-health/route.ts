import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

const KNOWN_SITES = [
  "si21-nepremicnine",
  "siol-nepremicnine",
  "ljubljananepremicnine",
  "galea",
  "mestonepremicnin",
  "abc-nepremicnine",
  "insa-nepremicnine",
  "simobilia",
  "solterra",
];

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "Supabase credentials not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key);

    // Total counts
    const { count: totalListings } = await supabase
      .from("nepremicnine_oglasi")
      .select("id", { count: "exact", head: true });

    const { count: activeListings } = await supabase
      .from("nepremicnine_oglasi")
      .select("id", { count: "exact", head: true })
      .neq("status", "potečeno");

    const { count: expiredListings } = await supabase
      .from("nepremicnine_oglasi")
      .select("id", { count: "exact", head: true })
      .eq("status", "potečeno");

    // Per-site stats — query each site individually to avoid 1000-row REST API limit
    const siteMap: Record<string, SiteStats> = {};

    for (const siteName of KNOWN_SITES) {
      const { count: total } = await supabase
        .from("nepremicnine_oglasi")
        .select("id", { count: "exact", head: true })
        .eq("site", siteName);

      const { count: prodaja } = await supabase
        .from("nepremicnine_oglasi")
        .select("id", { count: "exact", head: true })
        .eq("site", siteName)
        .eq("status", "prodaja");

      const { count: oddaja } = await supabase
        .from("nepremicnine_oglasi")
        .select("id", { count: "exact", head: true })
        .eq("site", siteName)
        .eq("status", "oddaja");

      const { count: priceZero } = await supabase
        .from("nepremicnine_oglasi")
        .select("id", { count: "exact", head: true })
        .eq("site", siteName)
        .or("price.is.null,price.eq.0");

      const { count: noImage } = await supabase
        .from("nepremicnine_oglasi")
        .select("id", { count: "exact", head: true })
        .eq("site", siteName)
        .or("image.is.null,image.eq.");

      const { count: noLocation } = await supabase
        .from("nepremicnine_oglasi")
        .select("id", { count: "exact", head: true })
        .eq("site", siteName)
        .or("location.is.null,location.eq.,location.eq.N/A");

      const { data: lastRow } = await supabase
        .from("nepremicnine_oglasi")
        .select("posodobljeno_ob")
        .eq("site", siteName)
        .order("posodobljeno_ob", { ascending: false })
        .limit(1);

      const { data: priceSample } = await supabase
        .from("nepremicnine_oglasi")
        .select("price")
        .eq("site", siteName)
        .gt("price", 0)
        .limit(200);

      const avgPrice =
        priceSample && priceSample.length > 0
          ? Math.round(
              priceSample.reduce((sum, r) => sum + (r.price || 0), 0) /
                priceSample.length
            )
          : 0;

      siteMap[siteName] = {
        site: siteName,
        total: total || 0,
        prodaja: prodaja || 0,
        oddaja: oddaja || 0,
        priceZero: priceZero || 0,
        noImage: noImage || 0,
        noLocation: noLocation || 0,
        lastUpdated: lastRow?.[0]?.posodobljeno_ob || null,
        avgPrice,
      };
    }

    // Discover any other sites
    const { data: otherSites } = await supabase
      .from("nepremicnine_oglasi")
      .select("site")
      .not("site", "in", `(${KNOWN_SITES.join(",")})`)
      .limit(5000);

    const otherSiteNames = new Set(
      (otherSites || []).map((r) => r.site || "unknown")
    );
    for (const siteName of otherSiteNames) {
      if (siteMap[siteName]) continue;
      const { count: total } = await supabase
        .from("nepremicnine_oglasi")
        .select("id", { count: "exact", head: true })
        .eq("site", siteName);
      if (total && total > 0) {
        siteMap[siteName] = {
          site: siteName,
          total,
          prodaja: 0,
          oddaja: 0,
          priceZero: 0,
          noImage: 0,
          noLocation: 0,
          lastUpdated: null,
          avgPrice: 0,
        };
      }
    }

    const sites = Object.values(siteMap).filter((s) => s.total > 0);
    sites.sort((a, b) => b.total - a.total);

    // Data quality
    const totalPriceZero = sites.reduce((sum, s) => sum + s.priceZero, 0);
    const totalNoImage = sites.reduce((sum, s) => sum + s.noImage, 0);
    const totalNoLocation = sites.reduce((sum, s) => sum + s.noLocation, 0);
    const total = totalListings ?? 0;

    // Last full run
    let lastFullRun: string | null = null;
    for (const s of sites) {
      if (s.lastUpdated && (!lastFullRun || s.lastUpdated > lastFullRun)) {
        lastFullRun = s.lastUpdated;
      }
    }

    return NextResponse.json({
      totalListings: total,
      activeListings: activeListings ?? 0,
      expiredListings: expiredListings ?? 0,
      sites,
      lastFullRun,
      dataQuality: {
        withPrice: total - totalPriceZero,
        withImage: total - totalNoImage,
        withLocation: total - totalNoLocation,
        total,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
