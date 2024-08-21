import {
	IBelfioreConnectorBaseConfig,
	IBelfioreConnectorMatcherConfig,
	IBelfioreConnectorProvinceConfig,
} from "@marketto/belfiore-connector";
import IBelfioreDb from "../interfaces/belfiore-db.interface";

type BelfioreConnectorConfig = (
	| IBelfioreConnectorBaseConfig
	| IBelfioreConnectorProvinceConfig
	| IBelfioreConnectorMatcherConfig
) &
	IBelfioreDb &
	({} | { fromDate: never; toDate: never });

export default BelfioreConnectorConfig;
