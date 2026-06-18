import {
  buildAgentHouseSpecs,
  houseGuideEmbed,
  socialLoungeGuideEmbed,
  townSquareGuideEmbed,
  type AgentHouseSpec,
  CATEGORY_NEIGHBORHOOD
} from "./agent-houses";
import { buildAgentEmbed } from "./embeds";
import { ensureAgentJournalStubs } from "./house-wiki";
import { CATEGORY_BRIEFING, CATEGORY_LOUNGE, CATEGORY_OPS, CATEGORY_START, STREAMLINED_LAYOUT, type AgentOsChannelKey } from "./layout";
import { loadDiscordGuildState, patchDiscordGuildState, type AgentHouseState, type DiscordGuildState } from "./bootstrap";
import { DiscordRestClient, webhookUrl, type DiscordChannel } from "./rest";
import { postPersonaWebhookMessage } from "./webhook-post";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveByNames<T extends { name: string; id: string; type?: number }>(
  items: T[],
  names: string[],
  type?: number
) {
  const normalized = new Map(items.map((item) => [item.name.toLowerCase(), item]));
  for (const name of names) {
    const hit = normalized.get(name.toLowerCase());
    if (hit && (type === undefined || hit.type === type)) return hit;
  }
  if (type !== undefined) {
    return items.find((item) => item.type === type && names.some((name) => item.name.toLowerCase() === name.toLowerCase()));
  }
  return undefined;
}

async function ensureCategory(client: DiscordRestClient, channels: DiscordChannel[], name: string) {
  const existing = channels.find((channel) => channel.type === 4 && channel.name === name);
  if (existing) return existing.id;
  const created = await client.createChannel({ name, type: 4 });
  return created.id;
}

async function ensureWebhook(client: DiscordRestClient, channelId: string, name: string) {
  const hooks = await client.listWebhooks(channelId);
  const existing = hooks.find((hook) => hook.name === name);
  if (existing) return webhookUrl(existing);
  const created = await client.createWebhook(channelId, name);
  return webhookUrl(created);
}

async function ensureStreamlinedChannel(
  client: DiscordRestClient,
  channels: DiscordChannel[],
  key: AgentOsChannelKey,
  categoryIds: Record<"start" | "ops" | "briefing" | "neighborhood" | "lounge", string>
) {
  const spec = STREAMLINED_LAYOUT[key];
  const categoryId =
    spec.category === CATEGORY_START
      ? categoryIds.start
      : spec.category === CATEGORY_OPS
        ? categoryIds.ops
        : spec.category === CATEGORY_BRIEFING
          ? categoryIds.briefing
          : spec.category === CATEGORY_NEIGHBORHOOD
            ? categoryIds.neighborhood
            : categoryIds.lounge;

  const existing = resolveByNames(channels, [spec.name, ...spec.legacyNames], spec.type);
  if (existing) {
    await client.patchChannel(existing.id, {
      name: spec.name,
      parent_id: categoryId,
      ...(spec.type !== 2 ? { topic: spec.topic } : {})
    });
    return existing.id;
  }

  const created = await client.createChannel({
    name: spec.name,
    type: spec.type,
    parent_id: categoryId,
    ...(spec.type !== 2 ? { topic: spec.topic } : {})
  });
  return created.id;
}

async function ensureHouseChannel(
  client: DiscordRestClient,
  channels: DiscordChannel[],
  neighborhoodCategoryId: string,
  spec: AgentHouseSpec
) {
  const existing = resolveByNames(channels, [spec.channelName, ...spec.legacyNames], 0);
  if (existing) {
    await client.patchChannel(existing.id, {
      name: spec.channelName,
      parent_id: neighborhoodCategoryId,
      topic: spec.topic
    });
    return existing.id;
  }
  const created = await client.createChannel({
    name: spec.channelName,
    type: 0,
    parent_id: neighborhoodCategoryId,
    topic: spec.topic
  });
  return created.id;
}

async function pinGuide(client: DiscordRestClient, channelId: string, messageId: string) {
  try {
    await client.pinMessage(channelId, messageId);
  } catch {
    // Pin is optional when permissions are missing.
  }
}

export type NeighborhoodBootstrapResult = {
  categoryId: string;
  townSquareChannelId: string;
  socialLoungeChannelId: string;
  houses: NonNullable<DiscordGuildState["houses"]>;
  journalSlugs: string[];
};

