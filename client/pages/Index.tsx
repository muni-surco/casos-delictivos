import { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrimeCase, CreateCaseInput } from "@shared/api";
import { CasesAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Filter, Images, Video as VideoIcon } from "lucide-react";
import CaseCard from "@/components/CaseCard";
import CaseForm from "@/components/CaseForm";
import CaseMap from "@/components/CaseMap";
import ImageUploader from "@/components/ImageUploader";
import VideoUploader from "@/components/VideoUploader";

export default function Index() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);
  const createGuardRef = useRef(0);
  const [editingCase, setEditingCase] = useState<CrimeCase | undefined>();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [uploadItem, setUploadItem] = useState<CrimeCase | null>(null);
  const uploadGuardRef = useRef(0);
  const [activeTab, setActiveTab] = useState("details");

  const { data, isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: CasesAPI.list,
    initialData: [],
    retry: false,
    refetchOnWindowFocus: false,
    onError: (err) => console.debug('Failed to fetch cases', err),
  });
  const items: any[] = data ?? [];

  const createMut = useMutation({
    mutationFn: (input: CreateCaseInput) => CasesAPI.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      setOpenCreate(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; input: Partial<CrimeCase> }) => CasesAPI.update(vars.id, vars.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      setEditingCase(undefined);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => CasesAPI.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });

  const deleteMediaMut = useMutation({
    mutationFn: (vars: { caseId: string; mediaId: string }) => CasesAPI.deleteMedia(vars.caseId, vars.mediaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });

  const refreshed = async () => {
    await qc.invalidateQueries({ queryKey: ["cases"] });
  };

  const filtered = useMemo(() => {
    return items.filter((c) => {
      const matchesSearch = search
        ? c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesStatus = status === "all" ? true : c.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, status]);

  useEffect(() => {
    document.title = "Dashboard de casos delictivos";
  }, []);

  // Handler para editar caso
  const handleEdit = (caso: CrimeCase) => {
    // Asegurarse de que tenemos todos los datos del caso
    setEditingCase({...caso}); // Crear una copia limpia
    setIsEditModalOpen(true);
  };

  // Handler para cerrar el modal
  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setEditingCase(undefined); // Limpiar el caso en edición
  };

  // Handler para guardar cambios
  const handleSubmit = async (data: CrimeCase) => {
    try {
      // Tu lógica para actualizar el caso
      await updateMut.mutateAsync({ id: editingCase!.id, input: data });
      handleCloseEdit();
      // Recargar la lista de casos si es necesario
    } catch (error) {
      console.error('Error al actualizar caso:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Casos delictivos</h1>
          <p className="text-muted-foreground text-sm">Registrar, rastrear y visualizar casos en un mapa interactivo. Adjunte imágenes y videos a cada caso.</p>
        </div>
        <Dialog open={openCreate} onOpenChange={(o) => {
            const now = Date.now();
            // prevent rapid re-open within 1500ms
            if (o) {
              if (now - createGuardRef.current < 1500) return;
            }
            createGuardRef.current = now;
            setOpenCreate(o);
          }}>
          <DialogTrigger asChild>
            <Button type="button">
              <Plus className="w-4 h-4" /> Nuevo caso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>Crear caso</DialogTitle>
            </DialogHeader>
            <CaseForm onSubmit={(d) => createMut.mutate(d)} onCancel={() => setOpenCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar casos" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="Open">Abierto</SelectItem>
              <SelectItem value="Investigating">Investigando</SelectItem>
              <SelectItem value="Closed">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="map">Mapa</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">{filtered.length} resultado(s)</div>
        </div>
        <Separator className="my-3" />
        <TabsContent value="list" className="space-y-3">
          {isLoading && <div className="text-sm text-muted-foreground">Cargando...</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">No hay casos todavía. Crea tu primer caso.</div>
          )}
          {filtered.map((c) => (
            <div key={c.id} className="space-y-2">
              <CaseCard
                data={c}
                onEdit={handleEdit}
                onDelete={(id) => deleteMut.mutate(id)}
                onUpload={(it) => setUploadItem(it)}
                onMediaDeleted={async (caseId, mediaId) => {
                  try {
                    await deleteMediaMut.mutateAsync({ caseId, mediaId });
                  } catch (e) {
                    console.error('delete media failed', e);
                  }
                }}
              />
            </div>
          ))}
        </TabsContent>
        <TabsContent value="map">
          <CaseMap items={filtered} />
        </TabsContent>
      </Tabs>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Editar caso</DialogTitle>
          </DialogHeader>
          {editingCase && (
            <CaseForm
              key={editingCase?.id} // Importante: forzar recreación del componente
              data={editingCase}
              onSubmit={handleSubmit}
              onCancel={handleCloseEdit}
              onDelete={(id) => deleteMut.mutate(id)}
              onUpload={(it) => setUploadItem(it)}
              onMediaDelete={async (caseId, mediaId) => {
                try {
                  await deleteMediaMut.mutateAsync({ caseId, mediaId });
                } catch (e) {
                  console.error('delete media failed', e);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!uploadItem} onOpenChange={(o) => {
        const now = Date.now();
        if (!o) {
          uploadGuardRef.current = now;
          if (!o) setUploadItem(null);
          return;
        }
        if (now - uploadGuardRef.current < 1500) return;
        uploadGuardRef.current = now;
      }}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Adjuntar evidencias</DialogTitle>
          </DialogHeader>
          {uploadItem && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <ImageUploader caseItem={uploadItem} onUploaded={refreshed} />
                <VideoUploader caseItem={uploadItem} onUploaded={refreshed} />
              </div>
              <p className="text-xs text-muted-foreground">Las imágenes y videos se almacenarán en /uploads. Para persistencia en producción, conecta un proveedor de almacenamiento.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
