// Constants
const admissionDates = {
    "Alaska": 1960,
    "Hawaii": 1960,
    "District of Columbia": 1964
}

const continuousColorScheme = [
    'case',
    ['==', ['get', 'denominator'], 0],
    '#dddddd',
    [
        'interpolate',
        ['linear'],
        ['/', ['get', 'dissimilarity'], ['get', 'denominator']],
        0,
        '#147833', 0.03,
        '#5B834B', 0.08,
        '#B09365', 0.15,
        '#876173', 0.25,
        '#5C3E58'
    ]
]

const binaryColorScheme = [
    'case',
    ['==', ['get', 'denominator'], 0],
    '#dddddd',
    [
        'interpolate',
        ['linear'],
        ['/', ['get', 'dissimilarity'], ['get', 'denominator']],
        0,
        '#147833', 0.1,
        '#5B834B', 0.3,
        '#B09365', 0.5,
        '#876173', 0.7,
        '#5C3E58'
    ]
];

const defaultZoom = 3.3;

// Global variables
var binary = true;
var selectedStateName = null;
var hoveredStateName = null;
var startYear = 1916;
var endYear = 2020;

// Helper functions
/* function TVD(stateData1, stateData2, year) {
    sum = 0;
    parties.forEach(party => {
        sum += Math.abs(stateData1[`${party}${year}`] * 0.01 - stateData2[`${party}${year}`] * 0.01)
    });

    return sum / 2;
} */

function calculateZoom() {
    let width = 0.8 * window.innerWidth;

    let zoomFactor = Math.max(Math.min(width, 800), 200) / 800;

    return defaultZoom + Math.log2(zoomFactor);
}

function getElectionYears(startYear, endYear) {
    let years = []

    let year = Math.ceil(startYear / 4) * 4;
    while (year <= endYear) {
        years.push(year);
        year += 4;
    }

    return years
}

function dissimilarity(binary, startYear, endYear, state1, state2=null) { 
    const stateData1 = (state1 == null) ? nationalData : data[state1];
    const stateData2 = (state2 == null) ? nationalData : data[state2]; 

    const summand = (d1, d2, year) => {
        return binary ? 
            (d1[`Winner${year}`] != d2[`Winner${year}`] ? 1 : 0) :
            Math.abs(d1[`TwoPartyDem${year}`] * 0.01 - d2[`TwoPartyDem${year}`] * 0.01);
    };

    const years = getElectionYears(startYear, endYear)

    let sum = 0;
    let denominator = 0;
    years.forEach(year => {
        if (wasAdmitted(state1, year) && wasAdmitted(state2, year)) {
            sum += summand(stateData1, stateData2, year);
            denominator += 1;
        }
    })

    return [sum, denominator];
}

function wasAdmitted(state, year) {
    if (state in admissionDates && year < admissionDates[state]) {
        return false;
    }
    return true;
}

function toPercent(number) {
    if (number < 0.1) {
        return Math.round(number * 1000) / 10;
    }
    return Math.round(number * 100)
}

// Page update functions
function computeDissimilarityScores() {
    Object.keys(stateProperties).forEach(stateName => {
        [stateProperties[stateName]["dissimilarity"], stateProperties[stateName]["denominator"]] = dissimilarity(binary, startYear, endYear, stateName, selectedStateName);
    });

    // Compute and store national dissimilarity score for selected state.
    if (selectedStateName != null) {
        [stateProperties[selectedStateName]["nationalDissimilarity"], _] = dissimilarity(binary, startYear, endYear, selectedStateName);
    }
}

