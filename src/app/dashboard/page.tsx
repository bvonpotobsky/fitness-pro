import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { api } from "~/trpc/server";
import { ClientCard } from "~/components/dashboard/ClientCard";
import { SignOutButton } from "~/components/SignOutButton";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch clients for the coach
  const clients = await api.clients.listForCoach();

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your clients and their fitness plans
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium">{session.user?.name}</div>
            <div className="text-xs text-muted-foreground">
              {session.user?.email}
            </div>
          </div>
          <SignOutButton size="sm" />
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No clients yet</h3>
          <p className="text-muted-foreground text-sm">
            Start by adding clients to create fitness plans for them.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard key={client.userId} client={client} />
          ))}
        </div>
      )}
    </main>
  );
}
