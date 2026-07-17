# Google Play asset manifest

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
| 1 | `graphics/phone/01-today.png` | Immediate next-action view and visible progress | Spark Today shows three completed actions, four points, and controls for choosing the next action. |
| 2 | `graphics/phone/02-focus.png` | Focus timer, small target, companion, and explicit calendar export | Focus setup shows a companion, ten-minute timer, task field, duration choices, and calendar export. |
| 3 | `graphics/phone/03-capture.png` | Low-friction local capture and later organization | Capture saves two thoughts locally with controls to focus, select, or organize them later. |
| 4 | `graphics/phone/04-progress.png` | Explainable points and positive progress summaries | Progress shows four Spark points, recent activity summaries, and expandable progress sections. |
| 5 | `graphics/phone/05-leave-on-time.png` | Time planning with departure time and preparation buffer | Leave on time works backward from a departure time and adds a realistic preparation buffer. |
| 6 | `graphics/phone/06-settings.png` | Clear groups, help, language, sensory controls, and simplicity options | Settings groups help, language, sensory feedback, reminders, privacy, and backup controls. |

## Visual review checklist

- No personal account, notification, email, phone number, location, or real person's habit appears.
- The clock and status icons are consistent and do not imply a specific carrier or endorsement.
- No screenshot claims cloud sync, AI coaching, medical treatment, or a paid feature.
- Buttons and text are readable at phone-preview size.
- The screenshot order tells one story: choose → focus → capture → review → plan → personalize.
- If the UI changes materially, recapture rather than adding explanatory marketing overlays.
