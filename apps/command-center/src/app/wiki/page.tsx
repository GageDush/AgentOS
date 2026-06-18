import { Suspense } from "react";
import { AgentOSLocalApp } from "../../components/local/AgentOSLocalApp";
import { ForgeBootLoader } from "../../components/forge/ForgeBootLoader";

export default function WikiPage() {
  return (
    <Suspense fallback={<ForgeBootLoader inline compact />}>
      <AgentOSLocalApp section="wiki" />
    </Suspense>
  );
}
