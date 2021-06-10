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
    const indexView = path.join(__dirname, '..', 'view', 'index.html')

    app.use(express.static(path.join(__dirname, '..', 'static')))

    app.use(httpLogging)

    app.get('/', (req, res) => {
        res.sendFile(indexView, err => {
            if (err) {
                log.error(`Failed to read view index.html: ${err}`)
            }
        })
    })

    app.get('/config.js', (req, res) => {
        res.contentType('application/javascript')
        res.send(`window.cfg = ${JSON.stringify(uiConfig, null, '  ')};`)
    })

    app.get('/sensors', (req, res) => {
        const state = getState()
        const sensors = state.sensors
        const sensorInfos = _.map(sensors,
            sensor => buildSensorInfo(sensor, state.sensorData[sensor.id]))
        res.send(sensorInfos)
    })

    app.get('/sensors/:sensorId', (req, res) => {
        const state = getState()
        const sensor = state.sensors[req.params.sensorId]
        const sensorData = state.sensorData[req.params.sensorId]
        const sensorInfo = buildSensorInfo(sensor, sensorData)
        if (!sensor) {
            res.status(404).end()
        } else {
            res.send({...sensorInfo, ...sensorData})
        }
    })

    return app
}