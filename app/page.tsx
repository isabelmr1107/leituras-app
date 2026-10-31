import { auth } from "../auth";
import { prisma } from "../lib/prisma";
import { redirect } from "next/navigation";
import Dashboard from "./dashboard";
export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const adminEmail = process.env.LIO_ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    const account = await prisma.user.findUnique({where:{id:session.user.id},select:{email:true}});
    if (account?.email.toLowerCase() === adminEmail) redirect("/admin");
  }
  return <Dashboard name={session.user.name || "Leitor(a)"} />;
}
