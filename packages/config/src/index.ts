export const agentosEnv = {
  apiPort: Number(process.env.AGENTOS_API_PORT ?? 8787),
  gatewayPort: Number(process.env.AGENTOS_GATEWAY_PORT ?? 8790),
  commandCenterPort: Number(process.env.AGENTOS_COMMAND_CENTER_PORT ?? 3000),
  providerMode: process.env.AGENTOS_MODEL_PROVIDER ?? "mock"
};
