import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, X, ServerCrash } from "lucide-react";
import { cn } from "../utils";
import AuthenticatedImage from "./AuthenticatedImage";

export interface NativeAlertData {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  type: "event" | "system";
  moduleName?: string;
}

interface NativeAlertModalProps {
  alert: NativeAlertData | null;
  authToken?: string;
  onClose: () => void;
  onView: () => void;
}

export default function NativeAlertModal({ alert, authToken, onClose, onView }: NativeAlertModalProps) {
  useEffect(() => {
    if (alert && alert.type === "system") {
      const timer = setTimeout(() => {
        onClose();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [alert, onClose]);

  return (
    <AnimatePresence>
      {alert && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-none p-4 pb-8 safe-pb">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 pointer-events-auto backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto",
              alert.type === "system" ? "border-2 border-danger" : "border border-gray-100"
            )}
          >
            <div className={cn(
              "px-5 py-4 flex items-center justify-between border-b",
              alert.type === "system" ? "bg-danger text-white border-danger" : "bg-white border-gray-100 text-text-dark"
            )}>
              <div className="flex items-center gap-2 font-bold">
                {alert.type === "system" ? <ServerCrash className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 text-warning" />}
                <span className={alert.type === "system" ? "text-white" : ""}>
                  {alert.title}
                </span>
              </div>
              <button 
                onClick={onClose}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  alert.type === "system" ? "hover:bg-white/20 text-white" : "hover:bg-gray-100 text-gray-400"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {alert.body}
              </p>

              {alert.imageUrl && (
                <AuthenticatedImage
                  src={alert.imageUrl}
                  authToken={authToken}
                  alt="Alert snapshot"
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-40 bg-gray-100 rounded-2xl overflow-hidden mb-4 border border-gray-200 shadow-inner"
                  loadingLabel="Resim yÃ¼kleniyor..."
                />
              )}

              {alert.moduleName && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                    {alert.moduleName}
                  </span>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                {alert.type === "event" && (
                  <button 
                    onClick={onView}
                    className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
                  >
                    Detayları İncele
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform",
                    alert.type === "event" ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-800"
                  )}
                >
                  Kapat
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
