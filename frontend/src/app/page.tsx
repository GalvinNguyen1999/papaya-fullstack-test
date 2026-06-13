import Link from "next/link";
import { ShieldCheck, Stethoscope } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center py-16">
      <div className="mb-10 text-center">
        <div className="mb-3 text-4xl">🥭</div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Papaya Claims Platform</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Choose a plan, file a claim, and let the AI assessor review it — then ops drives it through the
          full claim lifecycle. Pick an entry point:
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-5 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <Stethoscope className="mb-2 size-6 text-primary" />
            <CardTitle>Member portal</CardTitle>
            <CardDescription>Compare plans, submit a claim, and track its status.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex gap-3">
            <Button asChild>
              <Link href="/plans">Compare plans</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/claims/new">Submit a claim</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <ShieldCheck className="mb-2 size-6 text-primary" />
            <CardTitle>Admin console</CardTitle>
            <CardDescription>Review the queue, run AI assessment, advance claims.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex gap-3">
            <Button asChild variant="dark">
              <Link href="/admin/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/claims">Claims queue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