export async function bootstrapAgentNeighborhood(options?: {
  postGuides?: boolean;
  ensureWiki?: boolean;
}) {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!token || !guildId) {
    throw new Error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.");
  }

  const postGuides = options?.postGuides !== false;
  const ensureWiki = options?.ensureWiki !== false;
  const houseSpecs = buildAgentHouseSpecs();
  const journalSlugs = ensureWiki ? ensureAgentJournalStubs().slugs : [];

  const client = new DiscordRestClient(token, guildId);
  let channels = await client.listChannels();
  const existingState = loadDiscordGuildState();

  const categoryIds = {
    start: existingState?.categories?.start ?? (await ensureCategory(client, channels, CATEGORY_START)),
    ops: existingState?.categories?.ops ?? (await ensureCategory(client, channels, CATEGORY_OPS)),
    briefing: existingState?.categories?.briefing ?? (await ensureCategory(client, channels, CATEGORY_BRIEFING)),
    neighborhood:
      existingState?.categories?.neighborhood ?? (await ensureCategory(client, channels, CATEGORY_NEIGHBORHOOD)),
    lounge: existingState?.categories?.lounge ?? (await ensureCategory(client, channels, CATEGORY_LOUNGE))
  };

  channels = await client.listChannels();
  const townSquareChannelId = await ensureStreamlinedChannel(client, channels, "townSquare", categoryIds);
  channels = await client.listChannels();
  const socialLoungeChannelId = await ensureStreamlinedChannel(client, channels, "socialLounge", categoryIds);

  const houses: NonNullable<DiscordGuildState["houses"]> = {};
  for (const spec of houseSpecs) {
    channels = await client.listChannels();
    const channelId = await ensureHouseChannel(client, channels, categoryIds.neighborhood, spec);
    const webhookName = `agentos-house-${spec.channelName}`;
    const webhook = await ensureWebhook(client, channelId, webhookName);
    houses[spec.agentId] = {
      agentId: spec.agentId,
      channelId,
      channelName: spec.channelName,
      wikiJournalSlug: spec.wikiJournalSlug,
      webhook
    };
    await sleep(120);
  }

  const publicAppUrl = process.env.AGENTOS_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const apiBaseUrl = process.env.AGENTOS_API_BASE_URL?.trim() || `http://127.0.0.1:${process.env.AGENTOS_API_PORT ?? 8787}`;

  const townSquareWebhook = await ensureWebhook(client, townSquareChannelId, "agentos-town-square");
  const socialLoungeWebhook = await ensureWebhook(client, socialLoungeChannelId, "agentos-social-lounge");

  if (postGuides) {
    const townMessage = await postPersonaWebhookMessage(townSquareWebhook, townSquareGuideEmbed({
      apiBaseUrl,
      publicAppUrl,
      houseSpecs
    }));
    await pinGuide(client, townSquareChannelId, townMessage.id);

    const loungeMessage = await postPersonaWebhookMessage(
      socialLoungeWebhook,
      socialLoungeGuideEmbed(publicAppUrl)
    );
    await pinGuide(client, socialLoungeChannelId, loungeMessage.id);

    for (const spec of houseSpecs) {
      const house = houses[spec.agentId];
      if (!house?.webhook) continue;
      const message = await postPersonaWebhookMessage(
        house.webhook,
        houseGuideEmbed({ spec, apiBaseUrl, publicAppUrl })
      );
      house.guideMessageId = message.id;
      await pinGuide(client, house.channelId, message.id);
      await sleep(250);
    }
  }

  if (existingState) {
    patchDiscordGuildState({
      categories: {
        ...existingState.categories,
        neighborhood: categoryIds.neighborhood
      },
      channels: {
        ...existingState.channels,
        townSquare: townSquareChannelId,
        socialLounge: socialLoungeChannelId
      },
      houses,
      webhooks: {
        ...existingState.webhooks,
        townSquare: townSquareWebhook,
        socialLounge: socialLoungeWebhook
      },
      layoutVersion: 8,
      bootstrappedAt: new Date().toISOString()
    });
  }

  return {
    categoryId: categoryIds.neighborhood,
    townSquareChannelId,
    socialLoungeChannelId,
    houses,
    journalSlugs,
    webhooks: {
      townSquare: townSquareWebhook,
      socialLounge: socialLoungeWebhook
    }
  } satisfies NeighborhoodBootstrapResult & { webhooks: { townSquare: string; socialLounge: string } };
}
