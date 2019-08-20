const CITIES_COUNTRIES = require('./asset/cities-countries.json');
const moment = require('moment');
const BelfioreConnector = require('@marketto/belfiore-connector');

/**
 * Handler for cities and countries Dataset
 * 
 * @namespace BelfioreConnectorEmbedded
 */
class BelfioreConnectorEmbedded extends BelfioreConnector {
    /**
     * @override
     * @param {Object} param Static json
     * @param {Array<Array<Object>>} param.data Resource data
     * @param {Array<Array<Object>>} param.licenses License array
     * @see BelfioreConnector.constructor
     * @constructor
     * @private
     */
    constructor(param) {
        const proxy = super(param);
        const {data, licenses} = param;

        const hiddenValueConf = value => ({
            value,
            enumerable: false,
            configurable: false,
            writable: false
        });

        Object.defineProperties(this, {
            _data: hiddenValueConf(data),
            _licenses: hiddenValueConf(licenses)
        });
        return proxy;
    }

    /**
     * @override
     * @async
     * @returns {Array<Object>} List of places
     * @public
     */
    async toArray() {
        const dataReader = resource => async (e, i) => this.constructor.locationByIndex(resource, i, {
            activeDate: this._activeDate,
            codeMatcher: this._codeMatcher,
            province: this._province,
            licenses: this._licenses
        });
        const dataMapper = resource => Promise.all(Array.from(new Array(resource.belfioreCode.length / 3), dataReader(resource) ));
        const locations = await Promise.all(this._data
            .map(dataMapper));

        return locations
            .reduce((a, b) => a.concat(b))
            .filter(e => !!e);
    }

    /**
     * Search places matching given name
     * @override
     * @async
     * @param {string} name Place name
     * @param {number} [limit=0] result limit
     * @returns {Array<Object>} List of places
     * @throws {Error} Missing or invalid provided name
     * @public
     */
    async searchByName(name, limit = 0) {
        let output = await super.searchByName(name, limit);
        if (!output.length) {
            for (let g = 0; g < this._data.length && (!limit || output.length <= limit); g++) {
                const resourceData = this._data[g];
                const indexer = this.constructor.indexByName(resourceData.name, name);
                for (let index of indexer) {
                    if (index >= 0) {
                        const foundItem = this.constructor.locationByIndex(resourceData, index, this.config());
                        if (foundItem) {
                            output.push(foundItem);
                        }
                    }
                }
            }
        }
        return output;
    }

    /**
     * Retrieve place matching given belfioreCode
     * @override
     * @async
     * @param {string} belfioreCode Belfiore Code
     * @returns {Object}
     * @throws {Error} Missing or invalid provided name
     * @public
     */
    async getByCode(belfioreCode) {
        await super.getByCode(belfioreCode);
        const base32name = this.constructor.belfioreToInt(belfioreCode).toString(32).padStart(3, '0');
        for (let g = 0; g < this._data.length; g++) {
            const resourceData = this._data[g];
            const index = this.constructor.binaryfindIndex(resourceData.belfioreCode, base32name);
            if (index >= 0) {
                return await this.constructor.locationByIndex(resourceData, index, this.config());
            }
        }
    }

    /**
     * Binary find Index (works ONLY in sorted arrays)
     * @param {string} text Unique string of values of the same length (step)
     * @param {string} value Exact text to find
     * @param {number} start text start index for seeking the value
     * @param {number} end text end index for seeking the value
     * @param {number} step length of a single value to seek properly the text string
     * @returns {number} Found value Index or -1 if not found
     * @private
     */
    static binaryfindIndex(text, value, start, end) {
        if (typeof text !== 'string' || !text.length) {
            return -1;
        }
        if (!start || start < 0) {
            start = 0;
        }
        if (!end || end >= text.length) {
            end = text.length -1;
        }
        const currentLength = end - start + 1;
        if (start > end || currentLength % value.length) {
            return -1;
        }
        const targetIndex = start + Math.floor(currentLength/(2*value.length))*value.length;
        const targetValure = text.substr(targetIndex, value.length);
        if (targetValure === value) {
            return Math.ceil((targetIndex + 1) / value.length) -1;
        }
        const goAhead = value > targetValure;
        return this.binaryfindIndex(text, value, goAhead ? targetIndex + value.length : start, goAhead ? end : targetIndex - 1);
    }

    /**
     * Converts belfiore code into an int
     * @param {string} code Belfiore Code
     * @returns {number} Int version of belfiore code
     * @private
     */
    static belfioreToInt(code) {
        return (code.charCodeAt()-65)*10**3 + parseInt(code.substr(1));
    }

