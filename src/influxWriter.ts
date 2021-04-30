import _ from 'lodash'
import dayjs, { Dayjs } from 'dayjs'
import { log } from './logging'
import { getState } from './state'
import { randomSampleValue } from './demo'
import { writeSamples } from './influx'

let samplePropability = 1.0

function randomWriteSamples(now: Dayjs) {
    const result = []
    const state = getState()
    for (const sensor of _.values(state.sensors)) {
        for (const seriesId of _.keys(sensor.series)) {
            if (Math.random() > samplePropability) continue
            const sampleType = sensor.series[seriesId]
            const sampleValue = randomSampleValue(now, sampleType)
            result.push({
                ts: now.toISOString(),
                sensorId: sensor.id,
                seriesId,
                value: sampleValue,
            })
        }
    }
    return result
}

function writeRandomSamplesForNow() {
    const samples = randomWriteSamples(dayjs())
    writeSamples(samples).catch(err => {
        log.error(err)
    })
}

let intervalHandle : NodeJS.Timeout | null = null

export function startWritingDemoSamples(intervalSeconds: number, propability: number) {
    stopWritingDemoSamples()
    samplePropability = propability
    intervalHandle = setInterval(writeRandomSamplesForNow, intervalSeconds * 1000)
}

export function stopWritingDemoSamples() {
    if (intervalHandle === null) return
    clearInterval(intervalHandle)
    intervalHandle = null
}