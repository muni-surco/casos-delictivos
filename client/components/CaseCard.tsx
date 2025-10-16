import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";
import { Trash2, Edit, MapPin, UploadCloud, ChevronLeft, ChevronRight } from "lucide-react";
import type { CrimeCase } from "@shared/api";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

function toEmbeddableUrl(url?: string) {
  if (!url) return url;
  try {
    const u = new URL(url);
    const hostname = u.hostname || '';
    if (hostname.includes('drive.google.com')) {
      // /file/d/FILEID/view or /file/d/FILEID
      const match = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
      // ?id=FILEID
      const id = u.searchParams.get('id');
      if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
      // fallback to original
      return url;
    }
    return url;
  } catch (e) {
    return url;
  }
}

interface Props {
  data: CrimeCase;
  onEdit: (c: CrimeCase) => void;
  onDelete: (id: string) => void;
  onUpload: (c: CrimeCase) => void;
  onMediaDeleted?: (caseId: string, mediaId: string) => void;
}

export default function CaseCard({ data, onEdit, onDelete, onUpload, onMediaDeleted }: Props) {
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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [confirmCaseOpen, setConfirmCaseOpen] = useState(false);

  // viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openConfirm = (mediaId: string) => {
    setSelectedMedia(mediaId);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMedia) return;
    setConfirmOpen(false);
    try {
      if (onMediaDeleted) await onMediaDeleted(data.id, selectedMedia);
    } catch (e) {
      console.error(e);
    } finally {
      setSelectedMedia(null);
    }
  };

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

  const prevViewer = () => setViewerIndex((i) => (i - 1 + data.media.length) % data.media.length);
  const nextViewer = () => setViewerIndex((i) => (i + 1) % data.media.length);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevViewer();
      if (e.key === "ArrowRight") nextViewer();
      if (e.key === "Escape") setViewerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, data.media.length]);

  return (
    <Card className="p-4 flex gap-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar archivo"
        description="¿Deseas eliminar este archivo multimedia? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onCancel={() => { setConfirmOpen(false); setSelectedMedia(null); }}
        onConfirm={handleConfirmDelete}
      />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight">{data.title} <span className="text-sm font-medium text-muted-foreground">#{data.code}</span></h3>
              <Badge className={cn("border", statusColor)}>{statusLabel(data.status)}</Badge>
              <Badge variant="secondary" className="ml-2">{data.crimeType}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{data.place ? `${data.place} — ` : ""}{data.description}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
              <div className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}</div>
              <div>{data.date} {data.hour}</div>
              <div>Cuad: {data.cuadrante ?? "—"} • Sec: {data.sector ?? "—"}</div>
            </div>
            { (data.suspect || data.victim) && (
              <div className="mt-2 text-sm">
                {data.suspect && <div><strong>Sospechoso:</strong> {data.suspect}</div>}
                {data.victim && <div><strong>Víctima:</strong> {data.victim}</div>}
                {data.escapeRoute && <div><strong>Ruta de escape:</strong> {data.escapeRoute}</div>}
                {data.suspectDescription && <div className="text-xs text-muted-foreground">{data.suspectDescription}</div>}
              </div>
            )}
          </div>
          <div className="shrink-0 flex gap-2">
            <UiButton variant="secondary" size="sm" onClick={() => onUpload(data)}>
              <UploadCloud className="w-4 h-4" /> Adjuntar Evidencias
            </UiButton>
            <UiButton variant="outline" size="sm" onClick={() => onEdit(data)}>
              <Edit className="w-4 h-4" /> Editar
            </UiButton>
            <UiButton variant="destructive" size="sm" onClick={() => setConfirmCaseOpen(true)}>
              <Trash2 className="w-4 h-4" /> Eliminar
            </UiButton>
            <ConfirmDialog
              open={confirmCaseOpen}
              title="Eliminar caso"
              description="¿Deseas eliminar este caso? Esta acción eliminará todos los datos asociados y no se puede deshacer."
              confirmLabel="Eliminar caso"
              cancelLabel="Cancelar"
              onCancel={() => setConfirmCaseOpen(false)}
              onConfirm={handleConfirmCaseDelete}
            />
          </div>
        </div>
        {data.media.length > 0 && (
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {data.media.slice(0, 12).map((m, idx) => (
              <div key={m.id} className="relative aspect-video rounded-md overflow-hidden bg-muted">
                {m.type === "image" ? (
                  <img onClick={() => openViewerAt(idx)} src={toEmbeddableUrl(m.url)} alt={m.filename} className="w-full h-full object-cover cursor-zoom-in" />
                ) : (
                  <video onClick={() => openViewerAt(idx)} src={toEmbeddableUrl(m.url)} className="w-full h-full object-cover cursor-zoom-in" />
                )}
                <div className="absolute top-1 right-1">
                  <button
                    type="button"
                    onClick={() => openConfirm(m.id)}
                    className="inline-flex items-center justify-center rounded-full bg-white/80 hover:bg-white p-1 text-rose-600 shadow"
                    aria-label="Delete media"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6m-5 0V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={viewerOpen} onOpenChange={(o) => setViewerOpen(o)}>
          <DialogContent className="max-w-4xl w-full">
            <DialogHeader>
              <DialogTitle>{data.title} — Evidencia {viewerIndex + 1} / {data.media.length}</DialogTitle>
            </DialogHeader>
            <div className="py-4 flex items-center justify-center gap-4">
              <button aria-label="Anterior" onClick={prevViewer} className="p-2 rounded bg-white/80 hover:bg-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="max-h-[70vh] max-w-[90%] flex items-center justify-center">
                {data.media[viewerIndex] && data.media[viewerIndex].type === 'image' ? (
                  <img src={toEmbeddableUrl(data.media[viewerIndex].url)} alt={data.media[viewerIndex].filename} className="max-h-[70vh] max-w-full object-contain" />
                ) : (
                  <video src={toEmbeddableUrl(data.media[viewerIndex]?.url)} controls className="max-h-[70vh] max-w-full object-contain" />
                )}
              </div>
              <button aria-label="Siguiente" onClick={nextViewer} className="p-2 rounded bg-white/80 hover:bg-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{data.media[viewerIndex]?.filename}</div>
              <DialogClose asChild>
                <button className="p-2 rounded bg-white/80 hover:bg-white">Cerrar</button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
