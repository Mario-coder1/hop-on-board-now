import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <SEO
        title="Stránka nenájdená — 404"
        description="Hľadaná stránka neexistuje. Vráť sa na úvod TakeMe."
        path={location.pathname}
        noindex
      />
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-6xl font-bold tracking-tight">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">
          Táto stránka neexistuje alebo bola presunutá.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Späť na úvod
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
