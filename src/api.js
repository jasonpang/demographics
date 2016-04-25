export default class CensusApi {
    static get PRODUCTS() {
        return {
            ACS_5_10_14: {
                name: 'American Community Survey (5 Year, 2010 - 2014) ',
                url_component: '2014/acs5'
            }
        }
    }

    static get API_KEY() {
        return 'c6393ada23468c0ef8e837a231bd9c38e946c082';
    }

    static get BASE_URL() {
        return 'http://api.census.gov/data/';
    }

    static get VARIABLES() {
        return {
            people_sampled: 'B00001_001E',
            houses_sampled: 'B00002_001E',
            population_by_age: 'B01001_001E',
            population_by_male_age: 'B01001_002E',
            population_by_male_age_under_5: 'B01001_003E',
            population_by_male_age_5_to_9: 'B01001_004E',
            population_by_male_age_10_to_14: 'B01001_005E',
            population_by_male_age_15_to_17: 'B01001_006E',
            population_by_male_age_18_to_19: 'B01001_007E',
            population_by_male_age_20: 'B01001_008E',
            population_by_male_age_21: 'B01001_009E',
            population_by_male_age_22_to_24: 'B01001_010E',
            population_by_male_age_25_to_29: 'B01001_011E',
            population_by_male_age_30_to_34: 'B01001_012E',
            population_by_male_age_35_to_39: 'B01001_013E',
            population_by_male_age_40_to_44: 'B01001_014E',
            population_by_male_age_45_to_49: 'B01001_015E',
            population_by_male_age_50_to_54: 'B01001_016E',
            population_by_male_age_55_to_59: 'B01001_017E',
            population_by_male_age_60_to_61: 'B01001_018E',
            population_by_male_age_62_to_64: 'B01001_019E',
            population_by_male_age_65_to_66: 'B01001_020E',
            population_by_male_age_67_to_69: 'B01001_021E',
            population_by_male_age_70_to_74: 'B01001_022E',
            population_by_male_age_75_to_79: 'B01001_023E',
            population_by_male_age_80_to_84: 'B01001_024E',
            population_by_male_age_above_85: 'B01001_025E',
        }
    }

    /**
     * Returns a Promise that resolves the parsed JSON response.
     */
    static apiCall(url, data) {
        var method = 'GET';
        var headers = new Headers();
        var options = {
            method: method,
            headers: headers,
            cache: 'no-cache',
            mode: 'cors',
            body: JSON.stringify(data)};
        return fetch(url, options)
            .then(response => response.json())
            .then(json => CensusApi.parseResponse(json))
            .catch(e => {
                console.error(`Failed to query: ${method} ${url}:`, e);
                throw e;
            });
    }

    /**
     * Parses a JSON response returned from the API like:
     *   [
     *       ["NAME","state"],
     *       ["Alabama","01"],
     *       ["Alaska","02"],
     *       ["Arizona","04"]
     *   ]
     * and turns it into:
     *   [
     *       { name: 'Alabama', state: '01' },
     *       { name: 'Alaska', state: '02' },
     *       { name: 'Arizona', state: '04' }
     *   ]
     */
    static parseResponse(json) {
        CensusApi.buildVariableRevserseLookupTable();
        if (!json.hasOwnProperty('length')) {
            throw Error(`JSON response was not an array: ${json}`);
        }
        if (json.length < 2) {
            throw Error(`Expected metadata header field for JSON response: ${json}`);
        }
        let response = [];
        let headers = json[0];
        // Get all the items except the first header row
        json.shift();
        let data = json;
        for (let datum of data) {
            let entry = {};
            for (let i = 0; i < headers.length; i++) {
                let header = CensusApi.performVariableReverseLookup(headers[i]);
                // e.g. header is 'name' or 'state'
                // In the case of variables, the header would be named 'B00001_001E',
                // so we need to do a reverse lookup to name 'B00001_001E' back to 'population'
                entry[header] = datum[i];
            }
            response.push(entry);
        }
        return response;
    }

    /**
     * Builds a reverse VARIABLES lookup table to change response variables like 'B00001_001E' back to 'population'.
     */
    static buildVariableRevserseLookupTable() {
        if (CensusApi.VARIABLES_REVERSE_LOOKUP) {
            return;
        }
        CensusApi.VARIABLES_REVERSE_LOOKUP = {};
        for (let key of Object.keys(CensusApi.VARIABLES)) {
            let original_key = key;
            let original_value = CensusApi.VARIABLES[key];
            CensusApi.VARIABLES_REVERSE_LOOKUP[original_value] = original_key;
        }
    }

    /**
     * Converts response variables like 'B00001_001E' to 'population' but leaves variables like 'state' untouched.
     * @param responseVariable
     */
    static performVariableReverseLookup(responseVariable) {
        if (CensusApi.VARIABLES_REVERSE_LOOKUP.hasOwnProperty(responseVariable)) {
            return CensusApi.VARIABLES_REVERSE_LOOKUP[responseVariable].toLowerCase();
        } else {
            return responseVariable.toLowerCase();
        }
    }

    static buildUrl(product, search) {
        return `${CensusApi.BASE_URL}${product.url_component}?key=${CensusApi.API_KEY}&${search}`;
    }

    /**
     * Returns the states in the U.S.
     */
    static getStates() {
        return CensusApi.apiCall(CensusApi.buildUrl(CensusApi.PRODUCTS.ACS_5_10_14, 'get=NAME&for=state:*'));
    }

    /**
     * Returns the counties of a state or of the U.S.
     * @param state Optional
     */
    static getCounties(state) {
        if (!state) {
            state = '*';
        }
        return CensusApi.apiCall(CensusApi.buildUrl(CensusApi.PRODUCTS.ACS_5_10_14, `get=NAME&for=county:*&in=state:${state}`));
    }

    static getAliasedVariables(variables) {
        let aliased_variables = [];
        for (let variable of variables) {
            if (CensusApi.VARIABLES.hasOwnProperty(variable)) {
                aliased_variables.push(CensusApi.VARIABLES[variable]);
            } else {
                aliased_variables.push(variable);
            }
        }
        return aliased_variables;
    }

    /**
     * Queries for variables at the block group level.
     * @param state Required
     * @param county Required
     * @param variables An array of FIPS code variables to apiCall by (e.g. B01001_001E).
     */
    static queryBlockGroups(state, county, ...variables) {
        if (!state) {
            throw Error('state is required and cannot be wildcarded.');
        }
        if (!county) {
            throw Error('county is required and cannot be wildcarded.');
        }
        if (!variables || variables.length === 0) {
            throw Error('You must pass at least one variable to apiCall by.');
        }
        if (variables[0] instanceof Array) {
            var variables = CensusApi.getAliasedVariables(...variables);
        } else {
            var variables = CensusApi.getAliasedVariables(variables);
        }
        return CensusApi.apiCall(CensusApi.buildUrl(CensusApi.PRODUCTS.ACS_5_10_14, `get=${variables.join(',')}&for=block+group:*&in=state:${state}+county:${county}`));
    }
}