# Tenno Vault V6

## Fehlerbehebung

Die vorige Fassung verglich den kompletten OCR-Rohtext mit allen Itemnamen. Bei Screenshots mit viel Text reichte eine zufaellige Buchstabenfolge fuer einen Treffer, und bei Gleichstand gewann immer der erste Listeneintrag. Ergebnis: Es wurde immer derselbe Gegenstand angezeigt, der gar nicht im Bild war.

Jetzt gilt:

- Nur einzelne Textzeilen werden bewertet, nie der ganze Rohtext.
- Ein Treffer braucht uebereinstimmende Woerter, nicht nur aehnliche Buchstaben.
- Eine Zeile, die viel laenger ist als ein Itemname, wird abgewertet.
- Unter 70 Prozent Uebereinstimmung gilt ein Gegenstand als nicht erkannt.
- Es gibt keine Notfalltreffer mehr. Lieber kein Ergebnis als ein falsches.
- Der gelesene Text ist aufklappbar einsehbar, damit Fehler nachvollziehbar sind.

## Bedienung

1. Im Tab Relikte auf "Belohnungen fotografieren".
2. Erkannte Namen erscheinen im Textfeld und koennen korrigiert werden.
3. Die App zeigt oben den wertvollsten Gegenstand.

## Grenzen

- Der erkannte Text sollte immer kurz geprueft werden.
- Preise sind die guenstigsten Verkaufsangebote, keine Verkaufsgarantie.
- Anfragen laufen gedrosselt (340 ms), Limit sind 3 pro Sekunde.
