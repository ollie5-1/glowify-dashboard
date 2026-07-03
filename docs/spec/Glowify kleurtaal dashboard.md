# Glowify kleurtaal voor dashboards

Datum: 2026-07-03
Hoort bij: [[Glowify dashboard stap 2 - thema]] en het bestand Glowify dashboard config.yaml

Eén vaste betekenis per kleur, op elke installatie identiek. De klant leert de taal in één dag.

| Kleur | Betekenis | Voorbeelden |
|---|---|---|
| Groen | Veilig, in orde | Slot op slot, deur/raam dicht, geen alarmen |
| Rood | Aandacht nodig | Slot open, deur/raam open, beweging, rook, waterlek, storing |
| Oranje (EC7622) | Comfort actief | Licht aan, zonwering open, media speelt |
| Blauw (4C80C9) | Lucht en klimaat actief | Ventilator draait, koeling, bevochtiging |
| Paars (8E2F89) | Speciale stand actief | Kattenstand, nachtstand, vakantiestand, scenes |
| Grijs | Uit of neutraal | Alles wat uit, dicht of inactief is |

## Regels

1. Rood is exclusief voor zaken die aandacht vragen. Gewone bediening kleurt nooit rood.
2. Oranje is de merkgloed: alles wat het huis "warm" maakt.
3. Iconen wisselen mee met de status waar dat kan: brandend lampje bij aan, open rolluik bij open, open slotje bij ontgrendeld.
4. Indicatoren zonder bediening (zoals beweging) zijn klein, zonder achtergrondcirkel, en verschijnen alleen wanneer actief.
5. Verwarming die actief verwarmt mag oranje; actief koelen is blauw.

## Technische toepassing

De kleurtaal zit op twee plaatsen:

1. Het Glowify-thema (themes/glowify.yaml): domeinkleuren via de mush-variabelen en de basiskleuren.
2. De styles-blokken per Bubble-kamerkaart in Glowify dashboard config.yaml: dynamische icoon- en kleurwissels per status (JS-sjablonen).

Bij twijfel over een nieuw toesteltype: kies de kleur volgens betekenis (veilig, aandacht, comfort, lucht, stand), niet volgens het toestel.
