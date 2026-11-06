# LeftStack Financial Hub

Campaign finance tracking for WordPress: donations, expenditures, in-kind contributions, bank tie-out, ActBlue syncing, and state report exports. It replaces the treasurer's spreadsheet.

> **Beta.** The Hub is being used on a real campaign, but screens and features may still change.

## For treasurers and campaign staff

You don't need anything on this page. Start with the **[Financial Hub guide](https://leftstackhq.github.io/leftstack-financial-hub/)**, which walks through installing the plugin, setting it up, connecting ActBlue, and entering donations.

Short version: download the zip from the [Releases page](https://github.com/LeftStackHQ/leftstack-financial-hub/releases), then in WordPress choose **Plugins → Add New Plugin → Upload Plugin**.

## What it does

- **Dashboard** with balance, goal progress, and recent activity, filterable by filing period.
- **Donations** from ActBlue (API or CSV) or entered by hand, with election, report type, and filing status, plus a donors view with contribution-limit warnings.
- **Expenditures** with budget categories, receipts, and a Vendors view that compares spend with money raised.
- **In-kind contributions** with fair market value.
- **Bank tie-out**: upload your bank's CSV and match each line to a payout, a donation, or an expense. Account numbers are never kept.
- **Before-you-file checks** and a **state report export** (Tennessee today).
- **Staff access** for people who aren't WordPress administrators.

Everything is stored in your own WordPress database. The only outside service the plugin can contact is ActBlue, and only when you start a sync.

## Requirements

WordPress 6.0 or newer and PHP 8.0 or newer. Multisite is supported.

## For developers

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and how to send a change. To report a security problem, see [SECURITY.md](SECURITY.md).

## Third-party code

The icons come from [Lucide](https://lucide.dev) (ISC license). Its license notice is in [THIRD-PARTY-LICENSES.txt](THIRD-PARTY-LICENSES.txt), which also ships inside the plugin.

## Acknowledgements

Financial Hub was built and tested on the Allie Phillips for Change campaign.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
