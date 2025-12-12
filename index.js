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
// 🔥 GOOGLE NEWS RSS – TR + FİNANS (DÜZELTİLDİ)
// =======================================================
const NEWS_FEEDS = [
  // ALTIN
  "https://news.google.com/rss/search?q=gram+altin+fiyat",
  "https://news.google.com/rss/search?q=ons+altin+fiyat",
  "https://news.google.com/rss/search?q=altin+fiyatlari",
  "https://news.google.com/rss/search?q=gold+price",

  // GÜMÜŞ ✅
  "https://news.google.com/rss/search?q=gumus+fiyat",
  "https://news.google.com/rss/search?q=silver+price",

  // BİLEZİK / ATA / ÇEYREK / YARIM
  "https://news.google.com/rss/search?q=22+ayar+bilezik",
  "https://news.google.com/rss/search?q=ata+lira",
  "https://news.google.com/rss/search?q=ceyrek+altin",
  "https://news.google.com/rss/search?q=yarim+altin",

  // DOLAR
  "https://news.google.com/rss/search?q=dolar+tl",
  "https://news.google.com/rss/search?q=usd+try",
  "https://news.google.com/rss/search?q=usdtry",

  // EURO
  "https://news.google.com/rss/search?q=euro+tl",
  "https://news.google.com/rss/search?q=eur+try",

  // MAKRO
  "https://news.google.com/rss/search?q=tcmb+faiz",
  "https://news.google.com/rss/search?q=fed+faiz",
  "https://news.google.com/rss/search?q=enflasyon+turkiye"
];

// =======================================================
// 🧠 YARDIMCI
// =======================================================
function toTrFeed(url) {
  const suffix = "hl=tr&gl=TR&ceid=TR:tr";
  return url.includes("?") ? `${url}&${suffix}` : `${url}?${suffix}`;
}

function cleanText(s = "") {
  return String(s)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTurkey(text) {
  const t = text.toLowerCase();
  return (
    t.includes("türkiye") ||
    t.includes("turkiye") ||
    t.includes("tcmb") ||
    t.includes("ankara") ||
    t.includes("istanbul") ||
    t.includes("bist")
  );
}

function detectImportance(title) {
  const t = title.toLowerCase();

  if (
    t.includes("faiz") ||
    t.includes("fed") ||
    t.includes("tcmb") ||
    t.includes("enflasyon")
  ) return "HIGH";

  if (
    t.includes("dolar") ||
    t.includes("euro") ||
    t.includes("altın") ||
    t.includes("altin") ||
    t.includes("ons") ||
    t.includes("gümüş") ||
    t.includes("gumus") ||
    t.includes("silver")
  ) return "MEDIUM";

  return "LOW";
}

function isGarbage(title, content) {
  const t = (title + " " + content).toLowerCase();
  return (
    t.includes("altin dumani") ||
    t.includes("altin krasniqi") ||
    t.includes("music") ||
    t.includes("song") ||
    t.includes("video")
  );
}

// =======================================================
// 🚀 HABER TOPLAMA (TEMİZ)
// =======================================================
async function fetchNews() {
  const allNews = [];
  const seen = new Set();

  for (const raw of NEWS_FEEDS) {
    const url = toTrFeed(raw);

    try {
      const res = await fetch(url, {
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

        allNews.push({
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

  allNews.sort((a, b) => new Date(b.date) - new Date(a.date));
  return allNews.slice(0, 50);
}

// =======================================================
// 🌐 ENDPOINTLER
// =======================================================
app.get("/news", async (req, res) => {
  const data = await fetchNews();
  console.log(`✔ Haber sayısı: ${data.length}`);
  res.json(data);
});

app.get("/haberler", async (req, res) => {
  const data = await fetchNews();
  console.log(`✔ Haber sayısı: ${data.length}`);
  res.json(data);
});

// =======================================================
app.listen(PORT, () => {
  console.log("🚀 Finans Haber Backend ÇALIŞIYOR");
});
