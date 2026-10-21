import { useContext } from "react";

import { ReferenceStatusContext } from "@/app/providers/domain/referenceStatusContext";

/** Where the rates in use came from; null when the domain is overridden. */
export const useReferenceStatus = () => useContext(ReferenceStatusContext);
