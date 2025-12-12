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
// 🇹🇷 TÜRKİYE + FİNANS ODAKLI GOOGLE NEWS RSS
// ======================================================
const NEWS_FEEDS = [
    // ALTIN
    "https://news.google.com/rss/search?q=altın+fiyatları&hl=tr&gl=TR&ceid=TR:tr",
    "https://news.google.com/rss/search?q=gram+altın&hl=tr&gl=TR&ceid=TR:tr",
    "https://news.google.com/rss/search?q=ons+altın&hl=tr&gl=TR&ceid=TR:tr",

    // GÜMÜŞ
    "https://news.google.com/rss/search?q=gümüş+fiyatları&hl=tr&gl=TR&ceid=TR:tr",

    // DÖVİZ
    "https://news.google.com/rss/search?q=dolar+tl&hl=tr&gl=TR&ceid=TR:tr",
    "https://news.google.com/rss/search?q=euro+tl&hl=tr&gl=TR&ceid=TR:tr",

    // MAKRO
    "https://news.google.com/rss/search?q=tcmb&hl=tr&gl=TR&ceid=TR:tr",
    "https://news.google.com/rss/search?q=merkez+bankası+faiz&hl=tr&gl=TR&ceid=TR:tr",
    "https://news.google.com/rss/search?q=jeopolitik+riskler&hl=tr&gl=TR&ceid=TR:tr"
];

let GLOBAL_NEWS = [];

// ======================================================
// 1️⃣ RSS → HAM HABERLER
// ======================================================
async function fetchRawNews() {
    const results = [];

    for (const feed of NEWS_FEEDS) {
        try {
            const parsed = await rss.parseURL(feed);

            for (const item of parsed.items) {
                results.push({
                    title: item.title || "",
                    content: item.contentSnippet || "",
                    date: item.pubDate || "",
                    summary: `${item.title} ${item.contentSnippet}`
                });
            }
        } catch (err) {
            console.log("RSS hata:", err.message);
        }
    }

    return results.slice(0, 50);
}

// ======================================================
// 2️⃣ GPT → SADECE ETİKETLE
// ======================================================
async function classifyNewsBatch(newsList) {

    const text = newsList.map((n, i) =>
        `${i + 1}) ${n.summary}`
    ).join("\n\n");

    const prompt = `
Aşağıdaki haberleri sınıflandır.

Sadece JSON array döndür.
Açıklama yazma.

Format:
[
 { "category":"GOLD", "importance":"HIGH", "isTurkey":true },
 ...
]

Kategori:
GOLD, SILVER, FED, TCMB, DXY, GEOPOLITIC, INFLATION, MARKET, OTHER

${text}
`;

    const payload = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
    };

    try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await r.json();
        return JSON.parse(data.choices[0].message.content);

    } catch (e) {
        console.log("GPT hata:", e.message);
        return [];
    }
}

// ======================================================
// 3️⃣ ANA MOTOR
// ======================================================
async function updateNews() {
    console.log("⏳ Haber güncelleniyor...");

    const raw = await fetchRawNews();
    const ai = await classifyNewsBatch(raw);

    GLOBAL_NEWS = raw.map((n, i) => {
        const c = ai[i] || {};
        return {
            title: n.title,
            content: n.content,
            date: n.date,
            category: c.category || "OTHER",
            importance: c.importance || "LOW",
            isTurkey: c.isTurkey ?? true
        };
    });

    console.log("✔ Haber sayısı:", GLOBAL_NEWS.length);
}

updateNews();
setInterval(updateNews, 1000 * 60 * 60 * 3);

// ======================================================
app.get("/haberler", (req, res) => {
    res.json(GLOBAL_NEWS);
});

app.listen(3000, () => {
    console.log("🚀 Finans Haber Backend ÇALIŞIYOR");
});
