import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";
import { Trash2, Edit, MapPin, UploadCloud, ChevronLeft, ChevronRight } from "lucide-react";
import type { CrimeCase } from "@shared/api";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";

function extractDriveId(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('drive.google.com')) return null;
    const match = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (match) return match[1];
    const id = u.searchParams.get('id');
    if (id) return id;
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[A-Za-z0-9_-]{20,}$/.test(last)) return last;
    return null;
  } catch {
    return null;
  }
}

function toImagePreviewUrl(url?: string) {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  return url;
}

function toVideoPreviewUrl(url?: string) {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  return url;
}

function toDriveIframePreview(url?: string) {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  return undefined;
}

function VideoWithFallback({ src, iframeSrc, onClick, controlsClassName }: { src?: string; iframeSrc?: string; onClick?: () => void; controlsClassName?: string }) {
  const [failed, setFailed] = useState(false);
  if (!failed && src) {
    return (
      <video onClick={onClick} src={src} className={controlsClassName || "w-full h-full object-cover cursor-zoom-in"} controls preload="metadata" playsInline referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    );
  }
  if (iframeSrc) {
    return (
      <iframe src={iframeSrc} className={controlsClassName || "w-full h-full"} allow="autoplay" />
    );
  }
  return (
    <div className={controlsClassName || "w-full h-full flex items-center justify-center text-sm text-muted-foreground"}>No se pudo cargar el video.</div>
  );
}

