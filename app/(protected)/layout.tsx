import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLink } from "@/components/NavLink";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="no-print sticky top-0 z-40 px-4 pt-4">
        <div className="glass mx-auto flex max-w-5xl items-center gap-4 rounded-2xl px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/letterhead/logo.png"
              alt="IT Support Group"
              width={38}
              height={32}
            />
            <span className="hidden text-sm font-bold tracking-tight sm:block">
              IT Support Group
            </span>
          </Link>

          <nav className="flex flex-1 items-center gap-1">
            <NavLink href="/">Новый акт</NavLink>
            <NavLink href="/history">
              {user.role === "admin" ? "История" : "Мои акты"}
            </NavLink>
            {user.role === "admin" && (
              <NavLink href="/admin/users">Сотрудники</NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden text-sm sm:block">
              {user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
