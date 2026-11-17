# Otvorenie hromadného upozornenia
- [x] Obsadenie sedadiel po úsekoch: serverová kapacita, jednotné rezervácie, automatické počty a označenie čiastočných miest. Osem matematických kontrol a 15 regresných testov prešlo; databázová skúška prijala nadväzujúce úseky, odmietla prekrývanie a opakované vystúpenie nezvýšilo kapacitu. Zostavenie bez chýb; dočasná jazda odstránená.
- [ ] Úplná rezervácia a vystúpenie cez prihlásené obrazovky: skúšobného cestujúceho blokovalo nedokončené uvítanie; telefón a počítač bez pretečenia overené na detaile vodiča, platba kartou ani skutočné vystúpenie neboli vykonané. Automatické vyhľadanie vhodného úseku podľa adries ešte nie je zapojené vo všetkých zoznamoch.
- [x] Na žiadosť používateľa spresnená kontrola pripomienok na každú minútu (približne 30 minút pred odchodom); bežné správy neobsahujú skúšobný text a dočasné skúšobné správy sú odstránené. Používateľ potvrdil prijatie upozornenia na telefóne.
- [x] Pripomienka 30 minút pred odchodom vodičovi aj potvrdeným cestujúcim, kontrola každých 5 minút a jedinečný záznam na jazdu/osobu/čas odchodu; osem časových testov a tri testy odkazov prešli. Prvý pravidelný beh uspel a vytvoril dve pripomienky; používateľ nemôže spúšťať odosielanie ani čítať interné záznamy, zostavenie bez chýb. Prijatie systémového push na telefóne nebolo overené.
- [x] Opakované spustenie vrátilo 0 nových pripomienok. Skúšobná správa čitateľná na počítači v svetlom aj tmavom zobrazení; skúšobné údaje odstránené. Kontrolu mobilného otvorenia a zatvorenia prerušilo nestabilné skúšobné prihlásenie; prijatie systémového push a otvorenie vodičovej/cestujúceho jazdy z telefónu zostávajú neoverené.
- [x] Kliknutie na nové push upozornenie otvorí konkrétnu celú správu, aj mimo posledných 20 upozornení; cieľ sa zachová pri prihlásení.
- [x] Tri automatické testy prešli a zostavenie je bez chýb. Prihlásená stránka načítala celú správu; úplné vizuálne overenie prerušila výzva na zapnutie push a nestabilné skúšobné prihlásenie. Skúšobné správy odstránené. Skutočný klik na systémové upozornenie telefónu nebol vykonaný.

# Spiatočná jazda
- [x] Predvyplniť obrátenú trasu vodiča a zastávky v existujúcom formulári, zachovať kategóriu a nastavenia.
- [x] Štyri testy prešli; prihlásený vodič vytvoril spiatočnú jazdu s obrátenou trasou a zastávkou, uloženie overené na detaile, skúšobná jazda odstránená. Telefón bez vodorovného pretečenia a zostavenie bez chýb.

# Payment text consistency
- [x] Correct registration FAQ and all language versions.
- [x] Audit and update obsolete payment text throughout passenger, driver, legal and admin screens, payment receipts and public summaries; hide obsolete wallet bonus and settings.
- [x] Verify all four FAQs and legal pages in the browser, 17 targeted tests, and current build OK. No live payment was made.

# Driver languages on ride cards
- [x] Show saved driver languages on passenger and search ride cards without hiding them on mobile.
- [x] Verify both lists with an eight-language test ride at phone width, no horizontal overflow, and current build OK.
# Facebook náhľad zdieľanej jazdy
- [x] Zobraziť vo Facebook skupine trasu, opis a obrázok pri zdieľanom odkaze jazdy.
- [x] Overiť verejný náhľad a presmerovanie na konkrétnu jazdu.

# Rozbeh TakeMe
- [x] Overiť zapnuté upozornenia, návštevnosť a rezervácie.
- [x] Pripraviť konkrétny 14-dňový postup a prirodzené texty na získanie prvých vodičov a cestujúcich.

# Firemný benefit cez pozvánku
- [ ] Registrácia firmy a pozvánka pre ľubovoľný overený email, pripojenie/odpojenie firemného režimu.
- [ ] HR iba súhrn jázd, odhad CO₂ a fakturačný podklad; oddelené cesty a bezpečná rezervácia v limitoch.
- [ ] Overiť pravidlá, prihlásený postup a aktuálne zostavenie.

# Prehľad hľadaní a rezervácií
- [x] Pridať meranie hľadaní a prázdnych výsledkov bez presných polôh.
- [x] Pridať administrátorský súhrn a overiť prihlásené zobrazenie; 4 testy prešli, skúšobné hľadanie sa zobrazilo a mobil nemá vodorovné pretečenie.

