import CITIES_COUNTRIES from "../asset/cities-countries";
import BelfioreConnector from "./classes/belfiore-connector.class";
import type BelfioreConnectorConfig from "./types/belfiore-connector-config.type";

const belfioreConnector = new BelfioreConnector(
	CITIES_COUNTRIES as BelfioreConnectorConfig
);
export default belfioreConnector;
export { BelfioreConnector, belfioreConnector };
export type * from "@marketto/belfiore-connector";
