import { getAuthenticatedUser } from "./auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, safeErrorResponse } from "./cors.ts";

export function authenticatedStub(feature: string, message: string) {
  return async (req: Request): Promise<Response> => {
    const optionsResponse = handleOptions(req);
    if (optionsResponse) {
      return optionsResponse;
    }

    if (req.method !== "POST") {
      return methodNotAllowed(req);
    }

    try {
      await getAuthenticatedUser(req);
      return jsonResponse({
        feature,
        status: "unavailable",
        message
      }, 501, req);
    } catch (error) {
      return safeErrorResponse(error, `${feature} failed`, req);
    }
  };
}
