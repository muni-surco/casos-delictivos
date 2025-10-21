import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Loader2 } from "lucide-react";
import type { CrimeCase } from "@shared/api";
import { CasesAPI } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

interface Props {
  caseItem: CrimeCase;
  onUploaded?: () => void;
}

export default function VideoUploader({ caseItem, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const allowed = new Set([
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/3gpp",
    ]);
    const valid = files.filter((f) => allowed.has((f.type || "").toLowerCase()));
    const invalid = files.filter((f) => !allowed.has((f.type || "").toLowerCase()));
    if (invalid.length) {
      const names = invalid.map((i) => i.name).join(", ");
      toast({ 
        title: "Formato no permitido", 
        description: `Estos archivos no son válidos: ${names}`,
        variant: "destructive" 
      });
    }
    if (!valid.length) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (!files.length) return;
    setLoading(true);
    try {
      const res = await CasesAPI.uploadMedia(caseItem.id, { videos: valid });
      const rejected = (res.warnings || []).find((w: any) => w.type === "rejected_uploads");
      if (rejected && rejected.items?.length) {
        const names = rejected.items.map((i: any) => i.originalname).join(", ");
        toast({
          title: "Formato no permitido",
          description: `Estos archivos fueron rechazados: ${names}`,
          variant: "destructive"
        });
      } else {
        // Mostrar mensaje de éxito
        const count = valid.length;
        toast({
          title: "✓ Videos subidos",
          description: `${count} ${count === 1 ? 'video ha' : 'videos han'} sido agregado${count === 1 ? '' : 's'} correctamente`,
        });
      }
      onUploaded?.();
    } catch (error) {
      toast({
        title: "Error al subir videos",
        description: "Ocurrió un error al subir los videos. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="video/*" multiple className="hidden" onChange={onChange} />
      <Button type="button" variant="secondary" onClick={onPick} disabled={loading}>
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Video className="w-4 h-4" />} Agregar videos
      </Button>
    </div>
  );
}