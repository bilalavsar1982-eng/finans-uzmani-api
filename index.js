import express from "express";
import fetch from "node-fetch";
import xml2js from "xml2js";

const app = express();
const PORT = process.env.PORT || 3000;

const parser = new xml2js.Parser({ explicitArray: false });

// =======================================================
// 🔥 GOOGLE NEWS RSS LİSTESİ (FİNANS ODAKLI – FİLTRELİ)
// =======================================================
const NEWS_FEEDS = [

  // ALTIN
  "https://news.google.com/rss/search?q=gram+altin+fiyat",
  "https://news.google.com/rss/search?q=ons+altin+gold+price",
  "https://news.google.com/rss/search?q=altin+fiyatlari+finans",
  "https://news.google.com/rss/search?q=gold+price+market",

  // BİLEZİK / ATA / ÇEYREK
  "https://news.google.com/rss/search?q=22+ayar+bilezik+fiyat",
  "https://news.google.com/rss/search?q=ata+lira+altin",
  "https://news.google.com/rss/search?q=ceyrek+altin+fiyat",
  "https://news.google.com/rss/search?q=yarim+altin+fiyat",

  // DOLAR
  "https://news.google.com/rss/search?q=dolar+tl+kur",
  "https://news.google.com/rss/search?q=usd+try",
  "https://news.google.com/rss/search?q=turkish+lira+usd",
  "https://news.google.com/rss/search?q=doviz+kur",

  // EURO
  "https://news.google.com/rss/search?q=euro+tl",
  "https://news.google.com/rss/search?q=eur+try",

  // MAKRO
  "https://news.google.com/rss/search?q=fed+interest+rate",
  "https://news.google.com/rss/search?q=tcmb+faiz+karari",
  "https://news.google.com/rss/search?q=inflation+turkey",
  "https://news.google.com/rss/search?q=geopolitical+risk+market"
];

// =======================================================
// 🧠 YARDIMCI FONKSİYONLAR
// =======================================================
function cleanText(s = "") {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isTurkey(text) {
  const t = text.toLowerCase();
  return t.includes("türkiye") || t.includes("tcmb") || t.includes("ankara");
}

function detectImportance(title) {
  const t = title.toLowerCase();
  if (
    t.includes("faiz") ||
    t.includes("fed") ||
    t.includes("tcmb") ||
    t.includes("enflasyon") ||
    t.includes("interest rate")
  ) return "HIGH";
  if (t.includes("kur") || t.includes("market") || t.includes("price"))
    return "MEDIUM";
  return "LOW";
}

// ❌ KİŞİ İSMİ / ALAKASIZ HABER FİLTRESİ
function isGarbage(title, content) {
  const t = (title + " " + content).toLowerCase();

  return (
    t.includes("altin dumani") ||
    t.includes("altin krasniqi") ||
    t.includes("altin gün") ||
    t.includes("director meets") ||
    t.includes("video") ||
    t.includes("music") ||
    t.includes("song")
  );
}

// =======================================================
// 🚀 API ENDPOINT
// =======================================================
app.get("/news", async (req, res) => {
  console.log("⏳ Haber güncelleniyor...");

  const allNews = [];

  for (const url of NEWS_FEEDS) {
    try {
      const response = await fetch(url);
      const xml = await response.text();
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

        allNews.push({
          title,
          content,
          date,
          importance: detectImportance(title),
          isTurkey: isTurkey(title + " " + content)
        });
      }

    } catch (err) {
      console.log("RSS hata:", err.message);
    }
  }

  // ===================================================
  // 🔥 TEKRAR TEMİZLEME + SIRALAMA
  // ===================================================
  const seen = new Set();
  const unique = [];

  for (const n of allNews) {
    const key = (n.title + n.date).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(n);
    }
  }

  unique.sort((a, b) => new Date(b.date) - new Date(a.date));

  const finalNews = unique.slice(0, 50);

  console.log(`✔ Haber sayısı: ${finalNews.length}`);

  res.json(finalNews);
});

// =======================================================
app.listen(PORT, () => {
  console.log("🚀 Finans Haber Backend ÇALIŞIYOR");
});
