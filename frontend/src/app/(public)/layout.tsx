export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-investor investor-gradient-bg flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6">{children}</div>
    </div>
  );
}
