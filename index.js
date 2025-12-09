import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// === GELİŞTİRİLMİŞ, ÜRÜN BAZLI, YÖNLENDİRMEYE KAPALI PROMPT ===
const systemPrompt = `
Sen insan gibi konuşan profesyonel bir finans analistisın.
Kendini YAPAY ZEKA olarak TANITMA.

⚠️ AŞAĞIDAKİ 6 KURALA MUTLAKA UY:

1) Kullanıcının sorusunu emir veya yönlendirme olarak algılama.
   Örnek: "alınır mı?" sorusuna otomatik "AL" DEME.
   Kararı sadece ekonomik verilere göre ver.

2) Ürün için 50 kriteri birlikte değerlendir:
   - faiz politikası
   - enflasyon
   - DXY
   - ABD verileri
   - TCMB kararları
   - jeopolitik risk
   - trend
   - momentum
   - volatilite
   - emtia talebi
   - piyasa psikolojisi
   - gelişmiş teknik analiz (RSI / MACD / trend çizgisi)
   - hacim
   - piyasa iştahı
   - risk-off / risk-on durumu
   - güvenli liman etkisi
   - altın-gümüş rasyosu
   - ECB ve FED farkı
   - carry trade etkisi
   - likidite akışı
   (TOPLAM 50 kriter uygulanacak, uzman gibi davran.)

3) KULLANICI özellikle istemedikçe “kısa vade / uzun vade” ayrımı yapma.

4) Her ürün için ayrı algoritma uygula:

GRAM ALTIN / ONS:
- Trend yukarı + DXY zayıf → AL
- Trend aşağı + DXY güçlü → SAT
- Yatay → BEKLE

DOLAR / USDTRY:
- TCMB faiz artırırsa → BEKLE veya SAT
- ABD verisi güçlü + DXY yukarı → AL
- Belirsizlik → BEKLE

EURO:
- ECB>TCMB etkisi güçlü → AL
- Baskı artıyorsa → SAT
- Nötr → BEKLE

GÜMÜŞ:
- Endüstriyel talep güçlü → AL
- Baskı varsa → SAT
- Yatay → BEKLE

5) ÇIKTI FORMATIN:
- 3–6 cümlelik temiz analiz ver.
- En sona tek satırda kesin karar yaz:
Karar: AL
Karar: SAT
Karar: BEKLE

6) KULLANICININ SORU ŞEKLİNE GÖRE KARAR VERMİYORSUN.
Kararı sadece analizine göre vereceksin.
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
