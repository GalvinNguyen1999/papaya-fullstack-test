import { MemberNav } from "@/components/app/site-nav";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <MemberNav />
      <main className="container py-8">{children}</main>
    </div>
  );
}
