import { redirect } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-emerald-50/30 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10">
      <div className="w-full max-w-md mx-auto px-4">
        {children}
      </div>
    </div>
  );
}
