import _ from 'lodash'
import dayjs, { Dayjs } from 'dayjs'
import { log } from './logging'
import { Sensor, SensorData, SensorDataMap } from './model'
import { getState, updateSensorData } from './state'
import { readLastSample, readWindowAggregatedSamples } from './influx'

let rangeSize = 7 * 24 * 60 * 60
let window = 60 * 60

function readSamplesForNow() {
    const now = dayjs()
    const start = now.subtract(rangeSize, 'seconds')
    const stop = now
    log.verbose(`Reading samples between ${start.toISOString()} and ${stop.toISOString()}`)
    readSamplesAsync(start, stop, window).then(
        updateSensorData,
        error => {
            log.error("Failed to read samples from influx: " + error)
        })
}

async function inSeries<T, R>(fn: (item: T) => Promise<R>, items: T[]): Promise<R[]> {
    const results = []
    for (const item of items) {
        results.push(await fn(item))
    }
    return results
}

async function inParallel<T, R>(fn: (item: T) => Promise<R>, items: T[]): Promise<R[]> {
    const results = []
    const tasks = items.map(fn)
    for (const task of tasks) {
        results.push(await task)
    }
    return results
}

async function readSamplesAsync(rangeStart: Dayjs, rangeStop: Dayjs, windowInSeconds: number) {
    const requestTimes: number[] = []
    const sensorDataMap : SensorDataMap = {}

    async function loadSensorData(sensor: Sensor) {
        const sensorData: SensorData = {
            track: null,
            data: {}
        }

        async function loadSeriesData(seriesId: string) {
            const t0 = dayjs()
            const samples = await readWindowAggregatedSamples(sensor.id, seriesId, rangeStart, rangeStop, windowInSeconds)
            const lastSample = await readLastSample(sensor.id, seriesId, rangeStart)
            const td = dayjs().diff(t0, 'milliseconds')
            requestTimes.push(td)
            const sampleType = sensor.series[seriesId]
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

        await inParallel(loadSeriesData, _.keys(sensor.series))
        sensorDataMap[sensor.id] = sensorData
    }

    const state = getState()
    const t0 = dayjs()
    await inSeries(loadSensorData, _.values(state.sensors))
    const tTotal = dayjs().diff(t0, 'milliseconds')
    log.verbose(`Finished reading samples. ${_.size(requestTimes)} requests with ${_.round(_.mean(requestTimes))} ms average took ${_.round(tTotal / 1000, 1)} s.`)
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
