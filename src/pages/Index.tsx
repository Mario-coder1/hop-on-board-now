import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

import { useLanguage } from "@/contexts/LanguageContext";
import {
  ArrowRight,
  Search,
  MousePointerClick,
  MapPin,
  Coins,
  ShieldCheck,
  Leaf,
  Users,
  CheckCircle,
  ChevronDown,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallBanner from "@/components/InstallBanner";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SEO from "@/components/SEO";
import PhoneDemoMockup from "@/components/PhoneDemoMockup";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45 },
  }),
};

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
    <div className="min-h-screen bg-background">
      <SEO
        title="TakeMe.sk – Slovenská spolujazda a ridesharing"
        description="Hľadáte lacný odvoz? TakeMe.sk je slovenská platforma na ridesharing a zdieľanú spolujazdu. Cestujte ekologicky, nájdite vodiča a zdieľajte náklady na palivo."
        path="/"
        keywords="spolujazda, ridesharing, zdieľané jazdy, takeme, takeme.sk, blablacar Slovensko, carpooling, lacný odvoz, vodič hľadá pasažierov, zdieľanie nákladov na palivo"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'takeme.sk',
            serviceType: 'Ridesharing a spolujazda',
            url: 'https://www.takeme.sk/',
            areaServed: { '@type': 'Country', name: 'Slovakia' },
            provider: {
              '@type': 'Organization',
              name: 'takeme.sk',
              url: 'https://www.takeme.sk/',
              email: 'support@takeme.sk',
              logo: 'https://www.takeme.sk/pwa-512x512.png',
            },
            description: 'Hľadáte lacný odvoz? TakeMe.sk je slovenská platforma na ridesharing a spolujazdu. Cestujte ekologicky, nájdite vodiča a zdieľajte náklady na palivo.',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'TakeMe',
            url: 'https://www.takeme.sk/',
            applicationCategory: 'TravelApplication',
            operatingSystem: 'Web, iOS, Android',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          },
        ]}
      />

      <InstallBanner />

      {/* ============ HEADER ============ */}
      <header className="container mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-display font-black text-lg tracking-tight truncate">TakeMe</span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* ============ HERO ============ */}
      <section className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-10 md:pt-16 pb-12 sm:pb-16 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-8 items-center">
          <div className="text-center lg:text-left">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-display font-black tracking-[-0.04em] leading-[0.95] sm:leading-[0.9] text-[2.6rem] xs:text-5xl sm:text-6xl lg:text-7xl"
            >
              Cestuj{" "}
              <span
                className="italic font-serif font-normal"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(222 89% 55%), hsl(190 95% 60%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                spolu.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed"
            >
              {t("hero.subtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-base px-8 rounded-full h-14 group"
              >
                {t("hero.cta_start")}
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/search")}
                className="text-base px-8 rounded-full h-14"
              >
                {t("hero.cta_search")}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                {t("free.badge")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {t("hero.badge_live_tracking")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t("hero.badge_stripe_payments")}
              </span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="flex justify-center lg:justify-end"
          >
            <PhoneDemoMockup />
          </motion.div>
        </div>
      </section>

      <main className="container mx-auto px-6 pb-24 max-w-3xl">
        {/* How it works */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-center mb-10">
            {t("howitworks.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Search className="w-5 h-5" />,
                title: t("howitworks.step1.title"),
                desc: t("howitworks.step1.desc"),
              },
              {
                icon: <MousePointerClick className="w-5 h-5" />,
                title: t("howitworks.step2.title"),
                desc: t("howitworks.step2.desc"),
              },
              {
                icon: <MapPin className="w-5 h-5" />,
                title: t("howitworks.step3.title"),
                desc: t("howitworks.step3.desc"),
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                custom={i}
                className="relative p-5 rounded-2xl border border-border/50 bg-background/50 text-center"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  {step.icon}
                </div>
                <h3 className="font-display font-semibold text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                <span className="absolute top-4 left-4 text-[10px] font-bold text-muted-foreground/40">
                  0{i + 1}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Why TakeMe */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-24 md:mt-28"
        >
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-center mb-10">
            {t("why.title")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Coins className="w-5 h-5" />, title: t("why.money.title"), desc: t("why.money.desc") },
              { icon: <ShieldCheck className="w-5 h-5" />, title: t("why.safe.title"), desc: t("why.safe.desc") },
              { icon: <Leaf className="w-5 h-5" />, title: t("why.green.title"), desc: t("why.green.desc") },
              { icon: <Users className="w-5 h-5" />, title: t("why.people.title"), desc: t("why.people.desc") },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                custom={i}
                className="p-4 rounded-2xl border border-border/50 bg-background/50 text-center"
              >
                <div className="w-9 h-9 mx-auto rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2.5">
                  {item.icon}
                </div>
                <h3 className="font-display font-semibold text-xs mb-0.5">{item.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-24 md:mt-28"
        >
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-center mb-8">
            {t("faq.title")}
          </h2>
          <div className="space-y-2 max-w-xl mx-auto">
            {[
              { q: t("faq.q1"), a: t("faq.a1") },
              { q: t("faq.q2"), a: t("faq.a2") },
              { q: t("faq.q3"), a: t("faq.a3") },
              { q: t("faq.q4"), a: t("faq.a4") },
            ].map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-border/50 bg-background/50 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-sm font-medium">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-xs text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Bottom CTA */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-24 md:mt-28"
        >
          <div className="p-8 md:p-10 rounded-3xl border border-border/50 bg-primary/5 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
              {t("cta.ready.title")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {t("cta.ready.desc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-base px-7 rounded-full h-12 group"
              >
                {t("cta.ready.button")}
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/install")}
                className="text-base px-7 rounded-full h-12"
              >
                <Smartphone className="w-4 h-4 mr-1.5" />
                {t("download.cta")}
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Popular routes */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20"
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
