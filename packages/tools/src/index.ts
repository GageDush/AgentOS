export const approvalRequiredTools = [
  "file.write",
  "file.delete",
  "terminal.run",
  "git.push",
  "deploy.production",
  "database.migration",
  "auth.change",
  "billing.change",
  "secrets.read",
  "external.network.call"
] as const;
