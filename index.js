import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import Parser from "rss-parser";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const rss = new Parser();

// ======================================================
//  GOOGLE NEWS RSS KAYNAKLARI (ASCII + ENCODED)
// ======================================================
const NEWS_FEEDS = [
    "https://news.google.com/rss/search?q=altin",
    "https://news.google.com/rss/search?q=gram+altin",
    "https://news.google.com/rss/search?q=ons+altin",
    "https://news.google.com/rss/search?q=ceyrek+altin",
    "https://news.google.com/rss/search?q=yarim+altin",
    "https://news.google.com/rss/search?q=ata+lira",
    "https://news.google.com/rss/search?q=22+ayar+bilezik",
    "https://news.google.com/rss/search?q=dolar+tl",
    "https://news.google.com/rss/search?q=euro+tl",
    "https://news.google.com/rss/search?q=fed+interest+rate",
    "https://news.google.com/rss/search?q=tcmb+faiz",
    "https://news.google.com/rss/search?q=geopolitics"
];

let GLOBAL_NEWS = [];

// ======================================================
//  1️⃣ RSS → HABERLERİ ÇEK (MAX 50)
// ======================================================
async function fetchRawNews() {
    let results = [];

    for (let feed of NEWS_FEEDS) {
        try {
            const parsed = await rss.parseURL(feed);

            for (let item of parsed.items) {
                results.push({
                    title: item.title || "",
                    content: item.contentSnippet || "",
                    date: item.pubDate || "",
                    summary: `${item.title || ""} ${item.contentSnippet || ""}`
                });
            }
        } catch (err) {
            console.log("RSS hata:", err.message);
        }
    }

    return results.slice(0, 50);
}

// ======================================================
//  2️⃣ GPT → HABERLERİ SINIFLANDIR
// ======================================================
async function classifyNewsBatch(newsList) {

    if (!OPENAI_API_KEY) {
        return [];
    }

    const newsText = newsList.map((n, i) =>
        `${i + 1}) ${n.summary}`
    ).join("\n\n");

    const prompt = `
Aşağıda haberler var.
Her haber için SADECE JSON üret:

[
 { "category":"FED", "importance":"HIGH", "isTurkey":false }
]

Kategoriler:
FED, TCMB, GOLD, DXY, GEOPOLITIC, INFLATION, MARKET, OTHER

Önem:
HIGH, MEDIUM, LOW

Açıklama yazma.
Haberler:
${newsText}
`;

    try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: prompt }]
            })
        });

        const txt = await resp.text();

        // 🔥 GPT ```json``` TEMİZLEME
        let clean = txt
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(clean);

    } catch (err) {
        console.log("GPT hata:", err.message);
        return [];
    }
}

// ======================================================
//  3️⃣ HABER MOTORU (3 SAATTE BİR)
// ======================================================
async function updateNews() {

    console.log("⏳ Haber güncelleniyor...");

    const raw = await fetchRawNews();
    const ai = await classifyNewsBatch(raw);

    const finalNews = [];

    for (let i = 0; i < raw.length; i++) {

        const base = raw[i];
        const cls = ai[i] || {
            category: "OTHER",
            importance: "LOW",
            isTurkey: false
        };

        finalNews.push({
            title: base.title,
            content: base.content,
            date: base.date,
            category: cls.category,
            importance: cls.importance,
            isTurkey: cls.isTurkey
        });
    }

    GLOBAL_NEWS = finalNews;

    console.log("✔ Haber sayısı:", GLOBAL_NEWS.length);
}

// İlk çalıştır
updateNews();

// 3 saatte bir
setInterval(updateNews, 1000 * 60 * 60 * 3);

// ======================================================
//  ANDROID → HABERLER
// ======================================================
app.get("/haberler", (req, res) => {
    res.json(GLOBAL_NEWS);
});

// ======================================================
app.listen(3000, () => {
    console.log("🚀 Finans Haber Backend ÇALIŞIYOR");
});
