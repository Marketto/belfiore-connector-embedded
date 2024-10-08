import dayjs, { Dayjs } from "dayjs";
import {
	BelfioreAbstractConnector,
	BelfiorePlace,
	IBelfioreCity,
	IBelfioreCommonPlace,
	IBelfioreCountry,
	MultiFormatDate,
} from "@marketto/belfiore-connector";
import generatorWrapper from "../functions/generator-wrapper.function";
import type IGeneratorWrapper from "../interfaces/generator-wrapper.interface";
import type IBelfioreDbData from "../interfaces/belfiore-db-data.interface";
import type IBelfioreDbLicense from "../interfaces/belfiore-db-license.interface";
import type BelfioreConnectorConfig from "../types/belfiore-connector-config.type";

/**
 * Handler for cities and countries Dataset
 */
export default class BelfioreConnector extends BelfioreAbstractConnector {
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
	private binaryfindIndex(
		sourceString: string,
		targetText: string,
		start: number = 0,
		end: number = sourceString.length - 1
	): number {
		if (!sourceString.length) {
			return -1;
		}
		const rangedStart: number = Math.max(start, 0);
		const rangedEnd: number = Math.min(end, sourceString.length - 1);
		const currentLength: number = rangedEnd - rangedStart + 1;
		if (rangedStart > rangedEnd || currentLength % targetText.length) {
			return -1;
		}
		const targetIndex: number =
			rangedStart +
			Math.floor(currentLength / (2 * targetText.length)) * targetText.length;
		const targetValue: string = sourceString.substr(
			targetIndex,
			targetText.length
		);
		if (targetValue === targetText) {
			return Math.ceil((targetIndex + 1) / targetText.length) - 1;
		}
		if (targetText > targetValue) {
			return this.binaryfindIndex(
				sourceString,
				targetText,
				targetIndex + targetText.length,
				rangedEnd
			);
		}
		return this.binaryfindIndex(
			sourceString,
			targetText,
			rangedStart,
			targetIndex - 1
		);
	}

	/**
	 * Converts belfiore code into an int
	 */
	private belfioreToInt(code: string): number {
		const upperCaseCode: string = code.toUpperCase();
		return (
			(upperCaseCode.charCodeAt(0) - 65) * 10 ** 3 +
			parseInt(upperCaseCode.substr(1), 10)
		);
	}

	/**
	 * Converts int to belfiore code
	 * @param code Belfiore int code
	 * @returns Standard belfiore code
	 */
	private belfioreFromInt(code: number): string {
		const charIndex: number = Math.floor(code / 10 ** 3);
		const char: string = String.fromCharCode(charIndex + 65);
		const numValue: string = code.toString().substr(-3);
		return `${char}${numValue.padStart(3, "0")}`;
	}

	/**
	 * Converst Base 32 number of days since 01/01/1861 to Date instance
	 * @param base32daysFrom1861 Base 32 number of days from 1861-01-01
	 * @returns Date instance
	 */
	private decodeDate(base32daysFrom1861: string): Dayjs {
		const italyBirthDatePastDays = parseInt(base32daysFrom1861, 32);
		return dayjs(this.ITALY_KINGDOM_BIRTHDATE).add(
			italyBirthDatePastDays,
			"days"
		);
	}

	/**
	 * Retrieve string at index posizion
	 * @param list concatenation of names
	 * @param index target name index
	 * @returns index-th string
	 */
	private static nameByIndex(list: string, index: number): string {
		if (typeof list !== "string") {
			throw new Error(
				"[BelfioreConnector.nameByIndex] Provided list is not a string"
			);
		}
		if (!list.length) {
			throw new Error("[BelfioreConnector.nameByIndex] Provided list empty");
		}
		let startIndex: number = 0;
		let endIndex: number = list.indexOf("|", startIndex + 1);
		let counter: number = index;

		while (counter > 0 && endIndex > startIndex) {
			counter--;
			startIndex = endIndex + 1;
			endIndex = list.indexOf("|", startIndex + 1);
		}

		if (index < 0 || counter > 0) {
			throw new Error(
				`[BelfioreConnector.nameByIndex] Provided index ${index} is out range`
			);
		}

		if (!counter && endIndex < 0) {
			return list.substring(startIndex);
		}

		return list.substring(startIndex, endIndex);
	}

	private data: IBelfioreDbData[];
	private licenses: IBelfioreDbLicense[];
	private sources: string[];
	private toDate: Date | undefined;
	private fromDate: Date | undefined;
	private codeMatcher: RegExp | undefined;
	private province: string | undefined;

