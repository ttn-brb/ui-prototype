// set the local for Vega and VegaLite
vega.defaultLocale(
    {
        "decimal": ",",
        "thousands": ".",
        "grouping": [3],
        "currency": ["", "\u00a0€"]
    },
    {
        "dateTime": "%A, der %e. %B %Y, %X",
        "date": "%d.%m.%Y",
        "time": "%H:%M:%S",
        "periods": ["AM", "PM"],
        "days": ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
        "shortDays": ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
        "months": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
        "shortMonths": ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
    }
);

// setup Day.js locale
dayjs.extend(window.dayjs_plugin_utc);
// setup Day.js PlugIns
dayjs.extend(window.dayjs_plugin_timezone);
dayjs.locale('de');

function tileServerUrl(style) {
    return style
        ? window.cfg.styledTileServer + '/styles/' + style + '/{z}/{x}/{y}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
}

function createBasemap(style) {
    return L.tileLayer(tileServerUrl(style), {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
}

function updateMap(ctx, style) {
    var map = ctx.map;
    if (!map) {
        var options = {}
        if (ctx.view === 'sensor') {
            options.attributionControl = false;
            options.zoomControl = false;
        }
        map = ctx.map = L.map('map', options);
        map.setView([52.41563, 12.54754], 13);
        initializeMap(ctx);
    }
    var mapStyle = ctx.mapStyle || 'initial';
    if (!ctx.tileLayer) {
        ctx.tileLayer = createBasemap(style);
        map.addLayer(ctx.tileLayer);
        ctx.mapStyle = style;
    }
    if (mapStyle !== style) {
        ctx.tileLayer.setUrl(tileServerUrl(style));
        ctx.mapStyle = style;
    }
}

function initializeMap(ctx) {
    if (ctx.view === 'home') {
        ctx.map.on('click', function () {
            hideSensorInfo(ctx);
        });
    }
}

function setupMap(ctx) {
    updateMap(ctx, $('#map-style').val());

    $('#map-style').on('change', function (e) {
        updateMap(ctx, $(e.target).val());
    });
}

function formatNumber(n, decimals) {
    var precision = Math.pow(10, decimals)
    return ('' + (Math.round(n * precision) / precision)).replace('.', ',')
}

function formatLocation(l) {
    return formatNumber(l.lat, 5) + '; ' + formatNumber(l.lon, 5);
}

function formatTimestamp(ts, longFormat) {
    var format = longFormat ?
        'ddd DD.MM.YYYY [um] HH:mm:ss [Uhr]' :
        'DD.MM.YYYY HH:mm:ss';
    return dayjs(ts).tz('Europe/Berlin').format(format)
}

function currentMeasurementHtml(sensor, series) {
    if (!series) return;
    var labelHtml = '<span class="measurement-label">' +
        series.type.label +
        '</span>';
    var latestSample = sensor.data[series.id].lastSample;
    var latestTimestamp = latestSample ?
        formatTimestamp(latestSample.ts) :
        '';
    var latestValue = latestSample ?
        formatNumber(latestSample.value, 1) :
        '&mdash;';
    var valueHtml = '<span class="measurement-value" title="' +
        latestTimestamp +
        '">' +
        latestValue +
        '&nbsp;' + series.type.unit +
        '</span>';
    var additionalClass = '';
    return '<div' +
        ' class="measurement interactive series-' + series.id + additionalClass + '"' +
        ' onclick="selectSeries(\'' + series.id + '\')"' +
        '>' +
        labelHtml +
        valueHtml +
        '</div>';
}

function createSeriesMiniPlotVegaLiteSpec(series) {
    return {
        width: 'container',
        height: 90,
        data: {
            values: series.samples,
        },
        layer: [
            {
                mark: {
                    type: 'line',
                    color: '#45649050',
                    interpolate: 'monotone',
                },
                transform: [
                    { filter: 'isNumber(datum["value"])' },
                ],
                encoding: {
                    y: {
                        field: 'value',
                        type: 'quantitative',
                        title: null,
                    },
                    x: {
                        field: 'ts',
                        type: 'temporal',
                        title: null,
                        axis: {
                            format: '%a',
                        }
                    },
                },
            },
            {
                mark: {
                    type: 'line',
                    color: '#456490FF',
                },
                encoding: {
                    y: {
                        field: 'value',
                        type: 'quantitative',
                        title: null,
                    },
                    x: {
                        field: 'ts',
                        type: 'temporal',
                        title: null,
                        axis: {
                            format: '%a',
                        }
                    },
                },
            },
        ],
    };
}

function updateSeriesMiniPlot(ctx) {
    var sensor = ctx.currentSensor;
    var seriesId = ctx.currentSeriesId;
    var series = _.get(sensor, ['data', seriesId]);
    if (series) {
        $('#show-all-sensors-block').show();
        $('.measurement').removeClass('selected-measurement');
        $('.measurement.series-' + seriesId).addClass('selected-measurement');
        var spec = createSeriesMiniPlotVegaLiteSpec(series);
        vegaEmbed('#sensor-details .sensor-plot', spec,
            {
                mode: 'vega-lite',
                actions: false,
            });
    } else {
        $('#show-all-sensors-block').hide();
        $('.measurement').removeClass('selected-measurement');
        $('#sensor-details .sensor-plot').html('<em>Kein Messwert ausgewählt</em>');
    }
}

function createSeriesVegaLiteSpec(series) {
    return {
        width: 'container',
        height: 220,
        data: {
            values: series.samples,
        },
        layer: [
            {
                mark: {
                    type: 'line',
                    color: '#45649050',
                    interpolate: 'monotone',
                },
                transform: [
                    { filter: 'isNumber(datum["value"])' },
                ],
                encoding: {
                    y: {
                        field: 'value',
                        type: 'quantitative',
                        title: null,
                    },
                    x: {
                        field: 'ts',
                        type: 'temporal',
                        title: null,
                        axis: {
                            format: '%a',
                        }
                    },
                },
            },
            {
                mark: {
                    type: 'line',
                    color: '#456490FF',
                },
                encoding: {
                    y: {
                        field: 'value',
                        type: 'quantitative',
                        title: null,
                    },
                    x: {
                        field: 'ts',
                        type: 'temporal',
                        title: null,
                        axis: {
                            format: '%a',
                        }
                    },
                },
            },
        ],
    };
}

function updateSeriesPlot(ctx) {
    var sensor = ctx.sensor;
    var seriesId = ctx.currentSeriesId;
    var series = _.get(sensor, ['data', seriesId]);
    if (series) {
        var spec = createSeriesVegaLiteSpec(series);
        spec.height = 220;
        vegaEmbed('#sensor-plot', spec,
            {
                mode: 'vega-lite',
                actions: false,
            });
    } else {
        $('#sensor-plot').html('<em>Kein Kanal ausgewählt</em>');
    }
}

function selectSeries(seriesId) {
    var ctx = window.ctx;
    ctx.currentSeriesId = seriesId
    if (ctx.view === 'home') {
        updateSeriesMiniPlot(ctx);
        updateMarker(ctx);
    }
    if (ctx.view === 'sensor') {
        $('#series-selection').val(seriesId);
        updateSeriesPlot(ctx);
    }
}

function showSensorInfo(ctx, sensorId) {
    $('#sensor-selection').val(sensorId);
    $.get('/api/v0/sensors/' + sensorId + '/info', sensor => {
        ctx.currentSensor = sensor;
        $('#intro-info').hide();
        var $sd = $('#sensor-details');
        $sd.find('.sensor-name').text(sensor.name);
        $sd.find('.sensor-description').text(sensor.description);
        $sd.find('.sensor-location').text(formatLocation(sensor.location));
        var sensorInfo = ctx.sensors[sensorId];
        $sd.find('.sensor-last-activity').text(formatTimestamp(sensorInfo.lastActivity, true));

        var $ss = $('#sensor-details .sensor-series').empty();

        var series = _.orderBy(_.values(sensor.data), series => series.type.label);
        for (var s of series) {
            $ss.append(currentMeasurementHtml(sensor, s));
        }
        $sd.show();
        updateSeriesMiniPlot(ctx);
    });
}

function hideSensorInfo(ctx) {
    ctx.currentSensor = null;
    $('#sensor-details').hide();
    $('#intro-info').show();
}

function gotoDetailView(ctx) {
    ctx = ctx || window.ctx;
    if (ctx.currentSensor) {
        document.location.href = '/sensors/' + ctx.currentSensor.id;
    }
}

function markerClickHandler(e) {
    var marker = e.target;
    showSensorInfo(window.ctx, marker.sensorId);
}
function markerMouseOverHandler(e) {
    var marker = e.target;
    marker.openPopup();
}
function markerMouseOutHandler(e) {
    var marker = e.target;
    marker.closePopup();
}

function updateMarker(ctx) {
    // remove all currently existing markers
    for (var m of ctx.markers) {
        ctx.map.removeLayer(m);
    }
    ctx.markers = [];
    // create new markers
    var minR = 3;
    var maxR = 40;
    if (ctx.view === 'home') {
        if (ctx.currentSeriesId) {
            // add marker for current series
            for (var sensor of _.values(ctx.sensors)) {
                var s = sensor;
                var series = _.get(s.series, ctx.currentSeriesId);
                if (!series || !series.lastSample) continue;

                var v = {
                    value: series.lastSample.value,
                    min: series.defaultDomain.min,
                    max: series.defaultDomain.max
                };
                var r = (v.value - v.min) / (v.max - v.min) * (maxR - minR) + minR;
                var marker = L.circleMarker([s.location.lat, s.location.lon], {
                    color: '#387ddf',
                    weight: 2,
                    fillColor: '#387ddf',
                    fillOpacity: 0.5,
                    radius: r,
                });
                marker.sensorId = s.id;
                marker.on('click', markerClickHandler);
                marker.on('mouseover', markerMouseOverHandler);
                marker.on('mouseout', markerMouseOutHandler);
                marker.bindPopup('<strong>' + s.name + '</strong><br>' +
                    series.label + ': ' + formatNumber(v.value, 1) + '&nbsp;' + series.unit);
                marker.addTo(ctx.map);
                ctx.markers.push(marker);
            }
        } else {
            // add marker for all sensors, visualizing the freshness
            for (var sensor of _.values(ctx.sensors)) {
                var s = sensor;
                var r = s.freshness * (maxR - minR) + minR;
                var marker = L.circleMarker([s.location.lat, s.location.lon], {
                    color: '#e12d6e',
                    weight: 2,
                    fillColor: '#e12d6e',
                    fillOpacity: 0.5,
                    radius: r,
                });
                marker.sensorId = s.id;
                marker.on('click', markerClickHandler);
                marker.on('mouseover', markerMouseOverHandler);
                marker.on('mouseout', markerMouseOutHandler);
                marker.bindPopup('<strong>' + s.name + '</strong><br>' +
                    'Letzte Aktivität: ' + formatTimestamp(s.lastActivity));
                marker.addTo(ctx.map);
                ctx.markers.push(marker);
            }
        }
    } else if (ctx.view === 'sensor' && ctx.sensor) {
        // add marker for sensor location only
        var s = ctx.sensor;
        var marker = L.marker([s.location.lat, s.location.lon]);
        marker.addTo(ctx.map);
        ctx.markers.push(marker);
    }
}

function onSensorSelectionChanged(e) {
    var sensorId = e.value;
    if (sensorId) {
        showSensorInfo(window.ctx, sensorId);
    } else {
        selectSeries(null);
        hideSensorInfo(window.ctx);
    }
}

function updateSensorDropDown(ctx) {
    $('#sensor-selection option:gt(0)').remove();
    var $e = $('#sensor-selection');
    _.forEach(_.sortBy(_.values(ctx.sensors), s => s.name), s => {
        $e.append($("<option></option>")
            .attr("value", s.id)
            .text(s.name));
    });
}

function loadSensors(ctx) {
    $.get('/api/v0/sensors/info', data => {
        ctx.sensors = _.keyBy(data, 'id');
        updateSensorDropDown(ctx);
        updateMarker(ctx);
    });
}

function updateSensorView(ctx) {
    ctx.map.setView(ctx.sensor.location, 13);
    var $sb = $('#sidebar');
    if (ctx.sensor) {
        var sensor = ctx.sensor;
        $sb.find('.sensor-last-activity').text(formatTimestamp(sensor.lastActivity, true));
        $sb.find('.sensor-location').text(formatLocation(sensor.location));
        var $ss = $sb.find('.sensor-series').empty();
        var series = _.orderBy(_.values(sensor.data), series => series.type.label);
        for (var s of series) {
            $ss.append(currentMeasurementHtml(sensor, s));
        }
    }

    // update sensor detail info
    // update series detail info
    // update series chart
}

function onSeriesSelectionChanged(e) {
    var seriesId = e.value;
    if (seriesId) {
        selectSeries(seriesId);
    } else {
        selectSeries(null);
    }
}

function updateSeriesDropDown(ctx) {
    $('#series-selection option:gt(0)').remove();
    var $e = $('#series-selection');
    _.forEach(_.sortBy(_.values(ctx.sensor.series), s => s.label), s => {
        $e.append($("<option></option>")
            .attr("value", s.id)
            .text(s.label));
    });
}

function loadSensor(ctx) {
    $.get('/api/v0/sensors/' + ctx.sensorId + '/info', data => {
        ctx.sensor = data;
        updateSensorView(ctx);
        updateSeriesDropDown(ctx);
        updateMarker(ctx);
        updateSeriesPlot(ctx);
    });
}

function initializeDateRangePicker(start, end) {

    if (start.value) {
        end.min = start.value;
    }
    if (end.value) {
        start.max = end.value;
    }

    $(start).on('change', e => {
        if (e.target.value) {
            end.min = e.target.value;
        } else {
            end.min = null;
        }
    })
    $(end).on('change', e => {
        if (e.target.value) {
            start.max = e.target.value;
        } else {
            start.max = null;
        }
    })

    end.value = new Date().toISOString().substring(0, 16);
}

function initializeDateSelection() {
    var plotStart = $('#plot-start')[0];
    var plotEnd = $('#plot-end')[0];
    initializeDateRangePicker(plotStart, plotEnd);
}

function initConfiguration() {
    // initialize defaults for dynamic configuration
    var cfg = window.cfg || {
        styledTileServer: 'https://tiles.ttn-brb.de'
    };
    window.cfg = cfg;
}

function initializeMapView() {
    $(function () {
        initConfiguration();

        // initialize empty context
        var ctx = {
            view: 'home',
            sensors: null, // map of sensors
            currentSensor: null,
            currentSeriesId: null,
            markers: [],
        };
        window.ctx = ctx;

        setupMap(ctx);
        loadSensors(ctx);
    });
}

function initializeSensorView(sensorId) {
    $(function () {
        initConfiguration();

        // initialize empty context
        var ctx = {
            view: 'sensor',
            sensorId: sensorId,
            currentSeriesId: null,
            markers: [],
        };
        window.ctx = ctx;

        initializeDateSelection();
        setupMap(ctx);
        loadSensor(ctx);
    });
}
