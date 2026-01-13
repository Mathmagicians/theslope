# Brugerguide til Skråningens Fællesspisning

Velkommen til TheSlope - Skråningens system til fællesspisning! Denne guide hjælper dig med de mest almindelige opgaver.

> **Se også:** [Chefkokguide](chef-guide.md) | [Administratorguide](admin-guide.md) | [Systemoversigt](features.md)

> **Tip:** Klik på hjælp-ikonet (?) i øverste højre hjørne for kontekstafhængig hjælp på hver side.

---

## For at bruge Skrånerappen...

Før du kan logge ind, skal du sikre dig følgende i **Heynabo**:

1. **Du har en Heynabo-konto** - Login bruger din Heynabo email og password
2. **Dine børn er tilføjet med fødselsdato** - Vigtigt! Billetprisen beregnes ud fra alder:
   - 👶 **Baby** (0-1 år) - gratis
   - 🧒 **Barn** (2-11 år) - reduceret pris
   - 🧑 **Voksen** (12+ år) - fuld pris

> **Vigtigt for forældre:** Tjek at dine børn er registreret i Heynabo **med korrekt fødselsdato**. Uden fødselsdato betaler du voksenpris for alle børn! Tilføj eller ret børnenes fødselsdato i Heynabo - så synkroniseres det automatisk til Skrånerappen.

### Sådan tjekker du dine børns billettype

