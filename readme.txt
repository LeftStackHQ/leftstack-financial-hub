=== LeftStack Financial Hub ===
Contributors: leftstack
Tags: campaign finance, donations, expenditures, actblue, fec
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 8.0
Stable tag: 1.19.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Campaign finance tracking for political campaigns — donations, expenditures, in-kind contributions, FEC/state reporting, and ActBlue integration.

== Description ==

**Status: beta.** Features and screens may still change.

LeftStack Financial Hub is a campaign finance management plugin for WordPress. It replaces spreadsheet-based workflows with a clean, purpose-built admin interface that handles everything from ActBlue imports to state report exports.

**Core Features:**

* **Dashboard** — Beginning balance + total raised − expenditures to date = current balance. Payments dated in the future are shown separately as scheduled, with the balance after they are paid. Campaign goal progress bar. Filterable by filing period.
* **Donations** — Import from ActBlue API or CSV. Manual entry for check and cash contributions. Tracks election type (Primary / General / Runoff), report type (itemized / unitemized), and reporting status (pending / filed).
* **Donors View** — Aggregate all gifts by donor. Shows primary, general, and runoff totals. Highlights maxed-out and near-limit donors based on configurable per-election contribution limits.
* **Expenditures** — Track expenses with budget categories, payment method, check number, and receipt attachments (WP Media Library or external URL). Mark as balanced to bank statement.
* **In-Kind Donations** — Non-cash contributions with fair market value, donor occupation/employer, and FEC report date.
* **TN State Report Export** — Generates the exact 13-column tab-delimited format for Tennessee state filing (CSV also available), replacing the Power Automate workflow. Optionally marks exported donations as filed.
* **ActBlue Sync** — Pull contributions by date range using ActBlue API credentials. Deduplicates automatically.
* **Filing Periods** — Segment data by reporting quarter with separate beginning balances.
* **Bank tie-out** — Upload your bank's CSV (read in your browser; account numbers are never kept) and match each line to a payout, a check, cash or wire donation, or an expense. Clear matches are confirmed in one click, groups and differences are reviewed by hand, and a confirmed match marks the items balanced and fills blank dates. Outstanding checks stay listed until the bank shows them.
* **Budget Categories** — User-created categories for expenditure bookkeeping and reporting.
* **Contribution Limits** — Per-election limits (Primary / General / Runoff) configurable by state. No-limit toggle for states like Virginia. Near-limit warning threshold with visual badges.
* **Staff Access** — Grant `manage_lsfh` capability to any WordPress user, same pattern as LeftStack Volunteer Hub.

**Designed for:**

* Local and state political campaigns
* Political action committees
* Campaign treasurers replacing Excel-based workflows
* Organizations required to file FEC or state campaign finance reports

== Installation ==

1. Upload the `leftstack-financial-hub` folder to `/wp-content/plugins/`.
2. Activate the plugin through the **Plugins** menu in WordPress.
3. Go to **Financial Hub → Settings** to configure your campaign name, goal, beginning balance, and contribution limits.
4. Optionally add ActBlue API credentials under **Settings → Integrations** to enable syncing.
5. Create filing periods and budget categories to match your reporting schedule.

== Frequently Asked Questions ==

= Does this replace ActBlue? =
No. It connects to your existing ActBlue account to pull donation data. You still process donations through ActBlue — this plugin just imports and tracks them.

= What states does the TN export work for? =
The export format is specifically designed for Tennessee state campaign finance reporting. It matches the exact column layout used by the TN Division of Elections portal (13 columns: CONTRIBUTORTYPE, LNAME, FNAME, STREET, ADDR2, CITY, STATE, ZIP, OCCUPATION, EMPLOYER, AMT, BATCHDTE, FUNDCODE). Tab-delimited per the TN spec, with CSV available as an option.

= Can I use this without ActBlue? =
Yes. You can manually enter all donations (check, cash, or any payment type) without ever connecting ActBlue.

= Is this compatible with LeftStack Volunteer Hub? =
Yes. Both plugins share the same visual design system and staff access model. They operate independently — activate only what you need.

= Where are receipts stored? =
Receipts are uploaded to the WordPress Media Library. You can also store an external URL instead of uploading a file.

== Screenshots ==

1. Dashboard — balance summary, campaign goal progress, stat cards, recent activity
2. Donations — transaction list with filters, bulk actions, TN report export
3. Donors — aggregate view with contribution totals and limit warnings
4. Expenditures — expense list with categories, receipt links, balanced status
5. In-Kind Donations — non-cash contributions with FMV and FEC report date
6. Settings — contribution limits, filing periods, budget categories, ActBlue credentials

== External Services ==

