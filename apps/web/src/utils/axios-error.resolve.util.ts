import axios from "axios";
import i18n from "@/i18n";

export const resolveErrorCategory = (
  err: unknown,
): "cancelled" | "network" | "server" | "unexpected" => {
  if (!axios.isAxiosError(err)) return "unexpected";
  if (err.code === "ERR_CANCELED") return "cancelled";
  if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED")
    return "network";
  if (err.response && err.response.status >= 500) return "server";
  return "unexpected";
};

export const resolveErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const category = resolveErrorCategory(err);
    if (category !== "unexpected") return i18n.t(category, { ns: "errors" });
    const message: unknown = err.response?.data?.message;
    return typeof message === "string" && message.trim()
      ? message
      : i18n.t("unexpected", { ns: "errors" });
  }

  if (err instanceof Error && err.message.trim()) return err.message;

  return i18n.t("unexpected", { ns: "errors" });
};