1. Log ind på [skraaningen.dk](https://www.skraaningen.dk)
2. Gå til **Husstanden** (fanen med hus-ikon)
3. Se listen over husstandens medlemmer
4. Hver person vises med deres billettype: 👶 Baby, 🧒 Barn, eller 🧑 Voksen

Står dit barn som **Voksen** selvom de er under 12 år? Så mangler fødselsdatoen i Heynabo. Ret det i Heynabo-appen, og det opdateres automatisk i Skrånerappen.

---

## Kom godt i gang

### Sådan logger du ind

1. Gå til [skraaningen.dk](https://www.skraaningen.dk)
2. Klik på **Log ind** i øverste højre hjørne
3. Brug dit Heynabo brugernavn og password
4. Du bliver sendt til din dashboard-side

![Dashboard](screenshots/user/dashboard.png)

> **Bemærk:** Login-oplysninger synkroniseres fra Heynabo. Hvis du har glemt dit password, nulstil det på Heynabo.

### Sådan finder du rundt

Efter login har du adgang til:

| Sektion | Hvad du kan gøre |
|---------|------------------|
| **Tilmeldinger** | Se og book middage for din husstand |
| **Husstanden** | Se medlemmer og sæt ugentlige præferencer |
| **Allergier** | Tilføj allergier for husstandens medlemmer |
| **Økonomi** | Se fakturaer og udgifter til fællesspisning |
| **Indstillinger** | Opdater husstandsoplysninger |

---

## Beboer-opgaver

### Sådan sætter du ugentlige præferencer

Ugentlige præferencer bestemmer, hvornår du automatisk bliver tilmeldt fællesspisning.

> **Automatisk opdatering:** Når du ændrer præferencer, opdateres dine fremtidige bookinger automatisk. Ændrer du f.eks. mandag fra "Ingen" til "Spisesal" eller "Takeaway", bliver du automatisk tilmeldt alle kommende mandagsmiddage. Ligeså kan du være fast frameldt på bestemte ugedage, takeaway alle tirsdage, og sen spisning onsdag efter den lange dag på arbejde.

> **Afmeldinger respekteres:** Har du afmeldt en specifik middag (f.eks. mandag den 15.), vil den IKKE blive genskabt når du ændrer præferencer. Dine manuelle afmeldinger bevares altid.

> **Sletning af bookinger:** Ændrer du en dag til "Ingen", slettes dine fremtidige bookinger på den dag automatisk.

1. Gå til **Husstanden** (fanen med hus-ikon)
2. Find den person du vil redigere
3. Klik på **blyant-ikonet** (✏️) ud for personen
4. Vælg spisningsform for hver dag (se [Spisningsformer](#spisningsformer) nedenfor)
5. Klik **Gem** - dine bookinger opdateres automatisk

![Præferencer i redigeringstilstand](screenshots/household/household-card-preferences-editing.png)
*Redigér præferencer for et enkelt medlem*

#### Power mode - opdatér alle på én gang

Vil du sætte samme præferencer for hele familien?

1. Klik på **⚡ lynikonet** på rækken "Alle medlemmer"
2. Vælg præferencer for hver dag
3. Klik **Gem** - alle medlemmer opdateres

![Husstandens medlemmer](screenshots/household/household-members-view-mode.png)
*Oversigt med alle medlemmer - klik ⚡ for power mode*

### Sådan tilmelder du dig fællesspisning

Tilmelding sker automatisk baseret på dine ugentlige præferencer. Men du kan altid ændre enkeltdage:

1. Gå til **Tilmeldinger** (kalenderikonet)
2. Vælg visning: **Dag**, **Uge** eller **Måned**
3. Klik på en dag for at se/ændre tilmeldinger
4. Brug **✏️ Redigér** for at ændre tilmeldinger

![Tilmeldingskalender](screenshots/household/household-bookings.png)
*Kalenderen viser dine tilmeldinger - vælg dag/uge/måned visning*

#### Uge- og månedsvisning (Grid booking)

I uge- eller månedsvisning kan du hurtigt ændre tilmeldinger for flere dage:

1. Klik **✏️ Redigér** for at aktivere redigeringstilstand
2. Klik på en celle for at skifte mellem spisningsmåder (🍽️ → 🛍️ → ❌)
3. Brug **⚡ Power-rækken** øverst til at ændre alle medlemmer på én gang
4. Klik **Gem** når du er færdig - eller **Annullér** for at fortryde

> **Tip:** Ændringer gemmes først når du klikker Gem. Du kan frit eksperimentere og annullere.

![Ugevisning](screenshots/dinner/booking-grid-week.png)
*Ugevisning: Overblik over hele ugens tilmeldinger*

### Forklaring

I appen bruges følgende symboler:

| Symbol | Navn | Betydning |
|:------:|------|-----------|
| ![Spisesal](https://api.iconify.design/streamline:food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining.svg?height=20&color=%2322c55e) | **Spisesal** | Spis i fællessalen til normal tid |
| ![Sen](https://api.iconify.design/heroicons:moon.svg?height=20&color=%2322c55e) | **Sen** | Spis i fællessalen til sen spisning |
| ![Takeaway](https://api.iconify.design/heroicons:shopping-bag.svg?height=20&color=%2322c55e) | **Takeaway** | Hent mad og spis hjemme |
| ![Ingen](https://api.iconify.design/heroicons:x-circle.svg?height=20&color=%23ef4444) | **Ingen** | Ikke tilmeldt denne dag |
| ![Blandet](https://api.iconify.design/heroicons:question-mark-circle.svg?height=20&color=%23737373) | **Blandet** | Familiemedlemmer har forskellige valg |
| ![Power](https://api.iconify.design/heroicons:bolt.svg?height=20&color=%23f59e0b) | **Power mode** | Ændr alle familiemedlemmer på én gang |

Klik på en celle for at ændre din booking - den cykler igennem mulighederne. Når du er færdig, husk at trykke **Gem**.

### Sådan framelder du dig fællesspisning

**Før deadline (typisk kl. 12 dagen før):**
1. Gå til **Tilmeldinger**
2. Find datoen og klik på den
3. Klik **Afmeld** - du slipper for at betale

**Efter deadline:**
- Du kan stadig afmelde, men du betaler for maden
- Overvej at sælge din plads til en nabo (kommer snart)

### Sådan bestiller du takeaway

1. Gå til [Tilmeldinger](https://www.skraaningen.dk/household)
2. Find datoen og klik på den
3. Skift til **🛍️ Takeaway** i stedet for Spis/Sen
4. Hent maden i køkkenet på middagstidspunktet

> **Tip:** Du kan også sætte takeaway som standard under [Præferencer](https://www.skraaningen.dk/household).

![Takeaway valg](screenshots/household/household-bookings.png)

### Sådan inviterer du en gæst

Du kan tilmelde gæster til fællesspisning - de tilknyttes dig som vært.

1. Gå til [Tilmeldinger](https://www.skraaningen.dk/household)
2. Find datoen i kalenderen og klik på den
3. Klik på **+** ud for **Tilføj gæst**
4. Vælg billettype (Voksen, Barn eller Baby)
5. Tilføj evt. gæstens allergier
6. Vælg antal gæster (hvis flere af samme type)
7. Vælg spisningsform (Spisesal, Sen eller Takeaway)
8. Klik **Tilføj gæst**

Gæsten vises i tabellen som "Gæst af [dit navn]" med den valgte billettype.

![Tilføj gæst](screenshots/dinner/booking-form-after-save.png)

> **Bemærk:** Gæstebilletter faktureres til din husstand via PBS.

### Sådan ser du din PBS-faktura

1. Gå til **Økonomi** (pengeikonet)
2. Se oversigt over udgifter for denne og forrige periode
3. Fakturaen trækkes automatisk via PBS omkring den 1. i måneden

![Økonomi fanen](screenshots/household/household-economy.png)

### Sådan tilføjer du allergier

1. Gå til **Allergier** (advarsels-ikonet)
2. Vælg det husstandsmedlem der har allergien
3. Klik **Tilføj allergi**
4. Vælg allergitype fra listen
5. Tilføj evt. en kommentar (f.eks. "mild" eller "alvorlig")
6. Gem

![Allergi administration](screenshots/household/household-allergies.png)

> **Vigtigt:** Kokkene ser allergierne når de planlægger menuen. Sørg for at holde dem opdateret!

---

## Chefkok-opgaver

Er du chefkok for et madhold? Se [Chefkokguiden](chef-guide.md) for vejledning til:

- Sådan planlægger og annoncerer du en menu
- Sådan ser du tilmeldinger og allergier
- Sådan koordinerer du med dit hold

---

## Administrator-opgaver

Er du administrator? Se [Administratorguiden](admin-guide.md) for vejledning til:

- Sæsonplanlægning og oprettelse af middage
- Madhold og teamfordeling
- Import fra Heynabo og CSV

---

## FAQ

*Spørgsmål tilføjes løbende baseret på brugerhenvendelser.*

---

## Har du brug for hjælp?

### Hurtig hjælp
Klik på **?-ikonet** i øverste højre hjørne for kontekstafhængig hjælp.

### Rapportér fejl eller kom med forslag
Klik på **?-ikonet** og vælg **Giv feedback** - vi læser alle henvendelser!

### Tekniske problemer
Kontakt en administrator eller opret et issue på [GitHub](https://github.com/Mathmagicians/theslope/issues).

---

*Sidst opdateret: Januar 2026*
