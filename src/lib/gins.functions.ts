import { createServerFn } from "@tanstack/react-start";
import { GINS, type Gin } from "@/data/gins";

const SPREADSHEET_ID = "1sjuPDsbhyvq2Q6K4a0I8TXT3qr4DwuVAnA2bnvWaCOo";
const SHEET_RANGE = "Gin Collection!A1:Z1000";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

const STYLE_COLOURS: Record<string, string> = {
  "london dry": "#7fa650",
  classic: "#9a6040",
  floral: "#c98bb9",
  citrus: "#e2b13c",
  fruit: "#c0392b",
  flavoured: "#d4ac0d",
  contemporary: "#2980b9",
  mediterranean: "#16a085",
  japanese: "#c0774a",
  spiced: "#b7770d",
  american: "#8e44ad",
  welsh: "#27ae60",
  scottish: "#5d8a3c",
  bathtub: "#8B6914",
};

const FALLBACK_COLOURS = new Map(GINS.map((g) => [g.name.trim().toLowerCase(), g.colour]));

function colourFor(name: string, style: string) {
  return (
    FALLBACK_COLOURS.get(name.trim().toLowerCase()) ??
    STYLE_COLOURS[style.trim().toLowerCase()] ??
    "#c8a870"
  );
}

function rowsToGins(values: string[][]): Gin[] {
  if (!values.length) return [];
  const header = values[0]!.map((h) => String(h ?? "").trim().toLowerCase());
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  const iId = col("#", "id", "no", "number");
  const iName = col("gin name", "name", "gin");
  const iOrigin = col("origin", "country");
  const iStyle = col("style", "category");
  const iAbv = col("abv", "abv %", "strength");
  const iTags = col("flavour tags", "flavor tags", "tags", "flavour");
  const iDesc = col("description", "notes", "tasting notes");

  const out: Gin[] = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r] ?? [];
    const name = String(row[iName] ?? "").trim();
    if (!name) continue;
    const style = String(row[iStyle] ?? "").trim() || "Contemporary";
    const abv = parseFloat(String(row[iAbv] ?? "").replace(/[^0-9.]/g, ""));
    const tags = String(row[iTags] ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const rawId = parseInt(String(row[iId] ?? "").replace(/[^0-9]/g, ""), 10);
    out.push({
      id: Number.isFinite(rawId) && rawId > 0 ? rawId : r,
      name,
      origin: String(row[iOrigin] ?? "").trim(),
      style,
      abv: Number.isFinite(abv) ? abv : 40,
      colour: colourFor(name, style),
      tags,
      description: String(row[iDesc] ?? "").trim(),
    });
  }
  return out;
}

export const fetchGins = createServerFn({ method: "GET" }).handler(async () => {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !connKey) {
    return { gins: GINS, source: "fallback" as const, error: "Spreadsheet not connected" };
  }

  try {
    const res = await fetch(
      `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connKey,
        },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`Google Sheets request failed [${res.status}]: ${body}`);
      return { gins: GINS, source: "fallback" as const, error: `Sheet unavailable (${res.status})` };
    }
    const json = (await res.json()) as { values?: string[][] };
    const gins = rowsToGins(json.values ?? []);
    if (!gins.length) {
      return { gins: GINS, source: "fallback" as const, error: "Sheet returned no rows" };
    }
    return { gins, source: "sheet" as const, error: null };
  } catch (err) {
    console.error("Google Sheets fetch error", err);
    return { gins: GINS, source: "fallback" as const, error: "Sheet unavailable" };
  }
});
