# BCP 1979 Daily Office source data

These files are the Book of Common Prayer (1979) Daily Office lectionary
tables, published as JSON by [Forward Movement](https://prayer.forwardmovement.org/new/data/lectionary/),
a ministry of The Episcopal Church. Retrieved 22 November 2026.

- `bcp1979_daily_office.json` — OT, NT, and Gospel lessons, keyed by
  liturgical day and Year One / Year Two
- `bcp1979_daily_psalms.json` — morning and evening psalms, same keys

The official printed source is *The Book of Common Prayer* (1979),
The Episcopal Church, “The Daily Office Lectionary,” pp. 936–995.

Year One begins on the First Sunday of Advent preceding odd-numbered
civil years (Advent 2024 starts Year One). Year Two precedes even years.

## Transcription corrections

The Forward Movement JSON has a handful of typographical errors. The
generator corrects only these exact strings, which were checked against
the surrounding rows in the same table (and, for Proverbs, the Year Two
week of the 7th Sunday after the Epiphany, which reads Prov. 1, 3, **4**,
6, 7, 8):

| Source string | Corrected to |
| --- | --- |
| `Rov. 4:1-27` | `Prov. 4:1-27` |
| `1 Joh 4:7-21` | `1 John 4:7-21` |
| `1 Joh 1:1-7` | `1 John 1:1-7` |
| `2 TIm. 4:9-22` | `2 Tim. 4:9-22` |
| `2 Cor. 9.6b-15` | `2 Cor. 9:6b-15` |
