const chai = require('chai');
chai.use(require('chai-things'));
const expect = chai.expect;
chai.should();

describe('belfiore', () => {
    const belfiore = require('../src/belfiore');
    describe('belfiore.constructor', () => {
        describe('belfiore.constructor.binaryfindIndex', () => {
            it('Should return proper index', () => {
                belfiore.constructor.binaryfindIndex('00100200300400500600700800900a00b00c00d00e00f00g00h00i','00e').should.be.equal(13);
            });
        });
    });

    describe('belfiore', () => {
        describe('belfiore[belfioreCode]', () => {
            it('Should return Rome for H501', async () => {
                const H501 = await belfiore.H501;
                H501.name.should.be.equal('ROMA');
            });
        });
        describe('belfiore place', () => {
            it('Should return code H501 for H501', async () => {
                const H501 = await belfiore.H501;
                H501.belfioreCode.should.be.equal('H501');
                H501.creationDate.getFullYear().should.be.equal(1884);
                H501.expirationDate.getFullYear().should.be.equal(9999);
                H501.province.should.be.equal('RM');
                H501.dataSource.should.be.an('object');
            });
        });
        describe('belfiore.toArray()', () => {
            const belfioreListPromise = belfiore.toArray();
            it('Should return an Array of places', async () => {
                const belfioreList = await belfioreListPromise;
                belfioreList.should.be.a('array');
            });
            it('Should have different elements', async () => {
                const belfioreList = await belfioreListPromise;
                belfioreList[10].belfioreCode.should.be.not.equal(belfioreList[11].belfioreCode);
                belfioreList[10].name.should.be.not.equal(belfioreList[11].name);
                belfioreList[32].belfioreCode.should.be.not.equal(belfioreList[632].belfioreCode);
                belfioreList[32].name.should.be.not.equal(belfioreList[632].name);
            });
        });
        describe('belfiore.findByName()', () => {
            it('Should return H501 for Rome', async () => {
                const result = await belfiore.findByName('Roma');
                result.name.should.be.equal('ROMA');
            });
        });
    });

    describe('belfiore.cities', () => {
        describe('belfiore[belfioreCode]', () => {
            it('Should return Bari for A662', async () => {
                const A662 = await belfiore.cities.A662;
                A662.name.should.be.equal('BARI');
            });
        });
        describe('belfiore.cities.byProvince', () => {
            it('Should return cities by RM province', async () => {
                const rmCities = await belfiore.byProvince('RM').toArray();
                rmCities.some(({province}) => province !== 'RM').should.be.false;
            });
        });
    });

    describe('belfiore.active', () => {
        describe('belfiore.active()[belfioreCode]', () => {
            it('Should return Bologna for A944', async () => {
                const A944 = await belfiore.active().A944;
                A944.name.should.be.equal('BOLOGNA');
            });
            it('Should return null for D620 today', () => {
                belfiore.active().D620.catch(D620 => expect(D620).to.be.undefined);
            });
            it('Should return FIUME for D620 in 1933', async () => {
                const D620 = await belfiore.active([1933]).D620;
                D620.name.should.be.equal('FIUME');
            });
            it('Should throws Error for D620 in 2000', () => {
                belfiore.active([2000]).D620.catch(D620 => expect(D620).to.be.undefined);
            });
        });
        describe('belfiore.cities.active()', () => {
            it('Should not contains D620 (Fiume)', () => {
                belfiore.cities.active().D620.catch(D620 => expect(D620).to.be.undefined);
            });
            it('Should contains D620 (Fiume) passing 1933 as active date', async () => {
                const D620 = await belfiore.cities.active([1933]).D620;
                D620.name.should.be.equal('FIUME');
            });
        });
    });

    describe('belfiore.nameByIndex', () => {
        const nameByIndex = (...args) => belfiore.constructor.nameByIndex(...args);
        const targetData = belfiore._data[0];
        it('Should return Bologna @ 0', () => {
            nameByIndex(targetData.name, 0).should.be.equal('Cecoslovacchia');
        });
        it('Should return Bologna @ 3', () => {
            nameByIndex(targetData.name, 3).should.be.equal('Unione Sovietica');
        });
        it('Should return Bologna @ last position', () => {
            nameByIndex(targetData.name, targetData.belfioreCode.length/3 -1).should.be.equal('Yemen del Sud');
        });
        it('Should return null @ last position +1', () => {
            try {
                nameByIndex(targetData.name, targetData.belfioreCode.length/3);
            } catch (err) {
                expect(err).to.be.ok;
            }
        });
    });
});