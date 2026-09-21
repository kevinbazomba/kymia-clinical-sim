import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getAiConfig } from "@/lib/app-config.server";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayProvider(initialRunId?: string) {
  const config = getAiConfig();
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publishRunId = (value?: string) => {
    const nextRunId = value?.trim() || undefined;
    if (!runId && nextRunId) runId = nextRunId;
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);

  const headers: Record<string, string> = {};
  if (config.authType === "bearer" && config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  if (config.authType === "lovable" && config.apiKey) {
    headers["Lovable-API-Key"] = config.apiKey;
    headers["X-Lovable-AIG-SDK"] = "vercel-ai-sdk";
  }

  const provider = createOpenAICompatible({
    name: config.provider,
    baseURL: config.gatewayUrl,
    headers,
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (config.authType === "lovable" && runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(config.authType === "lovable" ? response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined : undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    },
  });

  return Object.assign(provider, {
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  });
}

export function getDefaultAiModel() {
  return getAiConfig().model;
}
