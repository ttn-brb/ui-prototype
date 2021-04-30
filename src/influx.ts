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

export function readSamples(
    sensorId: string, seriesId: string,
    rangeStart: Dayjs, rangeStop: Dayjs,
    windowInSeconds: number
) : Promise<InfluxSample[]> {
    const queryApi = influx.getQueryApi(org)

    const fluxQuery = `from(bucket: "${bucket}")
    |> range(start: ${rangeStart.unix()}, stop: ${rangeStop.unix()})
    |> filter(fn: (r) => r["sensor"] == "${sensorId}")
    |> filter(fn: (r) => r["series"] == "${seriesId}")
    |> filter(fn: (r) => r["_measurement"] == "sensor_value")
    |> filter(fn: (r) => r["_field"] == "value")
    |> aggregateWindow(every: ${windowInSeconds}s, fn: mean, createEmpty: false)
    |> yield(name: "mean")`

    const samples: InfluxSample[] = []

    return new Promise((onSuccess, onError) => {
        queryApi.queryRows(fluxQuery, {
            next(row: string[], tableMeta: FluxTableMetaData) {
                const o = tableMeta.toObject(row)
                samples.push({
                    ts: dayjs(o._time).toISOString(),
                    sensorId,
                    seriesId,
                    value: Number.parseFloat(o._value),
                })
            },
            error(error: Error) {
                onError(error)
            },
            complete() {
                onSuccess(samples)
            },
        })
    })
}