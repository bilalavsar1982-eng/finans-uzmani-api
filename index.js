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
//  GOOGLE NEWS RSS KAYNAKLARI
// ======================================================
const NEWS_FEEDS = [
    "https://news.google.com/rss/search?q=altın",
    "https://news.google.com/rss/search?q=gram+altın",
    "https://news.google.com/rss/search?q=dolar",
    "https://news.google.com/rss/search?q=ons",
    "https://news.google.com/rss/search?q=fed+faiz",
    "https://news.google.com/rss/search?q=tcmb",
    "https://news.google.com/rss/search?q=jeopolitik"
];

let GLOBAL_NEWS = [];  // Android buradan okuyacak

// ======================================================
//  1) RSS → Haberleri çek (30 tane)
// ======================================================
async function fetchRawNews() {
    let results = [];

    for (let feed of NEWS_FEEDS) {
        try {
            const parsed = await rss.parseURL(feed);

            for (let item of parsed.items) {
                const summary = `${item.title} ${item.contentSnippet}`;
                results.push({
                    title: item.title,
                    content: item.contentSnippet,
                    date: item.pubDate,
                    summary: summary
                });
            }

        } catch (err) {
            console.log("RSS Hatası:", err);
        }
    }

    // En fazla 30 haber
    return results.slice(0, 30);
}

// ======================================================
//  2) GPT → 30 HABERİ TEK SEFERDE SINIFLANDIR
// ======================================================
async function classifyNewsBatch(newsList) {

    const newsText = newsList.map((n, i) => {
        return `${i+1}) ${n.summary}`;
    }).join("\n\n");

    const prompt = `
Aşağıda 30 haber metni var.
Her haber için şu formatta JSON üret:

[
 { "category":"FED", "importance":"HIGH", "isTurkey":false },
 { "category":"GOLD", "importance":"LOW", "isTurkey":true },
 ...
]

Kategori seçenekleri:
FED, TCMB, GOLD, DXY, GEOPOLITIC, INFLATION, MARKET, OTHER

Önem dereceleri:
HIGH, MEDIUM, LOW

Sadece JSON üret, açıklama yazma.

Haberler:
${newsText}
`;

    const payload = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: prompt }
        ]
    };

    try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const txt = await resp.text();
        let arr = [];

        try {
            arr = JSON.parse(txt);
        } catch {
            console.log("GPT JSON parse hatası:", txt);
        }

        return arr;

    } catch (err) {
        console.log("GPT toplu sınıflandırma hatası:", err);
        return [];
    }
}

// ======================================================
//  3) HABER MOTORU → 3 saatte bir çalışır
// ======================================================
async function updateNews() {

    console.log("⏳ Haberler çekiliyor...");

    const raw = await fetchRawNews();  // 30 adet haber
    const ai = await classifyNewsBatch(raw);

    const finalNews = [];

    for (let i = 0; i < raw.length; i++) {
        const base = raw[i];
        const cls  = ai[i] || {
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

    console.log("✔ Haberler güncellendi:", GLOBAL_NEWS.length);
}

// İlk yüklemede çalıştır
updateNews();

// Her 3 saatte tekrar
setInterval(updateNews, 1000 * 60 * 60 * 3);

// ======================================================
//  ANDROID → HABERLERİ AL
// ======================================================
app.get("/haberler", (req, res) => {
    res.json(GLOBAL_NEWS);
});

// ======================================================
app.listen(3000, () => {
    console.log("🚀 Haber + Finans Uzmanı Backend ÇALIŞIYOR!");
});
