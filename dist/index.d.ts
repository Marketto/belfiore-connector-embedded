import { IBelfioreConnectorBaseConfig, IBelfioreConnectorProvinceConfig, IBelfioreConnectorMatcherConfig, BelfioreAbstractConnector, BelfiorePlace, MultiFormatDate } from '@marketto/belfiore-connector';
export * from '@marketto/belfiore-connector';

interface IBelfioreDbData {
    belfioreCode: string;
    name: string;
    creationDate?: string;
    expirationDate?: string;
    provinceOrCountry: string;
    dataSource: string;
}

interface IBelfioreDbLicense {
    name: string;
    url: string;
    license: string;
    licenseUrl: string;
    termsAndConditions: string;
    authors?: string;
}

interface IBelfioreDb {
    data: IBelfioreDbData[];
    licenses: IBelfioreDbLicense[];
    sources: string[];
}

type BelfioreConnectorConfig = (IBelfioreConnectorBaseConfig | IBelfioreConnectorProvinceConfig | IBelfioreConnectorMatcherConfig) & IBelfioreDb & ({} | {
    fromDate: never;
    toDate: never;
});

/**
 * Handler for cities and countries Dataset
 */
declare class BelfioreConnector extends BelfioreAbstractConnector {
    /**
     * Binary find Index (works ONLY in sorted arrays)
     * @param text Unique string of values of the same length (step)
     * @param value Exact text to find
     * @param start text start index for seeking the value
     * @param end text end index for seeking the value
     * @param step length of a single value to seek properly the text string
     * @returns Found value Index or -1 if not found
     * @private
     */
    private binaryfindIndex;
    /**
     * Converts belfiore code into an int
     */
    private belfioreToInt;
    /**
     * Converts int to belfiore code
     * @param code Belfiore int code
     * @returns Standard belfiore code
     */
    private belfioreFromInt;
    /**
     * Converst Base 32 number of days since 01/01/1861 to Date instance
     * @param base32daysFrom1861 Base 32 number of days from 1861-01-01
     * @returns Date instance
     */
    private decodeDate;
    /**
     * Retrieve string at index posizion
     * @param list concatenation of names
     * @param index target name index
     * @returns index-th string
     */
    private static nameByIndex;
    private data;
    private licenses;
    private sources;
    private toDate;
    private fromDate;
    private codeMatcher;
    private province;
    constructor({ fromDate, toDate, codeMatcher, data, licenses, province, sources, }: BelfioreConnectorConfig);
    private get config();
    private scanDataSourceIndex;
    private scanData;
    private scanDataGenerator;
    /**
     * Retrieve location for the given index in the given subset
     * @param resourceData concatenation of names
     * @param index target name index
     * @returns location
     */
    private locationByIndex;
    private parseProvinces;
    /**
     * Return belfiore places list
     */
    toArray(): Promise<BelfiorePlace[]>;
    get provinces(): Promise<string[]>;
    /**
     * @description Search places matching given name
     */
    searchByName(name: string): Promise<BelfiorePlace[] | null>;
    /**
     * @description Find place matching given name, retuns place object if provided name match only 1 result
     */
    findByName(name: string): Promise<BelfiorePlace | null>;
    /**
     * @description Retrieve Place by Belfiore Code
     */
    findByCode(belfioreCode: string): Promise<BelfiorePlace | null>;
    /**
     * Returns a Proxied version of Belfiore which filters results by given date
     * @param date Target date to filter places active only for the given date
     * @returns Belfiore instance filtered by active date
     * @public
     */
    active(date?: MultiFormatDate): BelfioreConnector;
    /**
     * Returns a Proxied version of Belfiore which filters results by given date ahead
     * @param date Target date to filter places active only for the given date
     * @returns Belfiore instance filtered by active date
     * @public
     */
    from(date?: MultiFormatDate): BelfioreConnector;
    /**
     * Returns a Belfiore instance filtered by the given province
     * @param code Province Code (2 A-Z char)
     * @returns Belfiore instance filtered by province code
     * @public
     */
    byProvince(code: string): BelfioreConnector | undefined;
    /**
     * Returns a Proxied version of Belfiore which filters results by place type
     */
    get cities(): BelfioreConnector | undefined;
    /**
     * Returns a Proxied version of Belfiore which filters results by place type
     */
    get countries(): BelfioreConnector | undefined;
}

declare const belfioreConnector: BelfioreConnector;

export { BelfioreConnector, belfioreConnector, belfioreConnector as default };
