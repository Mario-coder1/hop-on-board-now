import { ArrowLeft, Scale, FileCheck, UserCheck, Download, Trash2, Shield, AlertCircle, CreditCard, MapPin, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';

const GDPR = () => {
  const navigate = useNavigate();
  const lastUpdated = '1. 6. 2026';

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="GDPR — Vaše práva"
        description="Informácie o spracovaní osobných údajov v TakeMe podľa nariadenia GDPR (EÚ) 2016/679."
        path="/gdpr"
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Späť
        </Button>

        <div className="space-y-8">
          <div className="text-center mb-12">
            <Scale className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="font-display text-4xl font-bold mb-4">GDPR — Vaše práva</h1>
            <p className="text-muted-foreground">
              Spracovanie osobných údajov podľa nariadenia (EÚ) 2016/679 (GDPR) a zákona č. 18/2018 Z. z.
            </p>
            <p className="text-sm text-muted-foreground mt-2">Posledná aktualizácia: {lastUpdated}</p>
          </div>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <FileCheck className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Prevádzkovateľ</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-semibold text-foreground">TakeMe s.r.o.</p>
                <p>Kontakt zodpovednej osoby: <strong className="text-foreground">support@takeme.sk</strong></p>
              </div>
              <p>Podrobný prehľad spracovania nájdete v <a href="/privacy" className="text-primary underline">Zásadách ochrany súkromia</a>.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <FileCheck className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Právny základ spracovania</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Plnenie zmluvy</strong> (čl. 6 ods. 1 písm. b GDPR) — sprostredkovanie spolujazdy, platby, live tracking, hodnotenia.</li>
                <li><strong>Zákonná povinnosť</strong> (čl. 6 ods. 1 písm. c) — účtovníctvo, daňové a AML povinnosti.</li>
                <li><strong>Oprávnený záujem</strong> (čl. 6 ods. 1 písm. f) — bezpečnosť platformy, prevencia podvodov, moderácia, ochrana právnych nárokov.</li>
                <li><strong>Súhlas</strong> (čl. 6 ods. 1 písm. a) — push notifikácie, presná poloha, marketing. Súhlas je kedykoľvek odvolateľný.</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Vaše práva ako dotknutej osoby</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na prístup (čl. 15)</h3>
                  <p>Získať potvrdenie, či spracúvame vaše údaje, a kópiu spracúvaných údajov.</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na opravu (čl. 16)</h3>
                  <p>Opraviť nepresné údaje. Väčšinu môžete upraviť priamo vo svojom profile.</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na vymazanie (čl. 17)</h3>
                  <p>Požiadať o vymazanie údajov („právo byť zabudnutý"), ak neexistuje zákonný dôvod ich uchovávať (napr. účtovné doklady).</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na obmedzenie spracovania (čl. 18)</h3>
                  <p>Obmedziť spracovanie počas overovania správnosti alebo námietky.</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na prenosnosť (čl. 20)</h3>
                  <p>Získať svoje údaje v štruktúrovanom, strojovo čitateľnom formáte (JSON/CSV).</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo namietať (čl. 21)</h3>
                  <p>Namietať proti spracovaniu na základe oprávneného záujmu vrátane profilovania.</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo odvolať súhlas (čl. 7)</h3>
                  <p>Kedykoľvek odvolať súhlas (napr. notifikácie) bez vplyvu na predchádzajúce spracovanie.</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo nepodliehať automatizovanému rozhodovaniu (čl. 22)</h3>
                  <p>Nepoužívame automatizované rozhodovanie s právnymi účinkami ani profilovanie, ktoré by vás významne ovplyvňovalo.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Ako uplatniť práva</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <ol className="list-decimal pl-6 space-y-2">
                <li>Napíšte na <strong className="text-foreground">support@takeme.sk</strong> z e-mailu spojeného s účtom.</li>
                <li>Uveďte, ktoré právo chcete uplatniť a v akom rozsahu.</li>
                <li>V prípade pochybností o totožnosti si môžeme vyžiadať dodatočné overenie.</li>
                <li>Odpovieme bez zbytočného odkladu, najneskôr do <strong>30 dní</strong> (lehotu možno predĺžiť o 2 mesiace pri zložitých žiadostiach).</li>
                <li>Uplatnenie práv je <strong>bezplatné</strong>; pri zjavne neopodstatnených alebo opakovaných žiadostiach môžeme účtovať primeraný poplatok.</li>
              </ol>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Zmazanie účtu</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <ol className="list-decimal pl-6 space-y-2">
                <li>Pošlite e-mail na <strong className="text-foreground">support@takeme.sk</strong> s predmetom „Žiadosť o zmazanie účtu".</li>
                <li>Účet a osobné údaje vymažeme najneskôr do 30 dní.</li>
                <li>Údaje potrebné na splnenie zákonných povinností (napr. účtovné doklady, doklady o platbách) uchováme po zákonom stanovenú dobu.</li>
                <li>Hodnotenia a recenzie zostávajú zachované v anonymizovanej forme.</li>
              </ol>
              <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-destructive flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <strong>Upozornenie:</strong> Zmazanie účtu je nevratné. Pred žiadosťou si vyberte zostatok z peňaženky.
                </p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Platby a Stripe</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Platobné karty spracúva Stripe Payments Europe, Ltd. ako nezávislý prevádzkovateľ. TakeMe k číslam kariet nemá prístup. Doklady o platbách uchovávame v súlade so zákonom o účtovníctve (10 rokov).</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Lokalizačné údaje</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>GPS poloha vodiča je viditeľná spolujazdcom iba počas aktívnej jazdy. Sledovanie sa automaticky ukončí pri dokončení alebo zrušení jazdy. Presnú polohu uchovávame najviac 30 dní.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Notifikácie</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Push notifikácie zasielame len so súhlasom. Vypnúť ich môžete v profile alebo v nastaveniach zariadenia.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Dozorný orgán</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>Ak sa domnievate, že spracovanie vašich osobných údajov porušuje GDPR, máte právo podať sťažnosť dozornému orgánu:</p>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-semibold text-foreground">Úrad na ochranu osobných údajov SR</p>
                <p>Hraničná 12, 820 07 Bratislava 27</p>
                <p>Tel.: +421 2 3231 3214</p>
                <p>E-mail: statny.dozor@pdp.gov.sk</p>
                <p>Web: <a href="https://dataprotection.gov.sk" target="_blank" rel="noopener noreferrer" className="text-primary underline">dataprotection.gov.sk</a></p>
              </div>
              <p>Používatelia z ČR, PL, AT, DE, HU a ďalších členských štátov EÚ sa môžu obrátiť aj na svoj národný dozorný orgán.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default GDPR;
