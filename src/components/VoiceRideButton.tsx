import { useRef, useState } from "react";
import { Mic, Loader2, Square, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const MAPBOX_TOKEN = "pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g";

export interface VoiceRideResult {
  origin_text?: string | null;
  destination_text?: string | null;
  seats?: number | null;
  price?: number | null;
  departure_iso?: string | null;
}

interface Props {
  onApply: (result: {
    origin?: { address: string; lat: number; lng: number };
    destination?: { address: string; lat: number; lng: number };
    seats?: number;
    price?: number;
    departureLocal?: string; // YYYY-MM-DDTHH:mm for datetime-local
  }, transcript: string) => void;
}

async function geocode(query: string) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=sk&country=sk,cz,at,hu,pl&limit=1`;
  const r = await fetch(url);
  const j = await r.json();
  const f = j.features?.[0];
  if (!f) return null;
  return { address: f.place_name as string, lng: f.center[0] as number, lat: f.center[1] as number };
}

function isoToLocalInput(iso: string): string | undefined {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VoiceRideButton({ onApply }: Props) {
  const { toast } = useToast();
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 1500) {
          setState("idle");
          toast({ title: "Príliš krátke", description: "Nahrávaj aspoň sekundu.", variant: "destructive" });
          return;
        }
        await process(blob, mime);
      };
      rec.start();
      recorderRef.current = rec;
      setState("recording");
    } catch (e) {
      toast({ title: "Mikrofón", description: "Povoľ prístup k mikrofónu.", variant: "destructive" });
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      setState("processing");
    }
  };

  const process = async (blob: Blob, mime: string) => {
    try {
      const ext = mime.includes("mp4") ? "m4a" : "webm";
      const fd = new FormData();
      fd.append("file", blob, `recording.${ext}`);
      fd.append("now", new Date().toISOString());
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-parse-ride`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Chyba", description: json.error || "AI zlyhala.", variant: "destructive" });
        setState("idle");
        return;
      }
      const parsed: VoiceRideResult = json.parsed || {};
      const transcript: string = json.transcript || "";

      const patch: Parameters<typeof onApply>[0] = {};
      if (parsed.destination_text) {
        const g = await geocode(parsed.destination_text);
        if (g) patch.destination = g;
      }
      if (parsed.origin_text) {
        const g = await geocode(parsed.origin_text);
        if (g) patch.origin = g;
      }
      if (typeof parsed.seats === "number" && parsed.seats > 0) patch.seats = Math.min(8, Math.round(parsed.seats));
      if (typeof parsed.price === "number" && parsed.price >= 0) patch.price = parsed.price;
      if (parsed.departure_iso) {
        const local = isoToLocalInput(parsed.departure_iso);
        if (local) patch.departureLocal = local;
      }

      onApply(patch, transcript);
      toast({ title: "Vyplnené hlasom ✨", description: transcript.slice(0, 120) });
    } catch (e) {
      toast({ title: "Chyba", description: (e as Error).message, variant: "destructive" });
    } finally {
      setState("idle");
    }
  };

  if (state === "recording") {
    return (
      <Button type="button" variant="destructive" onClick={stop} className="gap-2">
        <Square className="w-4 h-4 fill-current" />
        <span className="flex items-center gap-2">
          Nahrávam
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
        </span>
      </Button>
    );
  }

  if (state === "processing") {
    return (
      <Button type="button" disabled variant="outline" className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Spracúvam…
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={start}
      className="gap-2 bg-gradient-to-r from-primary to-purple-500 text-white hover:opacity-90"
    >
      <Sparkles className="w-4 h-4" />
      <Mic className="w-4 h-4" />
      Vyplň hlasom
    </Button>
  );
}
