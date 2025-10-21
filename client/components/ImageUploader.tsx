import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2 } from "lucide-react";
import type { CrimeCase } from "@shared/api";
import { CasesAPI } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

interface Props {
  caseItem: CrimeCase;
  onUploaded?: () => void;
}

export default function ImageUploader({ caseItem, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
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
    
    setLoading(true);
    try {
      console.log('Uploading images...', valid.map(f => f.name));
      const res = await CasesAPI.uploadMedia(caseItem.id, { images: valid });
      console.log('Upload response:', res);
      
      // Check for rejected uploads
      const rejected = (res.warnings || []).find((w: any) => w.type === "rejected_uploads");
      if (rejected && rejected.items?.length) {
        const names = rejected.items.map((i: any) => i.originalname).join(", ");
        toast({
          title: "Formato no permitido",
          description: `Estos archivos fueron rechazados: ${names}`,
          variant: "destructive"
        });
      }
      
      // Always show success message if files were added
      const addedCount = res.added?.length || valid.length;
      if (addedCount > 0) {
        console.log('Showing success toast for', addedCount, 'images');
        toast({
          title: "✓ Imágenes subidas",
          description: `${addedCount} ${addedCount === 1 ? 'imagen ha' : 'imágenes han'} sido agregada${addedCount === 1 ? '' : 's'} correctamente`,
        });
      }
      
      // Call onUploaded callback
      if (onUploaded) {
        console.log('Calling onUploaded callback');
        onUploaded();
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Error al subir imágenes",
        description: error?.message || "Ocurrió un error al subir las imágenes. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onChange} />
      <Button type="button" variant="secondary" onClick={onPick} disabled={loading}>
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <ImagePlus className="w-4 h-4" />} Agregar imágenes
      </Button>
    </div>
  );
}