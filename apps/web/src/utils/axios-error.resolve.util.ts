import axios from "axios";

export const resolveErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    if (err.code === "ERR_CANCELED") {
      return "הבקשה בוטלה על ידי המשתמש";
    }

    return (
      err.response?.data?.message ??
      err.message ??
      "שגיאה לא צפויה בשרת. אנא נסה שוב"
    );
  }

  if (err instanceof Error) return err.message;

  return "שגיאה לא צפויה. אנא נסה שוב";
};
