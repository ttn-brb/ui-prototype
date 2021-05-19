import _ from 'lodash'
import dayjs, { Dayjs } from 'dayjs'
import { log } from './logging'
import { SensorData, SensorDataMap } from './model'
import { getState, updateSensorData } from './state'
import { readSamples } from './influx'

let rangeSize = 7 * 24 * 60 * 60
let window = 60 * 60

function readSamplesForNow() {
    const now = dayjs()
    const start = now.subtract(rangeSize, 'seconds')
    const stop = now
    readSamplesAsync(start, stop, window).then(
        updateSensorData,
        error => {
            log.error(error)
        })
}

async function readSamplesAsync(rangeStart: Dayjs, rangeStop: Dayjs, windowInSeconds: number) {
    const state = getState()
    const sensorDataMap : SensorDataMap = {}
    for (const sensor of _.values(state.sensors)) {
        const sensorData: SensorData = {
            track: null,
            data: {}
        }
        for (const seriesId of _.keys(sensor.series)) {
            const sampleType = sensor.series[seriesId]
            const samples = await readSamples(sensor.id, seriesId, rangeStart, rangeStop, windowInSeconds)
            sensorData.data[seriesId] = {
                id: seriesId,
                type: sampleType,
                samples: samples.map(influxSample => ({
                    ts: influxSample.ts,
                    value: influxSample.value,
                })),
            }
        }
        sensorDataMap[sensor.id] = sensorData
    }
    return sensorDataMap
}

let intervalHandle : NodeJS.Timeout | null = null

export function startReadingSamples(intervalSeconds: number,
    rangeInSeconds: number, windowInSeconds: number) {
    stopReadingSamples()
    rangeSize = rangeInSeconds
    window = windowInSeconds
    readSamplesForNow()
    intervalHandle = setInterval(readSamplesForNow, intervalSeconds * 1000)
}

export function stopReadingSamples() {
    if (intervalHandle === null) return
    clearInterval(intervalHandle)
    intervalHandle = null
}