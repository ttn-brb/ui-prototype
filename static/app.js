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
    var map = ctx.map || (ctx.map = L.map('map').setView([52.41563, 12.54754], 13));
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

function showSensorInfo(sensorId) {
    $.get('sensors/' + sensorId, s => {
        $('#intro-info').hide();
        var $sd = $('#sensor-details');
        $sd.find('.sensor-name').text(s.name);
        $sd.find('.sensor-description').text(s.description);
        $sd.find('.sensor-location').text(formatLocation(s.location));
        var ps = s.data[s.primarySeriesId];
        if (ps) {
            $sd.find('.sensor-primary-value-label')
                .text(ps.type.label)
                .attr('title', ps.type.description);
            var pv = ps.samples[ps.samples.length - 1];
            $sd.find('.sensor-primary-value').text(formatNumber(pv.value, 1) + ' ' + ps.type.unit);
        }
        $sd.show();
    });
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
