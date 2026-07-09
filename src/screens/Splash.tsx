import { motion } from "motion/react";
import { useEffect } from "react";
import { ArvonasLogo, BrightIqLogo } from "../components/BrandLogo";

export default function Splash({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex bg-bg-light flex-col items-center justify-center h-screen w-full relative px-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center w-full"
      >
        <BrightIqLogo className="w-full max-w-[240px]" />
        <h1 className="sr-only">BRIGHTIQ</h1>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-12 left-8 right-8 flex flex-col items-center"
      >
        <span className="text-text-muted text-xs font-semibold">By Arvonas Techonology</span>
        <ArvonasLogo className="mt-2 h-9 w-44" />
      </motion.div>
    </div>
  );
}
