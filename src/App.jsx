import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Calendar,
  BarChart3,
  MessageSquare,
  Inbox,
  AlertTriangle,
  Megaphone,
  Info,
  RefreshCw,
  Send,
  Sparkles,
  Zap,
  CheckCircle2,
  Loader2,
  History,
  Clock,
  Moon,
  Sun,
  ArrowRight,
  FileText,
  Download,
  Trash2,
  StickyNote,
  Minus,
  Slack,
  X,
  LogOut
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { fetchEmails, updateEmailRow, fetchSlackAnnouncements } from "./services/sheetsService";
import { classifyEmail, chatWithAssistant, analyzeSlackMessage } from "./services/groqService";
import { createCalendarEvent } from "./services/calendarService";
import { auth } from "./services/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Auth from "./components/Auth";
import "./App.css";

/* ───────── helpers ───────── */
function getBadgeClass(kategori, turu) {
  if (turu) {
    const t = turu.toLowerCase();
    if (t.includes("iş") || t.includes("is")) return "badge-meeting-work";
    if (t.includes("şirket") || t.includes("sirket")) return "badge-meeting-company";
    if (t.includes("müşteri") || t.includes("musteri")) return "badge-meeting-client";
    if (t.includes("bireysel") || t.includes("özel")) return "badge-meeting-personal";
  }
  if (!kategori) return "badge-general";
  const k = kategori.toLowerCase();
  if (k.includes("toplantı") || k.includes("toplanti")) return "badge-meeting";
  if (k.includes("görev") || k.includes("aksiyon") || k.includes("gorev")) return "badge-urgent";
  if (k.includes("acil") || k.includes("önemli") || k.includes("onemli"))
    return "badge-urgent";
  if (k.includes("reklam") || k.includes("spam")) return "badge-spam";
  return "badge-general";
}

function getMeetingCardClass(turu) {
  if (!turu) return "";
  const t = turu.toLowerCase();
  if (t.includes("iş") || t.includes("is")) return "card-meeting-work";
  if (t.includes("şirket") || t.includes("sirket")) return "card-meeting-company";
  if (t.includes("müşteri") || t.includes("musteri")) return "card-meeting-client";
  if (t.includes("bireysel") || t.includes("özel")) return "card-meeting-personal";
  return "";
}

function getCategoryIcon(kategori) {
  if (!kategori) return <Info size={14} />;
  const k = kategori.toLowerCase();
  if (k.includes("toplantı") || k.includes("toplanti"))
    return <Calendar size={14} />;
  if (k.includes("görev") || k.includes("aksiyon") || k.includes("gorev"))
    return <CheckCircle2 size={14} />;
  if (k.includes("acil") || k.includes("önemli"))
    return <AlertTriangle size={14} />;
  if (k.includes("reklam") || k.includes("spam"))
    return <Megaphone size={14} />;
  return <Info size={14} />;
}

