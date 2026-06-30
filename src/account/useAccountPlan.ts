import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { loadActiveAccountPlan, type AccountPlanResult } from "@/account/accountPlan";

export type AccountPlanLoadState = AccountPlanResult & {
  loading: boolean;
};

export function useAccountPlan(session: Session | null): AccountPlanLoadState {
  const [state, setState] = useState<AccountPlanLoadState>({
    loading: Boolean(session),
    ok: true,
    message: "Loading plan."
  });

  useEffect(() => {
    let isActive = true;

    if (!session) {
      setState({
        loading: false,
        ok: false,
        message: "Sign in to load your plan."
      });
      return;
    }

    setState({
      loading: true,
      ok: true,
      message: "Loading plan."
    });

    void loadActiveAccountPlan(session).then((result) => {
      if (!isActive) return;
      setState({
        ...result,
        loading: false
      });
    });

    return () => {
      isActive = false;
    };
  }, [session]);

  return state;
}
