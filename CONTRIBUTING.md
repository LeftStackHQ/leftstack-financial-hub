# Contributing

Thanks for helping. This plugin handles campaign money and donor records, so changes are reviewed with care. Small, focused changes are easiest to review.

## Set up a local site

You need [Docker](https://www.docker.com/) and [Node.js](https://nodejs.org/) (LTS).

```bash
git clone https://github.com/LeftStackHQ/leftstack-financial-hub.git
cd leftstack-financial-hub
npm install
npm run build
npm run env:start
```

That starts a WordPress site with the plugin already active at <http://localhost:8888/wp-admin/> (user `admin`, password `password`).

To fill it with fake data (never real donor data), run:

```bash
npm run seed
```

The seeder wipes the plugin's tables first, so only run it on a local site.

## Working on the code

- JavaScript and CSS live in `src/`. `npm run start` rebuilds as you save; `npm run build` makes the files WordPress loads (in `assets/js/`).
- PHP lives in `includes/` (REST controllers, support classes) and `admin/`.
- `npm run lint:js` and `npm run format` keep the JavaScript tidy. PHP follows the [WordPress coding standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/); the ruleset is `.phpcs.xml.dist`.

## House rules

- **Follow WordPress guidelines.** Escape output, sanitize and validate input, use `$wpdb->prepare`, check capabilities in every REST route, and prefix everything with `LSFH_` or `lsfh_`.
- **Reuse before you add.** If a helper already does what you need, use it. Don't copy it.
- **Keep files and functions small and named for what they do.**
- **Never commit real donor data**, names, or addresses. Use the seed script.
- **Say what you tested.** In your pull request, describe how you checked the change, including any screen you clicked through.

## Sending a change

1. Fork the repository and make a branch.
2. Make your change, and run `npm run build` and `npm run lint:js`.
3. Open a pull request that explains what changed and why.

## Reporting a bug

Open an issue with what you did, what you expected, and what happened. Please leave out donor names and other personal details. For a security problem, don't open a public issue; follow [SECURITY.md](SECURITY.md).
