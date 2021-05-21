import _, { last } from 'lodash'
import dayjs from 'dayjs'
import { Sample, SampleType, Sensor, SensorData, SensorMap, Series } from './model'

const freshnessWindow = _.toSafeInteger(_.get(process.env, 'FRESHNESS_WINDOW') || (60 * 60 * 2))

export function lastActivity(sensorData: SensorData) {
    let lastActivity = dayjs('1970-01-01T00:00:00Z')
    for (const series of _.values(sensorData.data)) {
        for (const s of series.samples) {
            if (!s || !s.ts) continue
            const ts = dayjs(s.ts)
            if (ts.diff(lastActivity) > 0) {
                lastActivity = ts
            }
        }
    }
    return lastActivity
}

function freshness(lastActivity: dayjs.Dayjs) {
    return 1.0 - Math.max(0, Math.min(freshnessWindow, dayjs().diff(lastActivity, 'seconds'))) / freshnessWindow
}

export function lastSample(series: Series | null | undefined) {
    return series && !_.isEmpty(series.samples)
        ? _.last(_.orderBy(series.samples, s => s.ts))
        : undefined
}

interface SensorInfoSeries extends SampleType {
    id: string,
    lastSample: Sample | undefined,
}

type SensorInfoSeriesMap = {
    [key: string]: SensorInfoSeries,
}

export function buildSensorInfo(sensor: Sensor, sensorData: SensorData) {
    const la = lastActivity(sensorData)
    const info = {
        id: sensor.id,
        name: sensor.name,
        description: sensor.description,
        location: sensor.location,
        lastActivity: la.toISOString(),
        freshness: freshness(la),
        series: <SensorInfoSeriesMap> {},
    }
    _.forEach(sensor.series, (sampleType, seriesId) => {
        const series = _.get(sensorData.data, seriesId)
        info.series[seriesId] = {
            id: seriesId,
            label: sampleType.label,
            description: sampleType.description,
            device: sampleType.device,
            unit: sampleType.unit,
            defaultDomain: sampleType.defaultDomain,
            lastSample: lastSample(series),
        }
    })
    return info
}

export function emptySensorData(sensor: Sensor) {
    return {
        track: null,
        data: _.mapValues(sensor.series, (sampleType, seriesId) => ({
            id: seriesId,
            type: sampleType,
            samples: [],
        }))
    }
}

export function emptySensorDataMap(sensors: SensorMap) {
    return _.mapValues(sensors, emptySensorData)
}
