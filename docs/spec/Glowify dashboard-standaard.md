# Glowify dashboard-standaard

Datum: 2026-07-03
Status: versie 1.0, uitontwikkeld en getest op de demo-HA
Gelinkt: [[Glowify kleurtaal dashboard]], [[Voorstel Glowify signature dashboard (aanpak)]], [[Project - Glowify installatie-USB (golden image keten)]]

Dit is het herbruikbare pakket voor elke klantinstallatie: wat erop moet, hoe je het uitrolt, en hoe je het achteraf aanpast zonder de automatische werking te breken.

## 1. Architectuur in één alinea

De motor is de **Mushroom Dashboard Strategy**: die bouwt de kamer-views en domein-views automatisch uit de Areas, dus elk nieuw toestel in de juiste kamer verschijnt vanzelf. Daarbovenop ligt één handgemaakte **Thuis-view** (Bubble Card) met interactieve kamerbalken, pop-ups per kamer die zichzelf vullen (auto-entities), snelpanelen met scèneknoppen (browser_mod) en de Glowify-kleurtaal. De Thuis-view is per installatie kopieerwerk uit het sjabloonbestand; al de rest is automatisch.

## 2. Benodigde onderdelen

| Onderdeel | Bron | Rol |
|---|---|---|
| Mushroom | HACS (piitaya) | Kaartenset voor de automatische views |
| Mushroom Dashboard Strategy | HACS (DigiLive), getest met v3.2.0 | De motor: bouwt views uit Areas |
| card-mod | HACS (thomasloven) | Stijlverfijning |
| Bubble Card | HACS (Clooos), getest met v3.2.4 | Kamerbalken, pop-ups, sub-knopjes |
| auto-entities | HACS (thomasloven) | Zelfvullende pop-upinhoud per kamer |
| browser_mod | HACS (thomasloven), integratie | Snelpanelen bij het aanzetten van licht |
| Glowify-thema | themes/glowify.yaml | Merkkleuren, licht en donker |
| Dashboard-sjabloon | 08 Kennisbank/Glowify dashboard config.yaml | De volledige dashboard-config |
| Backend-blokken | configuration.yaml, glowify_scripts.yaml, glowify_automations.yaml | Lichtgroepen, scènes, schuifjes |

## 3. Naamconventies (de sleutel tot uniformiteit)

1. **Areas**: elke kamer een Area, elk toestel toegewezen. Kamernamen kort en Nederlands (Woonkamer, Keuken, Inkomhal).
2. **Lichtgroepen**: per kamer één groep `Verlichting <Kamer>` (entiteit `light.verlichting_<kamer>`), gedefinieerd in configuration.yaml.
3. **Zonwering**: `Rolluik <Kamer>` of `Gordijn <Kamer>`.
4. **Slot**: `Slot Voordeur` (en analoog voor andere sloten).
5. **Sensoren**: `Temperatuur <Kamer>`, `Luchtvochtigheid <Kamer>`, `Beweging <Kamer>`, met de juiste device_class.
6. Scèneknoppen zijn kamerneutraal: Gezellig, Relax, Normaal, Fel.

## 4. Kleurtaal

Zie [[Glowify kleurtaal dashboard]]: groen veilig, rood aandacht, oranje comfort actief, blauw lucht en klimaat, paars standen en scènes, grijs neutraal. Lampknopjes kleuren mee met de werkelijke lichtkleur.

## 5. Installatiedraaiboek nieuwe klant

