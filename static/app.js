function basemap(style) {
    var tileServerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    if (style) {
        tileServerUrl = 'https://tiles.mastersign.de/styles/' + style + '/{z}/{x}/{y}.png';
    }
    return L.tileLayer(tileServerUrl, {
        attribution: attribution
    });
}

function updateMap(ctx, style) {
    var map = ctx.map || (ctx.map = L.map('map').setView([52.41563, 12.54754], 13));
    var mapStyle = ctx.mapStyle || 'initial';

    if (mapStyle !== style) {
        ctx.mapStyle = style;
        ctx.tileLayer = basemap(style);
        map.eachLayer(function (l) { map.removeLayer(l); });
        map.addLayer(ctx.tileLayer);
    }
}

function setupMap(ctx) {
    updateMap(ctx, $('#map-style').val());

    $('#map-style').on('change', function (e) {
        updateMap(ctx, $(e.target).val());
    });
}

$(function () {
    var ctx = {};
    window.ctx = ctx;

    setupMap(ctx);
});
