import _ from 'lodash'
import express from 'express'
import Dayjs from 'dayjs'
import { log } from './logging'
import { getState } from './state'
import { writeSamples } from './influx'

function parseToken(auth: string | null | undefined) {
    if (!_.isString(auth)) return null
    auth = auth.trim()
    if (!auth.match(/^Token\s+\S+$/i)) return null
    return auth.split(/\s+/)[1]
}

export function setupApi() {

    const app = express()

    const jsonParser = express.json({
        inflate: true,
        limit: '10kb',
        strict: true, // accept only arrays and objects
        type: '*/*', // do not require Content-Type=application/json header
    })

    app.post('/sensors/:sensorId/series/:seriesId/sample', jsonParser, (req, res) => {
        const state = getState()
        const sensorId = _.get(req.params, 'sensorId')
        const seriesId = _.get(req.params, 'seriesId')
        const token = parseToken(req.get('authorization'))
        const sensor = state.sensors[sensorId]

        if (!token) {
            res.status(401).send("Authorization required")
            return
        }
        if (!sensor) {
            res.status(404).send("Sensor not found")
            return
        }
        if (sensor.token !== token) {
            res.status(403).end("Access to sensor denied.")
            return
        }
        if (!_.has(sensor.series, seriesId)) {
            res.status(404).send("Series in sensor not found.")
            return
        }

        const ts = Dayjs(_.get(req.body, 'ts'))
        const value = _.toNumber(_.get(req.body, 'value'))
        const sample = {
            ts: ts.toISOString(),
            sensorId,
            seriesId,
            value,
        }
        log.verbose(`SAMPLE ${sensorId}/${seriesId} ${value}`)
        writeSamples([sample]).then(
            () => {
                res.status(204).end()
            },
            error => {
                res.status(500).send(error)
            })
    })

    return app
}