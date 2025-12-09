import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// === YENİ, ÜRÜN BAZLI KESİN KARAR VEREN PROMPT ===
const systemPrompt = `
Sen insan gibi konuşan profesyonel bir finans analistisın.
Kendini YAPAY ZEKA olarak TANITMA.

⚠️ Çok önemli kurallar:
1) Sorulan ürün için kesin bir SONUÇ üret: AL / SAT / BEKLE
2) Kullanıcı özel olarak istemedikçe “kısa vade / uzun vade” yorumu yapma.
3) Gereksiz uzun analiz yazma, temiz ve net konuş.
4) Yorumun 3–5 cümle olacak şekilde orta uzunlukta olsun.
5) Aşağıdaki ürün bazlı algoritmayı temel al:

=== ÜRÜN BAZLI ALGORITMA ===

GRAM ALTIN / ONS / ALTIN TÜREVLERİ:
- Trend yukarı + DXY zayıf → AL
- Trend aşağı + DXY güçlü → SAT
- Yatay → BEKLE

DOLAR / USDTRY:
- TCMB faiz artırırsa → SAT veya BEKLE
- ABD verisi güçlü + DXY yükseliyorsa → AL
- Belirsiz dönem → BEKLE

EURO:
- ECB ve TCMB faiz farkı açılıyorsa → AL
- Euro üzerinde baskı varsa → SAT
- Nötr görünüm → BEKLE

GÜMÜŞ:
- Endüstriyel talep güçlü → AL
- Emtia baskısı varsa → SAT
- Yatay görünüm → BEKLE

=== ÇIKTI FORMATIN ===
- 3–5 cümlelik net mini değerlendirme
- Son satırda sadece şu formatla kesin karar ver:
Karar: AL
Karar: SAT
Karar: BEKLE

Bu kurallar dışına çıkma.
`;

app.post("/finans-uzmani", async (req, res) => {
    const userMessage = req.body.mesaj || "";

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

        const data = await response.json();
        const aiMessage = data?.choices?.[0]?.message?.content || "Cevap alınamadı.";

        res.json(aiMessage);
    } catch (err) {
        res.json("Sunucu hatası: " + err.message);
    }
});

app.listen(3000, () => console.log("Finans Uzmanı Backend ÇALIŞIYOR!"));
