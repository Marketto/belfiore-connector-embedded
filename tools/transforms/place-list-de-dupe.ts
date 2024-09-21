import _ from "lodash";
import dayjs from "dayjs";
import { Transform, TransformCallback } from "stream";
import { belfioreToInt, cleanObject, DEFAULT_CREATION_DATE } from "../utils";

const MERGE_MAP: {
	[key: string]: (
		valS: string | null,
		valD: string | null
	) => string | Date | null;
} = {
	active: (valS: string | null, valD: string | null): string | null =>
		valS || valD,
	creationDate: (valS: string | null, valD: string | null): Date | null =>
		valS && valD
			? dayjs(Math.min(dayjs(valD).valueOf(), dayjs(valS).valueOf())).toDate()
			: valS || valD
			? dayjs(valS || valD).toDate()
			: null,
	expirationDate: (valS: string | null, valD: string | null): Date | null =>
		valD && valS
			? dayjs(Math.max(dayjs(valD).valueOf(), dayjs(valS).valueOf())).toDate()
			: valS || valD
			? dayjs(valS || valD).toDate()
			: null,
};

export const merge = <T extends { [key: string]: any }>(...entries: T[]) => {
	if (entries.length < 2) {
		return entries[0];
	}
	const sortedEntries = entries.sort((a, b) =>
		dayjs(b.creationDate).diff(dayjs(a.creationDate), "day")
	);

	const merged = sortedEntries.reduce((aggr, entry) =>
		_.mergeWith(
			aggr,
			entry,
			(valD: string | null, valS: string | null, key: string) => {
				const customizer = MERGE_MAP[key];
				if (customizer) {
					return customizer(valS, valD);
				}
				return valD;
			}
		)
	);

	return cleanObject(merged);
};

export const deDupeList = <T extends { [key: string]: unknown }>(
	dataList: T[],
	groupKeys: (keyof T)[]
) =>
	groupKeys.reduce((aggr, key) => {
		const { emptyKey, ...group } = _.groupBy(
			aggr,
			(record) => record?.[key] || "emptyKey"
		);
		return Object.values(group)
			.map((entries) => merge(...entries))
			.concat(Object.values(emptyKey || {}));
	}, dataList);

export class PlaceListDeDupe extends Transform {
	private groupKey: string;

	constructor(opts: { groupKey: string }) {
		super({
			objectMode: true,
		});
		this.groupKey = opts.groupKey;
	}
	protected storage: any[] = [];
	public _transform(chunk: any, encoding: string, callback: TransformCallback) {
		let element;
		if (this.readableObjectMode) {
			element = chunk;
		} else {
			try {
				element = JSON.parse(chunk);
			} catch (err) {
				return callback(err as Error);
			}
		}
		if (element?.[this.groupKey] || element?.belfioreCode) {
			this.storage.push(element);
		}
		callback();
	}

	public _flush(callback: TransformCallback) {
		let ddl;
		try {
			ddl = deDupeList(this.storage, [this.groupKey, "belfioreCode"])
				.filter(({ belfioreCode }) => !!belfioreCode)
				.sort(
					(a, b) =>
						belfioreToInt(a.belfioreCode) - belfioreToInt(b.belfioreCode)
				)
				.map((record) => ({
					...record,
					creationDate:
						record.creationDate || dayjs(DEFAULT_CREATION_DATE).toDate(),
					expirationDate: record.expirationDate || dayjs("9999-12-31").toDate(),
				}));
		} catch (err) {
			this.storage.length = 0;
			return callback(err as Error);
		}
		this.push(ddl);
		this.storage.length = 0;
		callback();
	}
}