    /**
     * Converts int to belfiore code
     * @param {number} code Belfiore int code
     * @returns {string} Standard belfiore code
     * @private
     */
    static belfioreFromInt(code) {
        return `${String.fromCharCode(Math.floor(code / 10**3) + 65)}${code.toString().substr(-3).padStart(3, '0')}`;
    }

    /**
     * Converst Base 32 number of days since 01/01/1861 to Moment instance
     * @param {string} base32daysFrom1861 Base 32 number of days from 1861-01-01
     * @returns {Moment} Moment instance date
     * @private
     */
    static decodeDate(base32daysFrom1861) {
        return moment('1861-01-01').add(parseInt(base32daysFrom1861, 32) ,'days');
    }

    /**
     * Retrieve string at index posizion
     * @param {string} list concatenation of names
     * @param {number} index target name index
     * @returns {string} index-th string
     * @private
     */
    static nameByIndex(list, index) {
        let startIndex = 0,
            endIndex = list.indexOf('|', startIndex + 1),
            counter = index;

        while (counter > 0 && endIndex > startIndex) {
            counter--;
            startIndex = endIndex + 1;
            endIndex = list.indexOf('|', startIndex + 1);
        }
        
        if (index < 0 || counter > 0) {
            throw new Error(`[Belfiore.nameByIndex] Provided index ${index} is out range`);
        }

        if (!counter && endIndex < 0) {
            return list.substring(startIndex);
        }

        return list.substring(startIndex, endIndex);
    }

    /**
     * Retrieve string at index posizion
     * @generator
     * @param {string} list concatenation of names
     * @param {string|RegExp} matcher target name index
     * @yields {number} index
     * @returns {number} -1 when Done
     * @private
     */
    static* indexByName(list, matcher) {
        if (typeof matcher === 'string') {
            matcher = new RegExp(matcher, 'i');
        }
        const seekEntryEndIndex = index => list.indexOf('|', index +1) + 1 || list.length;
        
        for(let startIndex = 0, entryIndex = 0; startIndex < list.length; entryIndex++) {
            const endIndex = seekEntryEndIndex(startIndex);
            const targetName = list.substring(startIndex, endIndex -1);
            if (matcher.test(targetName)) {
                yield entryIndex;
            }
            // Moving to next entry to chgeck
            startIndex = endIndex;
        }
        return -1;
    }

    /**
     * Retrieve location for the given index in the given subset
     * @param {string} resourceData concatenation of names
     * @param {number} index target name index
     * @returns {Object} location
     * @private
     */
    static locationByIndex(resourceData, index, { activeDate, codeMatcher, province, licenses } = {}) {
        const belfioreIndex = index * 3;
        if (resourceData.belfioreCode.length - belfioreIndex < 3) {
            return null;
        }
        const belFioreInt = parseInt(resourceData.belfioreCode.substr(belfioreIndex, 3), '32');
        const belfioreCode = this.belfioreFromInt(belFioreInt);
        if (codeMatcher && !codeMatcher.test(belfioreCode)) {
            return null;
        }
        const code = resourceData.provinceOrCountry.substr(index * 2, 2);
        if (province && province !== code) {
            return null;
        }

        const dateIndex = index * 4;
        const creationDate = this.decodeDate((resourceData.creationDate || '').substr(dateIndex, 4) || '0').startOf('day');
        const expirationDate = this.decodeDate((resourceData.expirationDate || '').substr(dateIndex, 4) || '2qn13').endOf('day');
        if (
            activeDate && 
            (
                resourceData.creationDate && moment(activeDate).isBefore(creationDate, 'day') ||
                resourceData.expirationDate &&  moment(activeDate).isAfter(expirationDate, 'day')
            )
        ) {
            return null;
        }
        const name = this.nameByIndex(resourceData.name, index);
        const isCountry = belfioreCode[0] === 'Z';

        const dataSource = licenses[parseInt(parseInt(resourceData.dataSource, 32).toString(2).padStart(resourceData.belfioreCode.length * 2/3, 0).substr(index * 2, 2), 2)];

        return Object.assign({
            belfioreCode,
            name,
            creationDate: creationDate.toDate(),
            expirationDate: expirationDate.toDate(),
            dataSource
        }, isCountry ? {
            iso3166: code
        } : {
            province: code
        });
    }
}

module.exports = new BelfioreConnectorEmbedded(CITIES_COUNTRIES);