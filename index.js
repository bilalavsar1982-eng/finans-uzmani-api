import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ===========================================
//  TUTARLI, ANALİZLİ, AKILLI AÇILIŞ KARAR MOTORU
// ===========================================

let GLOBAL_DECISIONS = {};  

async function createDecision(productName, productCode) {

    const systemPrompt = `
Sen profesyonel bir finans analistisın.
Kendini asla yapay zeka olarak tanıtma.

Aşağıdaki 50 faktörü KISA şekilde değerlendir:
TCMB faizi, FED faizi, ECB politikası, DXY, ABD tahvil faizi,
jeopolitik riskler, resesyon ihtimali, petrol fiyatları,
global likidite, altın ETF hareketleri, hedge fon pozisyonlanması,
endüstriyel talep, volatilite, momentum, trend, destek/direnç,
hacim, yatırımcı psikolojisi, PMI verileri, enflasyon,
CDS, carry trade, sermaye akımları, kur baskısı, emtia endeksi,
ekonomik takvim, istihdam verileri, büyüme verileri,
merkez bankası açıklamaları, para politikası yönü,
arz-talep dengesi, global risk iştahı ve piyasa fiyatlaması.

Görev:
1) Ürünü analiz et
2) Mantıklı tek karar üret: AL / SAT / BEKLE
3) Analiz yazma
4) Sadece şu formatla bitir:

Karar: AL
Karar: SAT
Karar: BEKLE
`;

    const payload = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${productName} için güncel piyasa şartlarına göre karar ver. Alayım mı?` }
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

        const text = await response.text();
        let answer = "";

        try {
            answer = JSON.parse(text)?.choices?.[0]?.message?.content || "";
        } catch {
            answer = text;
        }

        answer = answer.toUpperCase();

        let decision = "BEKLE";
        if (answer.includes("KARAR: AL")) decision = "AL";
        else if (answer.includes("KARAR: SAT")) decision = "SAT";

        console.log(productCode, "→", decision);

        return decision;

    } catch (err) {
        return "BEKLE";
    }
}

// ===========================================
//  AÇILIŞTA TÜM ÜRÜNLER İÇİN KARAR ÜRET
// ===========================================

async function generateAllDecisionsOnStartup() {

    const products = [
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

    for (let p of products) {
        GLOBAL_DECISIONS[p.code] = await createDecision(p.name, p.code);
    }

    console.log("✔ Açılış kararları üretildi:", GLOBAL_DECISIONS);
}

generateAllDecisionsOnStartup();

// ===========================================
//  ANDROID → TÜM KARARLARI ÇEKSİN
// ===========================================
app.get("/tum-kararlar", (req, res) => {
    res.json(GLOBAL_DECISIONS);
});

// ===========================================
//  SOHBET API (KARAR GÜNCELLER)
// ===========================================
app.post("/finans-uzmani", async (req, res) => {

    const userMessage = req.body.mesaj || "";
    const productCode = req.body.code || "";

    const systemPrompt = `
Sen profesyonel bir finans analistisın.
Analiz yap, insan gibi konuş.
Cevabın sonunda mutlaka şu formatlardan biri olsun:

Karar: AL
Karar: SAT
Karar: BEKLE
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

        const text = await response.text();
        let aiMessage = "Cevap alınamadı.";

        try {
            aiMessage = JSON.parse(text)?.choices?.[0]?.message?.content || aiMessage;
        } catch {
            aiMessage = text;
        }

        // Sohbet kararı → GLOBAL’e yaz
        const upper = aiMessage.toUpperCase();
        let decision = null;

        if (upper.includes("KARAR: AL")) decision = "AL";
        else if (upper.includes("KARAR: SAT")) decision = "SAT";
        else if (upper.includes("KARAR: BEKLE")) decision = "BEKLE";

        if (decision && productCode) {
            GLOBAL_DECISIONS[productCode] = decision;
            console.log("✔ Sohbet kararı güncellendi:", productCode, decision);
        }

        res.json(aiMessage);

    } catch (err) {
        res.json("Sunucu hatası: " + err.message);
    }
});

app.listen(3000, () => {
    console.log("🚀 Finans Uzmanı API ÇALIŞIYOR!");
});
