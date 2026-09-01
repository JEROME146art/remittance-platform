import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Base rates relative to USD. These are realistic illustrative values.
const BASE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  MXN: 17.42,
  INR: 83.5,
  PKR: 278.5,
  BRL: 5.08,
  SGD: 1.34,
  EGP: 48.7,
  JPY: 157.2,
  CAD: 1.37,
  AUD: 1.52,
  NGN: 1580,
  KES: 129,
  PHP: 58.3,
};

const CURRENCY_META: Record<string, { name: string; flag: string }> = {
  USD: { name: "US Dollar", flag: "🇺🇸" },
  EUR: { name: "Euro", flag: "🇪🇺" },
  GBP: { name: "British Pound", flag: "🇬🇧" },
  MXN: { name: "Mexican Peso", flag: "🇲🇽" },
  INR: { name: "Indian Rupee", flag: "🇮🇳" },
  PKR: { name: "Pakistani Rupee", flag: "🇵🇰" },
  BRL: { name: "Brazilian Real", flag: "🇧🇷" },
  SGD: { name: "Singapore Dollar", flag: "🇸🇬" },
  EGP: { name: "Egyptian Pound", flag: "🇪🇬" },
  JPY: { name: "Japanese Yen", flag: "🇯🇵" },
  CAD: { name: "Canadian Dollar", flag: "🇨🇦" },
  AUD: { name: "Australian Dollar", flag: "🇦🇺" },
  NGN: { name: "Nigerian Naira", flag: "🇳🇬" },
  KES: { name: "Kenyan Shilling", flag: "🇰🇪" },
  PHP: { name: "Philippine Peso", flag: "🇵🇭" },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const base = (url.searchParams.get("base") ?? "USD").toUpperCase();

    if (!BASE_RATES[base]) {
      return new Response(
        JSON.stringify({ error: `Unsupported base currency: ${base}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add a small random fluctuation so rates feel "live".
    const now = Date.now();
    const baseRate = BASE_RATES[base];

    const rates = Object.entries(BASE_RATES).map(([code, usdRate]) => {
      // Fluctuation: deterministic-ish per call using time + code hash, +/- ~0.8%
      const seed = (now / 5000) + code.charCodeAt(0) + code.charCodeAt(1);
      const fluctuation = 1 + (Math.sin(seed) * 0.004) + (Math.cos(seed * 1.3) * 0.003);
      const rate = base === code ? 1 : (usdRate / baseRate) * fluctuation;
      const prevRate = (usdRate / baseRate) * (1 + Math.sin(seed - 1) * 0.005);
      const change24h = ((rate - prevRate) / prevRate) * 100;
      const meta = CURRENCY_META[code];
      return {
        code,
        name: meta?.name ?? code,
        flag: meta?.flag ?? "🌐",
        rate: Math.round(rate * 1e6) / 1e6,
        change24h: Math.round(change24h * 100) / 100,
        trend: change24h >= 0 ? "up" : "down",
      };
    });

    return new Response(
      JSON.stringify({
        base,
        timestamp: new Date().toISOString(),
        rates,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