function renderInfobox() {
    let text;
    const numElections = Math.floor(endYear / 4) - Math.ceil(startYear / 4) + 1;

    if (selectedStateName in admissionDates && admissionDates[selectedStateName] > endYear) {
        text = `<br>${selectedStateName} did not vote in presidential elections prior to ${admissionDates[selectedStateName]}.`;
    }
    else if (hoveredStateName in admissionDates && admissionDates[hoveredStateName] > endYear) {
        text = `<br>${hoveredStateName} did not vote in presidential elections prior to ${admissionDates[hoveredStateName]}.`;
    }
    else if (numElections > 1) {
        if (selectedStateName == null && hoveredStateName == null) {
            text = `<br>Between ${startYear} and ${endYear}, the United States held <b>${numElections}</b> presidential elections.`;
        }
        else if (selectedStateName == null) {
            text = binary ? 
                `<b>${hoveredStateName}</b> voted for the winning candidate in ` +
                // `<br> <b>${100 - toPercent(stateProperties[hoveredStateName]["dissimilarity"] * 100 / stateProperties[hoveredStateName]["denominator"])}%</b> <br> of ` +
                `<br> <b>${stateProperties[hoveredStateName]["denominator"] - stateProperties[hoveredStateName]["dissimilarity"]}</b> of <b>${stateProperties[hoveredStateName]["denominator"]}</b> <br>` +
                `presidential elections between ${startYear} and ${endYear}.` :
                `On average, <b>${hoveredStateName}</b> and the nation as a whole voted ` + 
                `<br> <b>${toPercent(stateProperties[hoveredStateName]["dissimilarity"] / stateProperties[hoveredStateName]["denominator"])} percentage points </b> <br>` +
                `apart in presidential elections between ${startYear} and ${endYear}.`
        }
        else if (selectedStateName == hoveredStateName || hoveredStateName == null) {
            text = binary ? 
                `<b>${selectedStateName}</b> voted for the winning candidate in ` +
                // `<br> <b>${100 - toPercent(stateProperties[selectedStateName]["nationalDissimilarity"] * 100 / stateProperties[selectedStateName]["denominator"])}%</b> <br> of ` +
                `<br> <b>${stateProperties[selectedStateName]["denominator"] - stateProperties[selectedStateName]["nationalDissimilarity"]}</b> of <b>${stateProperties[selectedStateName]["denominator"]}</b> <br>` +
                `presidential elections between ${startYear} and ${endYear}.` :
                `On average, <b>${selectedStateName}</b> and the nation as a whole voted ` + 
                `<br> <b>${toPercent(stateProperties[selectedStateName]["nationalDissimilarity"] / stateProperties[selectedStateName]["denominator"])} percentage points </b> <br>` +
                `apart in presidential elections between ${startYear} and ${endYear}.`
        }
        else {
            text = binary ? 
                `<b>${hoveredStateName}</b> voted for the same candidate as <b>${selectedStateName}</b> in ` +
                // `<br> <b>${100 - toPercent(stateProperties[hoveredStateName]["dissimilarity"] * 100 / stateProperties[hoveredStateName]["denominator"])}%</b> <br> of ` +
                `<br> <b>${stateProperties[hoveredStateName]["denominator"] - stateProperties[hoveredStateName]["dissimilarity"]}</b> of <b>${stateProperties[hoveredStateName]["denominator"]}</b> <br>` +
                `presidential elections between ${startYear} and ${endYear}.` :
                `On average, <b>${hoveredStateName}</b> and <b>${selectedStateName}</b> voted ` +
                `<br> <b>${toPercent(stateProperties[hoveredStateName]["dissimilarity"] / stateProperties[hoveredStateName]["denominator"])} percentage points </b> <br>` + 
                `apart in presidential elections between ${startYear} and ${endYear}.`;
        }
    }
    else { // if only one presidential election was held
        const electionYear = Math.floor(endYear / 4) * 4;
        if (selectedStateName == null && hoveredStateName == null) {
            text = `<br>In ${electionYear}, the United States held a presidential election.`;
        }
        else if (selectedStateName == null) {
            text = binary ? 
                `<br> <b>${hoveredStateName}</b> ${stateProperties[hoveredStateName]["dissimilarity"] > 0 ? "did not vote" : "voted"} for the winning candidate in the ${electionYear} presidential election.` :
                `<b>${hoveredStateName}</b> and the nation as a whole voted ` + 
                `<br> <b>${toPercent(stateProperties[hoveredStateName]["dissimilarity"] / stateProperties[hoveredStateName]["denominator"])} percentage points </b> <br>` +
                `apart in the ${electionYear} presidential election.`
        }
        else if (selectedStateName == hoveredStateName || hoveredStateName == null) {
            text = binary ? 
                `<br> <b>${selectedStateName}</b> ${stateProperties[selectedStateName]["nationalDissimilarity"] > 0 ? "did not vote" : "voted"} for the winning candidate in the ${electionYear} presidential election.` :
                `<b>${selectedStateName}</b> and the nation as a whole voted ` + 
                `<br> <b>${toPercent(stateProperties[selectedStateName]["nationalDissimilarity"] / stateProperties[selectedStateName]["denominator"])} percentage points </b> <br>` +
                `apart in the ${electionYear} presidential election.`
        }
        else {
            text = binary ? 
                `<b>${hoveredStateName}</b> ${stateProperties[hoveredStateName]["dissimilarity"] > 0 ? "did not vote" : "voted"} for the same candidate as <b>${selectedStateName}</b> in the ${electionYear} presidential election.` :
                `<b>${hoveredStateName}</b> and <b>${selectedStateName}</b> voted ` +
                `<br> <b>${toPercent(stateProperties[hoveredStateName]["dissimilarity"] / stateProperties[hoveredStateName]["denominator"])} percentage points </b> <br>` + 
                `apart in the ${electionYear} presidential election.`;
        }
    }

    document.getElementById("infobox").innerHTML = text;
}

function updateMap() {
    computeDissimilarityScores();

    map.getSource('states').setData(states);

    renderInfobox();
}

