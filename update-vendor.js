const fs = require('fs')
const path = require('path')

function mkdir(trg) {
    const trgPath = path.join(__dirname, 'static', 'vendor', trg)
    fs.mkdirSync(trgPath, { recursive: true })
}
function copy(src, trg) {
    const srcPath = path.join(__dirname, 'node_modules', src)
    const trgPath = path.join(__dirname, 'static', 'vendor', trg)
    fs.copyFileSync(srcPath, trgPath)
}

copy('lodash/lodash.min.js', 'lodash.min.js')
copy('jquery/dist/jquery.min.js', 'jquery.min.js')
copy('dayjs/dayjs.min.js', 'dayjs.min.js')
copy('dayjs/locale/de.js', 'dayjs.locale.de.js')
copy('dayjs/plugin/utc.js', 'dayjs.plugin.utc.js')
copy('dayjs/plugin/timezone.js', 'dayjs.plugin.timezone.js')
copy('bootstrap/dist/js/bootstrap.min.js', 'bootstrap.min.js')
copy('bootstrap/dist/js/bootstrap.min.js.map', 'bootstrap.min.js.map')
copy('bootstrap/dist/css/bootstrap.min.css', 'bootstrap.min.css')
copy('bootstrap/dist/css/bootstrap.min.css.map', 'bootstrap.min.css.map')
copy('leaflet/dist/leaflet.js', 'leaflet.js')
copy('leaflet/dist/leaflet.js.map', 'leaflet.js.map')
copy('leaflet/dist/leaflet.css', 'leaflet.css')
mkdir('images')
copy('leaflet/dist/images/marker-icon.png', 'images/marker-icon.png')
copy('leaflet/dist/images/marker-icon-2x.png', 'images/marker-icon-2x.png')
copy('leaflet/dist/images/marker-shadow.png', 'images/marker-shadow.png')
copy('vega/build/vega.min.js', 'vega.min.js')
copy('vega/build/vega.min.js.map', 'vega.min.js.map')
copy('vega-lite/build/vega-lite.min.js', 'vega-lite.min.js')
copy('vega-lite/build/vega-lite.min.js.map', 'vega-lite.min.js.map')
copy('vega-embed/build/vega-embed.min.js', 'vega-embed.min.js')
copy('vega-embed/build/vega-embed.min.js.map', 'vega-embed.min.js.map')
