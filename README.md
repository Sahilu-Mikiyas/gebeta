# Gebeta

Digital menus, QR table stands and menu screens for cafes in Ethiopia.

Cafe owners sign up with their phone number, build a bilingual (English/Amharic) menu, pick a board style and print a QR code. Customers scan it and get the menu on their phone.

## What works today

- **Owner accounts:** sign up and log in with an Ethiopian mobile number (09… or 07…) and a password.
- **Onboarding:** create a cafe, optionally starting from a sample Addis cafe menu.
- **Menu editor** with a live phone preview:
  - sections and items in English and Amharic, with descriptions and prices in birr
  - fasting tags, and sold-out items that come back at 6:00 AM Addis time
  - item photos (resized in the browser before upload)
  - reordering and moving items between sections
  - bulk price changes by percentage, rounded to 5 birr
- **Design:** four board styles (Wood & Red, Mustard, Paper & Orange, Fasting Green).
- **Public menu at `/m/<slug>`:** English/Amharic switch, fasting-only filter and section jump links. Pages are server-rendered.
- **QR codes:** PNG (1200 px) and SVG downloads, and a printable A4 sheet of four table cards.
- **Menu screens for TVs at `/s/<slug>`:** a full-screen 16:9 board that rotates through the menu one section at a time.
  - long sections are split across boards
  - shows the cafe's board style and item photos
  - picks up price and sold-out changes within 30 seconds
  - keeps the screen awake
  - owners set seconds per board and the language (English, Amharic or both) in the Menu screen tab
- **Stats:** scan counts for the last 7 days. Only visits from the QR code (`?src=qr`) are counted.
- **Owner UI** in English and Amharic.
- **Marketing page** at `/` (`public/landing.html`).

## Run it locally

Requires Node 22 and Postgres.

```bash
cp .env.example .env    # then fill in DATABASE_URL and SESSION_SECRET
npm install
npx prisma migrate dev  # creates the tables
npm run db:seed         # demo cafe: log in with 0911 00 00 00 / gebeta-demo
npm run dev
```

Open http://localhost:3000. The demo menu is at http://localhost:3000/m/selam-buna-house.

## Checks

```bash
npm test           # unit tests (phone numbers, slugs, prices, sold-out reset)
npm run typecheck
npm run build
```

## Deploy

`render.yaml` describes a Render web service plus a Postgres database. After the first deploy, set `APP_URL` to the public address. QR codes use that address, so set it before printing anything.

## Code map

| Path | What it is |
| --- | --- |
| `prisma/schema.prisma` | Owners, cafes, sections, items, photos, scans |
| `src/app/(app)/dashboard/actions.ts` | Every menu change: validation and ownership checks |
| `src/app/(app)/dashboard/Editor.tsx` | The editor UI and live preview |
| `src/components/MenuView.tsx` | The customer menu, shared by the public page and the preview |
| `src/app/m/[slug]/` | Public menu page and QR code downloads |
| `src/app/s/[slug]/` | TV menu screen and the data endpoint it polls |
| `src/lib/screen.ts` | Splits a menu into TV boards |
| `src/lib/i18n.ts` | All UI text in English and Amharic |

## Known limits of this first version

- Photos are stored in Postgres. Move them to object storage (for example Cloudflare R2) before there are many cafes.
- Login rate limiting is kept in memory, so it only works with a single server instance.
- There is no password reset yet. It needs SMS (for example AfroMessage).
- Not built yet: stand ordering and payments (Telebirr, Chapa), the Telegram bot, and multiple cafes per owner.