function renderCalendar(emails, onDelete) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const meetingDataByDate = emails
    .filter((e) => e.toplantiTarihi &&
      (e.kategori?.toLowerCase().includes("toplantı") || e.kategori?.toLowerCase().includes("toplanti")) &&
      e.takvimeEklendi // Sadece onaylanmış toplantılar takvimde gözüksün
    )
    .reduce((acc, e) => {
      const d = new Date(e.toplantiTarihi);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
      }
      return acc;
    }, {});

  const days = [];
  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }

  const getMeetingTypeClass = (turu) => {
    if (!turu) return "dot-default";
    const t = turu.toLowerCase();
    if (t.includes("iş") || t.includes("is")) return "dot-work";
    if (t.includes("şirket") || t.includes("sirket")) return "dot-company";
    if (t.includes("müşteri") || t.includes("musteri")) return "dot-client";
    if (t.includes("bireysel") || t.includes("özel")) return "dot-personal";
    if (t.includes("slack")) return "dot-slack";
    return "dot-default";
  };

  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentYear}-${currentMonth}-${i}`;
    const dayMeetings = meetingDataByDate[dateStr] || [];
    const hasMeeting = dayMeetings.length > 0;
    const isToday = i === today.getDate();

    days.push(
      <div key={`day-${i}`} className={`calendar-day ${hasMeeting ? "has-meeting" : ""} ${isToday ? "today" : ""}`}>
        <span className="day-number">{i}</span>
        {hasMeeting && (
          <>
            <div className="meeting-dots-container">
              {dayMeetings.map((m, idx) => (
                <div
                  key={idx}
                  className={`meeting-dot ${getMeetingTypeClass(m.toplantiTuru)}`}
                />
              ))}
            </div>
            <div className="calendar-tooltip">
              <div className="tooltip-header">
                <Calendar size={12} /> {i} {monthNames[currentMonth]}
              </div>
              <div className="tooltip-body">
                {dayMeetings.map((m, idx) => (
                  <div key={idx} className="tooltip-item">
                    <div className={`tooltip-dot-indicator ${getMeetingTypeClass(m.toplantiTuru)}`} />
                    <div className="tooltip-info">
                      <div className="tooltip-time">
                        {new Date(m.toplantiTarihi).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="tooltip-subject">{m.konu}</div>
                    </div>
                    {onDelete && (
                      <button
                        className="btn-tooltip-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(m.id);
                        }}
                        title="Toplantıyı Sil"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel fade-in" style={{ marginTop: 24 }}>
      <div className="panel-header">
        <h3>
          <Calendar size={18} /> {monthNames[currentMonth]} {currentYear} Takvimi
        </h3>
      </div>
      <div className="panel-body">
        <div className="calendar-grid">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(d => (
            <div key={d} className="calendar-header-day">{d}</div>
          ))}
          {days}
        </div>
      </div>
    </div>
  );
}

function getNavForCategory(kategori) {
  if (!kategori) return "inbox";
  const k = kategori.toLowerCase();
  if (k.includes("toplantı") || k.includes("toplanti")) return "meetings";
  if (k.includes("görev") || k.includes("aksiyon") || k.includes("gorev")) return "tasks";
  if (k.includes("acil") || k.includes("önemli")) return "urgent";
  if (k.includes("reklam") || k.includes("spam")) return "ads";
  return "general";
}

/* ───────── APP ───────── */
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      console.log("Çıkış işlemi başlatılıyor...");
      await signOut(auth);
      setUser(null); // Manuel state güncellemesi (garanti olsun)
      console.log("Çıkış başarılı");
    } catch (error) {
      console.error("Çıkış hatası:", error);
      alert("Çıkış hatası: " + error.message);
    }
  };

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  /* ───── Arama Sistemi (Spotlight) ───── */
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQ = searchQuery.toLowerCase();
    return emails.filter(e =>
      e.konu?.toLowerCase().includes(lowerQ) ||
      e.gonderen?.toLowerCase().includes(lowerQ) ||
      e.ozet?.toLowerCase().includes(lowerQ)
    ).slice(0, 5);
  }, [searchQuery, emails]);

  /* chatbot */
  const [chatMessages, setChatMessages] = useState([
    {
      role: "ai",
      text: "Merhaba! 👋 Ben SmartFlow AI asistanınım. E-postalarınız hakkında bana soru sorabilirsiniz.\n\nÖrneğin: \"Bugün kaç acil mail var?\" veya \"Toplantılarımı özetle\"",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [meetingModal, setMeetingModal] = useState({
    isOpen: false,
    email: null,
    selectedDate: "",
  });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, email: null });
  const [reportState, setReportState] = useState({ isOpen: false, step: 0 });

  /* ───── Yapışkan Notlar ───── */
  const [stickyNotes, setStickyNotes] = useState(() => {
    const saved = localStorage.getItem("smartflow_sticky_notes");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("smartflow_sticky_notes", JSON.stringify(stickyNotes));
  }, [stickyNotes]);

  const addStickyNote = () => {
    const colors = ["#fef9c3", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setStickyNotes([...stickyNotes, { id: Date.now(), text: "", x: 50, y: 50, color: randomColor, minimized: false }]);
  };

  const updateStickyNote = (id, text) => {
    setStickyNotes(stickyNotes.map(n => n.id === id ? { ...n, text } : n));
  };

  const toggleMinimizeStickyNote = (id) => {
    setStickyNotes(stickyNotes.map(n => n.id === id ? { ...n, minimized: !n.minimized } : n));
  };

  const deleteStickyNote = (id) => {
    setStickyNotes(stickyNotes.filter(n => n.id !== id));
  };

  /* ───── Slack Duyuruları ───── */
  const [slackMessages, setSlackMessages] = useState([]);
  const [deletedSlackIds, setDeletedSlackIds] = useState(() => {
    const saved = localStorage.getItem("smartflow_deleted_slack");
    return saved ? JSON.parse(saved) : [];
  });

  const loadSlackMessages = async () => {
    const msgs = await fetchSlackAnnouncements();
    if (msgs.length > 0) {
      setSlackMessages(msgs);
    }
  };

  const deleteSlackMessage = (id) => {
    const newDeleted = [...deletedSlackIds, id];
    setDeletedSlackIds(newDeleted);
    localStorage.setItem("smartflow_deleted_slack", JSON.stringify(newDeleted));
  };

  /* ───── Slack AI & Modal ───── */
  const [selectedSlackMsg, setSelectedSlackMsg] = useState(null);
  const [slackInsights, setSlackInsights] = useState({});
  const [analyzingSlack, setAnalyzingSlack] = useState(false);

  const handleSlackMsgClick = async (msg) => {
    setSelectedSlackMsg(msg);
    if (!slackInsights[msg.id]) {
      setAnalyzingSlack(true);
      const insight = await analyzeSlackMessage(msg.content);
      setSlackInsights(prev => ({ ...prev, [msg.id]: insight }));
      setAnalyzingSlack(false);
    }
  };

  useEffect(() => {
    if (activeNav === "slack") {
      loadSlackMessages();
    }
  }, [activeNav]);

  /* ───── veri yükle ───── */
  useEffect(() => {
    loadEmails();
  }, []);

  async function loadEmails() {
    setLoading(true);
    try {
      const data = await fetchEmails();
      setEmails(data);
    } catch (err) {
      console.error("Veri yükleme hatası:", err);
    }
    setLoading(false);
  }

  /* ───── AI ile sınıflandır ───── */
  async function processAllEmails() {
    setProcessing(true);
    setProcessedCount(0);
    const unprocessed = emails.filter((e) => !e.islendi && !e.kategori);

    if (unprocessed.length === 0) {
      setProcessing(false);
      return;
    }

    const updated = [...emails];

    for (let i = 0; i < unprocessed.length; i++) {
      const email = unprocessed[i];
      try {
        const result = await classifyEmail(email);

        /* update local state */
        const idx = updated.findIndex((e) => e.id === email.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            kategori: result.kategori,
            ozet: result.ozet,
            toplantiTarihi: result.toplanti_tarihi,
            toplantiTuru: result.toplanti_turu,
            islendi: true,
          };

          /* Toplantı takvime ekleme işlemi artık manuel onaya bağlandı (markAsCompleted) */

          /* sonucu yerel belleğe kaydet (sayfayı yenileyince kaybolmasın) */
          await updateEmailRow(email.id, {
            kategori: result.kategori,
            ozet: result.ozet,
            toplantiTarihi: result.toplanti_tarihi,
            toplantiTuru: result.toplanti_turu,
            takvimeEklendi: updated[idx].takvimeEklendi,
          });
        }
      } catch (err) {
        console.error(`E-posta ${email.id} işlenemedi:`, err);
      }
      setProcessedCount(i + 1);
      setEmails([...updated]);
    }

    setProcessing(false);
  }

  /* ───── aksiyon butonları ───── */
  function openMeetingModal(email) {
    let defaultDate = "";
    if (email.toplantiTarihi && !isNaN(new Date(email.toplantiTarihi).getTime())) {
      const d = new Date(email.toplantiTarihi);
      const tzoffset = d.getTimezoneOffset() * 60000;
      defaultDate = new Date(d - tzoffset).toISOString().slice(0, 16);
    }
    setMeetingModal({
      isOpen: true,
      email: email,
      selectedDate: defaultDate,
    });
  }

  async function handleConfirmMeeting() {
    const { email, selectedDate } = meetingModal;
    if (!email) return;

    // Yyyy-mm-ddThh:mm formatından tam ISO string oluştur
    const finalDate = selectedDate ? new Date(selectedDate).toISOString() : null;

    // Modal kapat
    setMeetingModal({ isOpen: false, email: null, selectedDate: "" });

    await markAsCompleted(email, finalDate);
  }

  async function markAsCompleted(email, customDate = null) {
    const updated = [...emails];
    const idx = updated.findIndex((e) => e.id === email.id);
    if (idx !== -1) {
      let takvimDurumu = updated[idx].takvimeEklendi;
      const finalDate = customDate || email.toplantiTarihi;

      /* Eğer kategori toplantıysa ve takvime eklenmemişse şimdi ekle */
      const k = email.kategori?.toLowerCase() || "";
      if ((k.includes("toplantı") || k.includes("toplanti")) && !takvimDurumu && finalDate) {
        takvimDurumu = await createCalendarEvent({
          toplanti_basligi: email.konu,
          toplanti_tarihi: finalDate,
          gonderen: email.gonderen,
          ozet: email.ozet
        });
        updated[idx].takvimeEklendi = takvimDurumu;
        updated[idx].toplantiTarihi = finalDate;
      }

      updated[idx].tamamlandi = true;
      setEmails([...updated]);
      await updateEmailRow(email.id, {
        tamamlandi: true,
        takvimeEklendi: takvimDurumu,
        toplantiTarihi: finalDate,
        toplantiTuru: email.toplantiTuru
      });
    }
  }

  async function handleDeleteEmail(id) {
    if (window.confirm("Bu toplantıyı silmek istediğinize emin misiniz?")) {
      const localResults = JSON.parse(localStorage.getItem("smartflow_ai_results") || "{}");
      if (!localResults[id]) localResults[id] = {};
      localResults[id].deleted = true;
      localStorage.setItem("smartflow_ai_results", JSON.stringify(localResults));

      setEmails((prev) => prev.filter((e) => e.id !== id));
    }
  }

  function handleAutomatedReply(email, type) {
    console.log("Yanıtlanacak Email Objesi:", email);
    const recipient = email.gonderen_mail || "";
    console.log("Tespit Edilen Alıcı Maili:", recipient);

    if (!recipient || !recipient.includes("@")) {
      alert(`⚠️ Hata: Mail adresi bulunamadı.\n\nTespit edilen değer: "${recipient}"\n\nLütfen Sheets dosyanızın Gelen_Kutusu sayfasında 5. sütunda (E sütunu) geçerli bir mail adresi olduğundan emin olun ve sayfayı yenileyin.`);
      return;
    }

    const subject = encodeURIComponent(`Ynt: ${email.konu}`);

    let bodyText = "";
    if (type.includes("Olumlu")) {
      bodyText = `Merhaba,\n\nİlettiğiniz konu hakkındaki talebinizi olumlu karşılıyorum. Detayları netleştirmek için en kısa sürede iletişime geçeceğim.\n\nİyi çalışmalar dilerim.`;
    } else if (type.includes("Tarih")) {
      bodyText = `Merhaba,\n\nİlettiğiniz toplantı talebi için maalesef o saatte uygun değilim. Alternatif bir tarih/saat belirlemek için uygun olduğunuz zamanları iletebilir misiniz?\n\nTeşekkürler.`;
    } else {
      bodyText = `Merhaba,\n\nKonu hakkında daha detaylı bilgi rica edebilir miyim? Bazı noktaları netleştirmemiz gerekiyor.\n\nİyi günler.`;
    }

    const body = encodeURIComponent(bodyText + `\n\n---\n(Bu yanıt SmartFlow AI tarafından asiste edilmiştir.)`);

    // Gmail Web Compose URL (Tarayıcıda Gmail'i açar)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;

    console.log("Gmail Web açılıyor:", gmailUrl);
    window.open(gmailUrl, "_blank");
  }

  /* ───── chatbot ───── */
  async function handleChatSend() {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    const lowerMsg = userMsg.toLowerCase();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    // AI Intent Recognition for Hackathon Demo
    if (lowerMsg.includes("toplantı") || lowerMsg.includes("toplanti")) {
      setTimeout(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        const newMeeting = {
          id: Date.now().toString(),
          gonderen: "AI Asistan (Manuel)",
          konu: userMsg,
          icerik: userMsg,
          kategori: "Toplantı",
          ozet: "Chatbot üzerinden kullanıcı komutuyla oluşturuldu.",
          toplantiTarihi: tomorrow.toISOString(),
          toplantiTuru: "İş Toplantısı",
          tarih: new Date().toLocaleDateString('tr-TR'),
          islendi: true,
          tamamlandi: false,
          takvimeEklendi: false
        };
        setEmails(prev => [newMeeting, ...prev]);
        setChatMessages((prev) => [
          ...prev,
          { role: "ai", text: "📅 Harika, isteğinizi algıladım. Otomatik olarak bir toplantı oluşturdum ve 'Toplantılar' sekmesine ekledim." }
        ]);
        setChatLoading(false);
      }, 1500);
      return;
    }

    if (lowerMsg.includes("görev") || lowerMsg.includes("gorev") || lowerMsg.includes("hatırlatma") || lowerMsg.includes("hatirlatma")) {
      setTimeout(() => {
        const newTask = {
          id: Date.now().toString(),
          gonderen: "AI Asistan (Manuel)",
          konu: userMsg,
          icerik: userMsg,
          kategori: "Görev",
          ozet: "Chatbot üzerinden kullanıcı komutuyla oluşturuldu.",
          tarih: new Date().toLocaleDateString('tr-TR'),
          islendi: true,
          tamamlandi: false,
        };
        setEmails(prev => [newTask, ...prev]);
        setChatMessages((prev) => [
          ...prev,
          { role: "ai", text: "✅ İsteğiniz üzerine 'Görev Tablosuna' yeni bir görev ve hatırlatma ekledim. Sol menüden 'Görevler' sekmesine giderek durumu takip edebilirsiniz." }
        ]);
        setChatLoading(false);
      }, 1500);
      return;
    }

    // Normal Chatbot Flow
    try {
      const context = emails.map((e) => ({
        gonderen: e.gonderen,
        konu: e.konu,
        kategori: e.kategori || "Henüz sınıflandırılmadı",
        ozet: e.ozet || e.icerik?.substring(0, 100),
        tarih: e.tarih,
        toplantiTarihi: e.toplantiTarihi,
      }));

      const response = await chatWithAssistant(userMsg, context);
      setChatMessages((prev) => [...prev, { role: "ai", text: response }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", text: "Üzgünüm, bir hata oluştu. Tekrar deneyin." },
      ]);
    }
    setChatLoading(false);
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ───── Sonraki Toplantı ───── */
  const nextMeetingEmail = useMemo(() => {
    const futureMeetings = emails
      .filter((e) => e.toplantiTarihi && (e.kategori?.toLowerCase().includes("toplantı") || e.kategori?.toLowerCase().includes("toplanti")))
      .filter((e) => {
        const d = new Date(e.toplantiTarihi);
        return !isNaN(d.getTime()) && d > new Date();
      })
      .sort((a, b) => new Date(a.toplantiTarihi) - new Date(b.toplantiTarihi));
    return futureMeetings[0] || null;
  }, [emails]);

  const [timeLeftStr, setTimeLeftStr] = useState("");

  useEffect(() => {
    if (!nextMeetingEmail) return;
    const updateTimeLeft = () => {
      const diff = new Date(nextMeetingEmail.toplantiTarihi) - new Date();
      if (diff <= 0) {
        setTimeLeftStr("Toplantı başladı!");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      if (days > 0) {
        setTimeLeftStr(`${days} gün ${hours} saat`);
      } else if (hours > 0) {
        setTimeLeftStr(`${hours} saat ${minutes} dk`);
      } else {
        setTimeLeftStr(`${minutes} dakika`);
      }
    };
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [nextMeetingEmail]);

  /* ───── istatistikler ───── */
  const stats = {
    toplam: emails.filter((e) => e.islendi).length,
    toplanti: emails.filter((e) =>
      !e.tamamlandi && (e.kategori?.toLowerCase().includes("toplantı") ||
        e.kategori?.toLowerCase().includes("toplanti"))
    ).length,
    gorev: emails.filter((e) =>
      !e.tamamlandi && (e.kategori?.toLowerCase().includes("görev") ||
        e.kategori?.toLowerCase().includes("gorev") ||
        e.kategori?.toLowerCase().includes("aksiyon"))
    ).length,
    acil: emails.filter((e) =>
      !e.tamamlandi && (e.kategori?.toLowerCase().includes("acil") ||
        e.kategori?.toLowerCase().includes("önemli"))
    ).length,
    reklam: emails.filter((e) =>
      !e.tamamlandi && (e.kategori?.toLowerCase().includes("reklam") ||
        e.kategori?.toLowerCase().includes("spam"))
    ).length,
  };
  stats.genel = emails.filter((e) => e.islendi && !e.tamamlandi &&
    !(
      e.kategori?.toLowerCase().includes("toplantı") ||
      e.kategori?.toLowerCase().includes("toplanti") ||
      e.kategori?.toLowerCase().includes("görev") ||
      e.kategori?.toLowerCase().includes("gorev") ||
      e.kategori?.toLowerCase().includes("aksiyon") ||
      e.kategori?.toLowerCase().includes("acil") ||
      e.kategori?.toLowerCase().includes("önemli") ||
      e.kategori?.toLowerCase().includes("reklam") ||
      e.kategori?.toLowerCase().includes("spam")
    )
  ).length;

  const pieData = [
    { name: "Toplantı", value: stats.toplanti || 0, color: "#f59e0b" },
    { name: "Görev", value: stats.gorev || 0, color: "#8b5cf6" },
    { name: "Acil", value: stats.acil || 0, color: "#f43f5e" },
    { name: "Reklam", value: stats.reklam || 0, color: "#475569" },
    { name: "Genel", value: stats.genel || 0, color: "#38bdf8" },
  ].filter((d) => d.value > 0);

  const processedEmails = emails.filter((e) => e.kategori);
  const unprocessedCount = emails.filter(
    (e) => !e.islendi && !e.kategori
  ).length;

  /* ───── rapor oluşturucu ───── */
  const generateReport = () => {
    setReportState({ isOpen: true, step: 1 });
    setTimeout(() => {
      setReportState(prev => ({ ...prev, step: 2 }));
      setTimeout(() => {
        setReportState(prev => ({ ...prev, step: 3 }));
        setTimeout(() => {
          setReportState(prev => ({ ...prev, step: 4 }));

          const content = `SMARTFLOW AI - HAFTALIK YÖNETİCİ RAPORU\nOluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}\n\n[İSTATİSTİKLER]\nToplam E-posta: ${stats.toplam}\nBekleyen Toplantılar: ${stats.toplanti}\nBekleyen Görevler: ${stats.gorev}\nAcil Aksiyonlar: ${stats.acil}\n\n[YAPAY ZEKA ÖZETİ]\nBu hafta toplam ${processedEmails.length * 5} dakika zaman tasarrufu sağlandı.\nSistem tespitiyle ${stats.gorev} adet görev tanımlandı.\n\n---\nSmartFlow AI tarafından otomatik oluşturulmuştur.`;
          const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "SmartFlow_Yonetici_Raporu.txt";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => {
            setReportState({ isOpen: false, step: 0 });
          }, 3000);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  /* ───── aksiyon butonu oluşturucu ───── */
  const renderActionButton = (email) => {
    if (!email.islendi) return null;
    if (email.tamamlandi) {
      return (
        <button className="btn btn-ghost btn-sm" disabled style={{ color: "var(--accent-emerald)", opacity: 0.8, borderColor: "rgba(16, 185, 129, 0.3)" }}>
          <CheckCircle2 size={14} /> Tamamlandı
        </button>
      );
    }

    const k = email.kategori?.toLowerCase() || "";
    if (k.includes("toplantı") || k.includes("toplanti")) {
      return (
        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openMeetingModal(email); }}>
          <CheckCircle2 size={14} /> Onayla
        </button>
      );
    }
    if (k.includes("görev") || k.includes("aksiyon") || k.includes("gorev")) {
      return (
        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); markAsCompleted(email); }}>
          <CheckCircle2 size={14} /> Yaptım
        </button>
      );
    }
    if (k.includes("acil") || k.includes("önemli")) {
      return (
        <button className="btn btn-primary btn-sm" style={{ background: "linear-gradient(135deg, var(--accent-rose), #be123c)" }} onClick={(e) => { e.stopPropagation(); markAsCompleted(email); }}>
          <CheckCircle2 size={14} /> Çözüldü
        </button>
      );
    }
    return (
      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); markAsCompleted(email); }}>
        <CheckCircle2 size={14} /> Okudum
      </button>
    );
  };

  if (authLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at top right, #f0f4ff, #ffffff, #eef2ff)" }}>
        <Loader2 className="spinning" size={48} color="var(--accent-indigo)" />
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={() => { }} />;
  }

  /* ───────── RENDER ───────── */
  return (
    <>
      <div className="bg-gradient-orb orb-1" />
      <div className="bg-gradient-orb orb-2" />

      {/* TOPLANTI TARİH SEÇİM MODALI */}
      {meetingModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="panel-header">
              <h3><Calendar size={18} /> Toplantı Takvim Onayı</h3>
            </div>
            <div className="panel-body">
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Takvime eklenecek etkinlik için tarih ve saat belirleyin. AI'ın tespit ettiği tahmini tarih aşağıdadır.
              </p>
              <input
                type="datetime-local"
                className="chat-input"
                style={{ width: "100%", marginBottom: "24px" }}
                value={meetingModal.selectedDate}
                onChange={(e) => setMeetingModal({ ...meetingModal, selectedDate: e.target.value })}
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setMeetingModal({ isOpen: false, email: null, selectedDate: "" })}
                >
                  İptal
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmMeeting}
                >
                  <CheckCircle2 size={16} /> Takvime Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="app-container">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Zap size={22} color="white" />
            </div>
            <div>
              <h1>SmartFlow AI</h1>
              <span>Personal Assistant</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeNav === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveNav("dashboard")}
            >
              <BarChart3 size={20} className="nav-icon" />
              Dashboard
            </button>
            <button
              className={`nav-item ${activeNav === "inbox" ? "active" : ""}`}
              onClick={() => setActiveNav("inbox")}
            >
              <Inbox size={20} className="nav-icon" />
              Gelen Kutusu
              {unprocessedCount > 0 && (
                <span className="nav-badge">{unprocessedCount}</span>
              )}
            </button>

            <button
              className={`nav-item nav-sub-item nav-sub-meeting ${activeNav === "meetings" ? "active" : ""}`}
              onClick={() => setActiveNav("meetings")}
            >
              <Calendar size={16} className="nav-icon" style={{ color: "var(--accent-amber)" }} />
              Toplantılar
              {stats.toplanti > 0 && (
                <span className="nav-badge" style={{ background: "#f59e0b" }}>
                  {stats.toplanti}
                </span>
              )}
            </button>
            <button
              className={`nav-item nav-sub-item nav-sub-task ${activeNav === "tasks" ? "active" : ""}`}
              onClick={() => setActiveNav("tasks")}
            >
              <CheckCircle2 size={16} className="nav-icon" style={{ color: "#8b5cf6" }} />
              Görevler
              {stats.gorev > 0 && (
                <span className="nav-badge" style={{ background: "#8b5cf6" }}>
                  {stats.gorev}
                </span>
              )}
            </button>
            <button
              className={`nav-item nav-sub-item nav-sub-urgent ${activeNav === "urgent" ? "active" : ""}`}
              onClick={() => setActiveNav("urgent")}
            >
              <AlertTriangle size={16} className="nav-icon" style={{ color: "var(--accent-rose)" }} />
              Önemliler
              {stats.acil > 0 && (
                <span className="nav-badge" style={{ background: "#f43f5e" }}>
                  {stats.acil}
                </span>
              )}
            </button>
            <button
              className={`nav-item nav-sub-item nav-sub-ads ${activeNav === "ads" ? "active" : ""}`}
              onClick={() => setActiveNav("ads")}
            >
              <Megaphone size={16} className="nav-icon" style={{ color: "#94a3b8" }} />
              Reklamlar
              {stats.reklam > 0 && (
                <span className="nav-badge" style={{ background: "#475569" }}>
                  {stats.reklam}
                </span>
              )}
            </button>

            <button
              className={`nav-item nav-sub-item nav-sub-general ${activeNav === "general" ? "active" : ""}`}
              onClick={() => setActiveNav("general")}
            >
              <Info size={16} className="nav-icon" style={{ color: "var(--accent-sky)" }} />
              Genel Bilgi
              {stats.genel > 0 && (
                <span className="nav-badge" style={{ background: "#38bdf8" }}>
                  {stats.genel}
                </span>
              )}
            </button>

            <button
              className={`nav-item ${activeNav === "slack" ? "active" : ""}`}
              onClick={() => setActiveNav("slack")}
              style={{ marginTop: "12px" }}
            >
              <Slack size={20} className="nav-icon" style={{ color: "#E01E5A" }} />
              Slack Duyuruları
              <span className="nav-badge" style={{ background: "#4A154B" }}>3</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <button
              className="nav-item"
              onClick={addStickyNote}
              style={{ marginBottom: "12px", border: "1px dashed var(--accent-indigo)", color: "var(--accent-indigo)" }}
            >
              <StickyNote size={18} className="nav-icon" />
              Yeni Not Ekle
            </button>
            <button
              className={`nav-item ${activeNav === "history" ? "active" : ""}`}
              onClick={() => setActiveNav("history")}
              style={{ marginBottom: "12px" }}
            >
              <History size={18} className="nav-icon" />
              Geçmiş İşlemler
            </button>
            <button
              className="nav-item logout-btn"
              onClick={handleLogout}
              style={{
                marginTop: "12px",
                marginBottom: "12px",
                color: "#f43f5e",
                border: "1px solid rgba(244, 63, 94, 0.2)",
                background: "rgba(244, 63, 94, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                fontWeight: "700",
                transition: "all 0.3s ease"
              }}
            >
              <LogOut size={18} className="nav-icon" />
              Çıkış Yap
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-content">
          {/* PAGE HEADER */}
          <div className="page-header fade-in">
            <div>
              <h2>
                {activeNav === "dashboard" && "Dashboard"}
                {activeNav === "inbox" && "📧 Gelen Kutusu"}
                {activeNav === "meetings" && "📅 Toplantılar"}
                {activeNav === "tasks" && "✅ Görevler"}
                {activeNav === "urgent" && "🔴 Önemliler"}
                {activeNav === "ads" && "📢 Reklamlar"}
                {activeNav === "general" && "ℹ️ Genel Bilgiler"}
                {activeNav === "history" && "🗄️ Geçmiş İşlemler"}
                {activeNav === "chat" && "💬 AI Chatbot"}
                {activeNav === "slack" && "Slack Duyuruları"}
              </h2>
              <p>
                {activeNav === "dashboard" &&
                  "E-posta analizi ve günlük özet"}
                {activeNav === "inbox" &&
                  "AI ile sınıflandırılmış e-postalarınız"}
                {activeNav === "meetings" &&
                  "Otomatik tespit edilen toplantılar"}
                {activeNav === "tasks" &&
                  "Aksiyon bekleyen görevler"}
                {activeNav === "urgent" &&
                  "Acil aksiyon gerektiren mesajlar"}
                {activeNav === "ads" &&
                  "Bültenler ve promosyonlar"}
                {activeNav === "general" &&
                  "Genel bilgilendirme e-postaları"}
                {activeNav === "history" &&
                  "Tamamlanan e-postalar ve log kayıtları"}
                {activeNav === "chat" &&
                  "SmartFlow AI ile sohbet edin"}
                {activeNav === "slack" &&
                  "Slack #announcements kanalındaki son duyurular"}
              </p>
            </div>

            <div className="header-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setIsSearchOpen(true)}
                title="Arama Yap (Ctrl+K)"
                style={{ display: "flex", gap: "8px", alignItems: "center", border: "1px solid var(--border-glass)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span style={{ fontSize: "11px", opacity: 0.7, fontWeight: 600 }}>Ctrl K</span>
              </button>
              <button
                className="btn btn-ghost theme-toggle-btn"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? "Açık Mod" : "Karanlık Mod"}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                className="btn btn-ghost"
                onClick={loadEmails}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? "spinning" : ""} />
                Yenile
              </button>
              <button
                className="btn btn-ghost"
                onClick={generateReport}
                title="Yönetici Raporu Oluştur (PDF/TXT)"
                style={{ display: "flex", gap: "6px", alignItems: "center", border: "1px solid var(--accent-indigo)", color: "var(--accent-indigo)", background: "rgba(99, 102, 241, 0.05)" }}
              >
                <FileText size={16} /> Rapor Al
              </button>
              <button
                className="btn btn-primary"
                onClick={processAllEmails}
                disabled={processing || (typeof unprocessedCount === 'number' && unprocessedCount === 0)}
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="spinning" />
                    İşleniyor ({processedCount || 0}/{unprocessedCount || 0})
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AI ile Analiz Et ({unprocessedCount || 0})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ═══════ SLACK VIEW ═══════ */}
          {activeNav === "slack" && (
            <div className="slack-view fade-in">
              <div className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
                <div className="panel-header" style={{ borderBottom: "1px solid var(--border-glass)", padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ background: "#4A154B", padding: "10px", borderRadius: "12px" }}>
                      <Slack size={24} color="white" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>#announcements</h3>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Şirket içi genel duyuru kanalı</p>
                    </div>
                  </div>
                  <button onClick={loadSlackMessages} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                    <RefreshCw size={14} className={loading ? "spinning" : ""} /> Şimdi Senkronize Et
                  </button>
                </div>

                <div className="panel-body" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  {slackMessages.filter(m => !deletedSlackIds.includes(m.id)).length > 0 ? (
                    slackMessages.filter(m => !deletedSlackIds.includes(m.id)).map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => handleSlackMsgClick(msg)}
                        className="slack-message clickable-card"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border-glass)",
                          borderRadius: "12px",
                          padding: "16px",
                          display: "flex",
                          gap: "16px",
                          position: "relative",
                          cursor: "pointer",
                          transition: "all 0.3s ease"
                        }}
                      >
                        <div style={{
                          width: "40px", height: "40px", borderRadius: "10px",
                          background: msg.type === "duyuru" ? "#E01E5A" : msg.type === "sistem" ? "#2EB67D" : "#36C5F0",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "18px", fontWeight: "bold", color: "white"
                        }}>
                          {msg?.user?.[0] || "?"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ fontWeight: "600", fontSize: "14px" }}>{msg.user}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{msg.time}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteSlackMessage(msg.id); }}
                                className="delete-slack-btn"
                                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                            {msg.content}
                          </div>

                          {slackInsights[msg.id] && (
                            <div style={{
                              marginTop: "12px",
                              padding: "10px",
                              background: "rgba(99, 102, 241, 0.1)",
                              borderRadius: "8px",
                              borderLeft: "3px solid var(--accent-indigo)",
                              fontSize: "12px",
                              color: "var(--accent-indigo)",
                              display: "flex",
                              gap: "8px",
                              alignItems: "center"
                            }}>
                              <Sparkles size={12} />
                              <i>AI: {slackInsights[msg.id]}</i>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      <p>Henüz duyuru bulunamadı veya tümü silindi.</p>
                      <p style={{ fontSize: "12px" }}>Slack → Zapier → Google Sheets akışını kontrol edin.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ SLACK DETAIL MODAL ═══════ */}
          <AnimatePresence>
            {selectedSlackMsg && (
              <div className="modal-overlay" onClick={() => setSelectedSlackMsg(null)} style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.4)" }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 30 }}
                  className="modal-content glass-panel"
                  onClick={e => e.stopPropagation()}
                  style={{
                    maxWidth: "550px",
                    padding: "0",
                    overflow: "hidden",
                    borderRadius: "24px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                  }}
                >
                  {/* Modal Header with Gradient */}
                  <div style={{
                    background: "linear-gradient(135deg, #4A154B 0%, #611f69 100%)",
                    padding: "24px",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <div style={{ background: "rgba(255,255,255,0.2)", padding: "10px", borderRadius: "12px" }}>
                        <Slack size={24} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Mesaj Detayı</h3>
                        <span style={{ fontSize: "12px", opacity: 0.8 }}>#announcements kanalı</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSlackMsg(null)}
                      style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "8px", borderRadius: "50%", cursor: "pointer" }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div style={{ padding: "24px" }}>
                    {/* User Info Section */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "14px",
                        background: "var(--accent-indigo)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "20px", fontWeight: "bold", color: "white", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
                      }}>
                        {selectedSlackMsg.user?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "16px" }}>{selectedSlackMsg.user}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{selectedSlackMsg.time} gönderildi</div>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div style={{
                      background: "rgba(255,255,255,0.03)",
                      padding: "18px",
                      borderRadius: "16px",
                      border: "1px solid var(--border-glass)",
                      fontSize: "15px",
                      lineHeight: "1.6",
                      color: "var(--text-secondary)",
                      marginBottom: "24px"
                    }}>
                      {selectedSlackMsg.content}
                    </div>

                    {/* AI Interpretation Card */}
                    <div style={{
                      position: "relative",
                      padding: "20px",
                      background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
                      borderRadius: "20px",
                      border: "1px solid rgba(99, 102, 241, 0.2)",
                      overflow: "hidden",
                      marginBottom: "24px"
                    }}>
                      <div style={{
                        position: "absolute", top: "-10px", right: "-10px",
                        opacity: 0.1, color: "var(--accent-indigo)"
                      }}>
                        <Sparkles size={80} />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--accent-indigo)", marginBottom: "10px", fontWeight: "700", fontSize: "14px" }}>
                        <div style={{ background: "var(--accent-indigo)", color: "white", padding: "5px", borderRadius: "8px" }}>
                          <Sparkles size={14} />
                        </div>
                        SmartFlow AI Görüşü
                      </div>
                      <p style={{ fontSize: "14px", margin: 0, lineHeight: "1.5", color: "var(--text-primary)", fontWeight: "500" }}>
                        {analyzingSlack ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Loader2 size={14} className="spinning" /> Analiz ediliyor...
                          </span>
                        ) : (slackInsights[selectedSlackMsg.id] || "Bu mesaj için analiz üretilemedi.")}
                      </p>
                    </div>

                    {/* Date/Time Picker Section */}
                    <div style={{
                      padding: "15px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "16px",
                      border: "1px solid var(--border-glass)"
                    }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px", color: "var(--text-muted)" }}>
                        Toplantı Tarihi ve Saati Seçin:
                      </label>
                      <input
                        type="datetime-local"
                        id="slack-meeting-date"
                        defaultValue={new Date().toISOString().slice(0, 16)}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--border-glass)",
                          borderRadius: "10px",
                          color: "var(--text-primary)",
                          fontFamily: "inherit",
                          fontSize: "14px",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{
                    padding: "20px 24px",
                    background: "rgba(255,255,255,0.02)",
                    borderTop: "1px solid var(--border-glass)",
                    display: "flex",
                    gap: "12px"
                  }}>
                    <button
                      className="btn"
                      style={{
                        flex: 1,
                        background: "#4A154B",
                        color: "white",
                        borderRadius: "14px",
                        height: "48px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        boxShadow: "0 4px 15px rgba(74, 21, 75, 0.3)"
                      }}
                      onClick={() => {
                        const dateInput = document.getElementById("slack-meeting-date");
                        const dateValue = dateInput ? dateInput.value : null;

                        if (dateValue) {
                          createCalendarEvent(
                            `Slack: ${selectedSlackMsg.user} ile Toplantı`,
                            dateValue,
                            selectedSlackMsg.content,
                            "#4A154B"
                          );

                          // Yerel state'i güncelle (Takvimde görünmesi için)
                          const newMeeting = {
                            id: `slack-${selectedSlackMsg.id}-${Date.now()}`,
                            gonderen: selectedSlackMsg.user,
                            konu: `Slack: ${selectedSlackMsg.user} ile Toplantı`,
                            icerik: selectedSlackMsg.content,
                            kategori: "Toplantı",
                            ozet: slackInsights[selectedSlackMsg.id] || "Slack üzerinden oluşturuldu.",
                            toplantiTarihi: dateValue,
                            toplantiTuru: "Slack Görüşmesi",
                            tarih: new Date().toLocaleDateString('tr-TR'),
                            islendi: true,
                            tamamlandi: false,
                            takvimeEklendi: true
                          };

                          setEmails(prev => [newMeeting, ...prev]);
                          alert("Toplantı takvime başarıyla eklendi!");
                          setSelectedSlackMsg(null);
                        }
                      }}
                    >
                      <Calendar size={18} /> Takvime Ekle
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedSlackMsg(null)}
                      style={{ borderRadius: "14px", height: "48px", padding: "0 24px" }}
                    >
                      Kapat
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* STAT CARDS */}
          {(activeNav === "dashboard" || activeNav === "inbox") && (
            <div className="stats-grid fade-in">
              <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                <div className="stat-icon indigo">
                  <Mail size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.toplam}</h3>
                  <p>Toplam E-posta</p>
                </div>
              </motion.div>

              <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                <div className="stat-icon amber">
                  <Calendar size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.toplanti}</h3>
                  <p>Toplantı Talebi</p>
                </div>
              </motion.div>

              <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                <div className="stat-icon rose">
                  <AlertTriangle size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.acil}</h3>
                  <p>Acil / Önemli</p>
                </div>
              </motion.div>

              <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                <div className="stat-icon emerald">
                  <CheckCircle2 size={24} />
                </div>
                <div className="stat-info">
                  <h3>{processedEmails.length}</h3>
                  <p>AI İşlendi</p>
                </div>
              </motion.div>

              <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                <div className="stat-icon violet">
                  <CheckCircle2 size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.gorev}</h3>
                  <p>Bekleyen Görev</p>
                </div>
              </motion.div>

              <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                <div className="stat-icon gray">
                  <Megaphone size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.reklam}</h3>
                  <p>Gereksiz / Spam</p>
                </div>
              </motion.div>

              <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                <div className="stat-icon teal">
                  <Clock size={24} />
                </div>
                <div className="stat-info">
                  <h3>{processedEmails.length * 5} dk</h3>
                  <p>Zaman Tasarrufu</p>
                </div>
              </motion.div>

              <motion.div className="stat-card" whileHover={{ scale: 1.02 }}>
                <div className="stat-icon sky">
                  <Sparkles size={24} />
                </div>
                <div className="stat-info">
                  <h3>%94</h3>
                  <p>AI Güven Skoru</p>
                </div>
              </motion.div>
            </div>
          )}

          {/* ═══════ DASHBOARD VIEW ═══════ */}
          {activeNav === "dashboard" && (
            <div className="fade-in">
              {/* Daily Briefing Banner */}
              <div className="glass-panel daily-brief-banner" style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "20px", background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))", borderLeft: "4px solid var(--accent-indigo)", padding: "20px 24px" }}>
                <div style={{ fontSize: "36px", animation: "pulse-dot 2s infinite" }}></div>
                <div>
                  <h3 style={{ fontSize: "18px", marginBottom: "6px", color: "var(--text-primary)", fontWeight: 700 }}>Günaydın Ünal, harika bir gün seni bekliyor!</h3>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                    Bugün AI tarafından tespit edilen <strong>{stats.toplanti || 0} toplantın</strong>, <strong>{stats.gorev || 0} görevin</strong> ve <strong>{stats.acil || 0} acil</strong> mesajın var.
                    {nextMeetingEmail && (
                      <span> İlk toplantın saat <strong style={{ color: "var(--accent-indigo)" }}>{new Date(nextMeetingEmail.toplantiTarihi).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</strong>'da <strong>{nextMeetingEmail.gonderen}</strong> ile.</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="content-grid">
                {/* Sol Kolon */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minWidth: 0 }}>
                  {/* İşlenmemiş E-postalar */}
                  {emails.filter((e) => !e.islendi).length > 0 && (
                    <div className="glass-panel">
                      <div className="panel-header">
                        <h3>
                          <Mail size={18} /> Bekleyen E-postalar
                        </h3>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {emails.filter(e => !e.islendi).length} mail
                        </span>
                      </div>

                      {processing && (
                        <div className="processing-bar">
                          <div className="spinner" />
                          AI analiz ediyor... ({processedCount}/{unprocessedCount})
                        </div>
                      )}

                      <div className="panel-body">
                        {loading ? (
                          <div className="loading-spinner">
                            <div className="spinner" />
                            <span className="loading-text">Yükleniyor...</span>
                          </div>
                        ) : (
                          <div className="email-list">
                            <AnimatePresence>
                              {emails
                                .filter((e) => !e.islendi)
                                .map((email, i) => (
                                  <motion.div
                                    key={email.id}
                                    className="email-card"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                  >
                                    <div className="email-card-header">
                                      <span className="email-sender">{email.gonderen}</span>
                                      <span className="email-date">{email.tarih}</span>
                                    </div>
                                    <div className="email-subject">{email.konu}</div>
                                    <div className="email-footer">
                                      <span className="badge badge-general">
                                        <Clock size={12} /> Bekliyor
                                      </span>
                                    </div>
                                  </motion.div>
                                ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* İşlenmiş Son E-postalar (Analizler) */}
                  <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div className="panel-header">
                      <h3>
                        <Sparkles size={18} /> AI Analiz Sonuçları
                      </h3>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        En son işlenen e-postalar
                      </span>
                    </div>
                    <div className="panel-body" style={{ flex: 1, maxHeight: emails.filter(e => !e.islendi).length > 0 ? "350px" : "600px" }}>
                      {emails.filter(e => !e.islendi).length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-icon">✨</div>
                          <p>Analiz edilecek yeni e-posta yok.<br /><span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, display: "inline-block" }}>Bekleyen analiz işlemi kalmadığı için ekran temizlendi.</span></p>
                        </div>
                      ) : processedEmails.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-icon">✨</div>
                          <p>Henüz analiz edilmiş e-posta yok.</p>
                        </div>
                      ) : (
                        <div className="email-list">
                          <AnimatePresence>
                            {processedEmails.slice(0, 5).map((email, i) => (
                              <motion.div
                                key={email.id}
                                className={`email-card ${getMeetingCardClass(email.toplantiTuru)}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                              >
                                <div className="email-card-header" style={{ marginBottom: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className={`badge ${getBadgeClass(email.kategori, email.toplantiTuru)}`}>
                                      {getCategoryIcon(email.kategori)}
                                      {email.toplantiTuru ? `${email.kategori} (${email.toplantiTuru})` : email.kategori}
                                    </span>
                                    <span className="email-sender">{email.gonderen}</span>
                                  </div>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setActiveNav(getNavForCategory(email.kategori))}
                                    style={{ padding: "6px 10px", fontSize: "11px", display: "flex", alignItems: "center" }}
                                  >
                                    Detayı Aç <ArrowRight size={14} style={{ marginLeft: 4 }} />
                                  </button>
                                </div>
                                <div className="email-subject">{email.konu}</div>
                                <div className="email-summary" style={{
                                  background: "var(--bg-primary)",
                                  padding: "12px",
                                  borderRadius: "8px",
                                  borderLeft: "3px solid var(--accent-indigo)",
                                  marginTop: "4px",
                                  color: "var(--text-primary)"
                                }}>
                                  💡 <strong>AI Yorumu:</strong> {email.ozet}
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sağ panel: Chart + Chat */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Sonraki Toplantı Widget */}
                  {nextMeetingEmail && (
                    <div className="glass-panel countdown-widget fade-in">
                      <div className="panel-header" style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "12px", marginBottom: "12px" }}>
                        <h3>
                          <Clock size={18} className="text-indigo" /> Yaklaşan Toplantı
                        </h3>
                        <div className="live-indicator">
                          <div className="live-dot"></div>
                          <span>Aktif</span>
                        </div>
                      </div>
                      <div className="countdown-body">
                        <div className="countdown-person">
                          <div className="person-avatar">
                            {nextMeetingEmail.gonderen.charAt(0).toUpperCase()}
                          </div>
                          <div className="person-details">
                            <span className="person-label">Kimle:</span>
                            <span className="person-name">{nextMeetingEmail.gonderen}</span>
                          </div>
                        </div>
                        <div className="countdown-time-container">
                          <div className="countdown-time">
                            {timeLeftStr}
                          </div>
                          <div className="countdown-message">
                            Lütfen hazırlığınızı yapın
                          </div>
                        </div>
                        <button
                          className="btn countdown-btn"
                          onClick={() => setActiveNav("meetings")}
                        >
                          Detayları Gör
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pie Chart */}
                  <div className="glass-panel">
                    <div className="panel-header">
                      <h3>
                        <BarChart3 size={18} /> Mail Dağılımı
                      </h3>
                    </div>
                    <div className="chart-container">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {pieData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: 10,
                                color: "#1e293b",
                                fontSize: 12,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                              }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: 12, color: "#475569" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="empty-state" style={{ padding: 30 }}>
                          <p>Analiz sonrası grafik oluşacak</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ═══════ INBOX VIEW ═══════ */}
          {activeNav === "inbox" && (
            <div className="glass-panel fade-in">
              <div className="panel-header">
                <h3>
                  <Inbox size={18} /> Tüm E-postalar
                </h3>
              </div>
              {processing && (
                <div className="processing-bar">
                  <div className="spinner" />
                  AI analiz ediyor... ({processedCount}/{unprocessedCount})
                </div>
              )}
              <div className="panel-body" style={{ maxHeight: "70vh" }}>
                <div className="email-list">
                  {emails.map((email, i) => (
                    <motion.div
                      key={email.id}
                      className={`email-card ${getMeetingCardClass(email.toplantiTuru)}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="email-card-header">
                        <span className="email-sender">{email.gonderen}</span>
                        <span className="email-date">{email.tarih}</span>
                      </div>
                      <div className="email-subject">{email.konu}</div>
                      {email.ozet ? (
                        <div className="email-summary">✨ {email.ozet}</div>
                      ) : (
                        <div
                          className="email-summary"
                          style={{ opacity: 0.5 }}
                        >
                          {email.icerik?.substring(0, 120)}...
                        </div>
                      )}
                      <div className="email-footer">
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {email.kategori ? (
                            <span
                              className={`badge ${getBadgeClass(email.kategori, email.toplantiTuru)}`}
                            >
                              {getCategoryIcon(email.kategori)}
                              {email.toplantiTuru ? `${email.kategori} (${email.toplantiTuru})` : email.kategori}
                            </span>
                          ) : (
                            <span className="badge badge-general">
                              <Clock size={12} /> Bekliyor
                            </span>
                          )}
                          {email.takvimeEklendi && (
                            <span className="badge badge-calendar">
                              <CheckCircle2 size={12} /> Takvime Eklendi
                            </span>
                          )}
                        </div>
                        {renderActionButton(email)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ MEETINGS VIEW ═══════ */}
          {activeNav === "meetings" && (
            <div className="glass-panel fade-in">
              <div className="panel-header">
                <h3>
                  <Calendar size={18} /> Tespit Edilen Toplantılar
                </h3>
              </div>
              <div className="panel-body" style={{ maxHeight: "70vh" }}>
                {emails.filter(
                  (e) => !e.tamamlandi && (
                    e.kategori?.toLowerCase().includes("toplantı") ||
                    e.kategori?.toLowerCase().includes("toplanti")
                  )
                ).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <p>
                      Henüz toplantı tespit edilmedi veya bekleyen toplantı yok.
                      <br />
                      Önce e-postaları AI ile analiz edin.
                    </p>
                  </div>
                ) : (
                  <div className="email-list">
                    {emails
                      .filter(
                        (e) => !e.tamamlandi && (
                          e.kategori?.toLowerCase().includes("toplantı") ||
                          e.kategori?.toLowerCase().includes("toplanti")
                        )
                      )
                      .map((email, i) => (
                        <motion.div
                          key={email.id}
                          className={`email-card clickable-card ${getMeetingCardClass(email.toplantiTuru)}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          onClick={() => setDetailsModal({ isOpen: true, email })}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="email-card-header">
                            <span className="email-sender">
                              {email.gonderen}
                            </span>
                            {email.toplantiTarihi && !isNaN(new Date(email.toplantiTarihi).getTime()) ? (
                              <span
                                className="badge badge-meeting"
                                style={{ fontSize: 12 }}
                              >
                                <Clock size={12} />
                                {new Date(
                                  email.toplantiTarihi
                                ).toLocaleString("tr-TR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              email.toplantiTarihi && (
                                <span
                                  className="badge badge-meeting"
                                  style={{ fontSize: 12 }}
                                >
                                  <Clock size={12} />
                                  {email.toplantiTarihi}
                                </span>
                              )
                            )}
                          </div>
                          <div className="email-subject">{email.konu}</div>
                          {email.ozet && (
                            <div className="email-summary">✨ {email.ozet}</div>
                          )}
                          <div className="email-footer">
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span className={`badge ${getBadgeClass(email.kategori, email.toplantiTuru)}`}>
                                <Calendar size={12} /> {email.toplantiTuru ? `${email.kategori} (${email.toplantiTuru})` : email.kategori}
                              </span>
                              {email.takvimeEklendi ? (
                                <span className="badge badge-calendar">
                                  <CheckCircle2 size={12} /> Takvime Eklendi
                                </span>
                              ) : (
                                <span
                                  className="badge"
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: 11,
                                  }}
                                >
                                  Takvime eklenmedi
                                </span>
                              )}
                            </div>
                            {renderActionButton(email)}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>
              {renderCalendar(emails, handleDeleteEmail)}
            </div>
          )}

          {/* ═══════ URGENT VIEW ═══════ */}
          {activeNav === "urgent" && (
            <div className="glass-panel fade-in">
              <div className="panel-header">
                <h3>
                  <AlertTriangle size={18} /> Önemli / Acil Mesajlar
                </h3>
              </div>
              <div className="panel-body" style={{ maxHeight: "70vh" }}>
                {emails.filter(
                  (e) => !e.tamamlandi && (
                    e.kategori?.toLowerCase().includes("acil") ||
                    e.kategori?.toLowerCase().includes("önemli")
                  )
                ).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🔴</div>
                    <p>Harika! Bekleyen acil veya önemli e-postanız yok.</p>
                  </div>
                ) : (
                  <div className="email-list">
                    {emails
                      .filter(
                        (e) => !e.tamamlandi && (
                          e.kategori?.toLowerCase().includes("acil") ||
                          e.kategori?.toLowerCase().includes("önemli")
                        )
                      )
                      .map((email, i) => (
                        <motion.div
                          key={email.id}
                          className="email-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                        >
                          <div className="email-card-header">
                            <span className="email-sender">
                              {email.gonderen}
                            </span>
                            <span className="email-date">{email.tarih}</span>
                          </div>
                          <div className="email-subject">{email.konu}</div>
                          {email.ozet && (
                            <div className="email-summary">✨ {email.ozet}</div>
                          )}
                          <div className="email-footer">
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span className="badge badge-urgent">
                                <AlertTriangle size={12} /> Acil/Önemli
                              </span>
                            </div>
                            {renderActionButton(email)}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════ ADS VIEW ═══════ */}
          {activeNav === "ads" && (
            <div className="glass-panel fade-in">
              <div className="panel-header">
                <h3>
                  <Megaphone size={18} /> Reklamlar ve Bültenler
                </h3>
              </div>
              <div className="panel-body" style={{ maxHeight: "70vh" }}>
                {emails.filter(
                  (e) => !e.tamamlandi && (
                    e.kategori?.toLowerCase().includes("reklam") ||
                    e.kategori?.toLowerCase().includes("spam")
                  )
                ).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📢</div>
                    <p>Şu an hiç reklam mesajınız bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="email-list">
                    {emails
                      .filter(
                        (e) => !e.tamamlandi && (
                          e.kategori?.toLowerCase().includes("reklam") ||
                          e.kategori?.toLowerCase().includes("spam")
                        )
                      )
                      .map((email, i) => (
                        <motion.div
                          key={email.id}
                          className="email-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                        >
                          <div className="email-card-header">
                            <span className="email-sender">
                              {email.gonderen}
                            </span>
                            <span className="email-date">{email.tarih}</span>
                          </div>
                          <div className="email-subject">{email.konu}</div>
                          {email.ozet && (
                            <div className="email-summary">✨ {email.ozet}</div>
                          )}
                          <div className="email-footer">
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span className="badge badge-spam">
                                <Megaphone size={12} /> Reklam
                              </span>
                            </div>
                            {renderActionButton(email)}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════ TASKS VIEW (KANBAN) ═══════ */}
          {activeNav === "tasks" && (
            <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", color: "var(--text-primary)" }}>
                  <CheckCircle2 size={22} color="var(--accent-indigo)" /> Görev Tablosu
                </h3>
              </div>
              <div style={{ display: "flex", gap: "24px", flex: 1, overflowX: "auto", paddingBottom: "16px" }}>
                {/* Bekleyen Sütunu */}
                <div style={{ flex: 1, minWidth: "300px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "16px", borderBottom: "1px solid var(--border-glass)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.02)" }}>
                    <h4 style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>Bekleyen Görevler</h4>
                    <span className="badge" style={{ background: "var(--bg-primary)" }}>
                      {emails.filter(e => !e.tamamlandi && (e.kategori?.toLowerCase().includes("görev") || e.kategori?.toLowerCase().includes("gorev") || e.kategori?.toLowerCase().includes("aksiyon"))).length}
                    </span>
                  </div>
                  <div style={{ padding: "16px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {emails
                      .filter(e => !e.tamamlandi && (e.kategori?.toLowerCase().includes("görev") || e.kategori?.toLowerCase().includes("gorev") || e.kategori?.toLowerCase().includes("aksiyon")))
                      .map((email, i) => (
                        <motion.div key={email.id} className="email-card clickable-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setDetailsModal({ isOpen: true, email })} style={{ cursor: "pointer", borderLeft: "4px solid var(--accent-indigo)", margin: 0 }}>
                          <div className="email-card-header">
                            <span className="email-sender">{email.gonderen}</span>
                          </div>
                          <div className="email-subject">{email.konu}</div>
                          {email.ozet && <div className="email-summary">✨ {email.ozet}</div>}
                          <div className="email-footer" style={{ marginTop: "12px" }}>
                            {renderActionButton(email)}
                          </div>
                        </motion.div>
                      ))}
                    {emails.filter(e => !e.tamamlandi && (e.kategori?.toLowerCase().includes("görev") || e.kategori?.toLowerCase().includes("gorev") || e.kategori?.toLowerCase().includes("aksiyon"))).length === 0 && (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>Bekleyen görev yok 🎉</div>
                    )}
                  </div>
                </div>

                {/* Tamamlanan Sütunu */}
                <div style={{ flex: 1, minWidth: "300px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", opacity: 0.8 }}>
                  <div style={{ padding: "16px", borderBottom: "1px solid var(--border-glass)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.02)" }}>
                    <h4 style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>Tamamlananlar</h4>
                    <span className="badge" style={{ background: "var(--bg-primary)" }}>
                      {emails.filter(e => e.tamamlandi && (e.kategori?.toLowerCase().includes("görev") || e.kategori?.toLowerCase().includes("gorev") || e.kategori?.toLowerCase().includes("aksiyon"))).length}
                    </span>
                  </div>
                  <div style={{ padding: "16px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {emails
                      .filter(e => e.tamamlandi && (e.kategori?.toLowerCase().includes("görev") || e.kategori?.toLowerCase().includes("gorev") || e.kategori?.toLowerCase().includes("aksiyon")))
                      .map((email, i) => (
                        <motion.div key={email.id} className="email-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ opacity: 0.6, borderLeft: "4px solid var(--accent-emerald)", margin: 0 }}>
                          <div className="email-card-header">
                            <span className="email-sender" style={{ textDecoration: "line-through" }}>{email.gonderen}</span>
                          </div>
                          <div className="email-subject" style={{ textDecoration: "line-through" }}>{email.konu}</div>
                          <div className="email-footer" style={{ marginTop: "12px" }}>
                            <span className="badge" style={{ color: "#047857", background: "#d1fae5", border: "1px solid #a7f3d0" }}>
                              <CheckCircle2 size={12} /> Tamamlandı
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    {emails.filter(e => e.tamamlandi && (e.kategori?.toLowerCase().includes("görev") || e.kategori?.toLowerCase().includes("gorev") || e.kategori?.toLowerCase().includes("aksiyon"))).length === 0 && (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>Henüz tamamlanan görev yok.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ GENERAL VIEW ═══════ */}
          {activeNav === "general" && (
            <div className="glass-panel fade-in">
              <div className="panel-header">
                <h3>
                  <Info size={18} /> Genel Bilgilendirmeler
                </h3>
              </div>
              <div className="panel-body" style={{ maxHeight: "70vh" }}>
                {emails.filter(
                  (e) => e.islendi && !e.tamamlandi &&
                    !(
                      e.kategori?.toLowerCase().includes("toplantı") ||
                      e.kategori?.toLowerCase().includes("toplanti") ||
                      e.kategori?.toLowerCase().includes("görev") ||
                      e.kategori?.toLowerCase().includes("gorev") ||
                      e.kategori?.toLowerCase().includes("aksiyon") ||
                      e.kategori?.toLowerCase().includes("acil") ||
                      e.kategori?.toLowerCase().includes("önemli") ||
                      e.kategori?.toLowerCase().includes("reklam") ||
                      e.kategori?.toLowerCase().includes("spam")
                    )
                ).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">ℹ️</div>
                    <p>Genel bilgilendirme e-postanız bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="email-list">
                    {emails
                      .filter(
                        (e) => e.islendi && !e.tamamlandi &&
                          !(
                            e.kategori?.toLowerCase().includes("toplantı") ||
                            e.kategori?.toLowerCase().includes("toplanti") ||
                            e.kategori?.toLowerCase().includes("görev") ||
                            e.kategori?.toLowerCase().includes("gorev") ||
                            e.kategori?.toLowerCase().includes("aksiyon") ||
                            e.kategori?.toLowerCase().includes("acil") ||
                            e.kategori?.toLowerCase().includes("önemli") ||
                            e.kategori?.toLowerCase().includes("reklam") ||
                            e.kategori?.toLowerCase().includes("spam")
                          )
                      )
                      .map((email, i) => (
                        <motion.div
                          key={email.id}
                          className="email-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                        >
                          <div className="email-card-header">
                            <span className="email-sender">
                              {email.gonderen}
                            </span>
                            <span className="email-date">{email.tarih}</span>
                          </div>
                          <div className="email-subject">{email.konu}</div>
                          {email.ozet && (
                            <div className="email-summary">✨ {email.ozet}</div>
                          )}
                          <div className="email-footer">
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span className="badge badge-general">
                                <Info size={12} /> Genel Bilgi
                              </span>
                            </div>
                            {renderActionButton(email)}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════ HISTORY VIEW ═══════ */}
          {activeNav === "history" && (
            <div className="glass-panel fade-in">
              <div className="panel-header">
                <h3>
                  <History size={18} /> İşlem Geçmişi ve Tamamlananlar
                </h3>
              </div>
              <div className="panel-body" style={{ maxHeight: "70vh" }}>
                {emails.filter((e) => e.tamamlandi).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🗄️</div>
                    <p>Henüz tamamlanmış veya arşive alınmış bir işleminiz yok.</p>
                  </div>
                ) : (
                  <div className="email-list">
                    {emails
                      .filter((e) => e.tamamlandi)
                      .map((email, i) => (
                        <motion.div
                          key={email.id}
                          className="email-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          style={{ opacity: 0.75 }}
                        >
                          <div className="email-card-header">
                            <span className="email-sender">
                              {email.gonderen}
                            </span>
                            <span className="email-date">{email.tarih}</span>
                          </div>
                          <div className="email-subject" style={{ textDecoration: "line-through", color: "var(--text-muted)" }}>{email.konu}</div>
                          {email.ozet && (
                            <div className="email-summary">✨ {email.ozet}</div>
                          )}
                          <div className="email-footer">
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span className="badge" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "var(--text-secondary)" }}>
                                {getCategoryIcon(email.kategori)}
                                {email.kategori || "İşlendi"}
                              </span>
                            </div>
                            <span className="badge" style={{ color: "#047857", background: "#d1fae5", border: "1px solid #a7f3d0" }}>
                              <CheckCircle2 size={12} /> İşlem Tamamlandı
                            </span>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════ CHAT VIEW ═══════ */}
          {activeNav === "chat" && (
            <div
              className="glass-panel fade-in"
              style={{ minHeight: "70vh" }}
            >
              <div className="panel-header">
                <h3>
                  <Sparkles size={18} /> SmartFlow AI Chatbot
                </h3>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Groq Llama 3.3 70B
                </span>
              </div>
              <div className="chatbot-container">
                <div
                  className="chat-messages"
                  style={{ maxHeight: "55vh", minHeight: "55vh" }}
                >
                  {chatMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      className={`chat-bubble ${msg.role}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {msg.role === "ai" && (
                        <div className="ai-label">SmartFlow AI</div>
                      )}
                      {msg.text}
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <div className="chat-bubble ai">
                      <div className="ai-label">SmartFlow AI</div>
                      <Loader2
                        size={16}
                        className="spinning"
                        style={{ display: "inline-block" }}
                      />{" "}
                      Düşünüyorum...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="chat-input-area">
                  <input
                    className="chat-input"
                    placeholder="Bir soru sorun... (Örn: Bugün gelen önemli mailleri özetle)"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                    disabled={chatLoading}
                  />
                  <button
                    className="chat-send-btn"
                    onClick={handleChatSend}
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* ═══════ FLOATING CHAT WIDGET ═══════ */}
          <div className={`floating-chat-widget ${isChatOpen ? "open" : ""}`}>
            <AnimatePresence>
              {isChatOpen && (
                <motion.div
                  className="floating-chat-window glass-panel"
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}><MessageSquare size={18} /> AI Asistan</h3>
                    <button className="btn-ghost" onClick={() => setIsChatOpen(false)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px" }}>
                      ✕
                    </button>
                  </div>
                  <div className="chatbot-container" style={{ display: "flex", flexDirection: "column", height: "400px" }}>
                    <div className="chat-messages" style={{ flex: 1, overflowY: "auto" }}>
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`chat-bubble ${msg.role}`}>
                          {msg.role === "ai" && (
                            <div className="ai-label">SmartFlow AI</div>
                          )}
                          {msg.text}
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="chat-bubble ai">
                          <div className="ai-label">SmartFlow AI</div>
                          <Loader2 size={16} className="spinning" style={{ display: "inline-block" }} />{" "}
                          Düşünüyorum...
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="chat-input-area">
                      <input
                        className="chat-input"
                        placeholder="Bir soru sorun..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                        disabled={chatLoading}
                      />
                      <button
                        className="chat-send-btn"
                        onClick={handleChatSend}
                        disabled={chatLoading || !chatInput.trim()}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              className="chat-fab"
              onClick={() => setIsChatOpen(!isChatOpen)}
              title="AI Asistan"
            >
              <MessageSquare size={24} />
            </button>
          </div>

          {/* ═══════ DETAILS MODAL ═══════ */}
          <AnimatePresence>
            {detailsModal.isOpen && detailsModal.email && (
              <motion.div
                className="modal-backdrop fade-in"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDetailsModal({ isOpen: false, email: null })}
                style={{
                  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                  zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <motion.div
                  className="modal-content glass-panel"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "90%", maxWidth: "600px", padding: "24px",
                    borderRadius: "var(--radius-lg)", border: "1px solid var(--border-glass)",
                    background: "var(--bg-secondary)", color: "var(--text-primary)",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "12px",
                        background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "white",
                        fontSize: "20px", fontWeight: "bold"
                      }}>
                        {detailsModal.email.gonderen.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "4px" }}>{detailsModal.email.gonderen}</h2>
                        <span className="badge badge-meeting" style={{ padding: "2px 8px", fontSize: "11px" }}><Calendar size={12} style={{ marginRight: 4 }} /> Toplantı Detayı</span>
                      </div>
                    </div>
                    <button className="btn-ghost" onClick={() => setDetailsModal({ isOpen: false, email: null })} style={{ padding: "4px", background: "var(--bg-primary)", borderRadius: "50%" }}>
                      ✕
                    </button>
                  </div>

                  <div style={{ background: "var(--bg-primary)", padding: "16px", borderRadius: "12px", marginBottom: "16px", border: "1px solid var(--border-glass)" }}>
                    <div style={{ marginBottom: "12px", borderBottom: "1px solid var(--border-glass)", paddingBottom: "12px" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600, letterSpacing: "0.5px" }}>KONU</div>
                      <div style={{ fontSize: "15px", fontWeight: 500 }}>{detailsModal.email.konu}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600, letterSpacing: "0.5px" }}>TARİH VE SAAT</div>
                      <div style={{ color: "var(--accent-indigo)", fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={16} />
                        {detailsModal.email.toplantiTarihi && !isNaN(new Date(detailsModal.email.toplantiTarihi).getTime())
                          ? new Date(detailsModal.email.toplantiTarihi).toLocaleString("tr-TR", { dateStyle: "full", timeStyle: "short" })
                          : (detailsModal.email.toplantiTarihi || "Belirtilmemiş")}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.5px" }}>YAPAY ZEKA ÖZETİ</div>
                    <div style={{
                      background: "rgba(99, 102, 241, 0.05)",
                      padding: "16px",
                      borderRadius: "12px",
                      borderLeft: "4px solid var(--accent-indigo)",
                      lineHeight: 1.6,
                      fontSize: "14px"
                    }}>
                      ✨ {detailsModal.email.ozet || "Özet bulunmuyor."}
                    </div>
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px", fontWeight: 600, letterSpacing: "0.5px" }}>
                      <Sparkles size={14} color="var(--accent-indigo)" /> AI HIZLI YANIT TASLAKLARI
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ border: "1px solid var(--border-glass)", fontSize: "13px", padding: "8px 14px", background: "var(--bg-primary)" }}
                        onClick={() => handleAutomatedReply(detailsModal.email, "Olumlu Dönüş")}
                      >
                        👍 Olumlu Dönüş Yap
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ border: "1px solid var(--border-glass)", fontSize: "13px", padding: "8px 14px", background: "var(--bg-primary)" }}
                        onClick={() => handleAutomatedReply(detailsModal.email, "Farklı Tarih Önerisi")}
                      >
                        📅 Farklı Tarih Öner
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ border: "1px solid var(--border-glass)", fontSize: "13px", padding: "8px 14px", background: "var(--bg-primary)" }}
                        onClick={() => handleAutomatedReply(detailsModal.email, "Bilgi Talebi")}
                      >
                        ❓ Daha Fazla Bilgi İste
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border-glass)", paddingTop: "16px" }}>
                    <button className="btn btn-ghost" onClick={() => setDetailsModal({ isOpen: false, email: null })}>
                      Kapat
                    </button>
                    {renderActionButton(detailsModal.email)}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════ SPOTLIGHT SEARCH MODAL ═══════ */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                className="modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSearchOpen(false)}
                style={{
                  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
                  zIndex: 10000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh"
                }}
              >
                <motion.div
                  className="modal-content glass-panel"
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "90%", maxWidth: "650px", padding: 0, overflow: "hidden",
                    borderRadius: "16px", border: "1px solid var(--border-glass)",
                    background: "var(--bg-secondary)", color: "var(--text-primary)",
                    boxShadow: "0 25px 50px rgba(0,0,0,0.3)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border-glass)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", marginRight: "12px" }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input
                      autoFocus
                      type="text"
                      placeholder="E-postalarda ara... (Gönderen, konu veya içerik)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        flex: 1, background: "transparent", border: "none", outline: "none",
                        fontSize: "16px", color: "var(--text-primary)"
                      }}
                    />
                    <div style={{ fontSize: "11px", background: "var(--bg-primary)", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border-glass)", color: "var(--text-muted)" }}>ESC</div>
                  </div>

                  {searchQuery && (
                    <div style={{ padding: "8px", maxHeight: "400px", overflowY: "auto" }}>
                      {searchResults.length > 0 ? (
                        searchResults.map((email) => (
                          <div
                            key={email.id}
                            style={{
                              padding: "12px 16px", borderRadius: "8px", cursor: "pointer",
                              display: "flex", flexDirection: "column", gap: "4px"
                            }}
                            className="search-result-item"
                            onClick={() => {
                              setIsSearchOpen(false);
                              setDetailsModal({ isOpen: true, email });
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 600, fontSize: "14px" }}>{email.gonderen}</span>
                              {email.kategori && (
                                <span className="badge" style={{ fontSize: "10px", padding: "2px 6px" }}>{email.kategori}</span>
                              )}
                            </div>
                            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{email.konu}</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                          Sonuç bulunamadı
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════ AI REPORT MODAL ═══════ */}
          <AnimatePresence>
            {reportState.isOpen && (
              <motion.div
                className="modal-backdrop fade-in"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                  background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
                  zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <motion.div
                  className="modal-content glass-panel"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    width: "400px", padding: "40px 30px", textAlign: "center",
                    borderRadius: "20px", border: "1px solid rgba(99, 102, 241, 0.5)",
                    background: "var(--bg-secondary)", color: "var(--text-primary)",
                    boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 40px rgba(99, 102, 241, 0.2)"
                  }}
                >
                  <div style={{ marginBottom: "24px" }}>
                    {reportState.step === 4 ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ display: "inline-block", background: "var(--accent-emerald)", color: "white", padding: "16px", borderRadius: "50%", marginBottom: "16px" }}>
                        <Download size={40} />
                      </motion.div>
                    ) : (
                      <div className="spinner" style={{ width: "60px", height: "60px", borderWidth: "4px", borderColor: "rgba(99, 102, 241, 0.1)", borderTopColor: "var(--accent-indigo)", margin: "0 auto 20px auto" }} />
                    )}
                  </div>

                  <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px", color: reportState.step === 4 ? "var(--accent-emerald)" : "var(--text-primary)" }}>
                    {reportState.step === 1 && "Veriler Toplanıyor..."}
                    {reportState.step === 2 && "Yapay Zeka Analiz Ediyor..."}
                    {reportState.step === 3 && "Grafikler Derleniyor..."}
                    {reportState.step === 4 && "Rapor İndirildi!"}
                  </h2>

                  <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>
                    {reportState.step !== 4
                      ? "SmartFlow AI tüm performansınızı ve istatistiklerinizi analiz ederek yönetici raporunu hazırlıyor. Lütfen bekleyin."
                      : "Rapor başarıyla oluşturuldu ve bilgisayarınıza 'SmartFlow_Yonetici_Raporu.txt' olarak indirildi."}
                  </p>

                  {reportState.step !== 4 && (
                    <div style={{ width: "100%", height: "4px", background: "rgba(99,102,241,0.2)", borderRadius: "2px", marginTop: "30px", overflow: "hidden" }}>
                      <motion.div
                        style={{ height: "100%", background: "var(--accent-indigo)" }}
                        initial={{ width: "0%" }}
                        animate={{ width: reportState.step === 1 ? "30%" : reportState.step === 2 ? "60%" : "90%" }}
                        transition={{ duration: 1.5 }}
                      />
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* Sticky Notes Katmanı */}
        <div className="sticky-notes-container">
          {stickyNotes.map((note) => (
            <motion.div
              key={note.id}
              drag
              dragMomentum={false}
              initial={{ x: note.x, y: note.y, opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                height: note.minimized ? "40px" : "200px",
                width: note.minimized ? "150px" : "200px"
              }}
              className="sticky-note"
              style={{ backgroundColor: note.color, overflow: "hidden" }}
            >
              <div className="sticky-note-header">
                <div className="drag-handle" style={{ opacity: note.minimized ? 0.5 : 1 }} />
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => toggleMinimizeStickyNote(note.id)} className="note-action-btn">
                    <Minus size={14} />
                  </button>
                  <button onClick={() => deleteStickyNote(note.id)} className="note-action-btn close">×</button>
                </div>
              </div>
              <AnimatePresence>
                {!note.minimized && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ flex: 1, display: "flex", flexDirection: "column" }}
                  >
                    <textarea
                      value={note.text}
                      onChange={(e) => updateStickyNote(note.id, e.target.value)}
                      placeholder="Notunuz..."
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}
