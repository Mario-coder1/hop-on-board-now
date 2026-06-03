import { ArrowLeft, FileText, Users, CreditCard, Car, MapPin, Shield, AlertTriangle, Ban, Wallet, Star, Trash2, Mail, Bell, MessageSquare, Gavel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';

const TermsOfService = () => {
  const navigate = useNavigate();
  const lastUpdated = '3. 6. 2026';

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Obchodné podmienky"
        description="Všeobecné obchodné podmienky platformy TakeMe — pravidlá používania služby zdieľaných jázd."
        path="/terms"
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Späť
        </Button>

        <div className="space-y-8">
          <div className="text-center mb-12">
            <FileText className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="font-display text-4xl font-bold mb-4">Obchodné podmienky</h1>
            <p className="text-muted-foreground">
              Všeobecné obchodné podmienky používania platformy TakeMe
            </p>
            <p className="text-sm text-muted-foreground mt-2">Posledná aktualizácia: {lastUpdated}</p>
          </div>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Gavel className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">1. Základné ustanovenia</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">1.1.</strong> Tieto všeobecné obchodné podmienky (ďalej len „VOP") upravujú vzťahy medzi prevádzkovateľom platformy TakeMe — spoločnosťou <strong className="text-foreground">Dominko s.r.o.</strong>, so sídlom Brehy 82, 023 13 Čierne, IČO: 45634521, DIČ: 2023074053, IČ DPH: SK2023074053, zastúpenou konateľom <strong className="text-foreground">Pavolom Dominkom</strong> (ďalej len „prevádzkovateľ", „my", „platforma") a používateľmi (ďalej len „používateľ", „vy", „vodič", „spolujazdec").</p>
              <p><strong className="text-foreground">1.2.</strong> Platforma TakeMe je sprostredkovateľská služba, ktorá umožňuje vodičom ponúkať voľné miesta vo svojich vozidlách a spolujazdcom vyhľadávať a rezervovať tieto miesta. <strong className="text-foreground">TakeMe nie je dopravcom ani taxislužbou.</strong> Samotnú prepravu uskutočňujú výlučne používatelia medzi sebou na vlastnú zodpovednosť.</p>
              <p><strong className="text-foreground">1.3.</strong> Registráciou a používaním platformy potvrdzujete, že ste sa oboznámili s týmito VOP a so <a href="/privacy" className="text-primary underline">Zásadami ochrany súkromia</a>, a že s nimi súhlasíte.</p>
              <p><strong className="text-foreground">1.4.</strong> Služba je určená osobám starším ako 16 rokov. Osoby mladšie ako 18 rokov môžu službu používať len so súhlasom zákonného zástupcu.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">2. Registrácia a účet</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">2.1.</strong> Pre používanie platformy je potrebná registrácia pomocou e-mailovej adresy a hesla, alebo prostredníctvom Google/Apple účtu.</p>
              <p><strong className="text-foreground">2.2.</strong> Používateľ je povinný uvádzať pravdivé a aktuálne údaje. Neplatné alebo zavádzajúce údaje môžu viesť k zablokovaniu účtu.</p>
              <p><strong className="text-foreground">2.3.</strong> Účet je osobný a neprenosný. Nesmiete ho prenajímať, požičiavať ani prevádzať na tretie osoby.</p>
              <p><strong className="text-foreground">2.4.</strong> Prevádzkovateľ si vyhradzuje právo zablokovať alebo zrušiť účet, ak používateľ:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>porušuje tieto VOP alebo platné zákony;</li>
                <li>zneužíva platformu (falošné rezervácie, podvody, obťažovanie);</li>
                <li>opakovane dostáva negatívne hodnotenia alebo hlásenia;</li>
                <li>neaktivuje účet po dobu dlhšiu ako 24 mesiacov.</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Car className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">3. Ponúkanie jázd (vodiči)</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">3.1.</strong> Vodič zodpovedá za to, že:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>je držiteľom platného vodičského preukazu a preukazu o evidencii vozidla (TP);</li>
                <li>vozidlo je v prevádzkyschopnom stave a má platné povinné zmluvné poistenie;</li>
                <li>ponúkaná jazda je súkromná a vodič by túto trasu absolvoval aj bez spolujazdca;</li>
                <li>uvedené údaje o trase, čase a cene sú presné a aktuálne.</li>
              </ul>
              <p><strong className="text-foreground">3.2.</strong> Vodič má právo odmietnuť ktoréhokoľvek spolujazdca bez uvedenia dôvodu, avšak nie na základe diskriminácie (rasa, pohlavie, náboženstvo, zdravotné postihnutie).</p>
              <p><strong className="text-foreground">3.3.</strong> Vodič sa zaväzuje čakať na spolujazdca primeranú dobu (min. 10 minút) po dohodnutom čase, ak sa nestretnete na dohodnutom mieste.</p>
              <p><strong className="text-foreground">3.4.</strong> Vodič môže definovať maximálny okruh odchýlky (detour) od trasy, v rámci ktorého je ochotný vyzdvihnúť alebo vysadiť spolujazdca.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">4. Rezervácie a spolujazdci</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">4.1.</strong> Spolujazdec môže požiadať o pripojenie k jazde len vtedy, ak:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>je na trase alebo v jej dostatočnej blízkosti podľa nastaveného okruhu odchýlky vodiča;</li>
                <li>je na jazde dostatočný počet voľných miest;</li>
                <li>je schopný a ochotný zaplatiť dohodnutú cenu.</li>
              </ul>
              <p><strong className="text-foreground">4.2.</strong> Platba sa uskutočňuje cez platformu (Stripe) pri odoslaní žiadosti. Z platby sa okamžite strháva provízia platformy. Zvyšná časť je pripísaná vodičovi do peňaženky po dokončení jazdy.</p>
              <p><strong className="text-foreground">4.3.</strong> Spolujazdec môže zrušiť rezerváciu kedykoľvek pred začiatkom jazdy. Pri zrušení sa peniaze vrátia spolujazdcovi na peňaženku v aplikácii. Vodič je o zrušení upozornený.</p>
              <p><strong className="text-foreground">4.4.</strong> Spolujazdec má právo hodnotiť vodiča a jazdu po jej dokončení. Hodnotenia sú verejné a ovplyvňujú reputáciu vodiča na platforme.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">5. Ceny a platby</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">5.1.</strong> Cenu jazdy určuje výlučne vodič. Cena musí byť primeraná a nesmie presahovať skutočné náklady na jazdu na osobu.</p>
              <p><strong className="text-foreground">5.2.</strong> TakeMe si z každej úspešnej jazdy účtuje províziu vo výške určenej v administrácii (aktuálne 15 %). Táto provízia sa strháva automaticky pri platbe.</p>
              <p><strong className="text-foreground">5.3.</strong> Spolujazdec platí cenu jazdy cez integrovanú platobnú bránu Stripe. TakeMe neukladá ani nemá prístup k údajom platobnej karty.</p>
              <p><strong className="text-foreground">5.4.</strong> Vodičovi je zvyšok po odpočítaní provízie pripísaný do internej peňaženky. Vyplatenie peňaženky na bankový účet prebieha na základe žiadosti vodiča a môže trvať niekoľko pracovných dní.</p>
              <p><strong className="text-foreground">5.5.</strong> Dobitie peňaženky cez Stripe môže byť spoplatnené poplatkom podľa aktuálnych nastavení v administrácii.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Ban className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">6. Zrušenie a storno</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">6.1.</strong> Spolujazdec môže zrušiť svoju rezerváciu kedykoľvek pred začiatkom jazdy. Pri zrušení sa finančné prostriedky vrátia na jeho peňaženku v aplikácii.</p>
              <p><strong className="text-foreground">6.2.</strong> Vodič môže zrušiť ponuku jazdy alebo odmietnuť konkrétneho spolujazdca. Pri zrušení sa voľné miesta vracajú do ponuky a spolujazdec je upozornený.</p>
              <p><strong className="text-foreground">6.3.</strong> Pri zrušení je povinné uviesť dôvod. Opakované bezdôvodné zrušenia môžu viesť k zablokovaniu účtu.</p>
              <p><strong className="text-foreground">6.4.</strong> Ak vodič nikoho nepovolí na jazdu a jazda uplynie, peniaze spolujazdcom sú automaticky vrátené.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">7. Zakázané správanie</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">7.1.</strong> Na platforme je prísne zakázané:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>používanie platformy na komerčnú prepravu osôb (taxislužba, prepravná služba);</li>
                <li>falšovanie totožnosti, údajov o vozidle alebo trase;</li>
                <li>obťažovanie, diskriminácia alebo akékoľvek násilné správanie voči iným používateľom;</li>
                <li>zneužívanie hodnotení (falošné recenzie, koordinované negatívne hodnotenia);</li>
                <li>šírenie škodlivého softvéru, spamu alebo nevhodného obsahu;</li>
                <li>obchádzanie platieb (platba mimo platformy);</li>
                <li>zverejňovanie osobných údajov tretích osôb bez súhlasu;</li>
                <li>akékoľvek konanie porušujúce platné zákony Slovenskej republiky alebo EÚ.</li>
              </ul>
              <p><strong className="text-foreground">7.2.</strong> Porušenie týchto pravidiel môže viesť k okamžitému zablokovaniu účtu, strate peňaženkového zostatku a v prípade vážnych priestupkov aj k podaniu trestného oznámenia.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">8. Zodpovednosť</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">8.1.</strong> <strong className="text-foreground">TakeMe je výlučne sprostredkovateľ</strong> a nezodpovedá za:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>kvalitu, bezpečnosť alebo priebeh samotnej jazdy;</li>
                <li>pravdivosť údajov poskytnutých používateľmi;</li>
                <li>škody spôsobené počas jazdy (vrátane dopravných nehôd);</li>
                <li>stratu alebo poškodenie osobných vecí počas jazdy;</li>
                <li>meškanie, zmenu trasy alebo zrušenie jazdy zo strany vodiča alebo spolujazdca.</li>
              </ul>
              <p><strong className="text-foreground">8.2.</strong> Zodpovednosť za priebeh jazdy nesie vodič ako prevádzkovateľ vozidla. Zodpovednosť za svoje správanie nesie každý používateľ individuálne.</p>
              <p><strong className="text-foreground">8.3.</strong> Prevádzkovateľ nezodpovedá za škody spôsobené vyššou mocou, výpadkami internetu, technickými poruchami platobných brán alebo iných externých služieb, ktoré sú mimo jeho kontroly.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">9. Hodnotenia a moderovanie</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">9.1.</strong> Po dokončení jazdy môže spolujazdec ohodnotiť vodiča a uviesť krátke zdôvodnenie. Hodnotenie je verejné a ovplyvňuje umiestnenie vodiča v rebríčku.</p>
              <p><strong className="text-foreground">9.2.</strong> Používatelia môžu nahlásiť nevhodné správanie. Prevádzkovateľ si vyhradzuje právo preskúmať hlásenia a prijať primerané opatrenia vrátane zablokovania účtu.</p>
              <p><strong className="text-foreground">9.3.</strong> Verejný chat je moderovaný. Obsah porušujúci pravidlá môže byť odstránený bez predchádzajúceho upozornenia.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">10. Peňaženka a výplaty</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">10.1.</strong> Interná peňaženka slúži na uchovávanie finančných prostriedkov z úspešných jázd a dobití.</p>
              <p><strong className="text-foreground">10.2.</strong> Prostriedky v peňaženke nie sú vklady a neprinášajú úrok. Používateľ nemá nárok na ich vrátenie v hotovosti, pokiaľ to nevyplýva z práva na odstúpenie alebo zrušenia jazdy.</p>
              <p><strong className="text-foreground">10.3.</strong> Výplata peňaženky na bankový účet je možná na základe žiadosti vodiča a prebieha bankovým prevodom. Prevádzkovateľ si vyhradzuje právo požiadať o overenie totožnosti pred prvou výplatou.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">11. Notifikácie</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">11.1.</strong> Platforma zasiela push notifikácie a e-maily týkajúce sa stavu jazdy, rezervácií a dôležitých oznámení.</p>
              <p><strong className="text-foreground">11.2.</strong> Push notifikácie sú zasielané len so súhlasom používateľa a je možné ich kedykoľvek vypnúť v profile alebo v nastaveniach zariadenia.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">12. Rebríček vodičov</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">12.1.</strong> Platforma zobrazuje verejný rebríček TOP vodičov na základe priemernej známky a počtu dokončených jázd.</p>
              <p><strong className="text-foreground">12.2.</strong> Umiestnenie v rebríčku je informatívne a nezakladá žiadny nárok na odmenu alebo výhodu okrem verejného uznania.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">13. Ukončenie a zrušenie účtu</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">13.1.</strong> Používateľ môže kedykoľvek požiadať o zrušenie účtu v profile alebo e-mailom na support@takeme.sk.</p>
              <p><strong className="text-foreground">13.2.</strong> Pri zrušení účtu sa osobné údaje vymažú do 30 dní, okrem údajov, ktoré sme povinní uchovať zo zákona (napr. účtovné doklady). Hodnotenia zostávajú zachované v anonymizovanej forme.</p>
              <p><strong className="text-foreground">13.3.</strong> Pred zrušením účtu si používateľ vyberie zostatok z peňaženky. Nevybraný zostatok po zrušení prepadá v prospech prevádzkovateľa na úhradu administratívnych nákladov.</p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">14. Záverečné ustanovenia</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">14.1.</strong> Tieto VOP nadobúdajú účinnosť dňom zverejnenia. Používaním platformy po zmene VOP potvrdzujete súhlas s aktuálnym znením.</p>
              <p><strong className="text-foreground">14.2.</strong> Vzťahy neupravené týmito VOP sa riadia právnym poriadkom Slovenskej republiky, najmä zákonom č. 40/1964 Zb. (Občiansky zákonník) a zákonom č. 22/2004 Z.z. (o elektronickom obchode).</p>
              <p><strong className="text-foreground">14.3.</strong> Prípadné spory sa budú snažiť strany riešiť dohodou. V prípade neúspechu je príslušný súd v Slovenskej republike.</p>
              <p><strong className="text-foreground">14.4.</strong> Ak by niektoré ustanovenie týchto VOP bolo neplatné alebo neúčinné, ostatné ustanovenia zostávajú v platnosti.</p>
              <p><strong className="text-foreground">14.5.</strong> Kontakt: <strong className="text-foreground">support@takeme.sk</strong> · Prevádzkovateľ: Dominko s.r.o., Brehy 82, 023 13 Čierne, IČO: 45634521 · Konateľ: Pavol Dominko · Vývojár platformy: Mário Kubalík</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
