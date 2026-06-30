import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import {
  loadAccountActivities,
  saveManualActivity,
  type ManualActivityInput
} from "@/account/accountActivities";
import type { Activity } from "@/lib/types";

export type AccountActivitiesLoadState = {
  loading: boolean;
  saving: boolean;
  ok: boolean;
  message: string;
  activities: Activity[];
  save: (input: ManualActivityInput) => Promise<string>;
};

export function useAccountActivities(session: Session | null): AccountActivitiesLoadState {
  const [loading, setLoading] = useState(Boolean(session));
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(true);
  const [message, setMessage] = useState("Loading activities.");
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    let isActive = true;

    if (!session) {
      setLoading(false);
      setOk(false);
      setMessage("Sign in to load activities.");
      setActivities([]);
      return;
    }

    setLoading(true);
    void loadAccountActivities(session).then((result) => {
      if (!isActive) return;
      setLoading(false);
      setOk(result.ok);
      setMessage(result.message);
      setActivities(result.activities);
    });

    return () => {
      isActive = false;
    };
  }, [session]);

  const save = useCallback(
    async (input: ManualActivityInput) => {
      setSaving(true);
      const result = await saveManualActivity(session, input);
      setSaving(false);
      setOk(result.ok);
      setMessage(result.message);

      if (result.activity) {
        setActivities((current) => [result.activity!, ...current.filter((activity) => activity.id !== result.activity!.id)]);
      }

      return result.message;
    },
    [session]
  );

  return {
    loading,
    saving,
    ok,
    message,
    activities,
    save
  };
}
