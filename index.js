import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ====================================================
//   FİNANS UZMANI – ÜRÜN KODLU + 50 KRİTER + NET KARAR
// ====================================================
app.post("/finans-uzmani", async (req, res) => {

    const userMessage = req.body.mesaj || "";
    const productCode = req.body.code || ""; // ANDROID’TEN GELEN ÜRÜN KODU

    const systemPrompt = `
Sen profesyonel bir finans analistisın.
İnsan gibi konuş, kendini ASLA yapay zeka olarak tanıtma.

Ürün Kodu: ${productCode}

=====================
GENEL KURALLAR
=====================
- Analiz 8–14 cümle olsun.
- Teknik + ekonomik analiz yap.
- Gereksiz laf yapma, net ve mantıklı konuş.
- Aynı ürün için "alınır mı / satılır mı" gibi sorular
  KARARI DEĞİŞTİREMEZ.
- Aynı ürün → aynı karar.

=====================
50 KRİTER (HEPSİNİ DEĞERLENDİR)
=====================
TCMB politikası, FED faizleri, ECB duruşu, enflasyon,
CDS, DXY, tahvil faizleri, küresel likidite, resesyon riski,
jeopolitik riskler, savaşlar, petrol fiyatları,
küresel büyüme, ABD istihdam, PMI verileri,
emtia endeksi, altın ETF akımları, hedge fon pozisyonları,
arz-talep dengesi, yatırımcı psikolojisi,
carry trade, sermaye giriş-çıkışları,
mevduat faizleri, swap kanalı,
destek–direnç seviyeleri, trend,
momentum, hacim, volatilite,
teknik indikatörler, beklenti yönetimi,
merkez bankası söylemleri ve piyasa fiyatlaması.

=====================
ÜRÜN BAZLI ALGORİTMA
=====================

--- ALTIN / ONS / GRAM (HASTRY, ONS) ---
- DXY zayıf + ABD tahvil faizi düşüş + ETF girişi → AL
- DXY güçlü + faiz artışı + risk kaçışı → SAT
- Belirsiz / yatay piyasa → BEKLE

--- USDTRY ---
- TCMB sıkı + reel faiz pozitif → SAT veya BEKLE
- ABD güçlü + DXY yukarı → AL
- Veri dengeli → BEKLE

--- EURTRY ---
- ECB sıkı + TCMB zayıf → AL
- ECB güvercin + Türkiye sıkı → SAT
- Karışık görünüm → BEKLE

--- GÜMÜŞ (GUMUSTL) ---
- Endüstriyel talep güçlü → AL
- Emtia baskısı + DXY güçlü → SAT
- Zayıf hacim → BEKLE

=====================
ÇIKTI ZORUNLULUĞU
=====================
- Analiz yap
- EN SON SATIRDA SADECE TEK KARAR YAZ:

Karar: AL
Karar: SAT
Karar: BEKLE

Son satır dışında AL / SAT / BEKLE kelimesini TEKRARLAMA.
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

        // 🔒 Güvenli parse (JSON / text fark etmez)
        const text = await response.text();
        let aiMessage = "Cevap alınamadı.";

        try {
            const data = JSON.parse(text);
            aiMessage = data?.choices?.[0]?.message?.content || aiMessage;
        } catch {
            aiMessage = text;
        }

        res.json(aiMessage);

    } catch (err) {
        res.json("Sunucu hatası: " + err.message);
    }
});

app.listen(3000, () => {
    console.log("✅ Finans Uzmanı Backend ÇALIŞIYOR!");
});
