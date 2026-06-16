import BottomNav from "@/components/BottomNav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell min-h-dvh pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
