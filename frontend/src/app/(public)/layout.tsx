export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="theme-investor bg-[#020617] h-full overflow-y-auto">{children}</div>;
}
