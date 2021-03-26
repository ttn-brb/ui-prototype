import _ from 'lodash'
import { InfluxDB, Point } from '@influxdata/influxdb-client'
import dayjs from 'dayjs'

const url = _.get(process.env, 'INFLUX_DB_URL') || 'http://127.0.0.1:8086'
const token = _.get(process.env, 'INFLUX_DB_TOKEN') || '5f5a4b63c6edc329b0ec37ee4b911ac'
const org = _.get(process.env, 'INFLUX_DB_ORG') || 'ttn-brb'
const bucket = _.get(process.env, 'INFLUX_DB_BUCKET') || 'ui-prototype-bucket'

const PRECISION = 'ms'

const influx = new InfluxDB({url, token})

interface WriteSample {
    ts: string,
    sensorId: string,
    seriesId: string,
    value: number,
}

function writeSampleToPoint(sample: WriteSample) {
    return new Point("sensor_value")
        .timestamp(dayjs(sample.ts).toDate())
        .tag("sensor", sample.sensorId)
        .tag("series", sample.seriesId)
        .floatField("value", sample.value)
}

export async function writeSamples(samples: _.List<WriteSample> | WriteSample[]) {
    const writeApi = influx.getWriteApi(org, bucket, PRECISION)
    writeApi.writePoints(_.map(samples, writeSampleToPoint))
    await writeApi.close()
}
