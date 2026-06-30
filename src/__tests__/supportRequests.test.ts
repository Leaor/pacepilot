import { describe, expect, it } from "vitest";
import {
  buildSupportRequestRow,
  submitSupportRequest,
  supportRequestUnavailableMessage,
  type SupportRequestInserter,
  type SupportRequestRow,
  type SupportRequestState
} from "@/support/supportRequests";

const signedInState: SupportRequestState = {
  configured: true,
  loading: false,
  hasSession: true,
  userId: "user-1"
};

function createInserter(error: { message?: string } | null = null) {
  const rows: SupportRequestRow[] = [];
  const inserter: SupportRequestInserter = async (row) => {
    rows.push(row);
    return { error };
  };

  return { inserter, rows };
}

describe("support requests", () => {
  it("pauses support submission while account state is loading", () => {
    expect(supportRequestUnavailableMessage({ configured: true, loading: true, hasSession: false }))
      .toBe("Checking your account session.");
  });

  it("does not insert requests when account services are unavailable", async () => {
    const { inserter, rows } = createInserter();

    const result = await submitSupportRequest(
      { configured: false, loading: false, hasSession: false },
      { topic: "Bug report", message: "The app closes after I submit a run." },
      inserter
    );

    expect(result).toEqual({
      ok: false,
      message: "Support requests need account services before they can be submitted here."
    });
    expect(rows).toHaveLength(0);
  });

  it("requires a signed-in session and user id", async () => {
    const { inserter, rows } = createInserter();

    const result = await submitSupportRequest(
      { configured: true, loading: false, hasSession: true, userId: null },
      { topic: "Bug report", message: "Something is wrong with support." },
      inserter
    );

    expect(result).toEqual({
      ok: false,
      message: "Refresh your session before submitting a support request."
    });
    expect(rows).toHaveLength(0);
  });

  it("validates topic and message before insert", () => {
    expect(
      buildSupportRequestRow(signedInState, {
        topic: "Mystery topic",
        message: "This message is long enough."
      }).message
    ).toBe("Choose a support topic.");

    expect(
      buildSupportRequestRow(signedInState, {
        topic: "Bug report",
        message: "Too short"
      }).message
    ).toBe("Add a brief description so support can help.");
  });

  it("normalizes and inserts a signed-in support request", async () => {
    const { inserter, rows } = createInserter();

    const result = await submitSupportRequest(
      signedInState,
      {
        topic: "Training plan questions",
        message: "  My long run moved twice.   Can someone check the plan? "
      },
      inserter
    );

    expect(result.ok).toBe(true);
    expect(rows).toEqual([
      {
        user_id: "user-1",
        topic: "Training plan questions",
        message: "My long run moved twice. Can someone check the plan?"
      }
    ]);
  });

  it("returns a generic failure without exposing backend details", async () => {
    const { inserter } = createInserter({ message: "relation public.support_requests leaked" });

    const result = await submitSupportRequest(
      signedInState,
      { topic: "Bug report", message: "The request form returned an error." },
      inserter
    );

    expect(result).toEqual({
      ok: false,
      message: "Could not submit support request. Please try again or email support@pacepilot.app."
    });
  });
});
