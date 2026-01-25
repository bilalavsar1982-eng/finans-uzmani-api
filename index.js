import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import xml2js from "xml2js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const parser = new xml2js.Parser({ explicitArray: false });

// =======================================================
// 🔥 CACHE
// =======================================================
let cachedNews = [];
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

// =======================================================
// 🔥 GOOGLE NEWS – SADECE FİNANS / EKONOMİ
// =======================================================
const FEEDS = {
  ALTIN: [
    "https://news.google.com/rss/search?q=altın+fiyatları+ekonomi",
    "https://news.google.com/rss/search?q=gram+altın+fiyat",
    "https://news.google.com/rss/search?q=ons+altın+gold+price"
  ],
  CEYREK: [
    "https://news.google.com/rss/search?q=çeyrek+altın+fiyat+ekonomi"
  ],
  DOLAR: [
    "https://news.google.com/rss/search?q=dolar+tl+ekonomi",
    "https://news.google.com/rss/search?q=usdtry+ekonomi"
  ],
  EURO: [
    "https://news.google.com/rss/search?q=euro+tl+ekonomi",
    "https://news.google.com/rss/search?q=eurtry+ekonomi"
  ],
  GUMUS: [
    "https://news.google.com/rss/search?q=gümüş+fiyatları+ekonomi",
    "https://news.google.com/rss/search?q=silver+price+market"
  ],
  MAKRO: [
    "https://news.google.com/rss/search?q=tcmb+faiz+kararı",
    "https://news.google.com/rss/search?q=fed+interest+rate",
    "https://news.google.com/rss/search?q=enflasyon+turkiye+ekonomi"
  ]
};

// =======================================================
// 🧠 YARDIMCI FONKSİYONLAR (AYNI)
// =======================================================
function toTr(url) {
  return url.includes("?")
    ? `${url}&hl=tr&gl=TR&ceid=TR:tr`
    : `${url}?hl=tr&gl=TR&ceid=TR:tr`;
}

function cleanText(s = "") {
  return String(s)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGarbage(title, content) {
  const t = (title + " " + content).toLowerCase();
  return (
    t.includes("gelinim") ||
    t.includes("mutfakta") ||
    t.includes("yarışma") ||
    t.includes("dizi") ||
    t.includes("oyuncu") ||
    t.includes("final") ||
    t.includes("kim elendi") ||
    t.includes("video") ||
    t.includes("magazin")
  );
}

function detectImportance(title) {
  const t = title.toLowerCase();
  if (t.includes("faiz") || t.includes("fed") || t.includes("tcmb") || t.includes("enflasyon")) return "HIGH";
  if (t.includes("dolar") || t.includes("euro") || t.includes("altın") || t.includes("gümüş") || t.includes("ons")) return "MEDIUM";
  return "LOW";
}

function isTurkey(text) {
  const t = text.toLowerCase();
  return t.includes("türkiye") || t.includes("turkiye") || t.includes("tcmb") || t.includes("bist");
}

// =======================================================
// 🚀 HABER TOPLAMA (TEK YERDEN)
// =======================================================
async function fetchNews() {
  const all = [];
  const seen = new Set();

  for (const group of Object.values(FEEDS)) {
    for (const rawUrl of group) {
      try {
        const res = await fetch(toTr(rawUrl), {
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        const xml = await res.text();
        const json = await parser.parseStringPromise(xml);
        const items = json?.rss?.channel?.item;
        if (!items) continue;

        const list = Array.isArray(items) ? items : [items];

        for (const it of list) {
          const title = cleanText(it.title);
          const content = cleanText(it.description || "");
          const date = it.pubDate || "";

          if (!title) continue;
          if (isGarbage(title, content)) continue;

          const key = (title + date).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          all.push({
            title,
            content,
            date,
            importance: detectImportance(title),
            isTurkey: isTurkey(title + " " + content)
          });
        }
      } catch (e) {
        console.log("RSS hata:", e.message);
      }
    }
  }

  all.sort((a, b) => new Date(b.date) - new Date(a.date));
  return all.slice(0, 50);
}

// =======================================================
// 🌐 ENDPOINT (CACHE'Lİ)
// =======================================================
app.get("/haberler", async (_, res) => {
  const now = Date.now();

  if (now - lastFetchTime > CACHE_TTL || cachedNews.length === 0) {
    cachedNews = await fetchNews();
    lastFetchTime = now;
    console.log(`🟢 Haber cache güncellendi: ${cachedNews.length}`);
  }

  res.json(cachedNews);
});

// =======================================================
// 🟡 SADECE METALSDAILY – GOLD NEWS (YENİ, BAĞIMSIZ)
// =======================================================
app.get("/metalsdaily/gold", async (_, res) => {
  try {
    const { load } = await import("cheerio");

    const r = await fetch("https://www.metalsdaily.com/news/gold-news/", {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!r.ok) {
      return res.status(500).json({ error: "MetalsDaily erişilemedi" });
    }

    const html = await r.text();
    const $ = load(html);

    const news = [];

    $(".view-content article").each((_, el) => {
      const title = $(el).find("h2 a").text().trim();
      const link = $(el).find("h2 a").attr("href");

      if (title && link) {
        news.push({
          title,
          link: link.startsWith("http")
            ? link
            : "https://www.metalsdaily.com" + link
        });
      }
    });

    res.json(news.slice(0, 20));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =======================================================
app.listen(PORT, () => {
  console.log("🚀 Finans Haber Backend ÇALIŞIYOR");
});
