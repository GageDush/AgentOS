import { defaultAgents, defaultTasks } from "@agentos/shared";

const heartbeat = () => {
  const activeAgents = defaultAgents.filter((agent) => agent.status !== "offline").length;
  const activeTasks = defaultTasks.filter((task) => task.status !== "done").length;
  console.log(
    JSON.stringify({
      service: "AgentOS Worker",
      mode: "mock",
      activeAgents,
      activeTasks,
      timestamp: new Date().toISOString()
    })
  );
};

heartbeat();
setInterval(heartbeat, 15000);
