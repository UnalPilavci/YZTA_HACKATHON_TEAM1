import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

/**
 * E-postayı Groq AI ile sınıflandırır.
 * Kategori, özet, toplantı bilgisi çıkarır.
 */
export async function classifyEmail(email) {
  const today = new Date().toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const prompt = `Sen akıllı bir e-posta asistanısın. Bugünün tarihi: ${today}.

Aşağıdaki e-postayı analiz et ve SADECE JSON formatında yanıt ver (başka hiçbir şey yazma):

Gönderen: ${email.gonderen}
Konu: ${email.konu}
İçerik: ${email.icerik}

Yanıt formatı:
{
  "kategori": "Toplantı Talebi" veya "Görev/Aksiyon" veya "Acil/Önemli" veya "Reklam/Spam" veya "Genel Bilgi",
  "ozet": "Türkçe 1-2 cümlelik kısa özet",
  "toplanti_var_mi": true veya false,
  "toplanti_tarihi": "YYYY-MM-DDTHH:MM:SS" veya null,
  "toplanti_basligi": "toplantı başlığı" veya null,
  "toplanti_turu": "İş Toplantısı" veya "Şirket Toplantısı" veya "Müşteri Toplantısı" veya "Bireysel" veya null,
  "oncelik": 1 ile 5 arası sayı (5 en acil)
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Groq sınıflandırma hatası:", error);
    return {
      kategori: "Genel Bilgi",
      ozet: "AI analiz edilemedi.",
      toplanti_var_mi: false,
      toplanti_tarihi: null,
      toplanti_basligi: null,
      oncelik: 1,
    };
  }
}

/**
 * Chatbot: Kullanıcı sorusunu e-posta bağlamıyla yanıtlar.
 */
export async function chatWithAssistant(userMessage, emailContext) {
  const systemPrompt = `Sen SmartFlow AI asistanısın. Kullanıcının e-posta verilerini analiz edip sorularını yanıtlıyorsun.
Kısa, net ve aksiyona yönelik yanıtlar ver. HER ZAMAN Türkçe yanıt ver.
Emojiler kullan. Toplantıları ve acil mailleri özellikle vurgula.

Bugünkü e-posta verileri:
${JSON.stringify(emailContext, null, 2)}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 1000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Chatbot hatası:", error);
    return "Üzgünüm, şu an yanıt veremedim. Lütfen tekrar deneyin.";
  }
}

/**
 * Günlük brifing oluşturur.
 */
export async function generateDailyBriefing(emails) {
  if (!emails || emails.length === 0) {
    return "📭 Bugün henüz yeni e-posta gelmedi.";
  }

  const prompt = `Bugün gelen ${emails.length} e-postayı analiz et ve Türkçe bir günlük brifing oluştur.

Format:
📊 Günlük Özet:
- Toplam mail sayısı
- Kategori dağılımı (Toplantı, Acil, Reklam, Genel)
- Acil aksiyonlar varsa listele
- Planlanan toplantılar varsa saat bilgisiyle listele

E-postalar: ${JSON.stringify(emails.map((e) => ({ konu: e.konu, gonderen: e.gonderen, kategori: e.kategori, ozet: e.ozet })))}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 800,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Brifing hatası:", error);
    return "Brifing oluşturulamadı.";
  }
}

/**
 * Slack mesajlarını analiz eder ve kısa bir özet/yorum çıkarır.
 */
export async function analyzeSlackMessage(content) {
  try {
    const prompt = `Sen bir iş asistanısın. Slack mesajlarını analiz edip, kullanıcıya mesajın önemini ve yapması gerekeni tek bir kısa cümlede (maksimum 15 kelime) söylemelisin. Profesyonel ama samimi bir dil kullan. HER ZAMAN Türkçe yanıt ver.
    
    Mesaj: "${content}"`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 100,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Slack AI Hatası:", error);
    return "Mesaj analiz edilirken bir hata oluştu.";
  }
}
