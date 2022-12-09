import _ from 'lodash'
import dayjs, { Dayjs } from 'dayjs'
import { log } from './logging'
import { SensorData, SensorDataMap } from './model'
import { getState, updateSensorData } from './state'
import { readLastSamples, readSamples, readWindowAggregatedSamples } from './influx'

let rangeSize = 7 * 24 * 60 * 60
let window = 60 * 60

function readSamplesForNow() {
    const now = dayjs()
    const start = now.subtract(rangeSize, 'seconds')
    const stop = now
    log.verbose(`Reading samples between ${start.toISOString()} and ${stop.toISOString()}`)
    readSamplesAsync(start, stop, window)
        .then(updateSensorData)
        .catch(error => {
            log.error("Failed to read samples from influx: " + error)
        })
}

async function readSamplesAsync(rangeStart: Dayjs, rangeStop: Dayjs, windowInSeconds: number | null) {
    const sensorDataMap : SensorDataMap = {}
    const state = getState()
    const t0 = dayjs()
    const samples = windowInSeconds
        ? await readWindowAggregatedSamples(null, null, rangeStart, rangeStop, windowInSeconds)
        : await readSamples(null, null, rangeStart, rangeStop)
    const tWindows = dayjs()
    const lastSamples = await readLastSamples(null, null, rangeStart)
    const tLastSamples = dayjs()

    log.verbose(
        `Finished reading samples. ` +
        `Windowed samples: ${_.round(tWindows.diff(t0, 'ms') / 1000, 1)} s, ` +
        `Last samples: ${_.round(tLastSamples.diff(tWindows, 'ms') / 1000, 1)} s.`)

    for (const sensor of _.values(state.sensors)) {
        const sensorData: SensorData = {
            track: null,
            data: {}
        }
        for (const seriesId of _.keys(sensor.series)) {
            const sampleType = sensor.series[seriesId]
            const lastSample = _.first(lastSamples
                .filter(influxSample =>
                    influxSample.sensorId === sensor.id &&
                    influxSample.seriesId === seriesId))
            sensorData.data[seriesId] = {
                id: seriesId,
                type: sampleType,
                samples: samples
                    .filter(influxSample =>
                        influxSample.sensorId === sensor.id &&
                        influxSample.seriesId === seriesId)
                    .map(influxSample => ({
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
    log.verbose(`Setting up interval timer for sample reading every ${intervalSeconds} seconds`)
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
    log.verbose("Destroy interval timer for sample reading")
    interval = null
    clearTimeout(intervalHandle)
    intervalHandle = null
}
