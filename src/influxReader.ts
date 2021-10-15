import _ from 'lodash'
import dayjs, { Dayjs } from 'dayjs'
import { log } from './logging'
import { SensorData, SensorDataMap } from './model'
import { getState, updateSensorData } from './state'
import { readLastSample, readWindowAggregatedSamples } from './influx'

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
    const requestTimes = []
    for (const sensor of _.values(state.sensors)) {
        const sensorData: SensorData = {
            track: null,
            data: {}
        }
        for (const seriesId of _.keys(sensor.series)) {
            const sampleType = sensor.series[seriesId]
            const t0 = dayjs()
            const samples = await readWindowAggregatedSamples(sensor.id, seriesId, rangeStart, rangeStop, windowInSeconds)
            const lastSample = await readLastSample(sensor.id, seriesId, rangeStart)
            const td = dayjs().diff(t0, 'milliseconds')
            requestTimes.push(td)
            sensorData.data[seriesId] = {
                id: seriesId,
                type: sampleType,
                samples: samples.map(influxSample => ({
                    ts: influxSample.ts,
                    value: influxSample.value,
                })),
                lastSample: lastSample ? {
                    ts: lastSample.ts,
                    value: lastSample.value,
                } : undefined,
            }
        }
        sensorDataMap[sensor.id] = sensorData
    }
    return sensorDataMap
}

let intervalHandle : NodeJS.Timeout | null = null
let interval : number | null = null

export function startReadingSamples(delaySeconds: number, intervalSeconds: number,
    rangeInSeconds: number, windowInSeconds: number) {
    stopReadingSamples()
    interval = intervalSeconds * 1000
    rangeSize = rangeInSeconds
    window = windowInSeconds
    readSamplesForNow()
    intervalHandle = setTimeout(intervalWorker, delaySeconds * 1000)
}

function intervalWorker() {
    if (interval) {
        readSamplesForNow()
        intervalHandle = setTimeout(intervalWorker, interval)
    }
}

export function stopReadingSamples() {
    if (intervalHandle === null) return
    clearInterval(intervalHandle)
    interval = null
    clearTimeout(intervalHandle)
    intervalHandle = null
}
