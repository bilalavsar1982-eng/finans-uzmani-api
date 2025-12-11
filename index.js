import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ===========================================
//  TÜM ÜRÜNLERİN KARARLARINI TUTAN HAFIZA
// ===========================================
let GLOBAL_DECISIONS = {};  

// ===========================================
//  Açılışta 1 defa tüm ürünler için analiz yap
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
        try {
            const systemPrompt = `
Sen deneyimli bir finans analistisin.
Sadece son satırda tek kelime ile karar ver: AL / SAT / BEKLE.
Detay yazma, yalnızca karar ver.

Ürün: ${p.name}

Karar Formatı:
Karar: AL
Karar: SAT
Karar: BEKLE
`;

            const payload = {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Bu ürün için güncel piyasa koşullarına göre karar ver." }
                ]
            };

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
            if (answer.includes("KARAR: SAT")) decision = "SAT";

            GLOBAL_DECISIONS[p.code] = decision;

        } catch (err) {
            GLOBAL_DECISIONS[p.code] = "BEKLE";
        }
    }

    console.log("✔ Açılış kararları oluşturuldu:", GLOBAL_DECISIONS);
}

// Açılışta 1 kere çalıştır
generateAllDecisionsOnStartup();

// ====================================================
//  ANDROID → TÜM KARARLARI ÇEKSİN
// ====================================================
app.get("/tum-kararlar", (req, res) => {
    res.json(GLOBAL_DECISIONS);
});

// ====================================================
//  SOHBET API (AYNEN KALDI)
// ====================================================
app.post("/finans-uzmani", async (req, res) => {

    const userMessage = req.body.mesaj || "";
    const productCode = req.body.code || "";

    const systemPrompt = `
Sen profesyonel bir finans analistisın.
İnsan gibi konuş, kendini asla yapay zekâ olarak tanıtma.

Ürün Kodu: ${productCode}

Cevabın sonunda mutlaka:
Karar: AL / SAT / BEKLE
yaz.
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

        res.json(aiMessage);

    } catch (err) {
        res.json("Sunucu hatası: " + err.message);
    }
});

app.listen(3000, () => {
    console.log("🚀 Finans Uzmanı API ÇALIŞIYOR!");
});
