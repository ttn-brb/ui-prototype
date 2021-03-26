function tileServerUrl(style) {
    return style
        ? 'https://tiles.mastersign.de/styles/' + style + '/{z}/{x}/{y}.png'
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
        map = ctx.map = L.map('map').setView([52.41563, 12.54754], 13);
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
    ctx.map.on('click', hideSensorInfo);
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

function currentMeasurementHtml(sensor, series) {
    if (!series) return
    var isPrimary = series.id == sensor.primarySeriesId;
    var additionalClass = isPrimary ? ' primary-measurement' : '';
    return '<div class="measurement' + additionalClass +
        '"><span class="measurement-label">' +
        series.type.label +
        '</span><span class="measurement-value">' +
        formatNumber(_.get(_.last(series.samples), 'value'), 1) +
        '&nbsp;' + series.type.unit +
        '</span></div>';
}

function showSensorInfo(sensorId) {
    $.get('sensors/' + sensorId, sensor => {
        $('#intro-info').hide();
        var $sd = $('#sensor-details');
        $sd.find('.sensor-name').text(sensor.name);
        $sd.find('.sensor-description').text(sensor.description);
        $sd.find('.sensor-location').text(formatLocation(sensor.location));

        var $ss = $('#sensor-details .sensor-series').empty();
        $ss.prepend('<h5>Aktuelle Messwerte</h5>');

        var ps = _.get(sensor, ['data', sensor.primarySeriesId]);
        $ss.append(currentMeasurementHtml(sensor, ps));

        var series = _.orderBy(_.values(sensor.data), series => series.type.label);
        for (var s of series) {
            if (s.id === sensor.primarySeriesId) continue;
            $ss.append(currentMeasurementHtml(sensor, s));
        }
        $sd.show();
    });
}

function hideSensorInfo() {
    $('#sensor-details').hide();
    $('#intro-info').show();
}

function markerClickHandler(e) {
    var marker = e.target;
    showSensorInfo(marker.sensorId);
}
function markerMouseOverHandler(e) {
    var marker = e.target;
    marker.openPopup();
}
function markerMouseOutHandler(e) {
    var marker = e.target;
    marker.closePopup();
}

function loadSensors(ctx) {
    var minR = 3;
    var maxR = 40;
    $.get('sensors', data => {
        ctx.sensors = data;
        for (var sensor of data) {
            var s = sensor;
            var pv = s.primaryValue;
            if (pv) {
                var r = (pv.value - pv.min) / (pv.max - pv.min) * (maxR - minR) + minR;
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
                    pv.label + ': ' + formatNumber(pv.value, 1) + '&nbsp;' + pv.unit);
                marker.addTo(ctx.map);
            }
        }
    });
}

$(function () {
    var ctx = {};
    window.ctx = ctx;

    setupMap(ctx);
    loadSensors(ctx);
});
