import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useLanguage } from "@/contexts/LanguageContext";
import { Car, Users, MapPin, Shield } from "lucide-react";
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
        // Role selection lives in Profile page
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

  const features = [
    { icon: Car, title: "Ponúkni jazdu", desc: "Zdieľaj cestu a ušetri na nákladoch" },
    { icon: Users, title: "Nájdi spolucestujúcich", desc: "Cestuj s overenými vodičmi" },
    { icon: MapPin, title: "Live sledovanie", desc: "Sleduj polohu v reálnom čase" },
    { icon: Shield, title: "Bezpečnosť", desc: "Overené profily a hodnotenia" },
  ];

  return (
    <div className="min-h-screen bg-mesh relative overflow-hidden">
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
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'Ako funguje TakeMe?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'TakeMe spája vodičov s pasažiermi. Vodič vytvorí jazdu, pasažier pošle žiadosť, po prijatí sleduje vodiča naživo na mape.',
                },
              },
              {
                '@type': 'Question',
                name: 'Je TakeMe zadarmo?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Áno, registrácia a používanie aplikácie je zadarmo. Platíš len cenu spolujazdy, ktorú určí vodič.',
                },
              },
              {
                '@type': 'Question',
                name: 'Funguje TakeMe na iPhone aj Android?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Áno, TakeMe je progresívna webová aplikácia (PWA), ktorú si môžeš nainštalovať na iPhone aj Android priamo z prehliadača.',
                },
              },
              {
                '@type': 'Question',
                name: 'Môžem sledovať vodiča naživo?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Áno, po prijatí žiadosti vidíš polohu vodiča v reálnom čase na mape a dostaneš push notifikáciu, keď je blízko.',
                },
              },
            ],
          },
        ]}
      />
      {/* Floating decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-40 -right-32 w-96 h-96 rounded-full bg-accent/25 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-[hsl(195_90%_60%)]/25 blur-3xl animate-float" style={{ animationDelay: '4s' }} />

      <InstallBanner />

      {/* Hero Section */}
      <div className="relative">
        <div className="container mx-auto px-4 pt-12 md:pt-20 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="glass-pill inline-flex items-center gap-2 px-4 py-2 rounded-full text-primary"
              >
                <Car className="w-4 h-4" />
                <span className="font-semibold text-sm">TakeMe</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-pill inline-flex items-center gap-2 px-4 py-2 rounded-full"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {onlineCount} online
                </span>
              </motion.div>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 text-gradient-hero leading-[1.05]">
              Cestuj spolu,
              <br />
              ušetri viac
            </h1>

            <p className="text-lg md:text-xl text-foreground/70 mb-8 max-w-xl mx-auto">
              Pripoj sa k tisícom ľudí, ktorí zdieľajú cesty po celom Slovensku. Bezpečne, pohodlne a ekonomicky.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" onClick={() => navigate("/auth")} className="text-base px-8 rounded-2xl h-12">
                Začať teraz
              </Button>
              <Button
                variant="glass"
                size="lg"
                onClick={() => navigate("/search")}
                className="text-base px-8 rounded-2xl h-12"
              >
                Hľadať jazdy
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features - Glass cards */}
      <div className="relative container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="glass rounded-2xl p-4 md:p-6 hover:scale-[1.02] hover:shadow-glass-lg transition-all"
            >
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-3 md:mb-4 shadow-[0_6px_18px_-4px_hsl(var(--primary)/0.5)]">
                <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-base md:text-lg font-semibold mb-1 md:mb-2">{feature.title}</h3>
              <p className="text-foreground/60 text-xs md:text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative container mx-auto px-4 pb-24 md:pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden p-10 md:p-14 text-center bg-gradient-to-br from-primary via-[hsl(190_80%_45%)] to-accent shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.5)]"
        >
          <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ background: 'radial-gradient(circle at 30% 20%, white, transparent 50%)' }} />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
              Pripravený na cestu?
            </h2>
            <p className="text-primary-foreground/85 mb-7 max-w-md mx-auto">
              Vytvor si účet zadarmo a začni cestovať ešte dnes.
            </p>
            <Button variant="glass" size="lg" onClick={() => navigate("/auth")} className="text-base px-8 rounded-2xl h-12">
              Registrovať sa
            </Button>
          </div>
        </motion.div>

        {/* Populárne trasy — interné SEO odkazy */}
        <section className="mt-16 sm:mt-24">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Populárne trasy</h2>
            <a href="/jazdy" className="text-xs text-muted-foreground hover:text-foreground">
              Všetky trasy →
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['bratislava','kosice','Bratislava → Košice'],
              ['bratislava','zilina','Bratislava → Žilina'],
              ['bratislava','banska-bystrica','Bratislava → Banská Bystrica'],
              ['bratislava','nitra','Bratislava → Nitra'],
              ['bratislava','trnava','Bratislava → Trnava'],
              ['kosice','presov','Košice → Prešov'],
              ['kosice','poprad','Košice → Poprad'],
              ['zilina','martin','Žilina → Martin'],
              ['kosice','bratislava','Košice → Bratislava'],
              ['presov','bratislava','Prešov → Bratislava'],
            ].map(([f, t, label]) => (
              <a
                key={`${f}-${t}`}
                href={`/jazdy/${f}-${t}`}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-border hover:bg-foreground hover:text-background transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
