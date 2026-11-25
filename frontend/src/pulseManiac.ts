import { loadReferencePackage } from "./builtins";
import { referenceAttributions } from "./attribution";
export function loadPulseManiacReference() {
  return loadReferencePackage(
    referenceAttributions.find((r) => r.template === "pulsemaniac")!,
  );
}
