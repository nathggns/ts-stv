import { STV } from '../src/stv2';

describe('STV', () => {
    describe('setup', () => {
        it('should calculate the threshold using the passed threshold calculator', () => {
           const stv = new STV(
               {
                   positions: 2
               },
               {
                   calculate: num => num / 2
               }
           );
           expect(stv.setup()).toEqual(expect.objectContaining({
               threshold: 25
           }));
        });

    })
});
