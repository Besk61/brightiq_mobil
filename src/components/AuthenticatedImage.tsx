import { useEffect, useState } from "react";
import { fetchImageAsBlob } from "../api";
import { Loader2, Search } from "lucide-react";
import { cn } from "../utils";

interface AuthenticatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** The CDN URL (possibly requires x-access-token header). Null/undefined renders nothing. */
  src: string | null | undefined;
  /** The JWT auth token to use when fetching from CDN */
  authToken?: string;
  /** Fallback src shown when image fails to load */
  fallbackSrc?: string;
  /** Custom container classes */
  containerClassName?: string;
  /** If provided, renders an interactive overlay with a Search icon, and becomes clickable ONLY when fully loaded */
  onImageClick?: () => void;
  /** Icon to show on hover when clickable. Default is Search. Set to null to hide. */
  interactiveIcon?: React.ReactNode;
  /** Optional text shown under the loading spinner. */
  loadingLabel?: string;
}

/**
 * An <img> component that fetches images requiring authentication headers.
 * Shows a loading spinner while fetching or loading the image.
 * Prevents clicking until the image is fully loaded.
 */
export default function AuthenticatedImage({
  src,
  authToken,
  fallbackSrc,
  alt,
  className,
  containerClassName,
  onImageClick,
  interactiveIcon = <Search className="w-6 h-6 text-white drop-shadow-md" />,
  loadingLabel,
  ...rest
}: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHasError(false);

    if (!src) {
      setBlobUrl(null);
      setIsLoading(false);
      return;
    }

    // If it's not a CDN download URL, use directly
    if (!src.includes("download?path=")) {
      setBlobUrl(src);
      setIsLoading(true);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setBlobUrl(null);

    fetchImageAsBlob(src, authToken).then((url) => {
      if (cancelled) return;

      if (!url) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setBlobUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [src, authToken]);

  const displaySrc = hasError ? (fallbackSrc ?? undefined) : (blobUrl ?? undefined);
  const isInteractive = onImageClick && !isLoading && displaySrc;

  return (
    <div
      className={cn(
        "relative overflow-hidden group",
        containerClassName,
        isInteractive ? "cursor-pointer" : ""
      )}
      onClick={() => {
        if (isInteractive) {
          onImageClick();
        }
      }}
    >
      {displaySrc ? (
        <img
          {...rest}
          src={displaySrc}
          alt={alt}
          className={cn(
            className,
            isLoading ? "opacity-0" : "opacity-100",
            "transition-opacity duration-300"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      ) : null}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100/50 backdrop-blur-sm z-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          {loadingLabel && (
            <span className="text-xs font-medium text-text-muted">{loadingLabel}</span>
          )}
        </div>
      )}

      {/* Interactive Overlay */}
      {isInteractive && interactiveIcon && (
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-20">
          {interactiveIcon}
        </div>
      )}
    </div>
  );
}
