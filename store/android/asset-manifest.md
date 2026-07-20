# Google Play asset manifest

> **Do not upload the current phone PNGs.** Their dimensions are valid, but their visible UI is
> from before the July 20 minimal-experience overhaul. Replace the six source captures with the
> current release-candidate screens described below, then run `spark.cmd release -Action Assets`.

Upload these files in this order. All paths are relative to `store/android`.

## Main store listing graphics

| Play Console field | File | Dimensions | Format | Accessible description |
| --- | --- | --- | --- | --- |
| App icon | `graphics/app-icon-512.png` | 512 × 512 | 32-bit PNG | Spark app icon: a warm glowing spark inside a rounded violet and teal ring on midnight blue. |
| Feature graphic | `graphics/feature-graphic-1024x500.png` | 1024 × 500 | 24-bit PNG, no alpha | Spark feature art says “Make the next step visible” beside a warm spark moving through a calm violet path. |

Play Console may not expose an alt-text field for every graphic. The descriptions are still kept
here for release review, accessibility-oriented marketing copy, and future console fields.

## Phone screenshots

Use all six screenshots. They meet Google's recommended portrait size and show the real Android
interface without a device frame or invented feature.

| Order | File | What it proves | Accessible description (under 140 characters) |
| --- | --- | --- | --- |
| 1 | `graphics/phone/01-today.png` | Minimal due-habit list and one clear Done action | Spark Today shows a compact list of due habits with frequency labels and one clear Done button. |
| 2 | `graphics/phone/02-focus.png` | Explicit habit frequency and optional details | Habit setup puts frequency directly after the name and keeps reminders and action sizes optional. |
| 3 | `graphics/phone/03-capture.png` | Month completion pattern across habits | Spark Calendar shows two compact monthly habit grids with completed and scheduled days. |
| 4 | `graphics/phone/04-progress.png` | Week/Month/Record navigation and review | Calendar Record shows completion totals, active habits, and direct habit-history access. |
| 5 | `graphics/phone/05-leave-on-time.png` | User-controlled feature visibility | Optional features lets a user add Focus, Capture, routines, streaks, points, or other tools. |
| 6 | `graphics/phone/06-settings.png` | Calm collapsed settings and local privacy controls | Settings leads with Optional features and keeps reminders, comfort, language, data, and help collapsed. |

## Visual review checklist

- No personal account, notification, email, phone number, location, or real person's habit appears.
- The clock and status icons are consistent and do not imply a specific carrier or endorsement.
- No screenshot claims cloud sync, AI coaching, medical treatment, or a paid feature.
- Buttons and text are readable at phone-preview size.
- The screenshot order tells one story: act → schedule → see the pattern → review → choose extras → personalize.
- If the UI changes materially, recapture rather than adding explanatory marketing overlays.
