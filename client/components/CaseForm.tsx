import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MapPicker from "@/components/MapPicker";
import { Calendar } from "lucide-react";
import type { CrimeCase, CreateCaseInput, CaseStatus } from "@shared/api";

interface Props {
  initial?: CrimeCase | null;
  onSubmit: (data: CreateCaseInput | Partial<CrimeCase>) => Promise<void> | void;
  onCancel?: () => void;
}

export default function CaseForm({ initial, onSubmit, onCancel }: Props) {
  const [code, setCode] = useState<string>(initial?.code !== undefined ? String(initial.code) : "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [crimeType, setCrimeType] = useState(initial?.crimeType ?? "Theft");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [hour, setHour] = useState(initial?.hour ?? "12:00");
  const [status, setStatus] = useState<CaseStatus>(initial?.status ?? "Open");
  const [latitude, setLatitude] = useState<string>(initial?.latitude !== undefined ? String(initial.latitude) : "");
  const [longitude, setLongitude] = useState<string>(initial?.longitude !== undefined ? String(initial.longitude) : "");
  const [suspect, setSuspect] = useState(initial?.suspect ?? "");
  const [victim, setVictim] = useState(initial?.victim ?? "");
  const [cuadrante, setCuadrante] = useState<string>(initial?.cuadrante !== undefined ? String(initial.cuadrante) : "");
  const [sector, setSector] = useState<string>(initial?.sector !== undefined ? String(initial.sector) : "");
  const [escapeRoute, setEscapeRoute] = useState(initial?.escapeRoute ?? "");
  const [suspectDescription, setSuspectDescription] = useState(initial?.suspectDescription ?? "");
  const [loading, setLoading] = useState(false);

  const crimeTypes = ["Robo", "Agresión", "Hurto", "Homicidio", "Vandalismo", "Delito de drogas", "Fraude", "Allanamiento"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        code: Number(code),
        title,
        place,
        description,
        crimeType,
        date,
        hour,
        status,
        latitude: latitude !== "" ? Number(latitude) : undefined,
        longitude: longitude !== "" ? Number(longitude) : undefined,
        suspect: suspect || undefined,
        victim: victim || undefined,
        cuadrante: cuadrante !== "" ? Number(cuadrante) : undefined,
        sector: sector !== "" ? Number(sector) : undefined,
        escapeRoute: escapeRoute || undefined,
        suspectDescription: suspectDescription || undefined,
      };
      await onSubmit(payload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <form id="case-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="code">Código</Label>
            <Input id="code" type="number" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="crimeType">Tipo de delito</Label>
            <Select value={crimeType} onValueChange={(v) => setCrimeType(v)}>
              <SelectTrigger id="crimeType"><SelectValue placeholder="Tipo de delito" /></SelectTrigger>
              <SelectContent>
                {crimeTypes.map((ct) => (
                  <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="place">Lugar</Label>
            <Input id="place" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="status">Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CaseStatus)}>
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
          <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div>
          <Label htmlFor="date">Fecha</Label>
          <div className="relative">
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <div className="absolute right-3 inset-y-0 pointer-events-none flex items-center">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
          <div>
            <Label htmlFor="hour">Hora</Label>
            <Input id="hour" type="time" value={hour} onChange={(e) => setHour(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="lat">Latitud</Label>
            <Input id="lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="lon">Longitud</Label>
            <Input id="lon" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
          </div>
        </div>

        <div className="grid md:grid-cols-6 gap-4">
          <div className="md:col-span-3">
            <Label htmlFor="suspect">Sospechoso</Label>
            <Input id="suspect" value={suspect} onChange={(e) => setSuspect(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="victim">Víctima</Label>
            <Input id="victim" value={victim} onChange={(e) => setVictim(e.target.value)} />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="cuadrante">Cuadrante</Label>
            <Input id="cuadrante" type="number" value={cuadrante} onChange={(e) => setCuadrante(e.target.value)} className="max-w-[5.5rem]" />
          </div>
        </div>

        <div className="grid md:grid-cols-6 gap-4">
          <div className="md:col-span-1">
            <Label htmlFor="sector">Sector</Label>
            <Input id="sector" type="number" value={sector} onChange={(e) => setSector(e.target.value)} className="max-w-[5.5rem]" />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="escapeRoute">Ruta de escape</Label>
            <Input id="escapeRoute" value={escapeRoute} onChange={(e) => setEscapeRoute(e.target.value)} className="w-full" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="suspectDescription">Descrip. sospechoso</Label>
            <Input id="suspectDescription" value={suspectDescription} onChange={(e) => setSuspectDescription(e.target.value)} className="w-full" />
          </div>
        </div>

      </form>

      <div>
        <div className="mb-2">
          <div className="text-sm font-medium">Seleccionar ubicación</div>
        </div>
        <div className="h-[420px] w-full overflow-hidden rounded-lg border">
          <MapPicker
            initialLat={latitude !== "" ? Number(latitude) : null}
            initialLon={longitude !== "" ? Number(longitude) : null}
            onSelect={(lat, lon, addr) => {
              setLatitude(String(lat));
              setLongitude(String(lon));
              if (addr) setPlace(addr);
            }}
          />
        </div>
      </div>

      <div className="md:col-span-2 flex justify-end mt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        )}
        <Button type="submit" form="case-form" disabled={loading} className="ml-2">{initial ? "Guardar cambios" : "Crear caso"}</Button>
      </div>
    </div>
  );
}
