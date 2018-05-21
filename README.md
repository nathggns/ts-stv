# ts-stv

TypeScript implementation of STV counting.

## Todo

- Testing
- Excess vote re-allocation
- Configurable "protected" RON 
- Disable RON 
- Nicer more consumable API
- Output (CSV, PDF, etc?)
- CLI (with input data formats)

## Usage

Probably don't use this yet, API is likely to change.

```ts
import { count, RON, candidate } from 'ts-stv';
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
console.log(`Took ${stage + 1 } stages to calculate`);
console.log(`${result[0].candidate.name} wins!`);
// Took 3 stages to calculate
// green wins!
```
