// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Yougo — Cloudflare Worker
//  حارس البوابة: كاش أمام Supabase
//  المفاتيح محفوظة في Environment Variables (آمن ✅)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// مسارات بيانات ثابتة نكشها (مطاعم، منتجات)
const CACHEABLE_PATHS = ["/rest/v1/restaurants", "/rest/v1/categories", "/rest/v1/menu_items"];

// مدة الكاش: 60 ثانية للبيانات العامة
const CACHE_TTL = 60;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── CORS Headers ────────────────────────────────
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, Prefer",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ── بناء طلب Supabase ───────────────────────────
    const supabaseUrl = env.SUPABASE_URL + url.pathname + url.search;

    const supabaseHeaders = {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: request.headers.get("Authorization") || `Bearer ${env.SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: request.headers.get("Prefer") || "",
    };

    // ── كاش فقط للـ GET على مسارات ثابتة ────────────
    const isCacheable =
      request.method === "GET" &&
      CACHEABLE_PATHS.some((p) => url.pathname.startsWith(p));

    if (isCacheable) {
      const cache = caches.default;
      const cached = await cache.match(request);
      if (cached) {
        const res = new Response(cached.body, cached);
        res.headers.set("X-Cache", "HIT");
        res.headers.set("Access-Control-Allow-Origin", "*");
        return res;
      }

      const response = await fetch(supabaseUrl, { headers: supabaseHeaders });
      const newRes = new Response(response.body, response);
      newRes.headers.set("Cache-Control", `s-maxage=${CACHE_TTL}`);
      newRes.headers.set("X-Cache", "MISS");
      Object.entries(corsHeaders).forEach(([k, v]) => newRes.headers.set(k, v));
      await cache.put(request, newRes.clone());
      return newRes;
    }

    // ── باقي الطلبات تمر مباشرة (POST, Auth, etc.) ──
    const response = await fetch(supabaseUrl, {
      method: request.method,
      headers: supabaseHeaders,
      body: request.method !== "GET" ? request.body : undefined,
    });

    const finalRes = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([k, v]) => finalRes.headers.set(k, v));
    return finalRes;
  },
};
