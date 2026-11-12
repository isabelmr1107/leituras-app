import { auth } from "../auth";
import { prisma } from "../lib/prisma";
import { redirect } from "next/navigation";
import Dashboard from "./dashboard";
export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const adminEmail = process.env.LIO_ADMIN_EMAIL?.trim().toLowerCase();
  const account=await prisma.user.findUnique({where:{id:session.user.id},select:{name:true,email:true}});
  if (adminEmail && account?.email.toLowerCase() === adminEmail) redirect("/admin");
  return <Dashboard name={account?.name || session.user.name || "Leitor(a)"} email={account?.email || session.user.email || ""} accountId={session.user.id} />;
}