	constructor({
		fromDate,
		toDate,
		codeMatcher,
		data,
		licenses,
		province,
		sources,
	}: BelfioreConnectorConfig) {
		super();
		if (codeMatcher && province) {
			throw new Error(
				"Both codeMatcher and province were provided to Bolfiore, only one is allowed"
			);
		}

		if (toDate && !fromDate) {
			throw new Error("Parameter fromDate is mandatory passing toDate");
		}

		this.fromDate = fromDate;
		this.toDate = toDate;
		this.codeMatcher = codeMatcher;
		this.data = data;
		this.licenses = licenses;
		this.province = province;
		this.sources = sources;
	}

	private get config(): BelfioreConnectorConfig {
		const { codeMatcher, data, fromDate, licenses, sources, toDate } = this;
		return {
			codeMatcher,
			data,
			fromDate,
			licenses,
			sources,
			toDate,
		} as BelfioreConnectorConfig;
	}

	private *scanDataSourceIndex(
		dataSource: IBelfioreDbData,
		matcher?: RegExp
	): Generator {
		if (matcher) {
			for (
				let startIndex = 0, entryIndex = 0;
				startIndex < dataSource.name.length;
				entryIndex++
			) {
				const endIndex =
					dataSource.name.indexOf("|", startIndex + 1) + 1 ||
					dataSource.name.length + 1;
				const targetName = dataSource.name.substring(startIndex, endIndex - 1);
				if (matcher.test(targetName)) {
					yield entryIndex;
				}
				// Moving to next entry to check
				startIndex = endIndex;
			}
		} else {
			const dsLength = dataSource.belfioreCode.length / 3;
			for (let index = 0; index < dsLength; index++) {
				yield index;
			}
		}
		return -1;
	}

	private scanData(
		name?: string | RegExp
	): IGeneratorWrapper<BelfiorePlace, null, void> {
		return generatorWrapper(this.scanDataGenerator(name));
	}
	private *scanDataGenerator(name?: string | RegExp): Generator {
		const nameMatcher = typeof name === "string" ? new RegExp(name, "i") : name;

		for (const sourceData of this.data) {
			const dataSourceScan = this.scanDataSourceIndex(sourceData, nameMatcher);
			for (
				let dss = dataSourceScan.next();
				!dss.done;
				dss = dataSourceScan.next()
			) {
				const index = dss.value as number;
				const parsedPlace: BelfiorePlace | null = this.locationByIndex(
					sourceData,
					index
				);
				if (parsedPlace) {
					yield parsedPlace;
				}
			}
		}
		return null;
	}

	/**
	 * Retrieve location for the given index in the given subset
	 * @param resourceData concatenation of names
	 * @param index target name index
	 * @returns location
	 */
	private locationByIndex(
		resourceData: IBelfioreDbData,
		index: number
	): BelfiorePlace | null {
		const belfioreIndex = index * 3;
		if (resourceData.belfioreCode.length - belfioreIndex < 3) {
			return null;
		}
		const belFioreInt = parseInt(
			resourceData.belfioreCode.substring(belfioreIndex, belfioreIndex + 3),
			32
		);
		const belfioreCode = this.belfioreFromInt(belFioreInt);
		const code = resourceData.provinceOrCountry.substring(
			index * 2,
			index * 2 + 2
		);
		if (
			(this.province && this.province !== code) ||
			(this.codeMatcher && !this.codeMatcher.test(belfioreCode))
		) {
			return null;
		}

		const dateIndex = index * 4;
		const creationDate = this.decodeDate(
			(resourceData.creationDate || "").substring(dateIndex, dateIndex + 4) ||
				"0"
		).startOf("day");
		const expirationDate = this.decodeDate(
			(resourceData.expirationDate || "").substring(dateIndex, dateIndex + 4) ||
				"2qn13"
		).endOf("day");
		if (
			(this.fromDate &&
				resourceData.expirationDate &&
				dayjs(this.fromDate).isAfter(expirationDate, "day")) ||
			(this.toDate &&
				resourceData.creationDate &&
				dayjs(this.toDate).isBefore(creationDate, "day"))
		) {
			return null;
		}
		const name = BelfioreConnector.nameByIndex(resourceData.name, index);
		const licenseIndex = parseInt(resourceData.dataSource, 32)
			.toString(2)
			.padStart((resourceData.belfioreCode.length * 2) / 3, "0")
			.substring(index * 2, index * 2 + 2);
		const dataSource = this.licenses[parseInt(licenseIndex, 2)];

		const location: IBelfioreCommonPlace = {
			belfioreCode,
			creationDate: creationDate.toDate(),
			dataSource,
			expirationDate: expirationDate.toDate(),
			name,
		};
		const isCountry = belfioreCode[0] === "Z";
		if (isCountry) {
			return {
				...location,
				iso3166: code,
			} as IBelfioreCountry;
		}
		return {
			...location,
			province: code,
		} as IBelfioreCity;
	}

