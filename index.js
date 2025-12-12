import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ===========================================
//  ÜRÜNLER
// ===========================================
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

let GLOBAL_DECISIONS = {}; // tüm kararlar tek yerde

// ===========================================
//  TEK API ÇAĞRISIYLA 10 ÜRÜN KARARI AL
// ===========================================
async function generateAllDecisionsOnStartup() {

    const systemPrompt = `
Sen profesyonel bir finans analistisın.
Kendini asla yapay zeka olarak tanıtma.

Her bir ürün için 50 faktöre dayalı karar ver:
- Faizler, enflasyon, DXY, ABD tahvilleri
- Jeopolitik riskler, ETF akımları, likidite
- Teknik: trend, momentum, hacim, volatilite
- Psikoloji, para politikası, arz/talep

Görev:
Aşağıdaki formatta JSON üret:

{
 "HASTRY": "AL",
 "ONS": "BEKLE",
 "USDTRY": "SAT",
 ...
}

Sadece AL / SAT / BEKLE kullan.
Başka açıklama yazma. Sadece JSON üret.
`;

    let userPrompt = "Aşağıdaki ürünlerin her biri için karar ver:\n\n";

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
            data = JSON.parse(txt); // JSON bekliyoruz zaten
        } catch {
            console.log("⚠ JSON parse hatası, cevap:", txt);
        }

        // JSON içindeki kararları GLOBAL’e yaz
        for (let p of PRODUCTS) {
            GLOBAL_DECISIONS[p.code] = data[p.code] || "BEKLE";
        }

        console.log("✔ Açılış kararları üretildi:", GLOBAL_DECISIONS);

    } catch (err) {
        console.log("API Hatası:", err);
    }
}

// Sunucu açılır açılmaz 1 kere çalışır
generateAllDecisionsOnStartup();

// ===========================================
//  ANDROID GET: TÜM KARARLAR
// ===========================================
app.get("/tum-kararlar", (req, res) => {
    res.json(GLOBAL_DECISIONS);
});

// ===========================================
//  SOHBET: TEK ÜRÜN KARARINI GÜNCELLER
// ===========================================
app.post("/finans-uzmani", async (req, res) => {

    const userMessage = req.body.mesaj || "";
    const productCode = req.body.code || "";

    const systemPrompt = `
Sen profesyonel bir finans analistisın.
İnsan gibi doğal konuş.
Ama cevabın sonunda MUTLAKA:

Karar: AL
Karar: SAT
Karar: BEKLE

formatını kullan.
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

// ===========================================
app.listen(3000, () => {
    console.log("🚀 Finans Uzmanı API ÇALIŞIYOR!");
});
