import { getAuthenticatedUser } from "./auth.ts";
import { handleOptions, jsonResponse, methodNotAllowed, safeErrorResponse } from "./cors.ts";

export function authenticatedStub(feature: string, message: string) {
  return async (req: Request): Promise<Response> => {
    const optionsResponse = handleOptions(req);
    if (optionsResponse) {
      return optionsResponse;
    }

    if (req.method !== "POST") {
      return methodNotAllowed();
    }

    try {
      const user = await getAuthenticatedUser(req);
      return jsonResponse({
        feature,
        userId: user.id,
        status: "stub",
        message
      });
    } catch (error) {
      return safeErrorResponse(error, `${feature} failed`);
    }
  };
}
