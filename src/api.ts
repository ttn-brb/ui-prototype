import _ from 'lodash'
import express from 'express'
import asyncHandler  from 'express-async-handler'
import dayjs from 'dayjs'
import { log } from './logging'
import { getState } from './state'
import { buildSensorInfo } from './data'
import { writeSamples } from './influx'
import { findTtnRxMetadata, getTtnMessageTimestamp } from './ttn'

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

    app.get('/sensors/info', (req, res) => {
        const state = getState()
        const sensors = state.sensors
        const sensorInfos = _.map(sensors,
            sensor => buildSensorInfo(sensor, state.sensorData[sensor.id]))
        res.send(sensorInfos)
    })

    app.get('/sensors/:sensorId/info', (req, res) => {
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

    app.post('/sensors/:sensorId/series/:seriesId/sample', jsonParser, asyncHandler(async (req, res) => {
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
            res.status(403).send("Access to sensor denied.")
            return
        }
        if (!_.has(sensor.series, seriesId)) {
            res.status(404).send("Series in sensor not found.")
            return
        }

        const ts = dayjs(_.get(req.body, 'ts'))
        const value = _.toNumber(_.get(req.body, 'value'))
        const sample = {
            ts: ts.toISOString(),
            sensorId,
            seriesId,
            value,
        }
        log.verbose(`SAMPLE ${sensor.name} ${sensor.id}/${seriesId} ${value}`)
        try {
            await writeSamples([sample])
        } catch (err) {
            res.status(500).send(err)
            return
        }
        res.status(204).end()
    }))

    app.post('/ttn/v3', jsonParser, asyncHandler(async (req, res) => {
        const ttnApplicationId = _.get(req.body, ['end_device_ids', 'application_ids', 'application_id'])
        if (!_.isString(ttnApplicationId) || ttnApplicationId.length === 0) {
            res.status(400).send("Did not find the TTN application ID at: end_device_ids.application_ids.application_id")
            return
        }
        const ttnDeviceId = _.get(req.body, ['end_device_ids', 'device_id'])
        if (!_.isString(ttnDeviceId) || ttnDeviceId.length === 0) {
            res.status(400).send("Did not find the TTN device ID at: end_device_ids.device_id")
            return
        }

        const state = getState()
        const sensor = _.find(state.sensors, s => s.ttnApplicationId === ttnApplicationId && s.ttnDeviceId === ttnDeviceId)
        const token = parseToken(req.get('authorization'))

        if (!token) {
            res.status(401).send("Authorization required")
            return
        }
        if (!sensor) {
            res.status(404).send("Sensor not found")
            return
        }
        if (sensor.token !== token) {
            res.status(403).send("Access to sensor denied.")
            return
        }

        const rxMetadata = findTtnRxMetadata(req.body)
        if (_.isNil(rxMetadata)) {
            res.status(400).send("RX metadata not found at: uplink_message.rx_metadata")
            return
        }

        const payload = _.get(req.body, ['uplink_message', 'decoded_payload'])

        function parseValue(v: any) {
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
                const match = v.trim().match(/^\d+(\.\d*)?/)
                return match ? Number.parseFloat(match[0]) : undefined
            }
            return undefined;
        }

        const t = getTtnMessageTimestamp(req.body, rxMetadata) || dayjs()
        const samples = []
        for (const seriesId in sensor.series) {
            let value = parseValue(_.get(payload, seriesId))
            if (typeof value !== 'number') {
                const aliases = _.get(sensor, ['seriesAliases', seriesId])
                if (_.isArray(aliases)) {
                    for (const alias of aliases) {
                        value = parseValue(_.get(payload, alias))
                        if (typeof value === 'number') break
                    }
                }
            }
            if (typeof value !== 'number') continue
            const sample = {
                ts: t.toISOString(),
                sensorId: sensor.id,
                seriesId,
                value,
            }
            log.verbose(`SAMPLE ${sensor.name} ${sensor.id}/${seriesId} ${value}`)
            samples.push(sample)
        }
        if (samples.length > 0) {
            try {
                await writeSamples(samples)
            } catch (err) {
                res.status(500).send(err)
                return
            }
        }
        res.status(204).end()
    }))

    return app
}