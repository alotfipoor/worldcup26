import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import AdminPanel from "@/components/admin/AdminPanel";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { predictions: true } } },
  });

  const lastSync = await prisma.match.findFirst({
    orderBy: { syncedAt: "desc" },
    select: { syncedAt: true },
  });

  const matchCount = await prisma.match.count();

  return (
    <PageWrapper>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Admin</h1>
        <AdminPanel
          users={users}
          lastSync={lastSync?.syncedAt ?? null}
          matchCount={matchCount}
        />
      </div>
    </PageWrapper>
  );
}
