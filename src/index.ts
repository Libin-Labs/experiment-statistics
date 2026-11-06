export type PValueAdjustment = 'bonferroni' | 'holm';

export interface ProportionInterval {
  estimate: number;
  lower: number;
  upper: number;
  confidenceLevel: number;
}

export interface ProportionComparison {
  controlRate: number;
  treatmentRate: number;
  difference: number;
  zStatistic: number;
  pValue: number;
  confidenceInterval: ProportionInterval;
}

export class StatisticsError extends Error {
  constructor(
    readonly code: 'invalid' | 'capacity',
    message: string,
  ) {
    super(message);
    this.name = 'StatisticsError';
  }
}

function counts(successes: number, trials: number): void {
  if (
    !Number.isSafeInteger(successes) ||
    !Number.isSafeInteger(trials) ||
    trials < 1 ||
    successes < 0 ||
    successes > trials
  )
    throw new StatisticsError(
      'invalid',
      'successes and trials must be safe integers with 0 <= successes <= trials and trials >= 1.',
    );
}

function level(confidenceLevel: number): void {
  if (!Number.isFinite(confidenceLevel) || confidenceLevel <= 0 || confidenceLevel >= 1)
    throw new StatisticsError('invalid', 'confidenceLevel must be strictly between 0 and 1.');
}

function inverseNormal(probability: number): number {
  if (!(probability > 0 && probability < 1))
    throw new StatisticsError('invalid', 'Normal quantile probability must be between 0 and 1.');
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const tail = 0.02425;
  if (probability < tail) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  if (probability > 1 - tail) return -inverseNormal(1 - probability);
  const q = probability - 0.5;
  const r = q * q;
  return (
    ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  );
}

function normalCdf(value: number): number {
  const absolute = Math.abs(value) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * absolute);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-absolute * absolute);
  return 0.5 * (1 + Math.sign(value) * erf);
}

export function wilsonInterval(
  successes: number,
  trials: number,
  confidenceLevel = 0.95,
): ProportionInterval {
  counts(successes, trials);
  level(confidenceLevel);
  const estimate = successes / trials;
  const z = inverseNormal(1 - (1 - confidenceLevel) / 2);
  const zSquared = z * z;
  const denominator = 1 + zSquared / trials;
  const center = (estimate + zSquared / (2 * trials)) / denominator;
  const halfWidth =
    (z / denominator) *
    Math.sqrt((estimate * (1 - estimate)) / trials + zSquared / (4 * trials * trials));
  return {
    estimate,
    lower: Math.max(0, center - halfWidth),
    upper: Math.min(1, center + halfWidth),
    confidenceLevel,
  };
}

export function compareProportions(
  controlSuccesses: number,
  controlTrials: number,
  treatmentSuccesses: number,
  treatmentTrials: number,
  confidenceLevel = 0.95,
): ProportionComparison {
  counts(controlSuccesses, controlTrials);
  counts(treatmentSuccesses, treatmentTrials);
  level(confidenceLevel);
  if (
    !Number.isSafeInteger(controlTrials + treatmentTrials) ||
    !Number.isSafeInteger(controlSuccesses + treatmentSuccesses)
  )
    throw new StatisticsError('capacity', 'Combined counts must remain safe integers.');
  const control = controlSuccesses / controlTrials;
  const treatment = treatmentSuccesses / treatmentTrials;
  const difference = treatment - control;
  const pooled = (controlSuccesses + treatmentSuccesses) / (controlTrials + treatmentTrials);
  const standardError = Math.sqrt(
    pooled * (1 - pooled) * (1 / controlTrials + 1 / treatmentTrials),
  );
  const zStatistic = standardError === 0 ? 0 : difference / standardError;
  const pValue =
    standardError === 0 ? 1 : Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(zStatistic)))));
  const controlInterval = wilsonInterval(controlSuccesses, controlTrials, confidenceLevel);
  const treatmentInterval = wilsonInterval(treatmentSuccesses, treatmentTrials, confidenceLevel);
  const lower =
    difference -
    Math.sqrt((treatment - treatmentInterval.lower) ** 2 + (controlInterval.upper - control) ** 2);
  const upper =
    difference +
    Math.sqrt((treatmentInterval.upper - treatment) ** 2 + (control - controlInterval.lower) ** 2);
  return {
    controlRate: control,
    treatmentRate: treatment,
    difference,
    zStatistic,
    pValue,
    confidenceInterval: {
      estimate: difference,
      lower: Math.max(-1, lower),
      upper: Math.min(1, upper),
      confidenceLevel,
    },
  };
}

export function adjustPValues(
  pValues: readonly number[],
  method: PValueAdjustment = 'holm',
): number[] {
  if (!Array.isArray(pValues)) throw new StatisticsError('invalid', 'pValues must be an array.');
  if (pValues.length > 100_000)
    throw new StatisticsError('capacity', 'At most 100000 p-values may be adjusted.');
  if (Reflect.ownKeys(pValues).length !== pValues.length + 1)
    throw new StatisticsError('invalid', 'pValues must be dense and contain no extra properties.');
  if (method !== 'holm' && method !== 'bonferroni')
    throw new StatisticsError('invalid', 'method must be holm or bonferroni.');
  const values: number[] = [];
  for (let index = 0; index < pValues.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(pValues, String(index));
    if (!descriptor?.enumerable || !('value' in descriptor))
      throw new StatisticsError('invalid', 'pValues must contain enumerable data elements.');
    const value = descriptor.value;
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new StatisticsError('invalid', `pValues[${index}] must be between 0 and 1.`);
    values.push(value);
  }
  if (method === 'bonferroni') return values.map((value) => Math.min(1, value * values.length));
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const adjusted = new Array<number>(values.length);
  let runningMaximum = 0;
  order.forEach(({ value, index }, rank) => {
    runningMaximum = Math.max(runningMaximum, (values.length - rank) * value);
    adjusted[index] = Math.min(1, runningMaximum);
  });
  return adjusted;
}
