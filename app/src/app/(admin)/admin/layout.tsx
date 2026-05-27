import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  title: "Admin Console — Founder Fate",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?from=/admin");
  }

  const role = session.user.role as string;
  if (role !== "admin" && role !== "support") {
    redirect("/hub");
  }

  return <AdminShell role={role}>{children}</AdminShell>;
}
