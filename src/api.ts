import _ from 'lodash'
import express from 'express'
import asyncHandler  from 'express-async-handler'
import dayjs from 'dayjs'
import { log } from './logging'
import { getState } from './state'
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

        const t = getTtnMessageTimestamp(req.body, rxMetadata) || dayjs()
        const samples = []
        for (const seriesId in sensor.series) {
            const value = _.get(payload, seriesId)
            if (!_.isNumber(value)) continue
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