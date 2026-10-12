# Facebook náhľad zdieľanej jazdy

## Výsledok
- Zdieľaný odkaz poskytne Facebooku názov trasy, krátky opis jazdy a obrázok TakeMe.
- Po kliknutí človek naďalej otvorí konkrétnu jazdu v aplikácii.

## Postup
1. Pridať verejnú náhľadovú adresu, ktorá bezpečne načíta iba základné údaje jazdy a vráti Facebook metadáta.
2. Upraviť tlačidlo Zdieľať tak, aby Facebooku a kopírovanému textu odovzdávalo túto adresu.
3. Overiť výsledné metadáta a presmerovanie na konkrétnu jazdu.

## Technické detaily
- Náhľad nebude zverejňovať telefón, polohu vodiča ani údaje cestujúcich.
- Použije existujúci obrázok TakeMe 1200 × 630 a po otvorení presmeruje na `/ride/:id`.
