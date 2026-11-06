# @lp-labs/experiment-statistics

Small, dependency-free inference helpers for binary experiments: Wilson score intervals, a pooled two-proportion z test, a Newcombe-Wilson interval for the rate difference, and family-wise p-value adjustments.

## Install

```sh
npm install @lp-labs/experiment-statistics
```

Node 18+ or ES2022 browsers. ESM, CommonJS, and declarations are included.

## Quick start

```js
import { compareProportions, adjustPValues } from '@lp-labs/experiment-statistics';

const result = compareProportions(50, 100, 60, 100);
console.log(result.difference, result.pValue); // 0.1, approximately 0.155
console.log(adjustPValues([result.pValue, 0.02], 'holm'));
```

Arguments are control successes/trials followed by treatment successes/trials. CommonJS: `const { compareProportions } = require('@lp-labs/experiment-statistics');`.

## API reference

Runtime exports: `wilsonInterval`, `compareProportions`, `adjustPValues`, `StatisticsError`.

Types: `PValueAdjustment`, `ProportionInterval`, `ProportionComparison`.

### `wilsonInterval(successes, trials, confidenceLevel?): ProportionInterval`

Computes a two-sided Wilson score interval for one binomial proportion. The default confidence level is 0.95. Returns the observed `estimate`, bounded `lower` and `upper`, and the requested `confidenceLevel`.

### `compareProportions(controlSuccesses, controlTrials, treatmentSuccesses, treatmentTrials, confidenceLevel?): ProportionComparison`

Returns control and treatment rates, treatment-minus-control `difference`, pooled two-sided normal-approximation `zStatistic` and `pValue`, and a two-sided Newcombe interval formed from the groups' Wilson intervals. The confidence interval is not a p-value inversion and can disagree in borderline cases.

### `adjustPValues(pValues, method?): number[]`

Adjusts values in input order using `bonferroni` or (default) step-down `holm`. Holm controls family-wise error under arbitrary dependence; Bonferroni is also family-wise valid. Empty inputs return an empty array. At most 100,000 values are accepted.

### Validation and errors

Each group must have safe-integer counts with `trials >= 1` and `0 <= successes <= trials`; combined counts must also remain safe integers. Confidence levels must be strictly between zero and one; p-values must be finite in `[0, 1]`. `StatisticsError.code` is `invalid` or `capacity`. There is no continuity correction or exact binomial test.

## Assumptions and limitations

These estimators assume independent Bernoulli observations within and between groups, fixed sample sizes, and a pre-specified analysis. The pooled z-test uses a large-sample normal approximation, which may be inaccurate with sparse counts or extreme rates; use a suitable exact or sequential design method when those conditions matter. The Newcombe interval is a score-based approximate interval. Do not treat repeated peeking, adaptive stopping, clustering, covariate adjustment, or non-binary outcomes as handled here.

Multiplicity correction only addresses the supplied p-value family. Decide which hypotheses belong in that family before looking at results; adjustment cannot repair selective reporting, bad randomization, confounding, or post-hoc metric selection. The numerical normal CDF is an approximation; outputs are not a substitute for a validated domain-specific statistical analysis.

## Customization

```js
import { adjustPValues, compareProportions } from '@lp-labs/experiment-statistics';

const comparisons = [compareProportions(18, 40, 23, 40), compareProportions(20, 50, 24, 50)];
const adjusted = adjustPValues(
  comparisons.map((item) => item.pValue),
  'bonferroni',
);
console.log(adjusted);
```

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
