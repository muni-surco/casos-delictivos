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
      toast({ title: "Formato no permitido", description: `Estos archivos no son válidos: ${names}` });
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
        });
      }
      onUploaded?.();
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
