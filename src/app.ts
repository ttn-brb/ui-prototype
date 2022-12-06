import path from 'path'
import _ from 'lodash'
import express from 'express'
import { log } from './logging'
import { getState } from './state'
import { buildSensorInfo } from './data'

const styledTileServer = _.get(process.env, 'STYLED_TILE_SERVER') || 'https://tiles.ttn-brb.de'
const uiConfig = {
    styledTileServer,
}

function httpLogging(req: express.Request, res: express.Response, next: express.NextFunction) {
    const end = res.end
    res.end = function() {
        log.http(`${res.statusCode} - ${req.originalUrl}`)
        res.end = end
        res.end(...arguments)
    }

    next()
}

export function setupApp() {

    const app = express()
    app.set('view engine', 'ejs')
    app.set('views', path.join(__dirname, '..', 'view'))

    app.use(express.static(path.join(__dirname, '..', 'static')))

    app.use(httpLogging)

    app.get('/', (req, res) => {
        res.render('index')
    })

    app.get('/config.js', (req, res) => {
        res.contentType('application/javascript')
        res.send(`window.cfg = ${JSON.stringify(uiConfig, null, '  ')};`)
    })

    return app
}