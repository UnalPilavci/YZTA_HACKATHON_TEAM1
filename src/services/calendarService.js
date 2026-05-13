const ZAPIER_WEBHOOK = import.meta.env.VITE_ZAPIER_CALENDAR_WEBHOOK;

/**
 * Zapier webhook üzerinden Google Calendar'a etkinlik oluşturur.
 */
export async function createCalendarEvent(meetingData) {
  if (!ZAPIER_WEBHOOK) {
    alert("HATA: Zapier Webhook URL bulunamadı! .env dosyasına linki koyduktan sonra Vite (terminal) yeniden başlatılmamış. Lütfen terminalde Ctrl+C yapıp tekrar 'npm run dev' yazın.");
    return false;
  }

  try {
    const payload = {
      title: meetingData.toplanti_basligi || "SmartFlow Toplantı",
      start_time: meetingData.toplanti_tarihi,
      end_time: calculateEndTime(meetingData.toplanti_tarihi, 60),
      description: `📧 SmartFlow AI tarafından otomatik oluşturuldu.\n\n📤 Gönderen: ${meetingData.gonderen || "Bilinmiyor"}\n📝 Özet: ${meetingData.ozet || ""}`,
    };

    console.log("ZAPIER'A GİDEN VERİ:", payload);

    // Zapier CORS sorununu aşmak için fetch seçenekleri
    const res = await fetch(ZAPIER_WEBHOOK, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log("ZAPIER CEVABI:", res.status);
    return true; // Zapier no-cors veya direk yollamalarda hata vermezse true
  } catch (error) {
    console.error("Calendar oluşturma hatası:", error);
    alert("Zapier'e gönderim sırasında bir bağlantı hatası oluştu. Konsolu kontrol edin.");
    return false;
  }
}

function calculateEndTime(startISO, durationMinutes) {
  if (!startISO) return null;
  try {
    const start = new Date(startISO);
    start.setMinutes(start.getMinutes() + durationMinutes);
    return start.toISOString();
  } catch {
    return null;
  }
}
