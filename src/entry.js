import CensusApi from './censusApi.js';
import './site.scss';
import chroma from 'chroma-js';


mapboxgl.accessToken = 'pk.eyJ1IjoianAyMDExIiwiYSI6ImNpbmgxemIyOTBwOXN1MmtqaXFhcTdqdTQifQ.FXUfjFSMN0qCn2f9ZN78wA';
var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/jp2011/cinh06ej0002daxnmu5s733sz', //hosted style id
    center: [-122.712891, 37.09024], // starting position
    zoom: 6 // starting zoom
});

// The values in each array are:
// 1. Color of choropleth
// 2. State population value
// 3. County population value
var percentageIncrements = 5;
var layerLength = (100 / percentageIncrements) + percentageIncrements;
var layers = [];
var colors = chroma.scale(['white', 'yellow', 'red', 'purple', 'black'])
                   .domain([0, 0.10, 0.40, 0.6, 1.0])
                   .colors(layerLength);
for (let i = 0; i < layerLength; i++) {
    layers.push([colors[i], 100 / layerLength * i]);
}

var facet = 'percent_20s';
function customPropertiesCallback(data) {
    let additionalData = {};
    data[facet] = ((data.male_21 + data.male_22_to_24 + data.male_25_to_29) / data.male) * 100;
    return Object.assign({}, data, additionalData);
}

var position = 1;
var allFilters = [];
function filterBy() {
    layers.forEach(function(layer, i) {
        var filters = [
            'all',
            ['<=', facet, layer[position]],
        ];

        if (i !== 0) {
            filters.push(['>', facet, layers[i - 1][position]]);
        }
        allFilters.push(filters);
        map.setFilter('layer-' + i, filters);

        // Set the legend value for each layer
        document.getElementById('legend-value-' + i).textContent = layer[position].toLocaleString() + '%';
    });
}

function renderChoropleth(json) {
    console.log('renderChloropleth json:', json);
    var legend = document.getElementById('legend');
    
    map.addSource('chloropleth', {
        'type': 'geojson',
        'data': json
    });

    layers.forEach(function(layer, i) {
        map.addLayer({
            "id": "layer-" + i,
            "type": "fill",
            "source": "chloropleth",
            "paint": {
                "fill-color": layer[0],
                "fill-opacity": 0.5
            }
        }, 'place_label_city_small_s');

        // Build out legends
        var item = document.createElement('div');

        var key = document.createElement('span');
        key.className = 'legend-key';
        key.style.backgroundColor = layer[0];

        var value = document.createElement('span');
        value.id = 'legend-value-' + i;
        value.className = 'legend-value';

        item.appendChild(key);
        item.appendChild(value);
        legend.appendChild(item);
    });

    filterBy();
}

function mergeGeoJsonWithData(geoJson, dataJson) {
    var geoMap = {
        // State + County + Tract + Block Group => Original Feature + New Data (eventually)
    };
    var dataMap = {
        // State + County + Tract + Block Group => Original Data
    };
    for (let feature of geoJson.features) {
        let [state, county, tract, blockGroup] = [feature.properties.STATEFP,
                                                  feature.properties.COUNTYFP,
                                                  feature.properties.TRACTCE,
                                                  feature.properties.BLKGRPCE];
        if (!state || !county || !tract || !blockGroup) {
            console.error('Geo state, county, tract, or blockGroup is null.', state, county, tract, blockGroup);
        }
        let hashKey = toHashKey(state, county, tract, blockGroup);
        geoMap[hashKey] = feature;
    }
    console.log('Finished building GeoJSON map.', geoMap);
    for (let datum of dataJson) {
        let [state, county, tract, blockGroup] = [datum.state, datum.county, datum.tract, datum['block group']];
        if (!state || !county || !tract || !blockGroup) {
            console.error('Data state, county, tract, or blockGroup is null.', state, county, tract, blockGroup);
        }
        let hashKey = toHashKey(state, county, tract, blockGroup);
        dataMap[hashKey] = datum;
    }
    console.log('Finished building data map.', dataMap);
    if (geoMap.length !== dataMap.length) {
        console.warn(`GeoJSON map has length ${geoMap.length}, but data map has length ${dataMap.length}.`);
    }
    let dataKeys = Object.keys(dataMap);
    let merged_count = 0;
    let missing_count = 0;
    for (let dataKey of dataKeys) {
        if (geoMap[dataKey]) {
            merged_count++;
            let finalData = customPropertiesCallback(dataMap[dataKey]);
            Object.assign(geoMap[dataKey]['properties'], finalData);
        } else {
            missing_count++;
            console.log('GeoMap does not have key:', dataKey);
        }
    }
    console.log(`Finished merging GeoJSON and data. Merged ${merged_count} datums and missing ${missing_count} datums.`);
}

function toHashKey(state, county, tract, blockGroup) {
    return `${state}_${county}_${tract}_${blockGroup}`
}

function deriveHashKeyComponents(hashKey) {
    return hashKey.split('_')
}


function initMap() {
    Promise.all([
            fetch('assets/acs_10_14_california_block_groups.json'),
            fetch('assets/acs_10_14_data_block_groups.json')])
        .then(([geoResponse, dataResponse]) => Promise.all([geoResponse.json(), dataResponse.json()]))
        .then(([geoJson, dataJson]) => {
            if (!geoJson || !dataJson) {
                console.error('geoJson or dataJson is null.', geoJson, dataJson);
            }
            mergeGeoJsonWithData(geoJson, dataJson);
            renderChoropleth(geoJson);
            window.layers = layers;
            window.allFilters = allFilters;

            map.on('mousemove', function (e) {
                var features = map.queryRenderedFeatures(e.point);
                if (features && features[0] && features[0]['properties']) {
                    document.getElementById('features').innerHTML = JSON.stringify(features[0]['properties'], null, 2);
                }
            });
        });
}

let repaintInterval = setInterval(() => {
    window.dispatchEvent(new Event('resize'));
    if (performance.now() > 20000) {
        clearInterval(repaintInterval);
    }
}, 150);

map.on('load', () => {
 initMap();
});
window.a = map;