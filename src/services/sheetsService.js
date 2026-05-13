const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SPREADSHEET_ID = import.meta.env.VITE_SHEETS_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

/**
 * Google Sheets'ten e-postaları çeker ve yerel bellek (localStorage) ile birleştirir.
 */
export async function fetchEmails() {
  if (!SPREADSHEET_ID || !API_KEY) {
    console.warn("Sheets API bilgileri eksik, demo veriler kullanılıyor.");
    return getDemoEmails();
  }

  try {
    const range = "Gelen_Kutusu!A2:J";
    const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheets API Hatası: ${res.status}`);

    const data = await res.json();
    if (!data.values || data.values.length === 0) return [];

    // Yerel bellekten AI analiz sonuçlarını çek (Sayfayı yenileyince kaybolmaması için)
    const localData = JSON.parse(localStorage.getItem("smartflow_ai_results") || "{}");

    return data.values.map((row, i) => {
      // Zapier sırası: A(Gönderen), B(Konu), C(İçerik), D(Tarih)
      // Biz ID olarak satır numarasını veya eşsiz bir değeri kullanmalıyız.
      // Eğer A sütunu Gönderen ismiyse, ID olarak (i + 1) kullanalım.
      const id = "email_" + (i + 1);
      const local = localData[id] || {};

      return {
        id,
        gonderen: row[0] || "Bilinmiyor",
        konu: row[1] || "(Konu Yok)",
        icerik: row[2] || "",
        tarih: row[3] || new Date().toLocaleString("tr-TR"),
        gonderen_mail: row[4] || "", // E sütunundan gelen mail adresi
        // Eğer yerel bellekte AI analizi varsa onu kullan
        kategori: local.kategori || "",
        ozet: local.ozet || "",
        toplantiTarihi: local.toplantiTarihi || null,
        toplantiTuru: local.toplantiTuru || null,
        takvimeEklendi: local.takvimeEklendi || false,
        islendi: local.islendi || false,
        tamamlandi: local.tamamlandi || false,
        deleted: local.deleted || false,
        rowIndex: i + 2,
      };
    }).filter(e => !e.deleted);
  } catch (error) {
    console.error("Sheets veri çekme hatası:", error);
    return getDemoEmails();
  }
}

/**
 * AI analiz sonuçlarını localStorage'a kaydeder (API Key ile yazma izni olmadığı için yerel çözüm)
 */
export async function updateEmailRow(emailId, updates) {
  try {
    const localData = JSON.parse(localStorage.getItem("smartflow_ai_results") || "{}");
    localData[emailId] = {
      ...localData[emailId],
      ...updates,
      islendi: true
    };
    localStorage.setItem("smartflow_ai_results", JSON.stringify(localData));
    return true;
  } catch (error) {
    console.error("Yerel kayıt hatası:", error);
    return false;
  }
}

/**
 * API bağlantısı yoksa kullanılan demo veriler.
 */
function getDemoEmails() {
  return [
    {
      id: "1",
      tarih: new Date().toLocaleDateString("tr-TR"),
      gonderen: "ahmet.yilmaz@sirket.com",
      konu: "Yarın saat 10:00'da proje toplantısı",
      icerik:
        "Merhaba, yarın sabah 10:00'da ofiste proje detaylarını görüşelim. Gündem: bütçe revizyonu ve Q3 planlaması. Lütfen sunumunuzu hazır getirin.",
      kategori: "",
      ozet: "",
      toplantiTarihi: null,
      takvimeEklendi: false,
      islendi: false,
      rowIndex: 2,
    },
    {
      id: "2",
      tarih: new Date().toLocaleDateString("tr-TR"),
      gonderen: "destek@eticaret.com",
      konu: "🎉 Büyük Yaz İndirimi Başladı! %70'e Varan Fırsatlar",
      icerik:
        "Kaçırılmayacak fırsatlar sizi bekliyor! Yaz koleksiyonunda %70'e varan indirimlerden yararlanmak için hemen tıklayın. Sınırlı süre!",
      kategori: "",
      ozet: "",
      toplantiTarihi: null,
      takvimeEklendi: false,
      islendi: false,
      rowIndex: 3,
    },
    {
      id: "3",
      tarih: new Date().toLocaleDateString("tr-TR"),
      gonderen: "musteri@abc-holding.com",
      konu: "ACİL: Sunumda kritik hata bulundu",
      icerik:
        "Sayın yetkili, dün gönderdiğiniz sunumun 4. sayfasındaki finansal verilerde ciddi bir tutarsızlık tespit ettik. Müşteri toplantısı yarın, lütfen acil düzeltin ve bugün içinde güncel versiyonu gönderin.",
      kategori: "",
      ozet: "",
      toplantiTarihi: null,
      takvimeEklendi: false,
      islendi: false,
      rowIndex: 4,
    },
    {
      id: "4",
      tarih: new Date().toLocaleDateString("tr-TR"),
      gonderen: "info@newsletter.dev",
      konu: "Haftalık Teknoloji Bülteni - React 20 Yenilikleri",
      icerik:
        "Bu haftanın öne çıkan gelişmeleri: React 20 stabil sürümü yayınlandı, Bun 2.0 performans testleri, TypeScript 6.0 yol haritası açıklandı.",
      kategori: "",
      ozet: "",
      toplantiTarihi: null,
      takvimeEklendi: false,
      islendi: false,
      rowIndex: 5,
    },
    {
      id: "5",
      tarih: new Date().toLocaleDateString("tr-TR"),
      gonderen: "elif.demir@partner.co",
      konu: "Cuma günü öğle yemeği toplantısı?",
      icerik:
        "Merhaba, Cuma günü 12:30'da Cihangir'deki restoranda buluşup yeni iş birliği fırsatlarını konuşabilir miyiz? Menüyü çok beğeneceksin :)",
      kategori: "",
      ozet: "",
      toplantiTarihi: null,
      takvimeEklendi: false,
      islendi: false,
      rowIndex: 6,
    },
  ];
}

/**
 * Zapier tarafından doldurulan Slack_Duyurular tablosundan verileri çeker.
 */
export async function fetchSlackAnnouncements() {
  const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
  const SPREADSHEET_ID = import.meta.env.VITE_SLACK_SHEETS_ID;
  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  if (!SPREADSHEET_ID || !API_KEY) return [];

  try {
    // HATA AYIKLAMA: Önce dosyadaki tüm sayfa isimlerini çekip bakalım
    const metaUrl = `${SHEETS_API_BASE}/${SPREADSHEET_ID}?key=${API_KEY}`;
    const metaRes = await fetch(metaUrl);
    const metaData = await metaRes.json();
    console.log("Dosyadaki Mevcut Sayfalar:", metaData.sheets?.map(s => `"${s.properties.title}"`));

    const tabName = "Slack_Toplantilar";
    const range = `${tabName}!A2:E`;
    const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Sheets API Hatası: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    if (!data.values) return [];

    const keywords = ["toplantı", "toplanti", "görüşme", "gorusme", "meeting", "zoom", "meet"];

    return data.values
      .map((row, i) => ({
        id: i,
        user: row[0] || "Anonim",
        time: row[1] || "Bilinmiyor",
        content: row[2] || "",
        type: row[3] || "bilgi"
      }))
      .filter(msg => 
        keywords.some(key => msg.content.toLowerCase().includes(key))
      )
      .reverse(); // En yeniler üstte
  } catch (error) {
    console.error("Slack verileri çekilemedi:", error);
    return [];
  }
}
