import { parseArgs } from "node:util";
import { z } from "zod";
import {
  researchRequestSchema,
  type ResearchRequest,
  ResearchError,
} from "../research/contracts.ts";

export const parseResearchCommand = (
  args: readonly string[],
): {
  readonly request: ResearchRequest;
  readonly mode: "plan" | "execute";
  readonly force: boolean;
} => {
  const { values } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      domain: { type: "string" },
      year: { type: "string" },
      month: { type: "string" },
      parameters: { type: "string" },
      subject: { type: "string" },
      plan: { type: "boolean" },
      execute: { type: "boolean" },
      force: { type: "boolean" },
    },
  });
  if (
    Boolean(values.plan) === Boolean(values.execute) ||
    !values.parameters ||
    !values.domain ||
    (values.plan && values.force)
  )
    throw new ResearchError("invalid_task");
  const domain = z
    .enum(["income-tax", "contributions", "elections", "allowances"])
    .parse(values.domain);
  const parameters = values.parameters.split(",");
  if (
    domain === "elections"
      ? values.year !== undefined || values.month !== undefined
      : values.subject !== undefined ||
        !/^\d{4}$/.test(values.year ?? "") ||
        !/^(?:[1-9]|1[0-2])$/.test(values.month ?? "")
  ) {
    throw new ResearchError("invalid_task");
  }
  const request = researchRequestSchema.parse(
    domain === "elections"
      ? {
          requestUnit: "subject",
          domain,
          subjectKey: values.subject,
          parameters,
        }
      : {
          requestUnit: "calendar_month",
          domain,
          year: Number(values.year),
          month: Number(values.month),
          parameters,
        },
  );
  return {
    request,
    mode: values.plan ? "plan" : "execute",
    force: values.force === true,
  };
};
