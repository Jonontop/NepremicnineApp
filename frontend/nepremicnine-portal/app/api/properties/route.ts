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
  novogradnja?: boolean | null;
  leto_izgradnje?: number | null;
  price_unit?: string | null;
  title?: string | null;
};

type HomeProperty = {
  id: string;
  title: string;
  location: string;
  city: "Ljubljana" | "Maribor" | "Koper" | "Kranj" | "Celje";
  price: number;
  priceUnit: "total" | "per_m2";
  totalPrice: number;
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

function isValidListing(row: RawListing): boolean {
  if (!row.price || row.price <= 0) return false;
  if (!row.location || row.location.trim() === "" || row.location.trim().toLowerCase() === "n/a") return false;
  return true;
}

function getPriceUnit(row: Pick<RawListing, "price_unit" | "features">): "total" | "per_m2" {
  const unit = (row.price_unit || "").toLowerCase();
  if (unit.includes("m2") || unit.includes("m²") || unit.includes("sqm")) return "per_m2";
  const featureText = (row.features || []).join(" ").toLowerCase();
  if (featureText.includes("€/m") || featureText.includes("eur/m") || featureText.includes("cena na m")) return "per_m2";
  return "total";
}

function getTotalPrice(row: Pick<RawListing, "price" | "area" | "price_unit" | "features">): number {
  const price = row.price ?? 0;
  if (getPriceUnit(row) === "per_m2" && row.area && row.area > 0) {
    return Math.round(price * row.area);
  }
  return price;
}

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

/**
 * Try to parse room count from the listing title or type field.
 * Matches patterns like "2-sobno", "3-sobno", "garsonjera", "studio" etc.
 */
function parseRoomsFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("garsonjera") || t.includes("studio")) return 1;
  const match = t.match(/(\d+)[- ]?sob/);
  if (match) return Math.min(parseInt(match[1], 10), 5);
  return null;
}

/**
 * Try to parse year from features array. Looks for 4-digit year strings (1950-2030).
 */
function parseYearFromFeatures(features: string[] | null | undefined): number | null {
  if (!features) return null;
  for (const feat of features) {
    const match = feat.match(/\b(19[5-9]\d|20[0-2]\d|203[0])\b/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

function buildTitle(row: RawListing): string {
  // Use the real type/title if available in type field
  if (row.type && row.type.trim().length > 3 && !["prodaja", "oddaja", "najem"].includes(row.type.trim().toLowerCase())) {
    return row.type.trim();
  }
  const type = mapType(row.type);
  const typeLabel =
    type === "hisa" ? "Hiša" :
    type === "poslovni" ? "Poslovni prostor" :
    type === "vikend" ? "Vikend" :
    "Stanovanje";
  return `${typeLabel} – ${row.location || "Slovenija"}`;
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
  const isNovogradnja = row.novogradnja === true;
  const filterTag: HomeProperty["filterTag"] =
    isNovogradnja ? "novogradnje" : isPremium ? "premium" : "rabljeno";

  // Parse rooms from title/type text first, fall back to area
  const parsedRooms =
    parseRoomsFromText(row.type) ??
    parseRoomsFromText(row.title) ??
    roomsFromArea(area);

  // Prefer the database field, then parse year from features array.
  const parsedYear =
    row.leto_izgradnje ??
    parseYearFromFeatures(row.features) ??
    (2000 + (Number(String(row.id).slice(-2)) % 25));

  const type = mapType(row.type);
  const priceUnit = getPriceUnit(row);
  const totalPrice = getTotalPrice(row);

  return {
    id: String(row.id),
    title: buildTitle(row),
    location: row.location || city,
    city,
    price: row.price ?? 0,
    priceUnit,
    totalPrice,
    area,
    rooms: parsedRooms,
    year: parsedYear,
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
  // Allow larger fetches from the frontend (cap at 1000 to avoid overly large responses)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : 50;

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

  // Filter out invalid listings (price 0/null or location N/A/empty)
  const allRows = (data || []) as RawListing[];
  const rows = allRows.filter(isValidListing);

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
        .filter((value): value is string => Boolean(value) && value !== "n/a")
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
