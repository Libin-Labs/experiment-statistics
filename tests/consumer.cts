import statistics = require('@lp-labs/experiment-statistics');

const result: statistics.ProportionComparison = statistics.compareProportions(20, 50, 25, 50);
console.log(statistics.adjustPValues([result.pValue], 'holm'));
