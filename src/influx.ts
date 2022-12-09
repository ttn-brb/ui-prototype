import _ from 'lodash'
import { FluxTableMetaData, InfluxDB, Point } from '@influxdata/influxdb-client'
import dayjs, { Dayjs } from 'dayjs'

const url = _.get(process.env, 'INFLUX_DB_URL') || 'http://127.0.0.1:8086'
const token = _.get(process.env, 'INFLUX_DB_TOKEN') || '5f5a4b63c6edc329b0ec37ee4b911ac'
const org = _.get(process.env, 'INFLUX_DB_ORG') || 'ttn-brb'
const bucket = _.get(process.env, 'INFLUX_DB_BUCKET') || 'ui-prototype-bucket'

const PRECISION = 'ms'

const influx = new InfluxDB({ url, token })

interface InfluxSample {
    ts: string,
    sensorId: string,
    seriesId: string,
    value: number,
}

function influxSampleToPoint(sample: InfluxSample) {
    return new Point("sensor_value")
        .timestamp(dayjs(sample.ts).toDate())
        .tag("sensor", sample.sensorId)
        .tag("series", sample.seriesId)
        .floatField("value", sample.value)
}

export async function writeSamples(samples: _.List<InfluxSample> | InfluxSample[]) {
    const writeApi = influx.getWriteApi(org, bucket, PRECISION)
    writeApi.writePoints(_.map(samples, influxSampleToPoint))
    await writeApi.close()
}

function readAsync<T>(query: string, rowHandler: (row: string[], tableMeta: FluxTableMetaData) => T) : Promise<T[]> {
    const queryApi = influx.getQueryApi(org)
    const items: T[] = []
    return new Promise((onSuccess, onError) => {
        queryApi.queryRows(query, {
            next(row: string[], tableMeta: FluxTableMetaData) {
                items.push(rowHandler(row, tableMeta))
            },
            error(error: Error) {
                onError(error)
            },
            complete() {
                onSuccess(items)
            },
        })
    })
}

function buildSampleParser(sensorId: string | null, seriesId: string | null) {
    return (row: string[], tableMeta: FluxTableMetaData) => {
        const o = tableMeta.toObject(row)
        return {
            ts: dayjs(o._time).toISOString(),
            sensorId: sensorId ?? o.sensor,
            seriesId: seriesId ?? o.series,
            value: Number.parseFloat(o._value),
        }
    }
}

function fluxQueryForValuesInRange(
    sensorId: string | null, seriesId: string | null,
    rangeStart: Dayjs | null, rangeStop: Dayjs | null
): string {
    let range = rangeStart
        ? rangeStop
            ? `|> range(start: ${rangeStart.unix()}, stop: ${rangeStop.unix()}) `
            : `|> range(start: ${rangeStart.unix()}) `
        : rangeStop
            ? `|> range(stop: ${rangeStop.unix()}) `
            : ``
    let fluxQuery =
        `from(bucket: "${bucket}") ` +
        range
    if (sensorId) fluxQuery +=
        `|> filter(fn: (r) => r["sensor"] == "${sensorId}") `
    if (seriesId) fluxQuery +=
        `|> filter(fn: (r) => r["series"] == "${seriesId}") `
    fluxQuery +=
        `|> filter(fn: (r) => r["_measurement"] == "sensor_value") ` +
        `|> filter(fn: (r) => r["_field"] == "value") `
    return fluxQuery
}

export async function readWindowAggregatedSamples(
    sensorId: string | null, seriesId: string | null,
    rangeStart: Dayjs | null, rangeStop: Dayjs | null,
    windowInSeconds: number
) : Promise<InfluxSample[]> {

    let fluxQuery = fluxQueryForValuesInRange(sensorId, seriesId, rangeStart, rangeStop)
    fluxQuery +=
        `|> aggregateWindow(every: ${windowInSeconds}s, fn: mean, createEmpty: true) ` +
        '|> yield(name: "mean")'

    return await readAsync(fluxQuery, buildSampleParser(sensorId, seriesId))
}

export async function readSamples(
    sensorId: string | null, seriesId: string | null,
    rangeStart: Dayjs | null, rangeStop: Dayjs | null
) : Promise<InfluxSample[]> {

    let fluxQuery = fluxQueryForValuesInRange(sensorId, seriesId, rangeStart, rangeStop)
    fluxQuery +=
        '|> yield()'

    return await readAsync(fluxQuery, buildSampleParser(sensorId, seriesId))
}

export async function readLastSamples(
    sensorId: string | null, seriesId: string | null,
    rangeStart: Dayjs | null
) : Promise<InfluxSample[]> {

    let fluxQuery = fluxQueryForValuesInRange(sensorId, seriesId, rangeStart, null)
    fluxQuery +=
        '|> last()'

    return await readAsync(fluxQuery, buildSampleParser(sensorId, seriesId))
}
