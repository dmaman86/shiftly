import { loadAdminEnv, loadResearchEnv } from "../config/env.ts";
import { loadLocalEnvFiles } from "../config/local-env.ts";
import { SupabaseResearchStore } from "../repositories/supabase-research-store.ts";
import { GoogleGroundedResearchProvider } from "../research/google-grounded-research-provider.ts";
import { executeResearch } from "../research/execute-research.ts";
import { planResearchTask } from "../research/planner.ts";
import {
  planningSpec,
  selectResearchSpec,
  researchSpecs,
} from "../research/spec-registry.ts";
import { ResearchError } from "../research/contracts.ts";
import { parseResearchCommand } from "./reference-research-command.ts";

loadLocalEnvFiles();
try {
  const command = parseResearchCommand(process.argv.slice(2));
  // Domain registration and explicit execution opt-in are separate controls.
  const spec =
    command.mode === "execute"
      ? selectResearchSpec(command.request.domain)
      : planningSpec(command.request.domain);
  const env = loadAdminEnv();
  const store = new SupabaseResearchStore({
    url: env.SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  });
  if (command.mode === "plan") {
    const snapshot = await store.read(command.request);
    console.log(
      JSON.stringify(
        {
          executable: false,
          reason: researchSpecs.some(
            (item) => item.domain === command.request.domain,
          )
            ? "plan_only"
            : "domain_spec_not_registered",
          task: planResearchTask(command.request, spec, snapshot, new Date()),
        },
        null,
        2,
      ),
    );
  } else {
    const settings = loadResearchEnv();
    if (!settings.REFERENCE_RESEARCH_ENABLED)
      throw new ResearchError("research_unavailable");
    const result = await executeResearch(
      command.request,
      spec,
      {
        store,
        provider: new GoogleGroundedResearchProvider({
          apiKey: settings.GEMINI_API_KEY,
          model: settings.GEMINI_MODEL,
        }),
        now: () => new Date(),
      },
      { force: command.force, persistCandidates: false },
    );
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(
    JSON.stringify({
      error:
        error instanceof ResearchError ? error.code : "research_unavailable",
    }),
  );
  process.exitCode = 1;
}
