# Localized Google Play listings

Spark has one prepared store listing for every locale bundled by the app. In Play Console, keep
English (United States) as the default, then use **Grow users → Store presence → Main store
listing → Manage translations** to add each language below and paste its three text blocks.

| App locale | Play listing file | Language |
| --- | --- | --- |
| `en` | `en-US.md` | English (United States), default |
| `es` | `es-ES.md` | Spanish |
| `pt-BR` | `pt-BR.md` | Portuguese (Brazil) |
| `fr` | `fr-FR.md` | French |
| `de` | `de-DE.md` | German |
| `it` | `it-IT.md` | Italian |
| `pl` | `pl-PL.md` | Polish |
| `uk` | `uk-UA.md` | Ukrainian |
| `ru` | `ru-RU.md` | Russian |
| `lt` | `lt-LT.md` | Lithuanian |
| `ja` | `ja-JP.md` | Japanese |
| `ko` | `ko-KR.md` | Korean |
| `zh-Hans` | `zh-CN.md` | Chinese (Simplified) |
| `hi` | `hi-IN.md` | Hindi |
| `ar` | `ar-SA.md` | Arabic |
| `nl` | `nl-NL.md` | Dutch |
| `tr` | `tr-TR.md` | Turkish |
| `id` | `id-ID.md` | Indonesian |
| `vi` | `vi-VN.md` | Vietnamese |

All files fit Play's 30-character app-name, 80-character short-description, and 4,000-character
full-description limits; `node scripts/release-check.mjs` enforces them.

The localized copy is a prepared product translation, not a certified legal translation. Before
a public marketing campaign in a language the publisher does not speak, a fluent reviewer should
check idiom and tone. The privacy policy remains the authoritative English legal text unless the
publisher obtains reviewed legal translations.