/* MiniMap: usa el embed público de OpenStreetMap (sin claves). Oculto en pantallas pequeñas. */
function MiniMap({ lat, lon, zoom = 14 }: { lat?: number | null; lon?: number | null; zoom?: number }) {
  if (lat == null || lon == null) {
    return <div className="w-48 h-32 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-muted-foreground">Sin coordenadas</div>;
  }

  // Configurar el bbox (bounding box) para el área del mapa
  const delta = 0.005 * Math.max(1, 14 - Math.min(zoom, 18)); // ajusta el área visible
  const bbox = {
    left: lon - delta,
    bottom: lat - delta,
    right: lon + delta,
    top: lat + delta
  };

  // URL del iframe con los parámetros necesarios
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.left},${bbox.bottom},${bbox.right},${bbox.top}&layer=mapnik&marker=${lat},${lon}`;

  // URL para abrir en nueva pestaña
  const fullUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;

  return (
    <a 
      href={fullUrl}
      target="_blank" 
      rel="noopener noreferrer" 
      className="group inline-block rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors"
      style={{ width: '192px', height: '128px' }}
    >
      <div className="relative w-full h-full">
        <iframe
          src={src}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
        />
      </div>
    </a>
  );
}


interface Props {
  data: CrimeCase;
  onEdit: (c: CrimeCase) => void;
  onDelete: (id: string) => void;
  onUpload: (c: CrimeCase) => void;
  onMediaDeleted?: (caseId: string, mediaId: string) => void;
}

export default function CaseCard({ data, onEdit, onDelete, onUpload }: Props) {
  const statusColor =
    data.status === "Open"
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : data.status === "Investigating"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-emerald-100 text-emerald-800 border-emerald-200";

  const statusLabel = (s: string) => {
    if (!s) return s;
    if (s === "Open") return "Abierto";
    if (s === "Investigating") return "Investigando";
    if (s === "Closed") return "Cerrado";
    return s;
  };

  const [confirmCaseOpen, setConfirmCaseOpen] = useState(false);

  // viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleConfirmCaseDelete = async () => {
    setConfirmCaseOpen(false);
    try {
      onDelete(data.id);
    } catch (e) {
      console.error(e);
    }
  };

  const openViewerAt = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const prevViewer = () => setViewerIndex((i) => (i - 1 + (data.media?.length || 1)) % (data.media?.length || 1));
  const nextViewer = () => setViewerIndex((i) => (i + 1) % (data.media?.length || 1));

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevViewer();
      if (e.key === "ArrowRight") nextViewer();
      if (e.key === "Escape") setViewerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, data.media?.length]);

  const mainMedia = data.media && data.media.length > 0 ? data.media[0] : null;
  const thumbMedia = data.media ?? [];

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* LEFT: galería de evidencias + minimapa */}
        <div className="sm:col-span-2 flex flex-col gap-4">
          {/* Galería de evidencias */}
          <div className="rounded-md overflow-hidden bg-muted aspect-video flex items-center justify-center shadow-sm">
            {mainMedia ? (
              mainMedia.type === "image" ? (
                <img 
                  src={toImagePreviewUrl(mainMedia.url)} 
                  alt={mainMedia.filename} 
                  className="w-full h-full object-cover cursor-zoom-in" 
                  onClick={() => openViewerAt(0)} 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <VideoWithFallback 
                  src={toVideoPreviewUrl(mainMedia.url)} 
                  iframeSrc={toDriveIframePreview(mainMedia.url)} 
                  onClick={() => openViewerAt(0)} 
                />
              )
            ) : (
              <div className="p-4 text-sm text-muted-foreground">Sin evidencias</div>
            )}
          </div>

          {/* Miniaturas si hay más de una evidencia */}
          {thumbMedia.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {thumbMedia.slice(0, 8).map((m, idx) => (
                <button 
                  key={m.id} 
                  type="button" 
                  onClick={() => openViewerAt(idx)} 
                  className="rounded-md overflow-hidden bg-muted aspect-video flex items-center justify-center group border border-transparent hover:border-slate-200"
                >
                  {m.type === "image" ? (
                    <img 
                      src={toImagePreviewUrl(m.url)} 
                      alt={m.filename} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <VideoWithFallback 
                      src={toVideoPreviewUrl(m.url)} 
                      iframeSrc={toDriveIframePreview(m.url)} 
                      controlsClassName="w-full h-full object-cover" 
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {thumbMedia.length > 8 && (
            <div className="text-xs text-muted-foreground">
              Mostrando 8 de {thumbMedia.length} evidencias
            </div>
          )}

        </div>

        {/* RIGHT: details */}
        <div className="sm:col-span-3 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold leading-tight truncate">
                  {data.title ?? "Sin título"}
                </h3>
                <span className="text-sm text-muted-foreground">#{data.code}</span>
                <div className="flex items-center gap-2 ml-2">
                  <Badge className={cn("border", statusColor)}>
                    {statusLabel(data.status)}
                  </Badge>
                  <Badge variant="secondary">{data.crimeType}</Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2 line-clamp-3">{data.date} {data.hour}</div>
            </div>

            {/* Acciones - solo editar y eliminar */}
            <div className="shrink-0 flex flex-col items-end gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <UiButton variant="outline" size="sm" onClick={() => onEdit(data)}>
                  <Edit className="w-4 h-4" /> 
                  <span className="hidden sm:inline ml-2">Editar</span>
                </UiButton>
                <UiButton 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setConfirmCaseOpen(true)}
                >
                  <Trash2 className="w-4 h-4" /> 
                  <span className="hidden sm:inline ml-2">Eliminar</span>
                </UiButton>
              </div>
            </div>
          </div>

          {/* Metadata y detalles */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-x-2 gap-y-2 text-xs text-muted-foreground">
              <div className="flex flex-col gap-1 mt-2 text-sm"> 
              <div><strong>Descripción:</strong> <span className="ml-1">{data.description}</span></div>
              <div><strong>Ubicación:</strong> <span className="ml-1">{data.place ? `${data.place} ` : ""}</span></div>
              </div>
            {/* Información adicional */}
          {(data.suspect || data.victim || data.escapeRoute) && (
            <div className="flex flex-col gap-1 mt-2 text-sm">
              {data.suspect && (
                <div><strong>Sospechoso:</strong> <span className="ml-1">{data.suspect}</span></div>
              )}
              {data.victim && (
                <div><strong>Víctima:</strong> <span className="ml-1">{data.victim}</span></div>
              )}
              {data.escapeRoute && (
                <div><strong>Ruta de escape:</strong> <span className="ml-1">{data.escapeRoute}</span></div>
              )}
              {data.suspectDescription && (
                <div><strong>Descripción del sospechoso:</strong> <span className="ml-1">{data.suspectDescription}</span></div>
              )}
            </div>
          )}
          
          <div className="flex flex-col gap-1 mt-2 text-sm">
            <div><strong>Cuadrante:</strong> <span className="ml-1">{data.cuadrante ?? "—"}</span></div>
            <div><strong>Sector:</strong> <span className="ml-1">{data.sector ?? "—"}</span></div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span className="font-mono">
                {data.latitude != null && data.longitude != null 
                  ? `${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)}` 
                  : "—"}
              </span>
            </div>
          {/* Minimapa debajo de la galería */}
              <MiniMap lat={data.latitude ?? null} lon={data.longitude ?? null} />
            </div>
        </div>
        </div>
      </div>

      {/* Visor de evidencias */}
      <Dialog open={viewerOpen} onOpenChange={(o) => setViewerOpen(o)}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>
              {data.title} — Evidencia {viewerIndex + 1} / {data.media?.length ?? 0}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 flex items-center justify-center gap-4">
            <button 
              aria-label="Anterior" 
              onClick={prevViewer} 
              className="p-2 rounded bg-white/80 hover:bg-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="max-h-[70vh] max-w-[90%] flex items-center justify-center">
              {data.media && data.media[viewerIndex] && data.media[viewerIndex].type === 'image' ? (
                <img 
                  src={toImagePreviewUrl(data.media[viewerIndex].url)} 
                  alt={data.media[viewerIndex].filename} 
                  className="max-h-[70vh] max-w-full object-contain" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <VideoWithFallback 
                  src={toVideoPreviewUrl(data.media?.[viewerIndex]?.url)} 
                  iframeSrc={toDriveIframePreview(data.media?.[viewerIndex]?.url)} 
                  controlsClassName="max-h-[70vh] max-w-full object-contain" 
                />
              )}
            </div>
            <button 
              aria-label="Siguiente" 
              onClick={nextViewer} 
              className="p-2 rounded bg-white/80 hover:bg-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {data.media?.[viewerIndex]?.filename}
            </div>
            <DialogClose asChild>
              <button className="p-2 rounded bg-white/80 hover:bg-white">
                Cerrar
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar caso */}
      <ConfirmDialog
        open={confirmCaseOpen}
        title="Eliminar caso"
        description="¿Deseas eliminar este caso? Esta acción eliminará todos los datos asociados y no se puede deshacer."
        confirmLabel="Eliminar caso"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmCaseOpen(false)}
        onConfirm={handleConfirmCaseDelete}
      />
    </Card>
  );
}