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
//  ÜRÜNLER
// ======================================================
const PRODUCTS = [
    { name: "Gram Altın", code: "HASTRY" },
    { name: "Ons Altın", code: "ONS" },
    { name: "Dolar/TL", code: "USDTRY" },
    { name: "Euro/TL", code: "EURTRY" },
    { name: "Gümüş", code: "GUMUSTL" },
    { name: "Çeyrek Altın", code: "YENI CEYREK" },
    { name: "Yarım Altın", code: "YENI YARIM" },
    { name: "Tam Altın", code: "YENI TAM" },
    { name: "Ata Lira", code: "YENI ATA" },
    { name: "22 Ayar", code: "22 AYAR" }
];

let GLOBAL_DECISIONS = {};    
let GLOBAL_NEWS = [];          // ⭐ Android buradan haber çekecek

// ======================================================
//  HABER MOTORU → GOOGLE NEWS RSS
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

// Haberleri sınıflandırma
async function classifyNews(text) {

    const prompt = `
Aşağıdaki haber metnini analiz et ve JSON döndür.

Metin:
"${text}"

Kategori seçenekleri:
FED, TCMB, GOLD, DXY, GEOPOLITIC, INFLATION, MARKET, OTHER

Önem derecesi:
HIGH, MEDIUM, LOW

Sadece şu formatta JSON üret:
{
 "category": "...",
 "importance": "...",
 "isTurkey": true/false
}
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
        return JSON.parse(txt);

    } catch {
        return {
            category: "OTHER",
            importance: "LOW",
            isTurkey: false
        };
    }
}

// RSS’ten haber çekme
async function fetchNews() {
    let results = [];

    for (let feed of NEWS_FEEDS) {
        try {
            const parsed = await rss.parseURL(feed);

            for (let item of parsed.items.slice(0, 5)) {

                const summary = `${item.title} ${item.contentSnippet}`;

                const ai = await classifyNews(summary);

                results.push({
                    title: item.title,
                    content: item.contentSnippet,
                    date: item.pubDate,
                    category: ai.category,
                    importance: ai.importance,
                    isTurkey: ai.isTurkey
                });
            }
        } catch (err) {
            console.log("RSS Hatası:", err);
        }
    }

    GLOBAL_NEWS = results;
    console.log("✔ Haberler güncellendi:", results.length);
}

// İlk çalıştırma
fetchNews();
// Her 3 saatte bir güncelle
setInterval(fetchNews, 1000 * 60 * 60 * 3);

// ======================================================
//  TEK API ÇAĞRISIYLA 10 ÜRÜN KARARI AL
// ======================================================
async function generateAllDecisionsOnStartup() {

    const systemPrompt = `
Sen profesyonel bir finans analistisın.
Sadece JSON üret.

{
 "HASTRY": "AL",
 "ONS": "SAT",
 ...
}
`;

    let userPrompt = "Aşağıdaki ürünler için karar üret:\n\n";
    for (let p of PRODUCTS) {
        userPrompt += `${p.code} = ${p.name}\n`;
    }

    const payload = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]
    };

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const txt = await response.text();
        let data = {};

        try {
            data = JSON.parse(txt);
        } catch {
            console.log("⚠ JSON parse hatası:", txt);
        }

        for (let p of PRODUCTS) {
            GLOBAL_DECISIONS[p.code] = data[p.code] || "BEKLE";
        }

        console.log("✔ Açılış kararları üretildi:", GLOBAL_DECISIONS);

    } catch (err) {
        console.log("API Hatası:", err);
    }
}

generateAllDecisionsOnStartup();

// ======================================================
//  ANDROID: TÜM KARARLAR
// ======================================================
app.get("/tum-kararlar", (req, res) => {
    res.json(GLOBAL_DECISIONS);
});

// ======================================================
//  ANDROID: HABERLERİ VER
// ======================================================
app.get("/haberler", (req, res) => {
    res.json(GLOBAL_NEWS);
});

// ======================================================
//  SOHBET: TEK ÜRÜN KARARI GÜNCELLER
// ======================================================
app.post("/finans-uzmani", async (req, res) => {

    const userMessage = req.body.mesaj || "";
    const productCode = req.body.code || "";

    const systemPrompt = `
Sen profesyonel bir finans analistisın.
Cevabın sonunda:

Karar: AL
Karar: SAT
Karar: BEKLE

KULLAN.
`;

    const payload = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ]
    };

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const txt = await response.text();
        let aiMessage = txt;

        try {
            aiMessage = JSON.parse(txt)?.choices?.[0]?.message?.content || txt;
        } catch {}

        const up = aiMessage.toUpperCase();
        let decision = null;

        if (up.includes("KARAR: AL")) decision = "AL";
        else if (up.includes("KARAR: SAT")) decision = "SAT";
        else if (up.includes("KARAR: BEKLE")) decision = "BEKLE";

        if (decision && productCode) {
            GLOBAL_DECISIONS[productCode] = decision;
            console.log("✔ Sohbet kararı güncellendi:", productCode, decision);
        }

        res.json(aiMessage);

    } catch (err) {
        res.json("Sunucu hatası: " + err.message);
    }
});

// ======================================================
app.listen(3000, () => {
    console.log("🚀 Finans Uzmanı API ÇALIŞIYOR!");
});
