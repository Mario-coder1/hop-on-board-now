import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyRidesTool from "./tools/list-my-rides";
import listMyTripsTool from "./tools/list-my-trips";
import searchRidesTool from "./tools/search-rides";
import getMyProfileTool from "./tools/get-my-profile";

// Construct the direct Supabase auth issuer from the project ref (Vite inlines
// this literal at build time, so the entry stays import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "takeme-mcp",
  title: "TakeMe",
  version: "0.1.0",
  instructions:
    "TakeMe je slovenská platforma na zdieľanie jázd (BlaBlaCar-style). Použi tieto nástroje na hľadanie jázd, prezeranie svojich jázd/ciest a profilu prihláseného používateľa. Všetky nástroje pracujú v mene aktuálneho používateľa a rešpektujú RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchRidesTool, listMyRidesTool, listMyTripsTool, getMyProfileTool],
});
