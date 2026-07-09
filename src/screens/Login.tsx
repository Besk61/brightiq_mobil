import { motion } from "motion/react";
import { Mail, Lock } from "lucide-react";
import React, { useState } from "react";
import { ArvonasLogo, BrightIqLogo } from "../components/BrandLogo";

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<void>;
};

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onLogin(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || "Giriş sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-bg-light flex-col items-center justify-center p-6 h-screen w-full">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-10">
          <BrightIqLogo className="w-full max-w-[190px] mb-3" />
          <ArvonasLogo className="h-8 w-40 mb-3" />
          <p className="text-text-muted mt-1 text-sm text-center">Giriş yapmak için e-posta ve şifrenizi kullanın</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase px-1">E-Posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@demofabrika.com"
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-text-dark transition-all"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase px-1">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-text-dark transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-primary text-white rounded-xl font-medium shadow-md shadow-primary/20 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
