# Gebeta

Digital menus, QR table stands, table ordering and menu screens for cafes in Ethiopia.

## What's in it

**For customers (`/m/<cafe>`)**
- Menu in English or Amharic. The language follows the phone's setting.
- Search, fasting filter and section shortcuts.
- Item photos, sizes, extras and tags.
- Specials with the old price crossed out.
- On fasting days (Wednesday, Friday, Abiy Tsom, Advent, Filseta), fasting dishes are listed first.
- Wi-Fi details and contact links.
- From a table QR (`?t=7`):
  - call a waiter or ask for the bill
  - order from the phone and follow the order's status
  - rate the visit

**For owners (`/dashboard`)**
- **Today:** setup checklist, today's numbers, one-tap sold-out switches, live orders and running specials.
- **Orders & calls:** live board (New → Preparing → Served → Paid) with a chime, and a full-screen kitchen view.
- **Menu:** bilingual items, photos (or built-in photos), sizes, add-ons, tags, hidden items, reordering, and bulk % price changes with undo.
- **Specials & timing:** happy hours by day and time, breakfast/lunch serving windows per section, and scheduled price changes.
- **Design:** four board styles, brand colours, logo and cover photo.
- **Cafe info:** hours, phone, map, social links, Wi-Fi, tables, ordering and waiter-call switches, fasting mode, menu link.
- **QR & print:** PNG/SVG downloads, table cards, one card per table, a two-column A4 paper menu and a window poster with Wi-Fi cards.
- **Menu screen (`/s/<cafe>`):** TV board in landscape or portrait, with promo slides, section choice and language choice.
- **Insights:** scans by day, hour and table; most-viewed dishes; best sellers; reviews; prices compared with the same area.
- **History & undo:** every change from the dashboard and Telegram.
- **Team:** invite links for managers (full editing) and staff (sold-out switches, orders and calls only).
- **Branches:** extra cafes with a copied menu, and a switcher.
- **Shop & plan:** order stands and screens, and pay for plans by Telebirr or CBE transfer, on delivery, or Chapa.
- **Account:** connect Telegram, change password. Forgot password works by Telegram code or a support code.

**For the platform (`/admin`)**
- Approve plan payments, track stand orders and grant plans.
- Connect the Telegram webhook.
- Make support reset codes.

**Telegram bot** (needs `TELEGRAM_BOT_TOKEN`)
- Commands: `/menu`, `/price macchiato 100`, `/soldout chechebsa`, `/available`, `/stats`, `/reset`, `/cafe`.
- Sends new orders, waiter calls, low ratings and a weekly summary to the owner and staff.

## Plans

| | Free | Cafe (590 birr/month) | Group (1,490 birr/month) |
|---|---|---|---|
| Items | 30 | unlimited | unlimited |
| Table ordering | no | yes | yes |
| Staff accounts | none | 5 | 25 |
| Branches | 1 | 1 | 5 |

Waiter calls, QR codes, printing and the menu screen work on every plan. On Free, a small Gebeta label shows on the menu and screen.

## Run it locally

Requires Node 22 and Postgres.

```bash
cp .env.example .env    # fill in DATABASE_URL and SESSION_SECRET
npm install
npx prisma migrate dev
npm run db:seed         # demo cafe: 0911 00 00 00 / gebeta-demo
npm run dev
```

## Checks

```bash
npm test
npm run typecheck
npm run build
```

## Deploy

`render.yaml` describes a Render web service plus Postgres. Database migrations run when the app starts. Set `APP_URL` before printing QR codes. The optional settings in `.env.example` switch on Telegram, admin, manual payment details and Chapa.

## Known limits

- Photos are stored in Postgres; move them to object storage when there are many cafes.
- Paying at the table online would need each cafe's own Chapa account, so table orders are paid to the waiter (cash, Telebirr, CBE).
- AI menu import from a photo and automatic translation need a paid AI API key, so they aren't built yet.
