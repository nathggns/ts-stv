export interface ThresholdCalculator {
    calculate(positions: number, totalVotes: number): number;
}

export interface Configuration {
    positions: number;
}
