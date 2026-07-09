import brightIqLogoRaw from "../assets/brightiq-logo.svg?raw";
import arvonasLogoBeyaz from "../assets/arvonas-logo_beyaz.png";
import arvonasLogoKoyu from "../assets/arvonas-logo_koyu.png";
import { cn } from "../utils";

const themedBrightIqLogo = brightIqLogoRaw.replace("fill:#0b0b3b", "fill:currentColor");

interface BrightIqLogoProps {
  className?: string;
}

export function BrightIqLogo({ className }: BrightIqLogoProps) {
  return (
    <div
      className={cn("brand-brightiq-logo [&_svg]:h-auto [&_svg]:w-full", className)}
      aria-label="BRIGHTIQ"
      dangerouslySetInnerHTML={{ __html: themedBrightIqLogo }}
    />
  );
}

interface ArvonasLogoProps {
  className?: string;
}

export function ArvonasLogo({ className }: ArvonasLogoProps) {
  return (
    <div className={cn("relative", className)} aria-label="Arvonas Technology">
      <img
        src={arvonasLogoBeyaz}
        alt="Arvonas Technology"
        className="brand-arvonas-logo-light h-full w-full object-contain"
      />
      <img
        src={arvonasLogoKoyu}
        alt="Arvonas Technology"
        className="brand-arvonas-logo-dark h-full w-full object-contain"
      />
    </div>
  );
}
