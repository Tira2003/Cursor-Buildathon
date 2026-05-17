export type CorrectiveChoice = {
  id: string;
  title: string;
  description: string;
};

/** Coerce Groq JSON (numeric ids, loose types) into schema-safe choices. */
export function normalizeCorrectiveChoices(
  raw: Array<{ id?: unknown; title?: unknown; description?: unknown }>,
): CorrectiveChoice[] {
  return raw.map((choice, index) => {
    let id: string;
    if (typeof choice.id === "string" && choice.id.trim()) {
      id = choice.id.trim();
    } else if (typeof choice.id === "number" && Number.isFinite(choice.id)) {
      id = `fix_${Math.floor(choice.id)}`;
    } else {
      id = `fix_${index + 1}`;
    }

    return {
      id,
      title: String(choice.title ?? "Corrective action").trim(),
      description: String(choice.description ?? "").trim(),
    };
  });
}

export function normalizeBranchChoices(
  raw: Array<{ id?: unknown; title?: unknown; description?: unknown }>,
): CorrectiveChoice[] {
  return raw.map((choice, index) => {
    let id: string;
    if (typeof choice.id === "string" && choice.id.trim()) {
      id = choice.id.trim();
    } else if (typeof choice.id === "number" && Number.isFinite(choice.id)) {
      id = `branch_${Math.floor(choice.id)}`;
    } else {
      id = `branch_${index + 1}`;
    }

    return {
      id,
      title: String(choice.title ?? "Branch").trim(),
      description: String(choice.description ?? "").trim(),
    };
  });
}
