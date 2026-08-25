export const metadata = {
  title: "Anqi's Daily Brief",
  description: "Personalized daily news — engineer format, causal chains, market angle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          /* Shared bubble-rise keyframe used by signup + feedback pages */
          @keyframes bubble-rise {
            0%   { transform: translateX(0) translateY(0);   opacity: 0; }
            8%   { opacity: 0.85; }
            92%  { opacity: 0.75; }
            100% { transform: translateX(calc(var(--drift) * 1vw)) translateY(-110vh); opacity: 0; }
          }
          @keyframes float-card {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-6px); }
          }
          @keyframes pulse-ring {
            0%   { box-shadow: 0 0 0 0 rgba(108,92,231,0.35); }
            70%  { box-shadow: 0 0 0 16px rgba(108,92,231,0); }
            100% { box-shadow: 0 0 0 0 rgba(108,92,231,0); }
          }
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; background: #faf8f5; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
