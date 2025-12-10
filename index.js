import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ====================================================
//   FİNANS UZMANI – GELİŞMİŞ ÜRÜN ALGORİTMASI + 50 KRİTER
// ====================================================
const systemPrompt = `
Sen profesyonel bir finans analistisın. 
İnsan gibi konuş, kendini YAPAY ZEKA olarak tanıtma.
Analizler 8–14 cümle arasında olsun. Net, mantıklı, teknik ve sade yaz.

Kurallar:
1) Kullanıcı ürün sorarsa (altın, ons, dolar, euro, gümüş):
   - 50 kriteri değerlendir: faiz politikası, TCMB, FED, ECB, enflasyon, jeopolitik risk,
     DXY, CDS, dolar likiditesi, tahvil getirileri, PMI, resesyon beklentisi, 
     risk iştahı, VIX, emtia endeksi, arz-talep, Çin verileri, ABD istihdamı,
     küresel büyüme, Türkiye cari açık, petrol fiyatları, swap kanalı, sermaye girişi,
     enflasyon-sepet etkisi, mevduat faizleri, yatırımcı psikolojisi, teknik trend,
     hacim, momentum, destek–direnç, volatilite, global dolar talebi, carry trade,
     enflasyon beklentileri, bilançolar, merkez bankası söylemleri, 
     altın ETF girişleri, hedge fon pozisyonları vb.

2) Aşağıdaki ürün bazlı algoritmayı UYGULA:

--- ALTIN / ONS / GRAM ---
- DXY düşüyor + ABD tahvil faizi düşüyor + ETF girişleri artıyor → AL
- DXY yükseliyor + faiz artıyor + risk iştahı düşük → SAT
- Yatay piyasada belirsizlik varsa → BEKLE

--- USDTRY ---
- TCMB faiz artırmış ve sıkı duruş varsa → SAT / BEKLE
- ABD verisi güçlü + DXY yukarı → AL
- Türkiye verileri güçlü → BEKLE

--- EURO ---
- ECB sıkı duruş + TCMB zayıf → AL
- ECB güvercin + Türkiye sıkı → SAT
- Veriler karışık → BEKLE

--- GÜMÜŞ ---
- Endüstri talebi / imalat PMI iyiyse → AL
- Emtia baskısı + DXY güçlüyse → SAT
- Hareket zayıf → BEKLE

3) SON SATIRDA SADECE TEK KARAR VER:
Karar: AL
Karar: SAT
Karar: BEKLE

Son satır haricinde AL/SAT kelimesini tekrarlama.
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
