# Re-seeding RCL and Catholic readings

The liturgical calendar and importers now use timezone-safe civil-date math. After merging this PR (and the calendar PR it is stacked on), **re-seed production** so Lent, Advent, Epiphany, and colliding Propers land on the correct days.

Do **not** run these commands against production from a laptop timezone without setting `TZ=UTC`. Docker and DigitalOcean typically already run in UTC.

## What changed in the seed

- Date arithmetic no longer uses `getTime() ± n * 86400000`, which was a day early around US spring DST (Ash Wednesday 2026 was stored as Feb 17 instead of Feb 18 if the seed ran in `America/New_York`).
- RCL Epiphany Sundays 4–9 were added from the [Vanderbilt Divinity Library Revised Common Lectionary](https://lectionary.library.vanderbilt.edu/pdfs/) PDFs. The importer only writes the Sundays that actually occur before Transfiguration in that year (e.g. 2025 gets Feb 2, 9, 16, and 23).
- When Trinity Sunday and Proper 4 land on the same date (2026-05-31), Trinity is kept and Proper 4 is omitted.
- Default coverage is Advent 2024 through Advent 2030. Override with `LECTIO_SEED_START_YEAR` and `LECTIO_SEED_END_YEAR`.

## Preview (no database)

```bash
TZ=UTC npx ts-node src/scripts/preview-lectionary-dates.ts
```

## Re-seed a database

This **deletes and replaces** all RCL (and, if you run the Catholic importer, all Catholic) readings, seasons, and liturgical years for that tradition. Take a backup first.

```bash
# Recommended: run in UTC so DATE columns stay on the civil day
export TZ=UTC

# Apply any pending schema migrations first
npm run build
npm run db:run-migrations

# RCL Sundays and feasts
npm run data:import-rcl

# Catholic Sundays, feasts, and solemnities
npm run data:import-catholic
```

Or, after a production build:

```bash
export TZ=UTC
node dist/scripts/import-rcl-with-dates.js
node dist/scripts/import-catholic-lectionary.js
```

Optional range:

```bash
export TZ=UTC
export LECTIO_SEED_START_YEAR=2024
export LECTIO_SEED_END_YEAR=2030
npm run data:import-rcl
npm run data:import-catholic
```

## After re-seeding, verify

- `GET /api/v1/readings?date=2026-02-18&tradition=rcl` — Ash Wednesday
- `GET /api/v1/readings?date=2025-11-30&tradition=rcl` — Advent 1, Year A
- `GET /api/v1/readings?date=2025-02-02&tradition=rcl` — Fourth Sunday after Epiphany (new)
- `GET /api/v1/readings?date=2026-05-31&tradition=rcl` — Trinity Sunday, not Proper 4
