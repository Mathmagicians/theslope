# Chefkokguide

Denne guide er til dig, der er chefkok på et madhold. Her finder du alt om menuplanlægning, annoncering og koordinering med dit hold.

> **Se også:** [Brugerguide](user-guide.md) | [Administratorguide](admin-guide.md) | [Systemoversigt](features.md)

---

## Hurtig oversigt

| Opgave | Hvor |
|--------|------|
| Meld dig som chefkok | `/dinner` eller `/chef` |
| Se mine madlavningsdage | `/chef` |
| Planlæg menu | `/chef/dinner/[id]` |
| Annoncér menu | `/chef/dinner/[id]` → Annoncér |
| Se allergier | `/chef/dinner/[id]` → Allergier |
| Se tilmeldinger | `/chef/dinner/[id]` → Tilmeldinger |

---

## Når du skal være chefkok for en fællesspisning

Selvom du er på et madhold, skal du aktivt **melde dig som chefkok** for de middage, du vil stå for. Der er 2 måder at gøre det på:

### Fra middagskalenderen

1. Gå til [skraaningen.dk/dinner](https://www.skraaningen.dk/dinner)
2. Find en middag hvor dit hold er tildelt
3. Klik på **Chef** under "Hvem laver maden?"

![Bliv chefkok fra kalenderen](screenshots/dinner/dinner-calendar.png)
*Klik på Chef-knappen for at tage tjansen som chefkok*

### Fra chefsiden

1. Gå til [skraaningen.dk/chef](https://www.skraaningen.dk/chef)
2. Find dit madhold i oversigten
3. Klik på **Bliv chefkok** for de dage du vil stå for

---

## Før madlavningsdagen

### Sådan ser du dine madlavningsdage

1. Gå til `/chef`
2. Se oversigt over kommende middage hvor du er chefkok
3. Klik på en dato for at se detaljer

![Chef Dashboard](screenshots/chef/chef-dashboard.png)

### Sådan planlægger du menuen

1. Gå til din næste madlavningsdag
2. Udfyld:
   - **Menutitel** - Kort beskrivelse af retten
   - **Menubeskrivelse** - Detaljer om maden
3. Gem ændringer

### Sådan publicerer du menuen

Når du publicerer, synkroniseres menuen automatisk til Heynabo-kalenderen, så alle beboere kan se den i Heynabo-appen.

1. Gå til [skraaningen.dk/chef](https://www.skraaningen.dk/chef)
2. Vælg din madlavningsdag fra listen
3. Udfyld menutitel og -beskrivelse
4. Klik **Publicer**

**Hvad sker der ved publicering:**
- En begivenhed oprettes i Heynabo med menuens titel og beskrivelse
- Begivenheden viser tidspunkt, chefkokkens navn, og et link tilbage til Skrånerappen
- Beboere får besked i Heynabo-appen og kan se menuen

> **Bemærk:** Når middagen først er publiceret, kan du opdatere menuen i Skrånerappen - ændringerne synkroniseres automatisk til Heynabo.

### Sådan aflyser du en middag

Hvis middagen ikke kan afholdes, kan du aflyse den. Aflysning bruger en **2-trins bekræftelse** for at undgå uheld:

1. Gå til [skraaningen.dk/chef](https://www.skraaningen.dk/chef) og vælg middagen
2. Klik **Aflys** - knappen skifter farve til rød og viser "Tryk igen for at aflyse..."
3. Klik igen inden for 3 sekunder for at bekræfte aflysningen

**Hvad sker der ved aflysning:**
- Middagen markeres som AFLYST
- Beboerne får deres penge tilbage (ordrer refunderes)
- Heynabo-begivenheden opdateres hvis den var publiceret

### Sådan fortryder du en aflysning

Har du aflyst ved en fejl? Du kan genåbne middagen:

1. Gå til den aflyste middag
2. Klik **Annuller aflysning** - knappen viser "Tryk igen for at genåbne..."
3. Klik igen for at bekræfte

Middagen genåbnes og beboere kan tilmelde sig igen.

### Sådan tjekker du allergier

1. Gå til madlavningsdagen
2. Se allergilisten for tilmeldte gæster
3. Planlæg menuen så alle kan spise med

---

## På madlavningsdagen

### Sådan ser du tilmeldinger

1. Gå til madlavningsdagen
2. Se antal gæster:
   - **Spis i salen** - Antal der spiser i fællessalen
   - **Takeaway** - Antal der henter mad
   - **Total** - Samlet antal portioner

### Sådan håndterer du afbud

Afbud efter deadline vises i tilmeldingsoversigten. Beboeren betaler stadig for maden.

---

## Dit madhold

### Sådan ser du dit hold

1. Gå til `/chef`
2. Se holdmedlemmer med roller:
   - **Chefkok** - Ansvarlig for menu og indkøb
   - **Kok** - Hjælper med madlavning
   - **Kokkespire** - Juniorhjælper

### Roller i køkkenet

| Rolle | Ansvar |
|-------|--------|
| Chefkok | Planlægger menu, handler ind, leder køkkenet |
| Kok | Hjælper med tilberedning |
| Kokkespire | Lærer at lave mad, lettere opgaver |

---

## FAQ

*Spørgsmål tilføjes løbende baseret på brugerhenvendelser.*

---

*Sidst opdateret: Januar 2026*
