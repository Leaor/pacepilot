import { getMockGarminStatus } from "@/lib/garmin/garminMock";

export async function getGarminStatus() {
  return getMockGarminStatus();
}

export async function connectGarmin() {
  return {
    authorizationUrl: null,
    message: "Garmin integration requires developer approval and is feature-flagged for future release."
  };
}
