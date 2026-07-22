import { ArrowLeft, Shield, Database, Eye, Lock, Mail, Trash2, Users, CreditCard, MapPin, Bell, MessageSquare, Cookie, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const lastUpdated = '1. 7. 2026';

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Zásady ochrany súkromia"
        description="Zásady ochrany súkromia aplikácie TakeMe — ako spracúvame osobné údaje používateľov v súlade s GDPR."
        path="/privacy"
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Späť
        </Button>

        <div className="space-y-8">
          <div className="text-center mb-12">
            <Shield className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="font-display text-4xl font-bold mb-4">Zásady ochrany súkromia</h1>
            <p className="text-muted-foreground">Posledná aktualizácia: {lastUpdated}</p>
          </div>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Prevádzkovateľ</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Prevádzkovateľom osobných údajov v zmysle nariadenia (EÚ) 2016/679 (GDPR) a zákona č. 18/2018 Z. z. je:</p>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-semibold text-foreground">Dominko s.r.o.</p>
                <p>So sídlom: Brehy 82, 023 13 Čierne</p>
                <p>IČO: 45634521 · DIČ: 2023074053 · IČ DPH: SK2023074053</p>
                <p>Konateľ: Pavol Dominko</p>
                <p>Kontaktný e-mail: <strong className="text-foreground">support@takeme.sk</strong></p>
                <p>Aplikácia (PWA) a web: takeme.sk</p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">1. Aké údaje spracúvame</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>V aplikácii TakeMe (ďalej len „služba") spracúvame nasledujúce kategórie osobných údajov:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Registračné údaje:</strong> meno a priezvisko, e-mailová adresa, heslo (uložené v hashovanej forme), prípadne identifikátor Google účtu pri prihlásení cez Google.</li>
                <li><strong>Profilové údaje:</strong> telefónne číslo, profilová fotografia, krátky popis profilu, jazyk, prípadné odznaky.</li>
                <li><strong>Údaje o vozidle (vodiči):</strong> značka a model auta, farba, evidenčné číslo (ŠPZ), počet sedadiel.</li>
                <li><strong>Údaje o jazdách:</strong> miesto vyzdvihnutia a vystúpenia, čas, cena, počet miest, zastávky, žiadosti spolujazdcov, stav jazdy, dôvody zrušenia.</li>
                <li><strong>Lokalizačné údaje:</strong> GPS poloha vodiča počas aktívnej jazdy (live tracking) a aktuálna poloha spolujazdca pri vyhľadávaní jazdy alebo voľbe miesta vyzdvihnutia. Poloha sa spracúva len keď je relevantná funkcia aktívna.</li>
                <li><strong>Platobné údaje:</strong> história platieb, výplaty vodičom a provízie. Všetky platby prebiehajú výhradne cez platobnú bránu Stripe — TakeMe nezadržiava peniaze používateľov a nemá prístup k údajom platobnej karty.</li>
                <li><strong>Komunikácia:</strong> správy vo verejnom chate, hodnotenia, hlásenia (reports), komunikácia s podporou.</li>
                <li><strong>Technické údaje:</strong> IP adresa, typ zariadenia, prehliadač, identifikátor push notifikácií (push subscription), návštevy stránok (interná štatistika), logy chýb.</li>
                <li><strong>Cookies a lokálne úložisko:</strong> session token autentifikácie, jazykové preferencie, stav onboardingu.</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">2. Účely a právny základ spracovania</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>Údaje spracúvame na nasledujúcich právnych základoch podľa čl. 6 GDPR:</p>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p><strong className="text-foreground">a) Plnenie zmluvy — čl. 6 ods. 1 písm. b):</strong> registrácia účtu, sprostredkovanie jazdy medzi vodičom a spolujazdcom, live tracking počas jazdy, spracovanie platby a vyplatenie odmeny vodičovi, hodnotenia, zákaznícka podpora.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p><strong className="text-foreground">b) Zákonná povinnosť — čl. 6 ods. 1 písm. c):</strong> vedenie účtovných a daňových dokladov, plnenie povinností podľa AML, spolupráca s orgánmi verejnej moci.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p><strong className="text-foreground">c) Oprávnený záujem — čl. 6 ods. 1 písm. f):</strong> bezpečnosť platformy, prevencia podvodov a zneužívania, moderácia obsahu, analýza návštevnosti, zlepšovanie služby, uplatňovanie a obhajoba právnych nárokov.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p><strong className="text-foreground">d) Súhlas — čl. 6 ods. 1 písm. a):</strong> zasielanie push notifikácií, prístup k presnej polohe, marketingová komunikácia. Súhlas môžete kedykoľvek odvolať bez vplyvu na zákonnosť predchádzajúceho spracovania.</p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">3. Príjemcovia a sprostredkovatelia</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Vaše údaje sprístupňujeme len v nevyhnutnej miere:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Iným používateľom platformy:</strong> meno, fotka, hodnotenie, údaje o vozidle a približná poloha sú viditeľné pri ponuke jazdy. Telefónne číslo a presná ŠPZ sa zdieľajú až po potvrdení rezervácie medzi konkrétnym vodičom a spolujazdcom.</li>
                <li><strong>Stripe Payments Europe, Ltd.</strong> (Írsko) — spracovanie platieb, ukladanie údajov o platobných kartách. Stripe je nezávislý prevádzkovateľ pre údaje o karte. Viac na <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">stripe.com/privacy</a>.</li>
                <li><strong>Supabase Inc.</strong> (hosting databázy, autentifikácie a serverovej logiky, EÚ región) — sprostredkovateľ.</li>
                <li><strong>Mapbox</strong> — zobrazovanie máp a výpočet trás (anonymizované požiadavky).</li>
                <li><strong>Google LLC</strong> — len ak používate prihlásenie cez Google.</li>
                <li><strong>Poskytovatelia push notifikácií</strong> (Apple APNs, Google FCM, Mozilla autopush) — doručovanie notifikácií do zariadenia.</li>
                <li><strong>Orgány verejnej moci</strong> — ak nám to ukladá zákon alebo súdne rozhodnutie.</li>
              </ul>
              <p>So všetkými sprostredkovateľmi máme uzatvorenú zmluvu o spracovaní osobných údajov podľa čl. 28 GDPR.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">4. Prenos údajov mimo EÚ</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Údaje primárne spracúvame v rámci EÚ/EHP. V prípade poskytovateľov so sídlom v tretích krajinách (napr. USA) prebieha prenos len na základe:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>rozhodnutia Komisie o primeranosti (napr. EU–US Data Privacy Framework), alebo</li>
                <li>štandardných zmluvných doložiek (SCC) podľa čl. 46 GDPR s dodatočnými technickými a organizačnými opatreniami.</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">5. Lokalizačné údaje a live tracking</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Poloha vodiča sa zaznamenáva výhradne počas aktívnej jazdy a je viditeľná iba potvrdeným spolujazdcom danej jazdy. Sledovanie sa automaticky ukončí po dokončení alebo zrušení jazdy. História presnej polohy sa neuchováva dlhšie, ako je nevyhnutné pre prevádzkovú a bezpečnostnú kontrolu (max. 30 dní), následne je anonymizovaná alebo vymazaná.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">6. Platby a provízie</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Platby spolujazdcov sú spracúvané výhradne prostredníctvom platobnej brány Stripe. TakeMe nezadržiava peniaze používateľov, neprevádzkuje žiadnu internú peňaženku a nemá prístup k údajom platobnej karty. Z každej úspešnej jazdy si platforma účtuje províziu (aktuálne 10 %), zvyšok je vyplatený vodičovi priamo cez Stripe. Pre účely účtovníctva uchovávame doklady o platbách po dobu vyžadovanú zákonom (zvyčajne 10 rokov).</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">7. Push notifikácie</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Push notifikácie zapíname iba s vaším výslovným súhlasom udeleným v prehliadači alebo zariadení. Ukladáme len technický identifikátor (endpoint) potrebný na doručenie. Notifikácie môžete kedykoľvek vypnúť v profile alebo v nastaveniach zariadenia.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">8. Verejný chat a obsah od používateľov</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Správy a obrázky vo verejnom chate sú viditeľné všetkým prihláseným používateľom. Nezdieľajte tam citlivé osobné údaje. Obsah, ktorý porušuje pravidlá, môžeme moderovať alebo odstrániť. Hodnotenia a recenzie zostávajú zobrazené aj po zrušení účtu v anonymizovanej forme z dôvodu transparentnosti.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">9. Cookies a lokálne úložisko</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Používame výhradne <strong>technicky nevyhnutné</strong> cookies a lokálne úložisko (localStorage / IndexedDB) na fungovanie prihlásenia, jazykových preferencií, PWA inštalácie a uchovanie stavu aplikácie. Nepoužívame reklamné ani trackingové cookies tretích strán. Návštevnosť meriame interne, agregovane a bez profilovania.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">10. Bezpečnosť údajov</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>Všetka komunikácia je šifrovaná pomocou HTTPS/TLS.</li>
                <li>Heslá sú uložené v hashovanej forme (bcrypt/argon).</li>
                <li>Prístup k databáze je obmedzený pravidlami Row Level Security (RLS).</li>
                <li>Citlivé údaje (telefón, ŠPZ) sú viditeľné len pre potvrdených účastníkov jazdy.</li>
                <li>Pravidelne vyhodnocujeme bezpečnostné incidenty a logy.</li>
                <li>V prípade porušenia ochrany údajov budeme dotknuté osoby informovať v súlade s čl. 33–34 GDPR.</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">11. Doba uchovávania</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Účet a profil:</strong> počas existencie účtu.</li>
                <li><strong>Údaje o jazde:</strong> 24 hodín po čase odjazdu jazdu automaticky odstraňujeme; agregované štatistiky uchovávame anonymizovane.</li>
                <li><strong>Platobné a účtovné doklady:</strong> 10 rokov (zákon o účtovníctve).</li>
                <li><strong>Lokalizačné údaje:</strong> max. 30 dní, následne anonymizácia/výmaz.</li>
                <li><strong>Logy a bezpečnostné záznamy:</strong> max. 12 mesiacov.</li>
                <li><strong>Po zmazaní účtu</strong> osobné údaje vymažeme do 30 dní, okrem údajov, ktoré sme povinní uchovať zo zákona.</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">12. Vaše práva</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Ako dotknutá osoba máte právo na prístup, opravu, vymazanie, obmedzenie spracovania, prenosnosť, námietku proti spracovaniu na základe oprávneného záujmu a právo odvolať súhlas. Detaily a postup uplatnenia nájdete na stránke <a href="/gdpr" className="text-primary underline">GDPR</a>. Máte tiež právo podať sťažnosť na Úrade na ochranu osobných údajov SR.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">13. Deti</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Služba je určená osobám starším ako 16 rokov. Účty osôb mladších ako 16 rokov bez súhlasu zákonného zástupcu môžu byť zrušené.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">14. Zmeny zásad</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Tieto zásady môžeme aktualizovať. O podstatných zmenách vás budeme informovať e-mailom alebo notifikáciou v aplikácii. Otázky smerujte na <strong className="text-foreground">support@takeme.sk</strong>.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
