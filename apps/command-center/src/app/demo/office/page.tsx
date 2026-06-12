import Link from "next/link";

export default function ArchivedOfficeDemoPage() {
  return (
    <main className="archived-demo">
      <h1>Office demo archived</h1>
      <p>
        The Phaser office scene has been retired. AgentOS product direction is the Forge Command Center.
      </p>
      <Link href="/">Open Command Center</Link>
    </main>
  );
}
