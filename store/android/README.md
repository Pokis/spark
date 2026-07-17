# Spark Google Play submission pack

This folder contains the ready-to-upload graphics, listing copy, and recommended Play Console
answers for Spark's first **free, offline Android release**. Start here instead of collecting
files from the rest of the repository.

## Five-minute upload map

1. Build the signed bundle locally with `.\spark.cmd release -Action LocalBuild` from
   `D:\AI\Spark`; the verified `.aab` appears in `artifacts/release`.
2. Run `.\spark.cmd release -Action Assets` from `D:\AI\Spark`.
3. In Play Console, open **Grow users → Store presence → Main store listing**.
4. Copy the English fields from [listing/en-US.md](./listing/en-US.md).
5. Upload the files shown in [asset-manifest.md](./asset-manifest.md).
6. Open **Policy and programs → App content** and follow [declarations.md](./declarations.md).

The local bundle command does not contact EAS (Expo Application Services), Firebase, or Google
Cloud and does not use a hosted-build quota. First-time upload-key creation is explained in the
[release checklist](../../docs/release-checklist.md).

The publisher's confirmed identity, audience, price, hosting, and feature-boundary choices are in
[release-decisions.md](./release-decisions.md).

The Assets command only reads local screenshots and writes this repository. It does not contact
Google, Expo, Firebase, or any other service and costs nothing to run.

## What is already complete

| Play item | Ready file | Status |
| --- | --- | --- |
| App icon | `graphics/app-icon-512.png` | 512 × 512, 32-bit PNG, below 1 MB |
| Feature graphic | `graphics/feature-graphic-1024x500.png` | 1024 × 500, 24-bit PNG, no alpha |
| Phone screenshots | `graphics/phone/01-*.png` through `06-*.png` | Six real-app captures, each 1080 × 1920, 24-bit PNG, no alpha |
| Default English listing | `listing/en-US.md` | Title, short description, full description, and notes |
| Localized listings | [`listing/README.md`](./listing/README.md) | Nineteen listings matching every language bundled by Spark, including Lithuanian and Arabic |
| Screenshot descriptions | `asset-manifest.md` | Upload order and accessible description for every image |
| Play declarations | `declarations.md` | Ads, access, audience, content rating, Data safety, health, accounts, and permissions |

The screenshots were captured from the local release-like Android build with representative,
non-sensitive test data. They are not mockups and contain no real person's data.

## What still requires you

These choices require your identity, account, or legal attestation and therefore cannot be
completed safely by code:

- keep the confirmed `com.djpokis.sparkhabits.app` package ID unchanged after the first Play upload;
- review the completed operator details in `docs/privacy-policy.md` and
  `apps/admin/public/privacy.html` for exact postal formatting;
- paste the verified public policy URL
  `https://djpokis-spark-habits.web.app/privacy.html` into Play Console;
- confirm the recommended 18+ target audience and the health-app category described in
  `declarations.md`;
- apply the confirmed all-available-countries, free-app, and `djpokis@gmail.com` choices in Play;
- upload the signed `.aab`, answer the console forms, and make the final declarations yourself.

Do not upload until the descriptions and declarations still match the exact build. The initial
pack assumes cloud sync, remote support, purchases, analytics, ads, and the creator-tip link are
all off.

## Regenerate or validate the images

Run:

```powershell
.\spark.cmd release -Action Assets
```

That command recreates the store icon, feature graphic, and screenshots and validates their
dimensions, PNG format, alpha rules, and icon file-size limit.

To validate without changing any image:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\prepare-play-store-assets.ps1 -ValidateOnly
```

The selected full-resolution captures are source-controlled under `source/phone`, so a clean
checkout can regenerate every final image. Ignored `artifacts/play-store/source-captures` contains
only device working files, dumps, and alternate captures and is not needed by the command.

## When this pack must be revised

Re-run the assets command after a visible design change. Revisit the listing and every declaration
before enabling any costed/network feature, especially:

- cloud accounts, sync, support chat, or remote configuration;
- Google Play purchases or lifetime-access grants;
- analytics, crash reporting, push notifications, or advertising;
- the creator-tip link;
- a new permission, SDK, health feature, or child-directed audience; or
- any behavior that sends user data away from the device.

The exact re-review triggers and likely form changes are in
[declarations.md](./declarations.md#change-triggers-do-not-skip).

## Artwork provenance

The feature-graphic background in `source/feature-graphic-background.png` was generated for Spark
with OpenAI's image-generation tool on July 17, 2026. The final composition adds Spark's own text
locally using `scripts/prepare-play-store-assets.ps1`; no third-party logo, person, device mockup,
or stock image is included.

The generation prompt was:

> Create an original premium abstract Google Play feature graphic for Spark, an ADHD-friendly
> habit and focus app: a warm coral spark moving through calm violet and midnight-blue rounded
> paths toward a small optimistic spark cluster, with generous light negative space on the left;
> modern editorial vector-like raster style, gentle depth and subtle paper grain; energetic but
> not overstimulating; no text, logo, people, device, medical symbol, casino imagery, clutter, or
> watermark.

Keep the source file alongside the final graphic so the asset can be regenerated without another
paid or network service call.
