import '../globals.css';

/** Overlay layout — no nav, transparent, standalone for OBS */
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'transparent', margin: 0 }}>{children}</body>
    </html>
  );
}
