export type ApiUsage = {
  groq: number;
  serper: number;
  total: number;
  updatedAt: number;
};

export class ApiCallTracker {
  groq = 0;
  serper = 0;

  incrementGroq(count = 1): void {
    this.groq += count;
  }

  incrementSerper(count = 1): void {
    this.serper += count;
  }

  addFrom(other: ApiUsage | undefined): void {
    if (!other) return;
    this.groq += other.groq;
    this.serper += other.serper;
  }

  toUsage(): ApiUsage {
    return {
      groq: this.groq,
      serper: this.serper,
      total: this.groq + this.serper,
      updatedAt: Date.now(),
    };
  }
}

export function mergeApiUsage(
  existing: ApiUsage | undefined,
  added: ApiUsage,
): ApiUsage {
  const groq = (existing?.groq ?? 0) + added.groq;
  const serper = (existing?.serper ?? 0) + added.serper;
  return {
    groq,
    serper,
    total: groq + serper,
    updatedAt: Date.now(),
  };
}
