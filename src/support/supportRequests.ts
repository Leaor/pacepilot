import { SUPABASE_TABLES } from "@/lib/supabaseTables";

export const supportTopics = [
  "Billing and subscriptions",
  "Training plan questions",
  "Data export or deletion",
  "AI Coach data use",
  "Race import corrections",
  "Bug report"
] as const;

export type SupportTopic = (typeof supportTopics)[number];

export type SupportRequestState = {
  configured: boolean;
  loading?: boolean;
  hasSession: boolean;
  userId?: string | null;
};

export type SupportRequestInput = {
  topic: string;
  message: string;
};

export type SupportRequestRow = {
  user_id: string;
  topic: SupportTopic;
  message: string;
};

export type SupportRequestResult = {
  ok: boolean;
  message: string;
};

export type SupportRequestInserter = (row: SupportRequestRow) => Promise<{ error: { message?: string } | null }>;

const minimumMessageLength = 12;
const maximumMessageLength = 2000;
const genericFailureMessage = "Could not submit support request. Please try again or email support@pacepilot.app.";

export function supportRequestUnavailableMessage(state: SupportRequestState): string | null {
  if (state.loading) {
    return "Checking your account session.";
  }

  if (!state.configured) {
    return "Support requests need account services before they can be submitted here.";
  }

  if (!state.hasSession) {
    return "Sign in to submit a support request.";
  }

  if (!state.userId) {
    return "Refresh your session before submitting a support request.";
  }

  return null;
}

function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function isSupportTopic(topic: string): topic is SupportTopic {
  return supportTopics.includes(topic as SupportTopic);
}

export function buildSupportRequestRow(
  state: SupportRequestState,
  input: SupportRequestInput
): { row?: SupportRequestRow; message?: string } {
  const unavailableMessage = supportRequestUnavailableMessage(state);
  if (unavailableMessage) {
    return { message: unavailableMessage };
  }

  if (!isSupportTopic(input.topic)) {
    return { message: "Choose a support topic." };
  }

  const message = normalizeMessage(input.message);
  if (message.length < minimumMessageLength) {
    return { message: "Add a brief description so support can help." };
  }

  if (message.length > maximumMessageLength) {
    return { message: "Keep support requests under 2,000 characters." };
  }

  return {
    row: {
      user_id: state.userId ?? "",
      topic: input.topic,
      message
    }
  };
}

async function insertSupportRequest(row: SupportRequestRow): Promise<{ error: { message?: string } | null }> {
  const { supabase } = await import("@/lib/supabase");
  const { error } = await supabase.from(SUPABASE_TABLES.supportRequests).insert(row);
  return {
    error: error ? { message: error.message } : null
  };
}

export async function submitSupportRequest(
  state: SupportRequestState,
  input: SupportRequestInput,
  inserter: SupportRequestInserter = insertSupportRequest
): Promise<SupportRequestResult> {
  const { row, message } = buildSupportRequestRow(state, input);
  if (!row) {
    return {
      ok: false,
      message: message ?? genericFailureMessage
    };
  }

  try {
    const { error } = await inserter(row);
    if (error) {
      return {
        ok: false,
        message: genericFailureMessage
      };
    }

    return {
      ok: true,
      message: "Support request submitted. PacePilot support can review it with your signed-in account."
    };
  } catch {
    return {
      ok: false,
      message: genericFailureMessage
    };
  }
}
