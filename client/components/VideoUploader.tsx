import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Loader2 } from "lucide-react";
import type { CrimeCase } from "@shared/api";
import { CasesAPI } from "@/lib/api";

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
    if (!files.length) return;
    setLoading(true);
    try {
      await CasesAPI.uploadMedia(caseItem.id, { videos: files });
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
