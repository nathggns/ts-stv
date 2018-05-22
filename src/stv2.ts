import {Configuration, ThresholdCalculator} from "./interfaces";

export class STV {
    constructor(
        private config: Configuration,
        private thresholdCalculator: ThresholdCalculator
    ) {
    }

    setup() {
        const threshold = this.thresholdCalculator.calculate(this.config.positions, 50);

        return { threshold };
    }
}
