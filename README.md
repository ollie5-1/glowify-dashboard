# Glowify Dashboard

Een custom **Home Assistant dashboard-strategie** van Glowify. Ze genereert
automatisch een merkgetrouw dashboard — Thuis-view met verdiepingsblokken,
interactieve kamerbalken, zelfvullende kamer-pop-ups, snelpanelen en de
Glowify-kleurtaal — rechtstreeks uit je **Areas, floors en entiteiten**.

Waar de vroegere aanpak een handgeschreven YAML-sjabloon per woning vroeg,
bouwt deze strategie alles dynamisch op. Elk nieuw toestel in de juiste Area
verschijnt vanzelf.

> Status: **Fase 0** — skelet, registratie en verpakking. De kamerbalken
> (Fase 1), pop-ups (Fase 2), snelpanelen (Fase 3) en editor/opruimmodus
> (Fase 4) volgen stapsgewijs.

## Vereisten

Deze frontend-onderdelen worden verondersteld aanwezig te zijn (via HACS):

- [Mushroom](https://github.com/piitaya/lovelace-mushroom)
- [Bubble Card](https://github.com/Clooos/Bubble-Card)
- [card-mod](https://github.com/thomasloven/lovelace-card-mod)
- [browser_mod](https://github.com/thomasloven/hass-browser_mod) (ook als integratie)

Home Assistant **2026.5** of nieuwer (voor de custom dashboard strategy API en
de zichtbaarheid onder *Communitydashboards*).

## Installatie via HACS

1. HACS → drie puntjes → **Custom repositories**.
2. Repository: `https://github.com/Glowify/glowify-dashboard`, type **Dashboard**.
3. Zoek **Glowify Dashboard** in HACS en download.
4. Herstart / ververs de browser (harde refresh, zie de werkregels).

## Dashboard toevoegen

**Instellingen → Dashboards → Dashboard toevoegen → Communitydashboards →
Glowify Dashboard.**

Of handmatig via de Ruwe configuratie-editor:

```yaml
strategy:
  type: custom:glowify
  options:
    title: Glowify
```

De strategie leest je woning en bouwt de rest zelf op. Zie
[Opties](#opties) voor de fijnafstelling.

## Opties

Alle opties zijn optioneel; standaard werkt de strategie zonder configuratie.

| Optie | Betekenis |
|---|---|
| `title` | Titel van het dashboard / de Thuis-view |
| `light_group_prefix` | Naamconventie voor lichtgroepen (default `verlichting_`) |
| `manual_floors` | Handmatige verdiepingsindeling voor installaties zonder HA-floors |
| `floors` | Per-verdieping: `hidden`, `order`, `name`, `icon`, `level` |
| `rooms` | Per-kamer: `hidden`, `order`, `icon`, `name`, `extra_sub_buttons`, … |
| `hidden_areas` | Lijst van area_id's om volledig te verbergen |
| `extra_chips` | Extra chips bovenaan de Thuis-view |

Voorbeeld met een handmatige verdiepingsindeling:

```yaml
strategy:
  type: custom:glowify
  options:
    manual_floors:
      - name: Gelijkvloers
        icon: mdi:home-floor-0
        level: 0
        areas: [inkomhal, woonkamer, keuken, tuin]
      - name: Eerste verdieping
        level: 1
        areas: [master_bedroom, badkamer, bureau_ruimte]
    rooms:
      berging:
        hidden: true
```

## Ontwikkelen

```bash
npm install
npm run build      # productie-bundle → dist/glowify-dashboard.js
npm run watch      # herbouwt bij wijzigingen
npm run typecheck  # TypeScript-controle
```

De build produceert één bestand (`dist/glowify-dashboard.js`) dat HA als
frontend-resource laadt — dezelfde single-file aanpak als de mushroom-strategy.

## Kleurtaal

Eén vaste betekenis per kleur: groen = veilig, rood = aandacht,
oranje (`#EC7622`) = comfort actief, blauw (`#4C80C9`) = lucht/klimaat,
paars (`#8E2F89`) = speciale stand/scène, grijs = neutraal.

## Licentie

MIT © Glowify