	private parseProvinces(): string[] {
		const provinceList = new Set<string>();
		for (const sourceData of this.data) {
			const dataSourceScan = this.scanDataSourceIndex(sourceData);
			for (
				let dss = dataSourceScan.next();
				!dss.done;
				dss = dataSourceScan.next()
			) {
				const index = dss.value as number;
				const province = sourceData.provinceOrCountry.substr(index * 2, 2);
				if (!provinceList.has(province)) {
					const belFioreInt = parseInt(
						sourceData.belfioreCode.substr(index * 3, 3),
						32
					);
					const belfioreCode = this.belfioreFromInt(belFioreInt);
					if (this.CITY_CODE_MATCHER.test(belfioreCode)) {
						if (province.trim()) {
							provinceList.add(province);
						}
					}
				}
			}
		}
		return Array.from(provinceList);
	}

	/**
	 * Return belfiore places list
	 */
	public async toArray(): Promise<BelfiorePlace[]> {
		return [...this.scanData()] as BelfiorePlace[];
	}

	public get provinces(): Promise<string[]> {
		return new Promise((resolve) => {
			if (this.province) {
				resolve([this.province]);
			} else if (this.codeMatcher !== this.COUNTRY_CODE_MATCHER) {
				resolve(this.parseProvinces());
			} else {
				resolve([]);
			}
		});
	}

	/**
	 * @description Search places matching given name
	 */
	public async searchByName(name: string): Promise<BelfiorePlace[] | null> {
		return name ? ([...this.scanData(name)] as BelfiorePlace[]) : null;
	}

	/**
	 * @description Find place matching given name, retuns place object if provided name match only 1 result
	 */
	public async findByName(name: string): Promise<BelfiorePlace | null> {
		if (!name) {
			return null;
		}
		const startingNameMatcher = new RegExp(`^${name}$`, "i");
		return this.scanData(startingNameMatcher).next().value;
	}

	/**
	 * @description Retrieve Place by Belfiore Code
	 */
	public async findByCode(belfioreCode: string): Promise<BelfiorePlace | null> {
		if (this.BELFIORE_CODE_MATCHER.test(belfioreCode)) {
			const base32name: string = this.belfioreToInt(belfioreCode)
				.toString(32)
				.padStart(3, "0");

			for (const sourceData of this.data || []) {
				const index: number = this.binaryfindIndex(
					sourceData.belfioreCode,
					base32name
				);
				if (index >= 0) {
					return this.locationByIndex(sourceData, index);
				}
			}
		}
		return null;
	}

	/**
	 * Returns a Proxied version of Belfiore which filters results by given date
	 * @param date Target date to filter places active only for the given date
	 * @returns Belfiore instance filtered by active date
	 * @public
	 */
	public active(date: MultiFormatDate = new Date()): BelfioreConnector {
		return new BelfioreConnector({
			...this.config,
			fromDate: Array.isArray(date)
				? new Date(date[0], date[1] ?? 0, date[2] ?? 1)
				: dayjs(date).toDate(),
			toDate: Array.isArray(date)
				? new Date(date[0], date[1] ?? 0, date[2] ?? 1)
				: dayjs(date).toDate(),
		});
	}

	/**
	 * Returns a Proxied version of Belfiore which filters results by given date ahead
	 * @param date Target date to filter places active only for the given date
	 * @returns Belfiore instance filtered by active date
	 * @public
	 */
	public from(date: MultiFormatDate = new Date()): BelfioreConnector {
		return new BelfioreConnector({
			...this.config,
			fromDate: Array.isArray(date)
				? new Date(date[0], date[1] ?? 0, date[2] ?? 1)
				: dayjs(date).toDate(),
		});
	}

	/**
	 * Returns a Belfiore instance filtered by the given province
	 * @param code Province Code (2 A-Z char)
	 * @returns Belfiore instance filtered by province code
	 * @public
	 */
	public byProvince(code: string): BelfioreConnector | undefined {
		if (typeof code !== "string" || !/^[A-Z]{2}$/u.test(code)) {
			return;
		}
		return new BelfioreConnector({
			...this.config,
			codeMatcher: undefined,
			province: code,
		});
	}

	/**
	 * Returns a Proxied version of Belfiore which filters results by place type
	 */
	public get cities(): BelfioreConnector | undefined {
		if (this.codeMatcher && this.codeMatcher !== this.CITY_CODE_MATCHER) {
			return undefined;
		}
		return new BelfioreConnector({
			...this.config,
			codeMatcher: this.CITY_CODE_MATCHER,
			province: undefined,
		});
	}

	/**
	 * Returns a Proxied version of Belfiore which filters results by place type
	 */
	public get countries(): BelfioreConnector | undefined {
		if (
			(this.codeMatcher && this.codeMatcher !== this.COUNTRY_CODE_MATCHER) ||
			this.province
		) {
			return undefined;
		}
		return new BelfioreConnector({
			...this.config,
			codeMatcher: this.COUNTRY_CODE_MATCHER,
			province: undefined,
		});
	}
}
