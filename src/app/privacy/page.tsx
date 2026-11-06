import "../(app)/legal.css";

export const metadata = { title: "Privacy · Gebeta" };

export default function Privacy() {
  return (
    <main className="legal">
      <a href="/" className="brand"><b>GEBETA</b><span>ገበታ</span></a>
      <h1>Privacy policy</h1>
      <p className="muted">Last updated 6 November 2026</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Cafe owners and staff:</b> name, phone number, a hashed password, and, if you connect it, your Telegram chat ID. Your cafe's menu, photos and settings.</li>
        <li><b>Customers viewing a menu:</b> we don't ask for names or phone numbers. We count menu scans, the table number from the QR code, the chosen language and which dishes were opened, without identifying anyone.</li>
        <li><b>Table orders and reviews:</b> what was ordered, the table number, any note, and star ratings with optional comments.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To run your menu, show you statistics, send the alerts you switched on, and confirm payments for plans and stands. We don't sell data or show advertising.</p>
      <h2>Who sees it</h2>
      <p>Your menu is public. Statistics, orders, reviews and your account details are visible only to you and the team members you invite. Area price comparisons use averages from at least three cafes and never name a cafe.</p>
      <h2>Your choices</h2>
      <p>You can edit or delete your menu at any time and disconnect Telegram from your account page. To delete your account and all its data, contact Gebeta support.</p>
      <p className="muted">ይህ የግላዊነት ፖሊሲ በአማርኛም ይገኛል። ለጥያቄዎች የገበታ ድጋፍን ያግኙ።</p>
    </main>
  );
}
