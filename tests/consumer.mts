import {
  compareProportions,
  wilsonInterval,
  type ProportionComparison,
} from '@lp-labs/experiment-statistics';

const interval = wilsonInterval(40, 100);
const comparison: ProportionComparison = compareProportions(40, 100, 50, 100);
console.log(interval.lower, comparison.pValue);
