import express, { type ErrorRequestHandler } from "express";

/**
 * JSON bodies up to 100 KB; shift and month payloads are far smaller.
 * Compressed bodies are refused: the web client never sends them, and this
 * parser runs before authentication, so decompressing would expose the
 * decoders (Brotli, gzip) to anyone on the internet.
 */
export const jsonBody = () => express.json({ limit: "100kb", inflate: false });

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
    case "encoding.unsupported":
      res.status(415).json({
        error: {
          code: "unsupported_encoding",
          message: "Compressed request bodies are not accepted",
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
