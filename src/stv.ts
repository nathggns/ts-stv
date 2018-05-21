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

function isComplete(result: BallotCandidate[], positions: number, threshold: number): boolean {
    return result.length === positions || !!result.find(candidate => candidate.votes > threshold);
}

function last<T>(collection: T[]): T|undefined {
    return collection[collection.length - 1];
}

export const RON: Candidate = {
    name: 'Reopen Nominations'
};

function calculateThreshold(ballot: Ballot, positions: number): number {
    return ballot.votes.length / (positions + 1);
}

function complete<T>(
    iterable: Iterable<T>
): T|undefined {
    let value;
    for (value of iterable) {}

    return value;
}

function* calculateByStage(
    ballot: Ballot,
    positions = 1,
    originalBallot = ballot,
    candidates = getCandidatesFromBallot(ballot),
    threshold = calculateThreshold(ballot, positions),
    stage = 0,
    nonTransferred = 0
): Iterable<CalculatedBallot> {
    const { votesAtThisStage, result } = calculate(ballot, candidates);
    const final = isComplete(result, positions, threshold);
    const calculatedBallot = {
        originalBallot,
        candidates,
        nonTransferred,
        votesAtThisStage,
        stage,
        result,
        final,
        ballot
    };

    yield calculatedBallot;

    if (!final) {
        const toEliminate = last(result.filter(r => r.candidate !== RON));

        if (!toEliminate) {
            throw new Error(`Attempting to progress stage with no candidate to eliminate`);
        }

        const {
            nonTransferred: newNonTransferred,
            votes: newVotes
        } = ballot.votes.reduce<{ nonTransferred: number, votes: Voter[]}>(({ nonTransferred, votes }, voter) => {
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

        yield* calculateByStage({
            ...ballot,
            votes: newVotes
        }, positions, originalBallot, candidates.filter(c => c !== toEliminate.candidate), threshold, stage + 1, newNonTransferred);
    }
}

const candidates = {
    green: {name: 'green'},
    blue: {name: 'blue'},
    yellow: {name: 'yellow'},
    red: {name: 'red'},
};

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

export const candidate = (() => {
    const map: { [key: string]: Candidate } = {};

    return (name: string): Candidate => map[name] || (map[name] = { name });
})();

const { result, stage } = count(
    {
        votes: [
            { preferences: [ candidate('green'), candidate('blue') ] },
            { preferences: [ candidate('green'), candidate('yellow') ] },
            { preferences: [ candidate('yellow'), candidate('green') ] },
            { preferences: [ candidate('yellow'), RON ] },
            { preferences: [ candidate('yellow'), candidate('green') ] },
            { preferences: [ candidate('blue'), candidate('green') ] },
        ]
    }
);
console.log(`Took ${stage + 1 } stages to calculate`);
console.log(`${result[0].candidate.name} wins!`);

