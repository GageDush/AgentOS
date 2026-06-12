"use client";

import { AgentOSLocalApp } from "../local/AgentOSLocalApp";
import { ForgeEntryExperience } from "./ForgeEntryExperience";

export function DashboardHome() {
  return (
    <ForgeEntryExperience>
      <AgentOSLocalApp section="dashboard" />
    </ForgeEntryExperience>
  );
}
