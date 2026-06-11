import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ArrowRight,
  Search,
  MousePointerClick,
  MapPin,
  Wallet,
  ShieldCheck,
  Leaf,
  Users,
  Sparkles,
  CheckCircle,
  ChevronDown,
  Globe,
  Clock,
  Mail,
  CreditCard,
  Bell,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallBanner from "@/components/InstallBanner";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SEO from "@/components/SEO";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const onlineCount = useOnlineUsers();
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
          },
        ]}
      />

      <InstallBanner />

      {/* Top bar */}
      <header className="relative container mx-auto px-6 pt-5 flex items-center justify-between">
        <span className="font-display font-bold text-lg tracking-tight">TakeMe</span>
        <LanguageSwitcher />
      </header>

      <main className="relative container mx-auto px-6 pt-20 md:pt-32 pb-24 max-w-3xl">
        {/* Hero — clean & airy */}
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
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            {t("free.badge")}
          </p>
        </motion.div>

        {/* Early adopter appeal */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          custom={0}
          className="mt-20 md:mt-28"
        >
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 p-8 md:p-10 text-center">
            <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-4" />
            <h2 className="font-display text-xl md:text-2xl font-bold mb-3">
              {t("early.title")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t("early.desc")}
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-base px-7 rounded-full h-12 group"
            >
              {t("early.cta")}
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-24 md:mt-32"
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
          className="mt-24 md:mt-32"
        >
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-center mb-10">
            {t("why.title")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: <Wallet className="w-5 h-5" />,
                title: t("why.money.title"),
                desc: t("why.money.desc"),
              },
              {
                icon: <ShieldCheck className="w-5 h-5" />,
                title: t("why.safe.title"),
                desc: t("why.safe.desc"),
              },
              {
                icon: <Leaf className="w-5 h-5" />,
                title: t("why.green.title"),
                desc: t("why.green.desc"),
              },
              {
                icon: <Users className="w-5 h-5" />,
                title: t("why.people.title"),
                desc: t("why.people.desc"),
              },
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

        {/* Coverage */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-24 md:mt-32"
        >
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-center mb-6">
            {t("coverage.title")}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-md mx-auto mb-8">
            {t("coverage.desc")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { flag: "🇸🇰", label: "Slovensko" },
              { flag: "🇨🇿", label: "Česko" },
              { flag: "🇵🇱", label: "Poľsko" },
              { flag: "🇦🇹", label: "Rakúsko" },
              { flag: "🇩🇪", label: "Nemecko" },
              { flag: "🇪🇺", label: "EÚ" },
            ].map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 text-xs text-foreground/80 bg-background/50"
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-24 md:mt-32"
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
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-24 md:mt-32 text-center"
        >
          <div className="p-8 md:p-10 rounded-3xl border border-border/50 bg-background/50">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
              {t("cta.ready.title")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {t("cta.ready.desc")}
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-base px-7 rounded-full h-12 group"
            >
              {t("cta.ready.button")}
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </motion.section>

        {/* Subtle popular routes — minimal */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
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
