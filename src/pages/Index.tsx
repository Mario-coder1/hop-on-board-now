import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallBanner from "@/components/InstallBanner";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SEO from "@/components/SEO";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const onlineCount = useOnlineUsers();
  const { t } = useLanguage();

  useEffect(() => {
    if (loading) return;

    if (user && profile) {
      if (profile.selected_role === "driver") {
        navigate("/driver", { replace: true });
      } else if (profile.selected_role === "passenger") {
        navigate("/passenger", { replace: true });
      } else {
        navigate("/profile", { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <SEO
        title="TakeMe — Zdieľané jazdy na Slovensku"
        description="Slovenská spolujazda. Nájdi vodiča alebo ponúkni miesto v aute, sleduj jazdu naživo a šetri náklady. Bratislava, Košice, Žilina a celé Slovensko."
        path="/"
        keywords="spolujazda, zdieľané jazdy, takeme, blablacar Slovensko, carpooling, jazdy Bratislava Košice, lacná doprava, vodič hľadá pasažierov"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'TakeMe',
            url: 'https://takeme.sk/',
            applicationCategory: 'TravelApplication',
            operatingSystem: 'Web, iOS, Android',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: '120' },
          },
        ]}
      />

      <InstallBanner />

      {/* Top bar */}
      <header className="relative container mx-auto px-6 pt-5 flex items-center justify-between">
        <span className="font-display font-bold text-lg tracking-tight">TakeMe</span>
        <LanguageSwitcher />
      </header>

      {/* Hero — clean & airy */}
      <main className="relative container mx-auto px-6 pt-20 md:pt-32 pb-24 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Online indicator */}
          <div className="inline-flex items-center gap-2 mb-8 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>{onlineCount} {t("hero.badge_online")}</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-[1.02] tracking-tight">
            {t("hero.title_1")}
            <br />
            <span className="text-muted-foreground">{t("hero.title_2")}</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-base px-7 rounded-full h-12 group"
            >
              {t("hero.cta_start")}
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate("/search")}
              className="text-base px-7 rounded-full h-12"
            >
              {t("hero.cta_search")}
            </Button>
          </div>
        </motion.div>

        {/* Subtle popular routes — minimal */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-24 md:mt-32"
        >
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {t("routes.title")}
            </h2>
            <a href="/jazdy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t("routes.all")} →
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['bratislava','kosice','Bratislava → Košice'],
              ['bratislava','zilina','Bratislava → Žilina'],
              ['bratislava','nitra','Bratislava → Nitra'],
              ['kosice','presov','Košice → Prešov'],
              ['kosice','poprad','Košice → Poprad'],
              ['zilina','martin','Žilina → Martin'],
            ].map(([f, to, label]) => (
              <a
                key={`${f}-${to}`}
                href={`/jazdy/${f}-${to}`}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-border/60 text-foreground/80 hover:border-foreground hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Index;
