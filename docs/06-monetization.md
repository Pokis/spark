# Monetization strategy

## Principle

Do not charge for the executive-function support that makes Spark useful. Charging to repair a
streak, avoid shame, add basic habits, or receive reminders would exploit the problem the product
claims to help.

## Initial offer

Recommended:

- free app download
- unlimited habits, flexible variants, focus, capture, routines, local reminders, widget,
  insights, backup, and accessibility
- one-time **Spark Premium Supporter** purchase
- illustrative launch price: USD 9.99 or a locally appropriate equivalent

Validate willingness to pay before finalizing the price. Google Play handles regional tax and
price conversion.

Purchase verification is disabled by default through `purchasesEnabled`. RTDN has a separate
default-off Terraform switch, `enable_google_play_rtdn`. Current user-scale cloud estimates and
an illustrative percentage-of-sales fee table are in
[08-cost-controls.md](./08-cost-controls.md); actual Play fees vary by region, install timing,
and enrolled program.

The implemented supporter catalog contains:

- Aurora, Ocean, and Forest accent themes
- supporter badge visibility control
- Spark, owl, and cloud body-double companions
- alternate burst, ripple, and confetti celebrations
- locally generated offline soundscapes with independent volume/mute
- in-app/widget icon treatments and build-time launcher variants
- entitlement restoration on another device

Basic on-device observations remain free. Do not advertise voting tools, cloud synchronization,
AI coaching, or any future feature until it exists in the exact released build.

Avoid advertisements, data brokerage, recurring “streak insurance,” loot boxes, paid reminders,
and fake urgency.

## Optional creator tip

A low-visibility Settings footer can open `https://buymeacoffee.com/djpokis` for someone who does
not want Premium but still wants to support the creator. It is deliberately separate from the
entitlement system: no feature, badge, account state, Spark points, or support priority changes
after a tip. Spark does not receive payment confirmation or supporter identity.

The build flag `EXPO_PUBLIC_SPARK_CREATOR_TIP_LINK_ENABLED` defaults to `false`. Keep it off for
Google Play and App Store binaries unless the exact release qualifies for an applicable
external-payment program and its regional/reporting requirements are implemented. This is not
treated as the tax-exempt-donation exception. See
[09-data-privacy-and-play-policy.md](./09-data-privacy-and-play-policy.md) and
[08-cost-controls.md](./08-cost-controls.md).

## Why lifetime first

A subscription adds recurring billing expectations, restore complexity, churn pressure, and a
reason to withhold ongoing functionality. Spark's initial cloud cost is near zero and its core
value is local, so a lifetime supporter purchase is the honest first model.

If real future costs arise from an optional service such as encrypted cross-device backup or AI,
offer that service separately and explain its operating cost. Do not retroactively move local
features behind a subscription.

## Technical flow

1. The native store returns a purchase token.
2. Mobile sends the token and product ID to authenticated Cloud Run.
3. Cloud Run asks Google Play for the purchase state.
4. If valid, Cloud Run stores the entitlement and acknowledges the purchase.
5. Only then does mobile finish the transaction and cache premium locally.

The control plane accepts only `spark_premium_lifetime`.

## Free grants

There are two safe mechanisms.

### Official Play promo code

Best for public giveaways and testers:

1. Generate the code in Play Console.
2. Import it in the dashboard.
3. Assign and privately send it.
4. The person redeems it through Google Play.

Google remains the entitlement authority.

### Audited admin grant

Best for a specific support case, contributor, reviewer, or accessibility tester:

1. The person creates a cloud identity by checking access or contacting support.
2. An owner locates the UID.
3. The owner records a reason and grants access.
4. The person refreshes entitlement.

Only owners can perform manual grants. Support staff cannot.

## iOS later

Create an App Store non-consumable product with the same conceptual benefit. App Store purchases
must be verified using Apple's supported server API before enabling iOS premium. Keep Play and
App Store transaction identifiers, but expose one platform-neutral entitlement to the app.

## Refunds and revocation

Google Play can refund, cancel, or revoke a purchase after initial verification. Spark now
implements the required lifecycle path:

- Terraform creates the Pub/Sub topic and authenticated push subscription only after
  `enable_google_play_rtdn=true`.
- Play one-time-product RTDN messages are deduplicated and re-verified with
  `purchases.productsv2.getproductpurchasev2`.
- Pending and cancelled purchases do not grant premium.
- Voided purchase notifications revoke the bound entitlement.
- A transient processing failure releases the deduplication claim so Pub/Sub can retry.

The remaining work is operational: connect Terraform's topic in Play Console, grant the Cloud Run
identity least-privilege purchase lookup/acknowledgement access, and run real internal-track
purchase, pending, restore, refund, cancellation, and revocation tests before enabling paid
access.

## Accounting

Google Play fees and taxes are separate from cloud runtime cost. Play sale proceeds do not become
Google Cloud credits. Export financial reports from Play Console and keep admin entitlement
audits for support, not accounting.
