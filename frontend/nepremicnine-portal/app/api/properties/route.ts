import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RawListing = {
  id: string | number;
  location: string | null;
  price: number | null;
  area: number | null;
  status: string | null;
  type: string | null;
  site: string | null;
  link: string | null;
  image: string | null;
  features: string[] | null;
  posodobljeno_ob: string | null;
  weight: number | null;
};

type HomeProperty = {
  id: string;
  title: string;
  location: string;
  city: "Ljubljana" | "Maribor" | "Koper" | "Kranj" | "Celje";
  price: number;
  area: number;
  rooms: number;
  year: number;
  image: string;
  badgeType: "emerald" | "slate" | "amber" | "indigo";
  badgeText: string;
  isPremium: boolean;
  filterTag: "novogradnje" | "24h" | "premium" | "rabljeno";
  type: "stanovanje" | "hisa" | "poslovni" | "vikend";
  weight: number;
};

const SUPPORTED_CITIES: HomeProperty["city"][] = [
  "Ljubljana",
  "Maribor",
  "Koper",
  "Kranj",
  "Celje",
];

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1560185007-5f0bb1866cab?auto=format&fit=crop&w=1200&q=80";

function pickCity(location: string | null): HomeProperty["city"] {
  const normalized = (location || "").toLowerCase();
  const match = SUPPORTED_CITIES.find((city) =>
    normalized.includes(city.toLowerCase())
  );
  return match ?? "Ljubljana";
}

function mapType(rawType: string | null): HomeProperty["type"] {
  const t = (rawType || "").toLowerCase();
  if (t.includes("hi") || t.includes("house")) return "hisa";
  if (t.includes("vikend")) return "vikend";
  if (t.includes("poslov")) return "poslovni";
  return "stanovanje";
}

function mapTypeGroup(rawType: string | null): "stanovanja" | "hise" | "zemljisca" | "poslovni" {
  const t = (rawType || "").toLowerCase();
  if (t.includes("hi") || t.includes("house")) return "hise";
  if (t.includes("zem") || t.includes("parcela") || t.includes("land")) return "zemljisca";
  if (t.includes("poslov") || t.includes("office")) return "poslovni";
  return "stanovanja";
}

function roomsFromArea(area: number): number {
  if (area >= 120) return 5;
  if (area >= 90) return 4;
  if (area >= 60) return 3;
  if (area >= 35) return 2;
  return 1;
}

function mapHomeProperty(row: RawListing): HomeProperty {
  const weight = row.weight ?? 50;
  const status = (row.status || "prodaja").toLowerCase();
  const city = pickCity(row.location);
  const area = row.area ?? 0;
  const isPremium = weight >= 80;
  const badgeType: HomeProperty["badgeType"] =
    status === "oddaja" ? "indigo" : isPremium ? "amber" : "slate";
  const badgeText =
    status === "oddaja"
      ? "Oddaja"
      : isPremium
      ? "Premium"
      : status === "prodaja"
      ? "Prodaja"
      : "Oglas";
  const filterTag: HomeProperty["filterTag"] =
    isPremium ? "premium" : "rabljeno";
  const year = 2000 + (Number(String(row.id).slice(-2)) % 25);
  const type = mapType(row.type);

  return {
    id: String(row.id),
    title: `${type === "hisa" ? "Hiša" : type === "poslovni" ? "Poslovni prostor" : type === "vikend" ? "Vikend" : "Stanovanje"} - ${
      row.location || city
    }`,
    location: row.location || city,
    city,
    price: row.price ?? 0,
    area,
    rooms: roomsFromArea(area),
    year,
    image: row.image || PLACEHOLDER_IMAGE,
    badgeType,
    badgeText,
    isPremium,
    filterTag,
    type,
    weight,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") || "50");
  const orderBy = searchParams.get("orderBy") || "posodobljeno_ob_desc";
  const view = searchParams.get("view") || "raw";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      {
        error:
          "Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  let query = supabase.from("nepremicnine_oglasi").select("*");

  if (orderBy === "weight_desc") {
    query = query.order("weight", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("posodobljeno_ob", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as RawListing[];
  if (view === "stats") {
    const { count: activeAdsCount, error: activeError } = await supabase
      .from("nepremicnine_oglasi")
      .select("id", { count: "exact", head: true })
      .neq("status", "potečeno");

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    const { count: newbuildCount, error: newbuildError } = await supabase
      .from("nepremicnine_oglasi")
      .select("id", { count: "exact", head: true })
      .eq("novogradnja", true);

    if (newbuildError) {
      return NextResponse.json({ error: newbuildError.message }, { status: 500 });
    }

    const { data: locations, error: locationsError } = await supabase
      .from("nepremicnine_oglasi")
      .select("location")
      .not("location", "is", null);

    if (locationsError) {
      return NextResponse.json({ error: locationsError.message }, { status: 500 });
    }

    const uniqueLocationsCount = new Set(
      (locations || [])
        .map((row) => row.location?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value))
    ).size;

    const typeCounts = { poslovni: 0, zemljisca: 0, hise: 0, stanovanja: 0 };
    const actionCounts = {
      poslovni: { prodaja: 0, oddaja: 0 },
      zemljisca: { prodaja: 0, oddaja: 0 },
      hise: { prodaja: 0, oddaja: 0 },
      stanovanja: { prodaja: 0, oddaja: 0 },
    };
    for (const row of rows) {
      const group = mapTypeGroup(row.type);
      typeCounts[group] += 1;
      const status = (row.status || "").toLowerCase();
      if (status.includes("oddaja")) actionCounts[group].oddaja += 1;
      else actionCounts[group].prodaja += 1;
    }

    return NextResponse.json({
      activeAdsCount: activeAdsCount ?? 0,
      newbuildCount: newbuildCount ?? 0,
      uniqueLocationsCount,
      typeCounts,
      actionCounts,
    });
  }

  if (view === "home") {
    return NextResponse.json(rows.map(mapHomeProperty));
  }

  return NextResponse.json(rows);
}