function toggleSettings() {
    let description = document.getElementById("settings");
    let arrow = document.getElementById("settings-arrow");

    if (description.style.display == "none") {
        description.style.display = "block";
        arrow.innerHTML = "▾";
    }
    else {
        description.style.display = "none";
        arrow.innerHTML = "▸";
    }
}

function toggleHelp() {
    let description = document.getElementById("help");
    let arrow = document.getElementById("help-arrow");

    if (description.style.display == "none") {
        description.style.display = "block";
        arrow.innerHTML = "▾";
    }
    else {
        description.style.display = "none";
        arrow.innerHTML = "▸";
    }
}

// Event handlers
function handleMouseMove(e) {
    map.getCanvas().style.cursor = 'pointer';

    if (e.features.length > 0) {
        if (hoveredStateName !== null) {
            map.setFeatureState(
                {source: 'states', id: hoveredStateName},
                {hovered: false}
            );
        }
        hoveredStateName = e.features[0].id;
        map.setFeatureState(
            {source: 'states', id: hoveredStateName},
            {hovered: true}
        );
    }

    renderInfobox(e.features[0].properties["dissimilarity"]);
};

function handleMouseLeave() {
    map.getCanvas().style.cursor = '';
    
    if (hoveredStateName !== null) {
        map.setFeatureState(
            {source: 'states', id: hoveredStateName},
            {hovered: false}
        );
    }

    hoveredStateName = null;

    renderInfobox();
};

function handleMouseClick(e) {
    e.preventDefault();

    if (selectedStateName !== null) {
        map.setFeatureState(
            {source: 'states', id: selectedStateName},
            {selected: false}
        );
    }

    if (selectedStateName == e.features[0].id) {
        selectedStateName = null;
    }
    else {
        selectedStateName = e.features[0].id;
        map.setFeatureState(
            {source: 'states', id: selectedStateName},
            {selected: true}
        );
    }

    updateMap();
}

// Render map
mapboxgl.accessToken = "pk.eyJ1IjoiZGF2aWRsaXU5OSIsImEiOiJjbGV3NzRrdmIwY3FoM3hxcjlpcmdlMmNyIn0.35yxjwDo27yF3X5owIo-AA";

var map = new mapboxgl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: []
    },
    center: [-97.5, 37.85],
    zoom: calculateZoom(),
    projection: 'albers'
});
     
map.scrollZoom.disable();
map.boxZoom.disable();
map.doubleClickZoom.disable();
map.dragPan.disable();
map.keyboard.disable();
map.touchZoomRotate.disable();

map.on('load', function () {
    computeDissimilarityScores(); 

    // Add a source for the county polygons.
    map.addSource('states', {
        'type': 'geojson',
        'data': states,
        promoteId: 'NAME'
    });

    map.setFeatureState(
        {source: 'states', id: selectedStateName},
        {selected: true}
    );

    // Add a layer showing the state polygons.
    map.addLayer({
        'id': 'states-layer',
        'type': 'fill',
        'source': 'states',
        'paint': {
            'fill-color': binary ? binaryColorScheme : continuousColorScheme,
            'fill-opacity': 1
        }
    });

    map.addLayer({
        'id': 'state-borders-layer',
        'type': 'line',
        'source': 'states',
        'paint': {
            'line-color': 'rgba(0, 0, 0, 1)',
            'line-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                2.5,
                [
                    'case',
                    ['boolean', ['feature-state', 'hovered'], false],
                    1.5,
                    0.5
                ]
            ]
        }
    })
    
    map.on('click', 'states-layer', handleMouseClick);

    map.on('click', function(e) {
        if (e.defaultPrevented === false) {
            if (selectedStateName !== null) {
                map.setFeatureState(
                    {source: 'states', id: selectedStateName},
                    {selected: false}
                );
            }

            selectedStateName = null;

            updateMap();
        }
    });
    
    map.on('mousemove', 'states-layer', handleMouseMove);

    map.on('mouseleave', 'states-layer', handleMouseLeave);
});

// Render infobox
renderInfobox()

// Settings handlers
function updateOutcomeOfInterest() {
    let value = document.getElementById("outcome").value;
    binary = (value == "winner");

    updateMap();

    map.setPaintProperty(
        'states-layer',
        'fill-color',
        binary ? binaryColorScheme : continuousColorScheme
    )
}

function updateRange() {
    let selectedStartYear = document.getElementById("startYear").value;
    let selectedEndYear = document.getElementById("endYear").value;

    if (selectedEndYear < selectedStartYear) {
        document.getElementById("invalidRangeWarning").style.display = "block";
    }
    else {
        document.getElementById("invalidRangeWarning").style.display = "none";

        startYear = selectedStartYear;
        endYear = selectedEndYear;

        updateMap();
    }
}

// Window event handler
function onResize() {
    map.setZoom(calculateZoom());
}

window.addEventListener("resize", (e) => onResize())