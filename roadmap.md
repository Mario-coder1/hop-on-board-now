# Otvorenie hromadného upozornenia
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
