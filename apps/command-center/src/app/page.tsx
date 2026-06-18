// AgentOS home / dashboard — rebuilt to the Forge "AgentOS — Home" design
// (Jun 2026 redesign). The previous DashboardHome (ForgeEntryExperience +
// AgentOSLocalApp) is preserved in src/components/forge and remains reachable
// from the other routes; the runtime-wired views (missions, gate, …) keep
// their data and now inherit the new orange Forge skin via the token rewire.
import "../styles/forge-home.css";
import ForgeHome from "../components/forge-home/ForgeHome";

export default function Home() {
  return <ForgeHome />;
}
