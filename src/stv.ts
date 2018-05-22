export interface Candidate {
    name: string;
}

export interface BallotCandidate {
    candidate: Candidate;
    votes: number;
    share: number;
}

export interface Voter {
    preferences: Candidate[];
}

export interface Ballot {
    votes: Voter[];
}

export interface CalculatedBallot {
    originalBallot: Ballot;
    ballot: Ballot;
    nonTransferred: number;
    stage: number;
    final: boolean;
    result: BallotCandidate[];
    candidates: Candidate[];
    votesAtThisStage: Candidate[];
    elected: Candidate[];
    threshold: number;
    positions: number;
}

function getCandidatesFromBallot(ballot: Ballot): Candidate[] {
    const candidates = ballot.votes.reduce<Candidate[]>(
        (candidates, vote) => [
            ...candidates,
            ...vote.preferences.filter(candidate => !candidates.includes(candidate))
        ],
        []
    );

    return candidates.includes(RON) ? candidates : [
        ...candidates,
        RON
    ];
}

function calculate(ballot: Ballot, candidates = getCandidatesFromBallot(ballot)) {
    const votesAtThisStage = ballot.votes.map<Candidate>(voter => voter.preferences[0]);
    const result = candidates.map<BallotCandidate>(candidate => {
        const votes = votesAtThisStage.filter(c => c === candidate).length;

        return {
            candidate,
            votes,
            share: votes / votesAtThisStage.length
        };
    }).sort((a, b) => b.votes - a.votes);

    return { votesAtThisStage, result };
}

function last<T>(collection: T[]): T|undefined {
    return collection[collection.length - 1];
}

export const RON: Candidate = {
    name: 'Reopen Nominations'
};

function calculateThreshold(ballot: Ballot, positions: number): number {
    return (ballot.votes.length / (positions + 1)) + 1;
}

function complete<T>(
    iterable: Iterable<T>
): T|undefined {
    let value;
    for (value of iterable) {}

    return value;
}

function iterateN<T>(
    iterable: Iterable<T>,
    n: number
): T|undefined {
    const iterator = iterable[Symbol.iterator]();
    let value;
    for (let i = 0; i < n; i++) {
        const result = iterator.next();
        if (result.done) {
            break;
        }
        value = result.value;
    }
    return value;
}

function eliminateCandidate(
    result: BallotCandidate[],
    ballot: Ballot,
    nonTransferred: number,
    candidates: Candidate[]
): { nonTransferred: number, votes: Voter[], candidates: Candidate[] } {
    const toEliminate = last(result.filter(r => r.candidate !== RON));

    if (!toEliminate) {
        throw new Error(`Attempting to progress stage with no candidate to eliminate`);
    }

    const reduced = ballot.votes.reduce<{ nonTransferred: number, votes: Voter[] }>(({nonTransferred, votes}, voter) => {
        const newPreferences = voter.preferences.filter(c => c !== toEliminate.candidate);

        if (newPreferences.length === 0) {
            nonTransferred += 1;
        } else {
            votes = [
                ...votes,
                {
                    ...voter,
                    preferences: newPreferences
                }
            ]
        }

        return { nonTransferred, votes };
    }, {
        nonTransferred,
        votes: []
    });

    return {
        ...reduced,
        candidates: candidates.filter(c => c !== toEliminate.candidate)
    };
}

function calculateAndRedistribute(
    ballot: Ballot,
    candidates = getCandidatesFromBallot(ballot),
    threshold: number,
    positions: number,
    totalElected: Candidate[] = []
) {
    const { result, ...other } = calculate(ballot, candidates);
    const elected = result.length === positions
        ? result[0]
        : result.find(candidate => candidate.votes >= threshold);

    if (elected && totalElected.length + 1 < positions) {
        console.log('REDISTRIBUTE');
    }

    return { result, elected: totalElected, ...other };
}

function* calculateByStage(
    ballot: Ballot,
    positions = 1,
    originalBallot = ballot,
    candidates = getCandidatesFromBallot(ballot),
    threshold = calculateThreshold(ballot, positions),
    stage = 0,
    nonTransferred = 0,
    previousCalculatedBallot?: CalculatedBallot
): Iterable<CalculatedBallot> {
    const { votesAtThisStage, result } = calculateAndRedistribute(
        ballot,
        candidates,
        threshold,
        positions,
        typeof previousCalculatedBallot === 'undefined' ? [] : previousCalculatedBallot.elected
    );
    const elected = result
        .filter(candidate => candidate.votes > threshold)
        .map(candidate => candidate.candidate);
    const final = result.length === positions ||
        elected.length === positions;

    const calculatedBallot = {
        originalBallot,
        candidates,
        nonTransferred,
        votesAtThisStage,
        stage,
        result,
        final,
        ballot,
        elected,
        threshold,
        positions,
    };

    yield calculatedBallot;

    if (!final) {
         const {
             candidates: newCandidates,
             nonTransferred: newNonTransferred,
             votes: newVotes
         } = eliminateCandidate(result, ballot, nonTransferred, candidates);

        yield* calculateByStage({
            ...ballot,
            votes: newVotes
        }, positions, originalBallot, newCandidates, threshold, stage + 1, newNonTransferred, calculatedBallot);
    }
}

export interface PublicAPI<T> {
    (ballot: Ballot, positions?: number): T;
}

export const iterate: PublicAPI<Iterable<CalculatedBallot>>
 = (ballot, positions) => calculateByStage(ballot, positions);

export const count: PublicAPI<CalculatedBallot> = (ballot, positions) => {
    const result = complete(iterate(ballot, positions));

    if (!result) {
        throw new Error('Dunno');
    }

    return result;
};

export const countToStage = (stage: number): PublicAPI<CalculatedBallot> => (ballot, positions) => {
    const result = iterateN(iterate(ballot, positions), stage + 1);

    if (!result) {
        throw new Error('Dunno');
    }

    return result;
};

export const candidate = (() => {
    const map: { [key: string]: Candidate } = {};

    return (name: string): Candidate => map[name] || (map[name] = { name });
})();

