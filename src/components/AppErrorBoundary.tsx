import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage?: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Keep console logs for debugging (useful on iOS Safari remote inspector)
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Caught error", error, info);
  }

  private reload = () => {
    window.location.reload();
  };

  private copy = async () => {
    try {
      await navigator.clipboard.writeText(this.state.errorMessage ?? "Unknown error");
    } catch {
      // ignore
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-12">
          <h1 className="font-display text-2xl font-bold">Niečo sa pokazilo</h1>
          <p className="text-muted-foreground mt-2">
            Aplikácia narazila na chybu a táto stránka sa nedala zobraziť.
          </p>

          {this.state.errorMessage && (
            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium">Chyba:</p>
              <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
                {this.state.errorMessage}
              </pre>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="hero" onClick={this.reload}>
              Obnoviť
            </Button>
            <Button variant="outline" onClick={this.copy}>
              Kopírovať chybu
            </Button>
          </div>
        </main>
      </div>
    );
  }
}
