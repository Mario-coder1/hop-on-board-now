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
import PhoneDemoMockup from "@/components/PhoneDemoMockup";


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

      {/* ================= HERO — Editorial ================= */}
      <section className="relative overflow-hidden border-b border-foreground/10">
        {/* subtle grid + noise */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--foreground)/0.08) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)/0.08) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse at 50% 40%, black 40%, transparent 75%)",
          }}
        />

        {/* Top bar */}
        <header className="relative container mx-auto px-6 pt-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-display font-black text-lg tracking-tight">TakeMe</span>
          </div>
          <LanguageSwitcher />
        </header>

        <div className="relative container mx-auto px-6 pt-14 md:pt-24 pb-20 md:pb-32 z-10">

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-black tracking-[-0.045em] leading-[0.86] text-[16vw] sm:text-[13vw] md:text-[10.5vw] lg:text-[168px] max-w-[8ch]"
          >
            Cestuj<br />
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

          {/* right column — running text + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-10 md:mt-14 grid md:grid-cols-12 gap-8 items-end"
          >
            <div className="md:col-span-7">
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border border-foreground/20 bg-background/60 backdrop-blur">
                  ⚡ Live tracking
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border border-foreground/20 bg-background/60 backdrop-blur">
                  🔒 Stripe payments
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border border-foreground/20 bg-background/60 backdrop-blur">
                  🇸🇰 Made in Slovakia
                </span>
              </div>

              <p className="text-lg md:text-xl text-foreground/80 max-w-xl leading-relaxed">
                {t("hero.subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="text-base px-8 rounded-full h-14 group bg-foreground text-background hover:bg-foreground/90 shadow-[0_10px_40px_-10px_hsl(var(--foreground)/0.5)]"
                >
                  {t("hero.cta_start")}
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/search")}
                  className="text-base px-8 rounded-full h-14 border-foreground/20 bg-background/60 backdrop-blur hover:bg-background"
                >
                  {t("hero.cta_search")}
                </Button>
              </div>

              <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                {t("free.badge")}
              </p>
            </div>

            {/* rotating disc badge */}
            <div className="md:col-span-5 hidden md:flex justify-end">
              <div className="relative w-40 h-40 lg:w-52 lg:h-52">
                <div
                  className="absolute inset-0 animate-[spin_18s_linear_infinite]"
                  style={{
                    WebkitMask:
                      "radial-gradient(circle, transparent 55%, black 56%)",
                    mask: "radial-gradient(circle, transparent 55%, black 56%)",
                  }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <defs>
                      <path
                        id="circle"
                        d="M 100,100 m -80,0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0"
                      />
                    </defs>
                    <text className="fill-foreground font-mono" style={{ fontSize: 13, letterSpacing: 6 }}>
                      <textPath href="#circle">
                        · SPOLUJAZDA · ŠETRI PENIAZE · CHRÁŇ PLANÉTU · SKUTOČNÍ ĽUDIA
                      </textPath>
                    </text>
                  </svg>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center">
                    <ArrowRight className="w-6 h-6 -rotate-45" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Marquee ticker */}
        <div className="relative border-y border-foreground/10 bg-foreground text-background overflow-hidden">
          <div className="flex whitespace-nowrap animate-[marquee_38s_linear_infinite] py-4">
            {Array.from({ length: 2 }).map((_, r) => (
              <div key={r} className="flex items-center gap-10 pr-10 font-display text-2xl md:text-4xl font-black tracking-tight">
                {[
                  "Bratislava → Košice",
                  "★",
                  "Žilina → Prešov",
                  "★",
                  "Nitra → Trnava",
                  "★",
                  "Poprad → Bratislava",
                  "★",
                  "Banská Bystrica → Zvolen",
                  "★",
                  "Trenčín → Piešťany",
                  "★",
                ].map((s, i) => (
                  <span key={`${r}-${i}`} className={s === "★" ? "text-[hsl(var(--primary-glow))]" : ""}>
                    {s}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="relative container mx-auto px-6 pt-24 md:pt-32 pb-24 max-w-3xl">
        {/* Phone demo — restored below hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-4 flex justify-center"
        >
          <PhoneDemoMockup />
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
                icon: <Coins className="w-5 h-5" />,
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

        {/* Trust badges */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-24 md:mt-32"
        >
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-center mb-8">
            {t("trust.title")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Mail className="w-5 h-5" />, title: t("trust.verified"), desc: t("trust.verified.desc") },
              { icon: <CreditCard className="w-5 h-5" />, title: t("trust.payment"), desc: t("trust.payment.desc") },
              { icon: <MapPin className="w-5 h-5" />, title: t("trust.tracking"), desc: t("trust.tracking.desc") },
              { icon: <Bell className="w-5 h-5" />, title: t("trust.support"), desc: t("trust.support.desc") },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                custom={i}
                className="p-4 rounded-2xl border border-border/50 bg-background/50 text-center"
              >
                <div className="w-9 h-9 mx-auto rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 mb-2.5">
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

        {/* Quick start — 30 seconds */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-24 md:mt-32"
        >
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-center mb-8">
            {t("quickstart.title")}
          </h2>
          <div className="max-w-xl mx-auto">
            <div className="relative flex items-center justify-between">
              {/* connector line */}
              <div className="absolute top-4 left-0 right-0 h-px bg-border/60 mx-8" />
              {[
                { icon: <Mail className="w-4 h-4" />, label: t("quickstart.step1") },
                { icon: <CheckCircle className="w-4 h-4" />, label: t("quickstart.step2") },
                { icon: <Search className="w-4 h-4" />, label: t("quickstart.step3") },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i}
                  className="relative z-10 flex flex-col items-center text-center w-28"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold mb-3 ring-4 ring-background">
                    {i + 1}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{step.label}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-base px-7 rounded-full h-12 group"
              >
                {t("quickstart.cta")}
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
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

        {/* Download / PWA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-24 md:mt-32"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-background/50 p-8 md:p-10 text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <Smartphone className="w-8 h-8 text-primary/40 mx-auto mb-4" />
            <h2 className="font-display text-xl md:text-2xl font-bold mb-3">
              {t("download.title")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t("download.desc")}
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/install")}
              className="text-base px-7 rounded-full h-12"
            >
              {t("download.cta")}
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
