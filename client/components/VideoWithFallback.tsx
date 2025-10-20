import { useState } from "react";

interface Props {
  src?: string;
  iframeSrc?: string;
  onClick?: () => void;
  controlsClassName?: string;
}

export default function VideoWithFallback({ src, iframeSrc, onClick, controlsClassName }: Props) {
  const [failed, setFailed] = useState(false);

  if (!failed && src) {
    return (
      <video 
        onClick={onClick} 
        src={src} 
        className={controlsClassName || "w-full h-full object-cover cursor-zoom-in"} 
        controls 
        preload="metadata" 
        playsInline 
        referrerPolicy="no-referrer" 
        onError={() => setFailed(true)} 
      />
    );
  }

  if (iframeSrc) {
    return (
      <iframe 
        src={iframeSrc} 
        className={controlsClassName || "w-full h-full"} 
        allow="autoplay"
        title="Video preview"
      />
    );
  }

  return (
    <div className={controlsClassName || "w-full h-full flex items-center justify-center text-sm text-muted-foreground"}>
      No se pudo cargar el video.
    </div>
  );
}