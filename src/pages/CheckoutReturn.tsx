import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count <= 0) {
      navigate("/passenger", { replace: true });
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl border bg-card">
        {sessionId ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">Platba prijatá</h1>
            <p className="text-muted-foreground">
              Vaša rezervácia bola odoslaná vodičovi. O odpovedi vás budeme notifikovať.
            </p>
            <p className="text-sm text-muted-foreground">
              Presmerovanie o {count}s...
            </p>
            <Button onClick={() => navigate("/passenger")} className="w-full">
              Pokračovať
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
            <p>Neznáma platobná relácia.</p>
            <Button variant="outline" onClick={() => navigate("/passenger")}>Späť</Button>
          </>
        )}
      </div>
    </div>
  );
}
