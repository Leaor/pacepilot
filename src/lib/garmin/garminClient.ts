import { getMockGarminStatus } from "@/lib/garmin/garminMock";

export async function getGarminStatus() {
  return getMockGarminStatus();
}

export async function connectGarmin() {
  return {
    authorizationUrl: null,
    message: "Garmin connection is available after partner approval."
  };
}
