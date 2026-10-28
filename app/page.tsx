import { auth } from "../auth";
import { redirect } from "next/navigation";
import Dashboard from "./dashboard";
export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <Dashboard name={session.user.name || "Leitor(a)"} />;
}