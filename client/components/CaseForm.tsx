import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MapPicker from "@/components/MapPicker";
import { Calendar, Loader2 } from "lucide-react";
import type { CrimeCase, CreateCaseInput, CaseStatus } from "@shared/api";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, UploadCloud } from "lucide-react";
import { toDriveIframePreview, toImagePreviewUrl, toVideoPreviewUrl } from "@/lib/utils";
import VideoWithFallback from "@/components/VideoWithFallback";
import { crimeTypes } from "@shared/constants";

interface Props {
  data?: CrimeCase;
  activeTab?: string;
  onSubmit: (data: CrimeCase) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  onUpload?: (c: CrimeCase) => void;  // Make it optional
  onMediaDelete?: (caseId: string, mediaId: string) => void;
}

export default function CaseForm({ data, onSubmit, onCancel, onDelete, onUpload, onMediaDelete }: Props) {
  const [loading, setLoading] = useState(false);
  // Inicializar el estado con los valores por defecto o los datos del caso
  const [formData, setFormData] = useState(() => ({
    code: data?.code !== undefined ? String(data.code) : "",
    title: data?.title ?? "",
    place: data?.place ?? "",
    description: data?.description ?? "",
    crimeType: data?.crimeType ?? "Robo",
    date: data?.date ?? new Date().toISOString().slice(0, 10),
    hour: data?.hour ?? "12:00",
    status: data?.status ?? "Open" as CaseStatus,
    latitude: data?.latitude !== undefined ? String(data.latitude) : "",
    longitude: data?.longitude !== undefined ? String(data.longitude) : "",
    suspect: data?.suspect ?? "",
    victim: data?.victim ?? "",
    cuadrante: data?.cuadrante !== undefined ? String(data.cuadrante) : "",
    sector: data?.sector !== undefined ? String(data.sector) : "",
    escapeRoute: data?.escapeRoute ?? "",
    suspectDescription: data?.suspectDescription ?? ""
  }));

  // Actualizar el formulario cuando cambia data
  useEffect(() => {
    if (data) {
      setFormData({
        code: data.code !== undefined ? String(data.code) : "",
        title: data.title ?? "",
        place: data.place ?? "",
        description: data.description ?? "",
        crimeType: data.crimeType ?? "Robo",
        date: data.date ?? new Date().toISOString().slice(0, 10),
        hour: data.hour ?? "12:00",
        status: data.status ?? "Open",
        latitude: data.latitude !== undefined ? String(data.latitude) : "",
        longitude: data.longitude !== undefined ? String(data.longitude) : "",
        suspect: data.suspect ?? "",
        victim: data.victim ?? "",
        cuadrante: data.cuadrante !== undefined ? String(data.cuadrante) : "",
        sector: data.sector !== undefined ? String(data.sector) : "",
        escapeRoute: data.escapeRoute ?? "",
        suspectDescription: data.suspectDescription ?? ""
      });
    }
  }, [data]);

  // Función helper para actualizar el formulario
  const updateForm = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      // Format the payload carefully to match the API expectations
      const payload = {
        id: data?.id,
        code: formData.code ? Number(formData.code) : undefined,
        title: formData.title || undefined,
        place: formData.place || undefined,
        description: formData.description || undefined,
        crimeType: formData.crimeType || undefined,
        date: formData.date || undefined,
        hour: formData.hour || undefined,
        status: formData.status as CaseStatus,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        suspect: formData.suspect || undefined,
        victim: formData.victim || undefined,
        cuadrante: formData.cuadrante ? Number(formData.cuadrante) : undefined,
        sector: formData.sector ? Number(formData.sector) : undefined,
        escapeRoute: formData.escapeRoute || undefined,
        suspectDescription: formData.suspectDescription || undefined
        // Remove media field from payload as it's handled separately
      };

      // Remove any undefined values and media field
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([key, v]) => v !== undefined && key !== 'media')
      );

      await onSubmit(cleanPayload as CrimeCase);
    } catch (error) {
      console.error('Error submitting form:', error);
      // Here you might want to show an error message to the user
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[1000px]">
      <DialogHeader>
        <DialogTitle>{data ? "Editar caso" : "Nuevo caso"}</DialogTitle>
      </DialogHeader>
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="evidence">Evidencias</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna izquierda: Formulario */}
            <div className="space-y-4">
              <form id="case-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Código</Label>
                    <Input 
                      id="code" 
                      type="number" 
                      value={formData.code}
                      onChange={(e) => updateForm('code', e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input 
                      id="title" 
                      value={formData.title}
                      onChange={(e) => updateForm('title', e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="crimeType">Tipo de delito</Label>
                    <Select value={formData.crimeType} onValueChange={(v) => updateForm('crimeType', v)}>
                      <SelectTrigger id="crimeType"><SelectValue placeholder="Tipo de delito" /></SelectTrigger>
                      <SelectContent>
                        {crimeTypes.map((ct) => (
                          <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Estado</Label>
                    <Select value={formData.status} onValueChange={(v) => updateForm('status', v as CaseStatus)}>
                      <SelectTrigger id="status"><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Abierto</SelectItem>
                        <SelectItem value="Investigating">Investigando</SelectItem>
                        <SelectItem value="Closed">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" rows={3} value={formData.description} onChange={(e) => updateForm('description', e.target.value)} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitud</Label>
                    <Input 
                      id="latitude" 
                      type="number" 
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => updateForm('latitude', e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitud</Label>
                    <Input 
                      id="longitude" 
                      type="number" 
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => updateForm('longitude', e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="place">Lugar</Label>
                  <Input 
                    id="place" 
                    value={formData.place}
                    onChange={(e) => updateForm('place', e.target.value)}
                  />
                </div>

                <div className="grid md:grid-cols-6 gap-4">
                  <div className="md:col-span-3">
                    <Label htmlFor="suspect">Sospechoso</Label>
                    <Input id="suspect" value={formData.suspect} onChange={(e) => updateForm('suspect', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="victim">Víctima</Label>
                    <Input id="victim" value={formData.victim} onChange={(e) => updateForm('victim', e.target.value)} />
                  </div>
                  <div className="md:col-span-1">
                    <Label htmlFor="cuadrante">Cuadrante</Label>
                    <Input id="cuadrante" type="number" value={formData.cuadrante} onChange={(e) => updateForm('cuadrante', e.target.value)} className="max-w-[5.5rem]" />
                  </div>
                </div>

                <div className="grid md:grid-cols-6 gap-4">
                  <div className="md:col-span-1">
                    <Label htmlFor="sector">Sector</Label>
                    <Input id="sector" type="number" value={formData.sector} onChange={(e) => updateForm('sector', e.target.value)} className="max-w-[5.5rem]" />
                  </div>
                  <div className="md:col-span-3">
                    <Label htmlFor="escapeRoute">Ruta de escape</Label>
                    <Input id="escapeRoute" value={formData.escapeRoute} onChange={(e) => updateForm('escapeRoute', e.target.value)} className="w-full" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="suspectDescription">Descrip. sospechoso</Label>
                    <Input id="suspectDescription" value={formData.suspectDescription} onChange={(e) => updateForm('suspectDescription', e.target.value)} className="w-full" />
                  </div>
                </div>

              </form>
            </div>

            {/* Columna derecha: Mapa */}
            <div className="space-y-2">
              <Label>Ubicación en el mapa</Label>
              <MapPicker
                initialLat={formData.latitude ? Number(formData.latitude) : null}
                initialLon={formData.longitude ? Number(formData.longitude) : null}
                onSelect={(lat, lon, address) => {
                  setFormData(prev => ({
                    ...prev,
                    latitude: String(lat),
                    longitude: String(lon),
                    place: address || prev.place
                  }));
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="evidence">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Evidencias ({data?.media?.length ?? 0})</h3>
              {data && (
                <Button 
                  onClick={() => onUpload?.(data)} 
                  variant="secondary"
                  disabled={!onUpload}
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Adjuntar evidencia
                </Button>
              )}
            </div>

            {data?.media && data.media.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {data.media.map((m) => (
                  <div key={m.id} className="relative group aspect-video rounded-md overflow-hidden bg-muted border border-slate-200">
                    {m.type === "image" ? (
                      <img 
                        src={toImagePreviewUrl(m.url)} 
                        alt={m.filename} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <VideoWithFallback 
                        src={toVideoPreviewUrl(m.url)} 
                        iframeSrc={toDriveIframePreview(m.url)} 
                        controlsClassName="w-full h-full object-cover" 
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    {onMediaDelete && (
                      <button
                        type="button"
                        onClick={() => onMediaDelete(data.id, m.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Eliminar evidencia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <div className="mb-4 text-muted-foreground">
                  <UploadCloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay evidencias adjuntas a este caso</p>
                </div>
                {data && (
                  <Button 
                    variant="outline" 
                    onClick={() => onUpload?.(data)}
                    disabled={!onUpload}
                  >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Adjuntar primera evidencia
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="case-form" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4 mr-2" />
              {data ? "Guardando..." : "Creando caso..."}
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Ejemplo de uso en el componente padre
function ParentComponent() {
  const [editingCase, setEditingCase] = useState<CrimeCase | undefined>();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEdit = (caso: CrimeCase) => {
    setEditingCase(caso); // Asegurarse de que esto tenga todos los datos, incluyendo media
    setIsEditModalOpen(true);
  };

  return (
    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
      <CaseForm
        data={editingCase}
        onSubmit={handleSubmit}
        onCancel={() => setIsEditModalOpen(false)}
        onDelete={handleDelete}
        onUpload={handleUpload}
        onMediaDelete={handleMediaDelete}
      />
    </Dialog>
  );
}
