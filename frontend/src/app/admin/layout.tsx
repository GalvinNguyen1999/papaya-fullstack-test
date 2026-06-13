import { AdminNav } from "@/components/app/site-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="container py-8">{children}</main>
    </div>
  );
}
