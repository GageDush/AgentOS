import { redirect } from "next/navigation";

// `/` is the canonical home/dashboard (ForgeHome, live-wired). The legacy
// /dashboard operational view is retired — redirect so there's one home.
export default function DashboardPage() {
  redirect("/");
}
