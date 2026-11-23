# Daily Office lectionary data

The Daily Office dataset is generated from the Book of Common Prayer
(1979) two-year table, as published in JSON by
[Forward Movement](https://prayer.forwardmovement.org/new/data/lectionary/).
The official printed source is BCP 1979, pp. 936–995. Vendor copies and
a short list of typo corrections live in `src/data/bcp1979/`.

Year One begins at the First Sunday of Advent preceding odd-numbered
civil years (Advent 1, 2024 starts Year One). Year Two precedes even
years. The generator expands liturgical-day keys onto civil dates and
rejects any citation that names a chapter a book does not have.

## Regenerate

```bash
TZ=UTC npm run data:generate-daily
```

By default this writes `src/data/daily-lectionary.json` for 1 December
2024 through 31 December 2030. Override the window with
`LECTIO_DO_START_YEAR`, `LECTIO_DO_START_MONTH`, `LECTIO_DO_START_DAY`
and the matching `LECTIO_DO_END_*` variables. The script exits with a
non-zero status if any date is missing or a citation fails validation.

## Re-import into a database

Do not run this against production from a pull request. After the
updated `daily-lectionary.json` is on the branch you intend to deploy:

```bash
TZ=UTC npm run build
TZ=UTC npm run data:import-daily
```

Then confirm:

- `2024-12-01` (Advent 1, Year One) morning OT is Isaiah 1:1-9
- `2025-11-30` (Advent 1, Year Two) is Year2, not Year1
- no reading cites Matthew 29–31 or Acts 29–31
