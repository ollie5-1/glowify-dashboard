# Glowify Dashboard — installatiedraaiboek nieuwe woning

Volledige uitrol van het Glowify-dashboard bij een nieuwe klant. Waar de
vroegere aanpak een YAML-sjabloon per woning vroeg, bouwt de **strategie** het
dashboard nu dynamisch op uit de Areas, floors en entiteiten. Je vult enkel de
backend in en wijst toestellen correct toe.

## 0. Vereisten

- Home Assistant **2026.5** of nieuwer.
- Deze HACS-frontenddelen: **Mushroom**, **Bubble Card**, **card-mod**,
  **browser_mod** (ook als integratie, met de vaste schermen geregistreerd).

## 1. Basis

1. HAOS installeren (of de golden back-up terugzetten — dan vervallen de meeste
   stappen hieronder).
2. HACS installeren (Get HACS add-on, herstart, integratie koppelen).

## 2. HACS-onderdelen downloaden

1. Download **Mushroom**, **Bubble Card**, **card-mod** en **browser_mod**.
2. Voeg **Glowify Dashboard** toe als custom repository:
   HACS → drie puntjes → *Custom repositories* → URL van deze repo, type
   **Dashboard** → daarna in HACS zoeken en downloaden.
3. browser_mod ook als **integratie** toevoegen en de vaste schermen
   (wandpaneel) registreren.
4. Ververs hard: F12 → Network → *Disable cache* aan → twee keer F5 → vinkje uit.
   (Ctrl+F5 alleen is niet betrouwbaar.)

## 3. Thema plaatsen

1. Kopieer `themes/glowify.yaml` uit deze repo naar `<config>/themes/`.
2. Zorg dat `configuration.yaml` het frontend-blok bevat (zie
   `backend/configuration.example.yaml`):
   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```
3. Herstart HA. Kies het thema **Glowify** (per gebruiker instelbaar).

## 4. Areas, floors en naamconventies

1. Maak per kamer een **Area** en wijs alle toestellen toe. Kamernamen kort en
   Nederlands (Woonkamer, Keuken, Inkomhal).
2. Wijs elke Area aan een **verdieping (floor)** toe. Heb je geen floors, dan
   kan je later `manual_floors` in de opties gebruiken.
3. Naamconventies:
   - Lichtgroep per kamer: entiteit `light.verlichting_<area_id>`.
   - Sensoren met de juiste `device_class` (temperatuur, luchtvochtigheid,
     beweging/aanwezigheid).
   - Sloten, zonwering en ventilatoren in de juiste Area.
4. Statuslampjes van gateways/hubs zijn **geen** lampen: nooit in een
   Verlichting-groep, en geef ze het label **verberg**.

## 5. Backend-blokken

Neem de blokken uit `backend/` over in je config:

1. **Lichtgroepen** per kamer (`backend/configuration.example.yaml`, `light:`).
2. **Scènescripts**: kopieer `backend/glowify_scripts.yaml` naar `<config>/` en
   voeg de include toe: `script glowify: !include glowify_scripts.yaml`.
3. **Scene-schuifjes**: neem het `input_number:`-blok over (acht schuifjes).
4. **Automatiseringen-haak**: `backend/glowify_automations.yaml` (`[]`) met
   `automation glowify: !include glowify_automations.yaml`.
5. Herstart HA.

## 6. Dashboard toevoegen

**Instellingen → Dashboards → Dashboard toevoegen → Communitydashboards →
Glowify Dashboard.**

De strategie leest de woning en bouwt de Thuis-view, kamerbalken, pop-ups en
kamerpagina's automatisch op. Geen YAML plakken, nooit *Controle nemen*.

Optioneel fijn afstellen via de Ruwe configuratie-editor of de config-editor:

```yaml
strategy:
  type: custom:glowify
  options:
    title: Glowify
    # manual_floors: [...]     # enkel wanneer je geen HA-floors gebruikt
    # rooms: { berging: { hidden: true } }
```

## 7. Scènes instellen

Open de **Scenes-chip** op de Thuis-view en zet de startwaarden:
Gezellig 30/2400, Relax 15/2200, Normaal 65/2900, Fel 100/4600 (helderheid %,
kleurtemperatuur K). Dit staat al als `initial` in het voorbeeld.

## 8. Testen

Test op gsm, tablet en desktop; bekijk het thema in lichte én donkere modus.
Controleer per kamer: kamerbalk-status, lampkleur, zonwering/ventilator/slot,
beweging (enkel zichtbaar bij beweging), de pop-up (tik) en de kamerpagina
(lang indrukken).

## 9. Back-up

Maak een volledige back-up als vertrekpunt voor onderhoud.

---

## Achteraf aanpassen

- **Bewerkmodus**: tik het subtiele **potlood-chipje** bovenaan. Dan verschijnen
  de plusjes op de kamerbalken en de plus- en opruim-chip. Nog een tik verbergt
  alles. De stand wordt per browser onthouden.
- **Knopje of chip toevoegen**: in bewerkmodus op een plusje tikken → kies
  icoon, kleur, tekst en actie in de dialoog. Wordt in de strategie-opties
  bewaard; het dashboard vernieuwt zichzelf.
- **Toestel verbergen**: bewerkmodus → **opruim-chip** (bezem) → beheerlijst.
  Zet een toestel op *Verbergen* (label `verberg`) of *Tonen*. Alternatief:
  Instellingen → Entiteiten → entiteit → Verborgen aan.
- **Kamer verbergen / volgorde**: `rooms.<area>.hidden` / `rooms.<area>.order`
  in de opties.
- **Kleuren of vormen**: `themes/glowify.yaml`, daarna Thema's herladen.

## Werkregels (kort)

1. Nooit *Controle nemen* op het strategie-dashboard.
2. Verversen: F12 → Network → *Disable cache* → 2× F5.
3. HACS-updates eerst op de demo testen, dan bij klanten.
4. Lichtcommando's altijd naar de lichtgroepen, nooit naar "alles".
5. "Configuratiefout" terwijl het onderdeel in HACS staat? Controleer de bron
   (Dashboards → drie puntjes → Bronnen); snelste fix: het onderdeel in HACS
   opnieuw downloaden.
