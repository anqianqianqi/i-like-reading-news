export const metadata = {
  title: "Anqi's News Agent",
  description: "Personalized daily news — engineer format",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#faf8f5" }}>{children}</body>
    </html>
  );
}
