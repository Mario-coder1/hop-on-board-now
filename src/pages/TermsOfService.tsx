import {
  ArrowLeft,
  FileText,
  Users,
  CreditCard,
  Car,
  MapPin,
  Shield,
  AlertTriangle,
  Ban,
  RefreshCcw,
  Star,
  Trash2,
  Mail,
  Bell,
  MessageSquare,
  Gavel,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";

const TermsOfService = () => {
  const navigate = useNavigate();
  const lastUpdated = "15. 7. 2026";

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
            <p className="text-muted-foreground">Všeobecné obchodné podmienky používania platformy TakeMe</p>
            <p className="text-sm text-muted-foreground mt-2">Posledná aktualizácia: {lastUpdated}</p>
          </div>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Gavel className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">1. Základné ustanovenia</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">1.1.</strong> Tieto všeobecné obchodné podmienky (ďalej len „VOP")
                upravujú vzťahy medzi prevádzkovateľom platformy TakeMe — spoločnosťou{" "}
                <strong className="text-foreground">Dominko s.r.o.</strong>, so sídlom Brehy 82, 023 13 Čierne, IČO:
                45634521, DIČ: 2023074053, IČ DPH: SK2023074053, zastúpenou konateľom{" "}
                <strong className="text-foreground">Pavolom Dominkom</strong> (ďalej len „prevádzkovateľ", „my",
                „platforma") a používateľmi (ďalej len „používateľ", „vy", „vodič", „spolujazdec").
              </p>
              <p>
                <strong className="text-foreground">1.2.</strong> Platforma TakeMe je sprostredkovateľská služba, ktorá
                umožňuje vodičom ponúkať voľné miesta vo svojich vozidlách a spolujazdcom vyhľadávať a rezervovať tieto
                miesta. <strong className="text-foreground">TakeMe nie je dopravcom ani taxislužbou.</strong> Samotnú
                prepravu uskutočňujú výlučne používatelia medzi sebou na vlastnú zodpovednosť.
              </p>
              <p>
                <strong className="text-foreground">1.3.</strong> Registráciou a používaním platformy potvrdzujete, že
                ste sa oboznámili s týmito VOP a so{" "}
                <a href="/privacy" className="text-primary underline">
                  Zásadami ochrany súkromia
                </a>
                , a že s nimi súhlasíte.
              </p>
              <p>
                <strong className="text-foreground">1.4.</strong> Služba je určená osobám starším ako 16 rokov. Osoby
                mladšie ako 18 rokov môžu službu používať len so súhlasom zákonného zástupcu.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCcw className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">
                2. Podmienky zrušenia a vrátenia peňazí (Cancellation &amp; Refund Policy)
              </h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">2.1. Zrušenie zo strany spolujazdca.</strong> Spolujazdec môže svoju
                žiadosť / rezerváciu zrušiť kedykoľvek pred fyzickým vyzdvihnutím vodičom. Ak vodič žiadosť ešte
                neschválil, alebo bola schválená a jazda sa ešte nezačala (stav <em>pending</em> alebo <em>accepted</em>
                ), spolujazdec má nárok na <strong className="text-foreground">plnú refundáciu (100 %)</strong>{" "}
                uhradenej sumy.
              </p>
              <p>
                <strong className="text-foreground">2.2. Zrušenie zo strany vodiča.</strong> Ak vodič zamietne žiadosť,
                zruší jazdu, alebo sa nedostaví, spolujazdec má nárok na{" "}
                <strong className="text-foreground">plnú refundáciu (100 %)</strong> vrátane provízie platformy.
              </p>
              <p>
                <strong className="text-foreground">2.3. Neuskutočnená jazda.</strong> Ak čas odchodu jazdy uplynul a
                spolujazdec nebol vyzdvihnutý (žiadosť neprešla do stavu <em>picked_up</em>), platforma automaticky
                iniciuje plnú refundáciu.
              </p>
              <p>
                <strong className="text-foreground">2.4. No-show spolujazdca.</strong> Ak sa spolujazdec nedostaví na
                dohodnuté miesto ani po primeranej čakacej dobe (min. 10 minút) a vodič odíde bez neho, jazda sa
                považuje za neuskutočnenú zo strany spolujazdca. V takom prípade{" "}
                <strong className="text-foreground">nárok na refundáciu nevzniká</strong> a suma prislúcha vodičovi ako
                kompenzácia.
              </p>
              <p>
                <strong className="text-foreground">2.5. Zrušenie počas jazdy / po vyzdvihnutí.</strong> Po tom, ako bol
                spolujazdec vodičom označený ako vyzdvihnutý (<em>picked_up</em>), sa jazda považuje za poskytnutú a{" "}
                <strong className="text-foreground">refundácia už nie je možná</strong>, s výnimkou preukázateľného
                pochybenia vodiča (kap. 2.7).
              </p>
              <p>
                <strong className="text-foreground">2.6. Spôsob refundácie.</strong> Všetky refundácie prebiehajú
                výhradne cez platobnú bránu <strong className="text-foreground">Stripe</strong> spätne na tú istú
                platobnú kartu alebo platobnú metódu, ktorou bola platba uhradená. TakeMe{" "}
                <strong className="text-foreground">neuchováva peniaze používateľov</strong> na žiadnych interných
                účtoch a neposkytuje výplatu refundácie v hotovosti ani inou cestou.
              </p>
              <p>
                <strong className="text-foreground">2.7. Reklamácia a mimoriadne prípady.</strong> Ak jazda neprebehla
                podľa dohody (napr. iná trasa, hrubé porušenie povinností vodiča, bezpečnostný incident), spolujazdec
                môže do 14 dní od jazdy podať reklamáciu na{" "}
                <strong className="text-foreground">support@takeme.sk</strong>. Prevádzkovateľ ju posúdi a v
                odôvodnených prípadoch iniciuje čiastočnú alebo plnú refundáciu cez Stripe.
              </p>
              <p>
                <strong className="text-foreground">2.8. Lehota vrátenia.</strong> Stripe iniciuje refundáciu okamžite;
                suma sa u vydávateľa karty typicky vráti do{" "}
                <strong className="text-foreground">5–10 pracovných dní</strong>. Prevádzkovateľ nezodpovedá za
                oneskorenie spôsobené bankou spolujazdca.
              </p>
              <p>
                <strong className="text-foreground">2.9. Právo spotrebiteľa na odstúpenie od zmluvy.</strong> Vzhľadom
                na to, že služba zdieľanej jazdy sa poskytuje v konkrétnom termíne (§ 7 ods. 6 písm. k) zákona č.
                102/2014 Z. z.), spotrebiteľ výslovne súhlasí, že po začatí poskytovania služby v dohodnutom čase stráca
                právo na odstúpenie od zmluvy podľa § 7 ods. 1 uvedeného zákona. Právo na refundáciu podľa článkov
                2.1–2.7 tým nie je dotknuté.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">3. Registrácia a účet</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">3.1.</strong> Pre používanie platformy je potrebná registrácia
                pomocou e-mailovej adresy a hesla, alebo prostredníctvom Google/Apple účtu.
              </p>
              <p>
                <strong className="text-foreground">3.2.</strong> Používateľ je povinný uvádzať pravdivé a aktuálne
                údaje. Neplatné alebo zavádzajúce údaje môžu viesť k zablokovaniu účtu.
              </p>
              <p>
                <strong className="text-foreground">3.3.</strong> Účet je osobný a neprenosný. Nesmiete ho prenajímať,
                požičiavať ani prevádzať na tretie osoby.
              </p>
              <p>
                <strong className="text-foreground">3.4.</strong> Prevádzkovateľ si vyhradzuje právo zablokovať alebo
                zrušiť účet, ak používateľ:
              </p>
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
              <h2 className="font-display text-2xl font-semibold">4. Ponúkanie jázd (vodiči)</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">4.1.</strong> Vodič zodpovedá za to, že:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>je držiteľom platného vodičského preukazu a preukazu o evidencii vozidla (TP);</li>
                <li>vozidlo je v prevádzkyschopnom stave a má platné povinné zmluvné poistenie;</li>
                <li>ponúkaná jazda je súkromná a vodič by túto trasu absolvoval aj bez spolujazdca;</li>
                <li>uvedené údaje o trase, čase a cene sú presné a aktuálne.</li>
              </ul>
              <p>
                <strong className="text-foreground">4.2.</strong> Vodič má právo odmietnuť ktoréhokoľvek spolujazdca bez
                uvedenia dôvodu, avšak nie na základe diskriminácie (rasa, pohlavie, náboženstvo, zdravotné
                postihnutie).
              </p>
              <p>
                <strong className="text-foreground">4.3.</strong> Vodič sa zaväzuje čakať na spolujazdca primeranú dobu
                (min. 10 minút) po dohodnutom čase, ak sa nestretnete na dohodnutom mieste.
              </p>
              <p>
                <strong className="text-foreground">4.4.</strong> Vodič môže definovať maximálny okruh odchýlky (detour)
                od trasy, v rámci ktorého je ochotný vyzdvihnúť alebo vysadiť spolujazdca.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">5. Rezervácie a spolujazdci</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">5.1.</strong> Spolujazdec môže požiadať o pripojenie k jazde len
                vtedy, ak:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>je na trase alebo v jej dostatočnej blízkosti podľa nastaveného okruhu odchýlky vodiča;</li>
                <li>je na jazde dostatočný počet voľných miest;</li>
                <li>je schopný a ochotný zaplatiť dohodnutú cenu.</li>
              </ul>
              <p>
                <strong className="text-foreground">5.2.</strong> Platba sa uskutočňuje pri odoslaní žiadosti výhradne
                cez platobnú bránu Stripe. Platba je držaná (authorized) do momentu dokončenia jazdy alebo jej zrušenia.
              </p>
              <p>
                <strong className="text-foreground">5.3.</strong> Zrušenie a vrátenie prostriedkov sa riadi kapitolou 2
                (Cancellation &amp; Refund Policy). Refundácie prebiehajú výlučne spätne cez Stripe na pôvodnú platobnú
                metódu.
              </p>
              <p>
                <strong className="text-foreground">5.4.</strong> Spolujazdec má právo hodnotiť vodiča a jazdu po jej
                dokončení. Hodnotenia sú verejné a ovplyvňujú reputáciu vodiča na platforme.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">6. Ceny, platby a výplaty vodičom</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">6.1.</strong> Cenu jazdy určuje výlučne vodič. Cena musí byť
                primeraná a nesmie presahovať skutočné náklady na jazdu na osobu (spolujazda, nie komerčná preprava).
              </p>
              <p>
                <strong className="text-foreground">6.2.</strong> TakeMe si z každej úspešnej jazdy účtuje
                sprostredkovateľskú províziu vo výške určenej v administrácii (aktuálne 10 %). Provízia sa strháva
                automaticky pri zúčtovaní platby cez Stripe.
              </p>
              <p>
                <strong className="text-foreground">6.3.</strong> Spolujazdec platí cenu jazdy výhradne cez integrovanú
                platobnú bránu <strong className="text-foreground">Stripe</strong>. TakeMe neukladá ani nemá prístup k
                údajom platobnej karty a{" "}
                <strong className="text-foreground">
                  neprevádzkuje žiadnu internú peňaženku ani úschovu peňazí používateľov
                </strong>
                .
              </p>
              <p>
                <strong className="text-foreground">6.4.</strong> Vodičovi je časť z ceny jazdy po odpočítaní provízie
                vyplatená prostredníctvom Stripe (bankovým prevodom / SEPA payoutom) po dokončení jazdy. Presný čas
                pripísania závisí od banky vodiča a spracovania Stripe (typicky 1–7 pracovných dní).
              </p>
              <p>
                <strong className="text-foreground">6.5.</strong> Pred prvou výplatou môže Stripe požadovať overenie
                totožnosti vodiča (KYC) v súlade s AML povinnosťami. TakeMe do tohto procesu nezasahuje.
              </p>
              <p>
                <strong className="text-foreground">6.6.</strong> Všetky finančné toky medzi spolujazdcom a vodičom
                prechádzajú cez Stripe. TakeMe nedrží ani nezadržiava finančné prostriedky používateľov na svojich
                účtoch.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">6a. Cold Start Bonus (registračný bonus)</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">6a.1.</strong> „Cold Start Bonus" je časovo obmedzený uvítací
                program, v rámci ktorého môže nový overený používateľ získať zľavu / kredit uplatniteľný pri platbe cez
                Stripe po splnení podmienok stanovených prevádzkovateľom (napr. dokončenie registrácie, overenie
                e-mailu/telefónu, prvá jazda).
              </p>
              <p>
                <strong className="text-foreground">6a.2.</strong> Bonus je <strong>nepeňažná zľava</strong>{" "}
                uplatniteľná výhradne na úhradu jazdy v aplikácii TakeMe. Bonus nie je možné vyplatiť v hotovosti,
                previesť na bankový účet ani zameniť za peniaze.
              </p>
              <p>
                <strong className="text-foreground">6a.3.</strong> Bonus je neprenosný, viazaný na jeden účet a jednu
                osobu. Vytváranie viacerých účtov, zneužívanie odporúčaní alebo iné obchádzanie pravidiel vedie k
                okamžitému odobratiu bonusu a k zablokovaniu účtu.
              </p>
              <p>
                <strong className="text-foreground">6a.4.</strong> Prevádzkovateľ si vyhradzuje právo program kedykoľvek
                zmeniť, obmedziť alebo ukončiť, ako aj upraviť výšku a podmienky bonusu. Nevyužitý bonus môže expirovať
                po dobe uvedenej pri jeho pripísaní.
              </p>
              <p>
                <strong className="text-foreground">6a.5.</strong> Pri zrušení účtu alebo porušení VOP nárok na
                nevyužitý bonus zaniká bez náhrady.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Ban className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">7. Storno zo strany vodiča</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">7.1.</strong> Vodič môže zrušiť ponuku jazdy alebo odmietnuť
                konkrétneho spolujazdca. Pri zrušení sa voľné miesta vracajú do ponuky a všetci dotknutí spolujazdci sú
                upozornení; ich platby sú plne refundované cez Stripe (kap. 2.2).
              </p>
              <p>
                <strong className="text-foreground">7.2.</strong> Pri zrušení je povinné uviesť dôvod. Opakované
                bezdôvodné zrušenia môžu viesť k zablokovaniu účtu.
              </p>
              <p>
                <strong className="text-foreground">7.3.</strong> Ak vodič neschváli žiadnu žiadosť a čas jazdy uplynie,
                platby všetkých žiadateľov sú automaticky refundované.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">8. Zakázané správanie</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">8.1.</strong> Na platforme je prísne zakázané:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>používanie platformy na komerčnú prepravu osôb (taxislužba, prepravná služba);</li>
                <li>falšovanie totožnosti, údajov o vozidle alebo trase;</li>
                <li>obťažovanie, diskriminácia alebo akékoľvek násilné správanie voči iným používateľom;</li>
                <li>zneužívanie hodnotení (falošné recenzie, koordinované negatívne hodnotenia);</li>
                <li>šírenie škodlivého softvéru, spamu alebo nevhodného obsahu;</li>
                <li>obchádzanie platieb (platba mimo platformy Stripe);</li>
                <li>zverejňovanie osobných údajov tretích osôb bez súhlasu;</li>
                <li>akékoľvek konanie porušujúce platné zákony Slovenskej republiky alebo EÚ.</li>
              </ul>
              <p>
                <strong className="text-foreground">8.2.</strong> Porušenie týchto pravidiel môže viesť k okamžitému
                zablokovaniu účtu, strate nároku na nevyplatené provízie a v prípade vážnych priestupkov aj k podaniu
                trestného oznámenia.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">9. Zodpovednosť</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">9.1.</strong>{" "}
                <strong className="text-foreground">TakeMe je výlučne sprostredkovateľ</strong> a nezodpovedá za:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>kvalitu, bezpečnosť alebo priebeh samotnej jazdy;</li>
                <li>pravdivosť údajov poskytnutých používateľmi;</li>
                <li>škody spôsobené počas jazdy (vrátane dopravných nehôd);</li>
                <li>stratu alebo poškodenie osobných vecí počas jazdy;</li>
                <li>meškanie, zmenu trasy alebo zrušenie jazdy zo strany vodiča alebo spolujazdca.</li>
              </ul>
              <p>
                <strong className="text-foreground">9.2.</strong> Zodpovednosť za priebeh jazdy nesie vodič ako
                prevádzkovateľ vozidla. Zodpovednosť za svoje správanie nesie každý používateľ individuálne.
              </p>
              <p>
                <strong className="text-foreground">9.3.</strong> Prevádzkovateľ nezodpovedá za škody spôsobené vyššou
                mocou, výpadkami internetu, technickými poruchami platobnej brány Stripe alebo iných externých služieb,
                ktoré sú mimo jeho kontroly.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">10. Hodnotenia a moderovanie</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">10.1.</strong> Po dokončení jazdy môže spolujazdec ohodnotiť vodiča
                a uviesť krátke zdôvodnenie. Hodnotenie je verejné a ovplyvňuje umiestnenie vodiča v rebríčku.
              </p>
              <p>
                <strong className="text-foreground">10.2.</strong> Používatelia môžu nahlásiť nevhodné správanie.
                Prevádzkovateľ si vyhradzuje právo preskúmať hlásenia a prijať primerané opatrenia vrátane zablokovania
                účtu.
              </p>
              <p>
                <strong className="text-foreground">10.3.</strong> Verejný chat je moderovaný. Obsah porušujúci pravidlá
                môže byť odstránený bez predchádzajúceho upozornenia.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">11. Notifikácie</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">11.1.</strong> Platforma zasiela push notifikácie a e-maily týkajúce
                sa stavu jazdy, rezervácií a dôležitých oznámení.
              </p>
              <p>
                <strong className="text-foreground">11.2.</strong> Push notifikácie sú zasielané len so súhlasom
                používateľa a je možné ich kedykoľvek vypnúť v profile alebo v nastaveniach zariadenia.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">12. Rebríček vodičov</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">12.1.</strong> Platforma zobrazuje verejný rebríček TOP vodičov na
                základe priemernej známky a počtu dokončených jázd.
              </p>
              <p>
                <strong className="text-foreground">12.2.</strong> Umiestnenie v rebríčku je informatívne a nezakladá
                žiadny nárok na odmenu alebo výhodu okrem verejného uznania.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">13. Ukončenie a zrušenie účtu</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">13.1.</strong> Používateľ môže kedykoľvek požiadať o zrušenie účtu v
                profile alebo e-mailom na support@takeme.sk.
              </p>
              <p>
                <strong className="text-foreground">13.2.</strong> Pri zrušení účtu sa osobné údaje vymažú do 30 dní,
                okrem údajov, ktoré sme povinní uchovať zo zákona (napr. účtovné doklady o platbách cez Stripe).
                Hodnotenia zostávajú zachované v anonymizovanej forme.
              </p>
              <p>
                <strong className="text-foreground">13.3.</strong> Prípadné nevyplatené prostriedky vodiča sú pred
                zrušením účtu vyplatené štandardným Stripe payoutom na jeho bankový účet.
              </p>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">14. Záverečné ustanovenia</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">14.1.</strong> Tieto VOP nadobúdajú účinnosť dňom zverejnenia.
                Používaním platformy po zmene VOP potvrdzujete súhlas s aktuálnym znením.
              </p>
              <p>
                <strong className="text-foreground">14.2.</strong> Vzťahy neupravené týmito VOP sa riadia právnym
                poriadkom Slovenskej republiky, najmä zákonom č. 40/1964 Zb. (Občiansky zákonník), zákonom č. 22/2004
                Z.z. (o elektronickom obchode) a zákonom č. 102/2014 Z. z. (o ochrane spotrebiteľa pri predaji na
                diaľku).
              </p>
              <p>
                <strong className="text-foreground">14.3.</strong> Prípadné spory sa budú snažiť strany riešiť dohodou.
                Spotrebiteľ má právo obrátiť sa aj na platformu{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  ec.europa.eu/consumers/odr
                </a>{" "}
                pre online riešenie sporov. V prípade neúspechu je príslušný súd v Slovenskej republike.
              </p>
              <p>
                <strong className="text-foreground">14.4.</strong> Ak by niektoré ustanovenie týchto VOP bolo neplatné
                alebo neúčinné, ostatné ustanovenia zostávajú v platnosti.
              </p>
              <p>
                <strong className="text-foreground">14.5.</strong> Kontakt:{" "}
                <strong className="text-foreground">support@takeme.sk</strong> · Prevádzkovateľ: Dominko s.r.o., Brehy
                82, 023 13 Čierne, IČO: 45634521 · Konateľ: Pavol Dominko · Vývojár platformy: Mário Kubalík
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
