import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 OPENAI API KEYINI BURAYA YAZACAKSIN
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/finans-uzmani", async (req, res) => {
    const userMessage = req.body.mesaj || "";

    const systemPrompt = `
Sen bir finans uzmanısın.
Profesyonel, doğal ve insan gibi konuş.
Kendini yapay zeka olarak TANITMA.
Her cevapta kısa vadeli ve uzun vadeli AL/SAT/BEKLE değerlendirmesi yap.
Piyasa hareketleri, risk iştahı, jeopolitik gelişmeler, faizler,
enflasyon, teknik analiz, momentum, trend, volatilite ve 50 kriteri hesaba kat.
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

        const data = await response.json();
        const aiMessage = data?.choices?.[0]?.message?.content || "Cevap alınamadı.";

        res.json(aiMessage);
    } catch (err) {
        res.json("Sunucu hatası: " + err.message);
    }
});

app.listen(3000, () => console.log("Finans Uzmanı Backend ÇALIŞIYOR!"));
