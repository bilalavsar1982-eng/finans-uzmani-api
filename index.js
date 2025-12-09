import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 OPENAI API KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🔥 YENİ ALGORİTMA → Kesin konuşur, kısa/uzun vade istemedikçe yapmaz
const systemPrompt = `
Sen bir finans uzmanısın.
Kesin konuşacaksın: cevabın AL, SAT veya BEKLE kararıyla BİTECEK.
Kullanıcı özellikle "kısa vade" veya "uzun vade" diye sormazsa
kısa/uzun vade analizi YAPMA.

Sadece sorulan ürüne göre kısa bir analiz yap,
ve piyasayı 50 kritere göre değerlendir:
faiz, enflasyon, jeopolitik risk, volatilite, trend, momentum,
ABD verileri, FED, TCMB, ons, dolar endeksi, risk iştahı,
altın talebi, petrol, savaş, belirsizlik, piyasa korku endeksi (VIX),
sermaye akışları, teknik göstergeler, hacim, RSI, MACD vb.

• Kesin hüküm vereceksin.
• AL / SAT / BEKLE kararlarından biri ile bitireceksin.
• Kendini yapay zeka olarak tanıtmayacaksın.
• Kesin, sade, net ve profesyonel konuşacaksın.
• İlk mesajdan önce: "⚠️ Bu bilgiler yatırım tavsiyesi değildir." diyeceksin.
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