This plugin optionally connects to the ActBlue API (https://secure.actblue.com) when you enter ActBlue credentials under Settings → Integrations and manually trigger a sync. No data is sent automatically or without user action.

* **Data sent:** Your ActBlue Client UUID and Client Secret (for authentication) and a disbursement date range.
* **Data received:** A CSV of contributions from ActBlue for the selected date range.
* **ActBlue Privacy Policy:** https://www.actblue.com/legal-privacy/
* **ActBlue Terms of Service:** https://www.actblue.com/legal-terms/

No other external services are contacted. All campaign data is stored locally in your WordPress database.

== Third-Party Code ==

The icons are from Lucide (https://lucide.dev, ISC license). The license notice is in THIRD-PARTY-LICENSES.txt in the plugin folder.

== Source Code ==

JavaScript source files and build configuration (React/webpack via @wordpress/scripts) are available at:
https://github.com/LeftStackHQ/leftstack-financial-hub

== Changelog ==

= 1.19.0 =
* New: Expenditures, Vendors tab: choose a date range and download the report as a CSV
* New: Privacy tools for donor records. WordPress's Export and Erase Personal Data tools now find contributions by email address. Erasing removes nothing and says the records are kept as campaign financial records. Only administrators can use them. Suggested privacy policy text is added
* Change: The unused fee total stored on each payout is removed from the database. It updates by itself the first time a page loads after the update
* Change: Every file download now goes through one shared routine, tested in a real browser
* Change: Plugin Check reports no findings. Added a contributor setup that works from a fresh clone (seed script, plugin-only wp-env file)

= 1.18.0 =
* New: Expenditures has a Vendors tab. It shows what you spent with each vendor against what was raised, by month and by send, with cost per dollar raised. Vendors can be grouped, and fundraising pages can be grouped with them. Fee expenses are left out of spend
* Change: The ActBlue sync and the donation import fill in a phone number or email that was blank on a donor, never overwriting one you already have, and the result says how many were added. They also say how many payout bank references were filled in

= 1.17.0 =
* New: Local is a fifth election, for PACs and party committees that do not report by election. A Settings switch turns elections off: the election fields and limits are hidden, and new donations and filing periods become Local. Existing records are never changed
* New: Organization types. Choose PAC, party committee, union, business or other on an organization's donation. PACs and party committees are exempt from the organization contribution limit. Donors, the dashboard and refunds carry the type
* New: A warning appears when a donation puts a donor over a contribution limit, both when you enter it and in the ActBlue sync result
* New: Before you file has a Compare with the state section. Save the list the state shows for the period as CSV (or tab separated), choose it, and the Hub shows what is missing, extra or different. It reads the state's own public results export as well as the state's bulk upload format
* New: Before you file shows how many payouts in the period are balanced to the bank, and the State Report window warns while some are not. The payouts table has a Notes column
* Change: Auto-Allocate shows the unitemized total net of refunds
* Change: The state export and the Before you file check now share one rule for which contributions a report holds and when an address is missing. The downloaded files are unchanged
* Change: A filing period whose name and election disagree gets a note. Custom election names are gone: periods use the five listed elections

= 1.16.0 =
* New: The Before you file tab lists the periods that need an amendment. When a donation in a period that was already filed is refunded, the refund is listed under that period until you mark it reported (amend the period on the state site first). "Mark reported" sets the refund's ordinary Filed status; nothing is sent to the state. Refunds with no original donation, or whose original has no filing period, are listed apart
* Change: Filing a payout no longer marks a refund Filed when its original donation is Filed or it has no original, so these refunds stay on the amendments list until you mark them reported. Every other donation in the payout still follows the payout
* Change: Refund cleanup: one rule for what counts as a refund in the donation form and list, the "Donation not found." message is translatable, and an old fix for refunds saved with a positive fee (no longer needed) is removed from the payout sync

= 1.15.0 =
* New: Donations has a "Before you file" tab. Pick a filing period and it lists, by donor and with names, the contributions that would go in the state report and are missing a name, street, city, state or ZIP, and for an individual an occupation or employer. Each contribution has an Edit button that opens the usual form. It only reads: the state export is unchanged
* New: "Best efforts" on that tab records that you asked a donor for their occupation and employer, with the date and a note. One record covers every gift from that donor, and the donor stops being listed for those two items. Remove the record to list them again
* Change: The Donors list and the Dashboard now share one rule for which donations belong to the same donor (no change in what they show)
* Database: adds a table for the best-efforts records (database version 1.21), created automatically

Earlier versions: see changelog.txt in the plugin folder.

== Upgrade Notice ==


= 1.0.0 =
Initial release.
