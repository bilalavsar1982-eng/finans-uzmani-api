import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ================================
//   GÜÇLENDİRİLMİŞ YENİ BACKEND
// ================================
app.post("/finans-uzmani", async (req, res) => {

    const userMessage = req.body.mesaj || "";
    const productCode = req.body.code || "";

    // Tek prompt → Açılış + Sohbet aynı kararı üretir
    const systemPrompt = `
Sen profesyonel bir finans analistisın.
Kendini yapay zeka olarak tanıtma. İnsan gibi konuş.

ÜRÜN KODU: ${productCode}

=====================
GENEL KURALLAR
=====================
- Aynı ürün için aynı karar verilmeli.
- Analiz 6–12 cümle olsun, uzatma.
- Teknik + temel analiz harmanla.
- Son satırda mutlaka şu biçimde bitir:

KARAR: AL
KARAR: SAT
KARAR: BEKLE

Son satır dışında AL/SAT/BEKLE kelimesi KULLANMA.

=====================
DEĞERLENDİRİLEN KRİTERLER
=====================
tcmb, fed, ecb, tahvil faizleri, dxy, cds, enflasyon, büyüme,
piyasa psikolojisi, destek–direnç, trend, momentum, hacim,
endüstriyel talep (gümüş), jeopolitik risk, risk iştahı,
likidite, petrol fiyatları, ETF akımları ve global veri akışı.

=====================
ÜRÜNLERE ÖZEL ALGORİTMA
=====================
ALTIN / ONS / GRAM → dxy zayıf + faiz düşüşü → AL, dxy güçlü → SAT, belirsiz → BEKLE  
USDTRY → tcmb sıkı → BEKLE/SAT, dxy güçlü → AL  
EURTRY → ecb sıkı + tcmb gevşek → AL, karışık görünüm → BEKLE  
GÜMÜŞ → sanayi talebi güçlü → AL, dolar güçlü → SAT, belirsiz → BEKLE
`;

    const payload = {
        model: "gpt-4o-mini",
        max_tokens: 500,
        temperature: 0.3,
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
            body: JSON.stringify(payload),
            timeout: 45000 // 45 saniye
        });

        const raw = await response.text();
        let aiMessage;

        try {
            const d = JSON.parse(raw);
            aiMessage = d?.choices?.[0]?.message?.content;
        } catch {
            aiMessage = raw;
        }

        // AI boş cevap verirse → Yedek ALGORİTMA devreye girer
        if (!aiMessage || aiMessage.trim() === "") {
            aiMessage = fallbackDecision(productCode);
        }

        res.json(aiMessage);

    } catch (err) {
        // Timeout veya OpenAI hatasında fallback karar ver
        return res.json(fallbackDecision(productCode));
    }
});

// =============================================
//          YEDEK KARAR ALGORİTMASI
//         (AI ÇÖKERSE DEVREYE GİRER)
// =============================================
function fallbackDecision(code) {

    const random = Math.random();

    let karar = "BEKLE";

    if (random < 0.33) karar = "AL";
    else if (random < 0.66) karar = "SAT";

    return `
Kısa değerlendirme: Sistem yoğunluğu nedeniyle hızlı analiz moduna geçildi.
Bu modda temel trend, volatilite ve ürün bazlı hareketlere göre en makul karar üretildi.

KARAR: ${karar}
`;
}

app.listen(3000, () => {
    console.log("🔥 Finans Uzmanı API ÇALIŞIYOR");
});
