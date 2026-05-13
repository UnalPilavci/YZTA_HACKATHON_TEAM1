import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../services/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { Mail, Lock, User, ArrowRight, Zap, Sparkles, Loader2 } from "lucide-react";

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
      onLogin();
    } catch (err) {
      console.error(err);
      setError(
        err.code === "auth/invalid-credential"
          ? "E-posta veya şifre hatalı."
          : err.code === "auth/email-already-in-use"
            ? "Bu e-posta zaten kullanımda."
            : "Bir hata oluştu, lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Animated Background Orbs */}
      <div className="auth-orb orb-1"></div>
      <div className="auth-orb orb-2"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card glass-panel"
      >
        <div className="auth-header">
          <div className="auth-logo">
            <Zap size={32} color="white" />
          </div>
          <h1>SmartFlow AI</h1>
          <p>{isLogin ? "Yapay zeka asistanına tekrar hoş geldin." : "Verimlilik yolculuğuna bugün başla."}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="input-group"
              >
                <User className="input-icon" size={18} />
                <input
                  type="text"
                  placeholder="Ad Soyad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="input-group">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              placeholder="E-posta Adresi"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="auth-error">{error}</motion.div>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <Loader2 className="spinning" size={20} />
            ) : (
              <>
                {isLogin ? "Giriş Yap" : "Hesap Oluştur"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>{isLogin ? "Hesabın yok mu?" : "Zaten üye misin?"}</span>
          <button onClick={() => setIsLogin(!isLogin)} className="auth-toggle-btn">
            {isLogin ? "Şimdi Kayıt Ol" : "Giriş Yap"}
          </button>
        </div>

        <div className="auth-features">
          <div className="feature-tag"><Sparkles size={12} /> TEAM ONE</div>
          <div className="feature-tag"><Zap size={12} /> HACKATHON</div>
        </div>
      </motion.div>
    </div>
  );
}
