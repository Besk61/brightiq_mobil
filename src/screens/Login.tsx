import { motion } from "motion/react";
import { Lock, Mail, X } from "lucide-react";
import React, { useState } from "react";
import { apiPost } from "../api";
import { ArvonasLogo, BrightIqLogo } from "../components/BrandLogo";

type LoginProps = {
  onLogin: (email: string, password: string, rememberMe: boolean) => Promise<void>;
};

const REMEMBERED_EMAIL_KEY = "brightiq_mobile_remembered_email";

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || "");
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      await onLogin(trimmedEmail, password, rememberMe);
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, trimmedEmail);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } catch (err: any) {
      setError(err?.message || "Giriş sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotMessage(null);
    setForgotLoading(true);

    try {
      await apiPost("/api/auth/forgot-password", { email: forgotEmail.trim() });
      setForgotMessage("E-posta kayıtlıysa geçici şifre gönderildi.");
    } catch (err: any) {
      setForgotError(err?.message || "Geçici şifre gönderilemedi.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-bg-light p-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="mb-10 flex flex-col items-center">
          <BrightIqLogo className="mb-3 w-full max-w-[190px]" />
          <ArvonasLogo className="mb-3 h-8 w-40" />
          <p className="mt-1 text-center text-sm text-text-muted">Giriş yapmak için e-posta ve şifrenizi kullanın</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="px-1 text-xs font-semibold uppercase text-text-muted">E-Posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@demofabrika.com"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-text-dark outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="px-1 text-xs font-semibold uppercase text-text-muted">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-text-dark outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 text-text-muted">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Beni hatırla
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email.trim());
                setForgotMessage(null);
                setForgotError(null);
                setIsForgotOpen(true);
              }}
              className="font-medium text-primary"
            >
              Şifremi unuttum
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-primary py-3 font-medium text-white shadow-md shadow-primary/20 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </motion.div>

      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4">
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6 w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-dark">Şifremi unuttum</h2>
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleForgotPassword}>
              <div className="space-y-1">
                <label className="px-1 text-xs font-semibold uppercase text-text-muted">E-Posta</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder="admin@demofabrika.com"
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-text-dark outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {forgotMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {forgotMessage}
                </div>
              )}
              {forgotError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {forgotError}
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-xl bg-primary py-3 font-medium text-white shadow-md shadow-primary/20 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {forgotLoading ? "Gönderiliyor..." : "Geçici Şifre Gönder"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
