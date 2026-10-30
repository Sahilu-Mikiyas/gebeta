// Owner-facing pages load the full type set. The public menu loads less, to stay light on 3G.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&family=Kaushan+Script&family=Noto+Sans+Ethiopic:wght@400;600;800&display=swap"
      />
      {children}
    </>
  );
}
