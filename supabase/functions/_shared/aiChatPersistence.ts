export type AiChatFirewallSnapshot = {
  usedSources: string[];
  excludedSources: string[];
};

export type AiChatMessageRow = {
  user_id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  used_sources: string[];
  excluded_sources: string[];
};

export type LegacyAiChatMessageRow =
  & Omit<AiChatMessageRow, "used_sources" | "excluded_sources">
  & {
    allowed_data_sources: string[];
  };

type DbError = {
  code?: string;
  message?: string;
};

const questionKeys = ["question", "message", "prompt"] as const;
const threadIdKeys = ["threadID", "threadId", "thread_id"] as const;
const displayContentKeys = [
  "message",
  "answer",
  "summary",
  "strategySummary",
  "content",
] as const;

export function extractUserQuestion(body: Record<string, unknown>): string {
  for (const key of questionKeys) {
    const value = body[key];
    if (typeof value === "string") {
      return value.trim().slice(0, 8_000);
    }
  }

  return "";
}

export function extractRequestedThreadId(
  body: Record<string, unknown>,
): string {
  for (const key of threadIdKeys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function displayAiContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    for (const key of displayContentKeys) {
      if (typeof record[key] === "string" && record[key].trim()) {
        return record[key];
      }
    }
  }

  try {
    return JSON.stringify(content) ?? "";
  } catch {
    return String(content);
  }
}

export function isMissingColumn(error: DbError | null | undefined): boolean {
  return error?.code === "42703" ||
    /column .* does not exist|schema cache/i.test(error?.message ?? "");
}

export function buildChatMessageRows(
  userId: string,
  threadId: string,
  userMessage: string,
  assistantMessage: string,
  firewall: AiChatFirewallSnapshot,
): AiChatMessageRow[] {
  return [
    {
      user_id: userId,
      thread_id: threadId,
      role: "user",
      content: userMessage,
      used_sources: firewall.usedSources,
      excluded_sources: firewall.excludedSources,
    },
    {
      user_id: userId,
      thread_id: threadId,
      role: "assistant",
      content: assistantMessage,
      used_sources: firewall.usedSources,
      excluded_sources: firewall.excludedSources,
    },
  ];
}

export function buildLegacyChatMessageRows(
  rows: AiChatMessageRow[],
): LegacyAiChatMessageRow[] {
  return rows.map((
    { used_sources: usedSources, excluded_sources: _excludedSources, ...row },
  ) => ({
    ...row,
    allowed_data_sources: usedSources,
  }));
}
