export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="theme-investor min-h-screen bg-[#020617]">{children}</div>;
}
