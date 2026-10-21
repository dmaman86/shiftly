import express, { type ErrorRequestHandler } from "express";

/** JSON bodies up to 100 KB; shift and month payloads are far smaller. */
export const jsonBody = () => express.json({ limit: "100kb" });

type BodyParserError = { type?: string };

/** A malformed or oversized body is the client's error, not a 500. */
export const handleBodyErrors: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  switch ((error as BodyParserError).type) {
    case "entity.parse.failed":
      res.status(400).json({
        error: {
          code: "invalid_json",
          message: "Request body is not valid JSON",
        },
      });
      return;
    case "entity.too.large":
      res.status(413).json({
        error: {
          code: "payload_too_large",
          message: "Request body is too large",
        },
      });
      return;
    default:
      next(error);
  }
};
