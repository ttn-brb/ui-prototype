import _, { last } from 'lodash'
import dayjs from 'dayjs'
import { Sample, SampleType, Sensor, SensorData, SensorMap, Series } from './model'
import { InfluxSample } from './influx'

const freshnessWindow = _.toSafeInteger(_.get(process.env, 'FRESHNESS_WINDOW') || (60 * 60 * 2))

export function lastActivity(sensorData: SensorData) {
    let lastActivity = dayjs('1970-01-01T00:00:00Z')
    for (const series of _.values(sensorData.data)) {
        if (!series.lastSample || !series.lastSample.ts) continue
        const ts = dayjs(series.lastSample.ts)
        if (ts.diff(lastActivity) > 0) {
            lastActivity = ts
        }
    }
    return lastActivity
}

function freshness(lastActivity: dayjs.Dayjs) {
    return 1.0 - Math.max(0, Math.min(freshnessWindow, dayjs().diff(lastActivity, 'seconds'))) / freshnessWindow
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
            lastSample: _.get(series, 'lastSample'),
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
            lastSample: undefined,
        }))
    }
}

export function emptySensorDataMap(sensors: SensorMap) {
    return _.mapValues(sensors, emptySensorData)
}

export enum CsvFormat {
    Standard,
    ExcelGerman,
}

function csvBOM(format: CsvFormat): string {
    switch (format) {
        case CsvFormat.ExcelGerman:
            return '\ufeff'
        default:
            return ''
    }
}

function csvFieldSeparator(format: CsvFormat): string {
    switch (format) {
        case CsvFormat.ExcelGerman:
            return ';'
        default:
            return ','
    }
}

function csvLineSeparator(format: CsvFormat): string {
    switch (format) {
        case CsvFormat.ExcelGerman:
            return '\r\n'
        default:
            return '\n'
    }
}

function csvFormatNumber(format: CsvFormat, v: number | null): string {
    if (v === null) return ''
    if (Number.isNaN(v)) return ''
    const vStr = _.toString(v)
    switch (format) {
        case CsvFormat.ExcelGerman:
            return vStr.replace('.', ',')
        default:
            return vStr
    }
}

function csvFormatTimestamp(format: CsvFormat, ts: string): string {
    switch (format) {
        case CsvFormat.ExcelGerman:
            return csvFormatNumber(format,
                (new Date(ts).valueOf() - Date.UTC(1899, 11, 30)) / (24 * 60 * 60 * 1000))
        default:
            return ts
    }
}

export function csvFromSamples(sensor: Sensor, samples: InfluxSample[], format: CsvFormat): string {
    const seriesIds = _.sortBy(_.keys(sensor.series))
    const fSep = csvFieldSeparator(format)
    const lSep = csvLineSeparator(format)
    let txt = csvBOM(format)
    txt += ['ts', ...seriesIds].join(fSep)
    txt += lSep
    const columns = _.mapValues(_.groupBy(samples, s => s.seriesId), g => _.sortBy(g, s => s.ts))
    const columnTimestamps = _.mapValues(columns, g => _.map(g, s => s.ts))
    const timestamps = _.sortedUniq(_.sortBy(_.map(samples, s => s.ts)))
    for (const ts of timestamps) {
        txt += csvFormatTimestamp(format, ts)
        for (const seriesId of seriesIds) {
            txt += fSep
            const timestamps = columnTimestamps[seriesId]
            const sampleIndex = _.sortedIndexOf(timestamps, ts)
            if (sampleIndex >= 0) {
                const sample = columns[seriesId][sampleIndex]
                txt += csvFormatNumber(format, sample.value)
            }
        }
        txt += lSep
    }
    return txt
}
