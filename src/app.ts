import path from 'path'
import _ from 'lodash'
import express from 'express'
import { log } from './logging'
import { getState } from './state'
import { buildSensorInfo } from './data'

function httpLogging(req: express.Request, res: express.Response, next: express.NextFunction) {
    next()
    log.http(`${res.statusCode} - ${req.originalUrl}`)
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
        if (!sensor) {
            res.status(404).end()
        } else {
            res.send({...sensor, ...sensorData})
        }
    })

    return app
}