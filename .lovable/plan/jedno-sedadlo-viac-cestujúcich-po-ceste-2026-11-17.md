# Jedno sedadlo, viac cestujúcich po ceste

## Výsledok
V jednej jazde sa bude dať rezervovať rovnaké sedadlo na nadväzujúce úseky. Napríklad Bratislava → Nitra a Nitra → Košice, bez ďalšej jazdy od vodiča.

## Čo sa zmení
- Po výbere nástupu a výstupu sa zobrazí počet voľných miest na konkrétnom úseku, nie iba pre celú jazdu.
- Jazda sa nezakryje len preto, že prvý úsek je plný. Dostupnosť sa overí podľa zadaných miest; bez vybranej trasy sa zobrazí, že miesta môžu byť dostupné na časti jazdy.
- Vodič bude môcť prijať nadväzujúcich cestujúcich, ale nie viac ľudí naraz, než má sedadiel.
- Po potvrdení vystúpenia sa miesto uvoľní bez ručného menenia počtu a bez opakovaného navýšenia pri opakovanom kliknutí.
- Počas jazdy sa neponúkne nástup, ktorý vodič podľa existujúcej ochrany už prešiel.

## Zachované pravidlá
- Vodič potvrdzuje žiadosti; nič sa neprijíma automaticky.
- Cena cestujúceho, poplatok TakeMe, PIN, platby a pravidlá refundácie zostanú zachované.
- Letiskové a firemné jazdy si zachovajú svoje oddelenie a prístupy.
- Zmena živej cesty nebude meniť dohodnuté úseky ani ceny.

## Technické riešenie
- Pridať celkovú kapacitu jazdy a bezpečne ju doplniť pri existujúcich jazdách z dostupných miest a potvrdených rezervácií.
- V spoločnej databázovej funkcii premietnuť nástup a výstup na pôvodnú trasu a vypočítať maximálne súbežné obsadenie. Nadväzujúce úseky so spoločnou hranicou sa neprekrývajú; chýbajúca alebo nepoužiteľná geometria sa posúdi konzervatívne.
- Zamknúť jazdu pri prijatí rezervácie, aby súčasné žiadosti nemohli preplniť auto. Použiť rovnakú kontrolu pred platbou a pri bežných, bezplatných aj firemných rezerváciách; zachovať existujúci postup uvoľnenia platby pri neúspešnej rezervácii.
- Presunúť počítanie miest z ručných zmien v prehliadači do jednotného serverového pravidla, vrátane odmietnutia, zrušenia, nedostavenia a vystúpenia.
- Zjednotiť zobrazenie dostupnosti vo vyhľadávaní, detaile a všetkých príslušných zoznamoch; aktualizovať ho pri zmenách rezervácií.

## Overenie
- Test jedného sedadla: Bratislava → Nitra a Nitra → Košice sú povolené, Bratislava → Košice súbežne nie.
- Testy viacerých sedadiel, súčasného prijatia, opakovaného vystúpenia, zrušenia a chýbajúcich súradníc.
- Prihlásený postup vodiča a cestujúceho: vybrať úsek, odoslať rezerváciu, prijať ju, potvrdiť vystúpenie a overiť nové miesto.
- Telefón a počítač, svetlé aj tmavé zobrazenie; bez skúšobných push správ skutočným používateľom.