# Viditeľnosť aktívnych jázd
- [x] Odstrániť časové skrývanie aktívnych jázd zo zoznamov; Pavlova jazda je viditeľná v prihlásenom vyhľadávaní, 4 testy prešli. Rezervačné a automatické ukončovacie pravidlá zostali bez zmeny.

# Poloha pri pripojení po odchode
- [x] Vysvetliť blokovanie nových žiadostí bez LIVE bez tvrdenia, že jazda skončila; zobraziť dostupnú poslednú polohu s časom, inak oznámiť nedostupnosť. Prihlásený detail reálnej jazdy overený, 4 testy prešli a zostavenie je bez chýb.

# Pripojenie bez LIVE
- [x] Odstrániť časové blokovanie z formulára, platobnej funkcie a bežnej aj firemnej rezervácie; ponechať ochranu ukončených a zrušených jázd aj dostupných miest. Deväť testov prešlo.

# Posledná obec a prejdený nástup
- [x] Zobraziť iba obec/mesto s časom uloženej polohy aj po zatvorení appky.
- [x] Zablokovať už prejdený nástup pred platbou aj pri odoslaní rezervácie bez požiadavky LIVE; pri posune počas platby uvoľniť blokáciu alebo refundovať poplatok.
- [x] Overiť geometriu proti skutočnému serveru a prihlásený formulár s vybraným nástupom. Skutočný pohyb vodiča a platba/refundácia kartou neboli vykonané.

# Formulár jazdy bez posúvania a s mapou na kliknutie
- [x] Odstrániť automatické posúvanie k mape pri vypĺňaní a mapu nahradiť tlačidlom, ktoré ju otvorí.
- [x] Overiť na telefóne: vypísanie trasy neposunie stránku, mapa sa otvorí z tlačidla a po zatvorení zostáva rovnaké miesto; dva strážne testy prešli a zostavenie je bez chýb.

# Spodné menu sa schová pri rolovaní
- [x] Mobilné spodné menu zmizne pri rolovaní dole a vráti sa, keď človek rolbuje hore alebo sa vráti na začiatok stránky.
- [x] Overené na telefóne (390×700) na Vytvoriť jazdu: hore viditeľné, po rolovaní dole skryté, po rolovaní hore zase viditeľné; 5 testov prešlo, spolu 88/88, zostavenie bez chýb.

# Meranie pridania appky na plochu
- [x] Merať prvú zistenú inštaláciu a otvorenie z plochy cez vstavanú analytiku so súhlasom, bez osobných údajov; počet je pozorovaný od nasadenia, nie historický počet ľudí.
- [x] Šesť testov overilo Android udalosť, iPhone otvorenie, opakovanie, súhlas, GPC aj neskoré načítanie analytiky; v prehliadači overená simulovaná udalosť na existujúcej stránke inštalácie, zostavenie aj oba katalógové záznamy sú platné. Skutočná inštalácia na telefóne a prijatie dát zo zverejnenej appky ešte neboli overené.

# Daňový export presne na cent
- [x] Všetky sumy exportu a potvrdenia o platbe sa počítajú z celých centov, DPH sa rozdeľuje pri každej platbe zvlášť, takže základ dane + DPH = suma poplatku.
- [x] Overené priamo zo Stripe: október 3,00 € (DPH 0,57 €, základ 2,43 €), november 1,00 € (DPH 0,19 €, základ 0,81 €); 103 testov a zostavenie bez chýb.

# Poplatok Stripe v daňovom exporte
- [x] Export zobrazuje aj sumu, ktorú si strhol Stripe (po refundácii úmernie), a zvyšok po jeho poplatku; DPH základ ostáva z celej poplatkovej sumy.
- [x] Overené priamo zo Stripe: október 3,00 € poplatkov, Stripe 0,81 €, zvyšok 2,19 €; november 1,00 €, Stripe 0,27 €, zvyšok 0,73 €. 104 testov a zostavenie bez chýb.

# Zmena cesty počas jazdy
- [x] Vodič môže vybrať alternatívnu cestu alebo prejazd cez obec/ulicu; cieľ, zastávky, miesta cestujúcich a ceny zostávajú zachované, živá cesta sa ukladá samostatne.
- [x] 12 cielených testov prešlo, mapa aj simulované uloženie overené na počítači a telefóne bez pretečenia; zostavenie bez chýb.
- [ ] Uloženie počas skutočnej jazdy a živé zobrazenie u cestujúceho: účet nemá aktívnu jazdu; simulované overenie nie je náhradou tohto testu.