1. HAOS installeren (later: golden back-up terugzetten, dan vervallen stappen 2 tot 4 grotendeels)
2. HACS installeren (Get HACS add-on, herstart, integratie koppelen met GitHub-account)
3. De zes HACS-onderdelen downloaden (tabel hierboven); browser_mod ook als integratie toevoegen en de vaste schermen (wandpaneel) registreren
4. Thema plaatsen: `themes/glowify.yaml` en de frontend-regels in configuration.yaml (zie blok hieronder), herstart
5. Areas aanmaken en alle toestellen toewijzen (naamconventies!)
6. Backend-blokken invullen: lichtgroepen per kamer, scripts- en automations-includes, scene-schuifjes (configuration.yaml, glowify_scripts.yaml, glowify_automations.yaml)
7. Dashboard aanmaken: Instellingen > Dashboards > + Dashboard toevoegen > leeg > titel Glowify. Meteen bij de eerste bewerking de VOLLEDIGE config uit het sjabloonbestand plakken via de Ruwe configuratie-editor. Nooit eerst een kale versie opslaan
8. Sjabloon aanpassen aan de woning: per kamer een kamerbalk-blok en pop-upblok (kopieer een bestaand blok, vervang kamernaam en entiteiten), area-id's in het areas-blok
9. Scene-instellingen openen (Scenes-chip) en de startwaarden zetten: Gezellig 30/2400, Relax 15/2200, Normaal 65/2900, Fel 100/4600
10. Testen op gsm, tablet en desktop; thema in beide modi bekijken
11. Volledige back-up maken als vertrekpunt voor onderhoud

## 6. Vaste werkregels (geleerd met bloed, zweet en cache)

1. Strategie-dashboard altijd in één keer aanmaken met de volledige config. Nooit "Controle nemen"
2. Verversen in HA: F12 > Network > Disable cache aan > twee keer F5 > vinkje uit. Ctrl+F5 alleen is niet betrouwbaar
3. Updates van HACS-onderdelen eerst op de demo testen, dan pas bij klanten
4. Elke wijziging aan het dashboard gebeurt in het sjabloonbestand (Glowify dashboard config.yaml) en wordt vandaar geplakt. Zo is het bestand altijd de waarheid
5. browser_mod maakt van elk geregistreerd scherm een light-entiteit; nooit lichtcommando's naar "alles" sturen, altijd naar de lichtgroepen
6. Toont een kaart "Configuratiefout" terwijl het onderdeel wél in HACS staat, controleer dan of de bron geregistreerd is (Instellingen > Dashboards > drie puntjes > Bronnen). Snelste fix: het onderdeel in HACS opnieuw downloaden, dat registreert de bron opnieuw. Komt voor op installaties met een oudere dashboard-historiek
7. Sjabloonfouten opsporen: plak het sjabloon in Ontwikkelaarshulpmiddelen > Sjabloon. Werkt het daar maar niet op het dashboard, dan zit het probleem aan de browserkant (bron of cache), niet in het sjabloon
8. Statuslampjes van gateways en hubs (ledbox en dergelijke) zijn geen lampen: nooit opnemen in een Verlichting-groep en het label verberg geven. Sommige kennen geen uit-commando en breken de alles-uit-knop met een foutmelding

## 7. Achteraf aanpassen

**Een toestel verbergen (overal):** Instellingen > Apparaten en diensten > Entiteiten > entiteit openen > tandwiel > schakelaar Verborgen aan. De strategie en de pop-ups slaan verborgen entiteiten over.

**Een toestel enkel uit een kamer-view houden:** in het sjabloonbestand onder `areas:` bij die kamer card_options gebruiken, of simpeler: de entiteit verbergen zoals hierboven.

**Een kamer toevoegen:** Area aanmaken, toestellen toewijzen, lichtgroep toevoegen in configuration.yaml, en in het sjabloonbestand één kamerbalk-blok en één pop-upblok kopiëren van een gelijkaardige kamer en de namen vervangen (kamernaam, area-id, entiteiten, hash). Volgorde regel je met het blok zelf (positie in de lijst) en `order:` onder areas.

**Een kamer verbergen:** onder `areas:` bij die kamer `hidden: true` toevoegen en de bijhorende kamerbalk en pop-up uit de Thuis-view knippen.

**Een extra knopje op een kamerbalk (bv. kattenstand):** onder `sub_button:` van die kamer een blokje bijzetten. Vaste volgorde van rechts naar links: verlichting, zonwering, ventilator; specials links daarvan. Voorbeeld:

```yaml
              - entity: script.kattenstand_slaapkamer
                icon: mdi:cat
                tap_action:
                  action: call-service
                  service: script.turn_on
                  target:
                    entity_id: script.kattenstand_slaapkamer
```

Het script zelf zet je in glowify_scripts.yaml (bv. cover.set_cover_position naar 20 procent voor een Velux). Paars bij actief kan met één styles-regel volgens de kleurtaal.

**Een statusindicator toevoegen (bv. beweging):** kopieer het bewegings-subknopje van de Woonkamer (show_background false, tap none) plus de bijhorende display-regel in styles, en pas entiteit en indexnummers aan.

**Een chip (klein knopje) bovenaan toevoegen:** zoek in het sjabloonbestand naar `chips:`, kopieer een bestaand blokje `- type: template` en pas aan: `icon` (mdi-icoon), `icon_color` (volg de kleurtaal), `content` (tekstje) en `tap_action`. Drie gangbare acties: navigate naar een pop-up-hash (bv. `'#inkomhal'`), toggle met een `entity:`-regel erbij, of call-service naar een script. Meekleuren met een status kan met een sjabloon in icon_color, zie de lampenteller-chip als voorbeeld.

**Scènes bijstellen:** Scenes-chip op de Thuis-view, schuifjes verzetten. Geen code.

**Een scène toevoegen:** blok kopiëren in glowify_scripts.yaml, twee schuifjes bijzetten in configuration.yaml, chip kopiëren in de vijf panelen in het sjabloonbestand, en de twee schuifjes aan de Scene-instellingen-pop-up toevoegen.

**Kleuren of vormen wijzigen:** themes/glowify.yaml (geldt overal, licht en donker apart), daarna Ontwikkelaarshulpmiddelen > YAML > Thema's herladen.

**Herschikken:** verslepen met de muis bestaat niet op een strategie-dashboard (en "Controle nemen" is verboden terrein: dat sloopt de zelf-aanvullende werking). Herschikken gebeurt in het sjabloonbestand: kamerblok verplaatsen in de lijst van de Thuis-view, en voor de automatische views de order-nummers onder areas of views wisselen.

**Klant wil zelf knutselen:** maak een extra eigen dashboard naast het Glowify-dashboard (Instellingen > Dashboards > toevoegen, leeg, secties-weergave). Daar heeft de klant volledige drag-and-drop, terwijl het Glowify-dashboard de beheerde standaard blijft die een servicebezoek herkenbaar houdt. Zo is eigen creativiteit een extraatje in plaats van een risico.

**Let op bij sub-knopjes toevoegen of verwijderen:** de styles-regels verwijzen naar posities (.bubble-sub-button-1, -2, ...) en subButtonIcon[0], [1], .... Schuift de volgorde, hernummer dan de regels van die kamer mee.

## 8. Backend-blokken (referentie)

De actuele, volledige versies staan in de bestanden zelf op de demo-HA; dit zijn de vaste onderdelen die elke installatie nodig heeft:

1. **configuration.yaml**: frontend-blok (thema's plus bubble-pop-up-fix), de vier includes (automation, automation glowify, script, script glowify), het light-blok met de groepen per kamer, en het input_number-blok met de acht scene-schuifjes
2. **glowify_scripts.yaml**: de vier scènescripts (Gezellig, Relax, Normaal, Fel) die op elke lichtgroep werken via het veld doelgroep en hun waarden uit de schuifjes lezen
3. **glowify_automations.yaml**: leeg (`[]`) als haak voor klantspecifieke automatiseringen
4. **themes/glowify.yaml**: het merkthema, beide modi, inclusief mush- en bubble-variabelen

## 9. Openstaand voor latere versies

1. Camera's en wall panel weergave (komt samen met Frigate in de golden image)
2. Verlengbare paneel-timer zodra browser_mod het ondersteunt (issue 804)
3. Golden back-up maken en het Proxmox-USB draaiboek (fase B en C van het installatie-USB project)
4. Donkere modus eindcontrole op alle nieuwe onderdelen
