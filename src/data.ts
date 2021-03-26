import _ from 'lodash'
import { Sensor, SensorData } from './model'

export function buildSensorInfo(sensor: Sensor, sensorData: SensorData) {
    const primarySeries = sensor.primarySeriesId
        ? sensorData.data[sensor.primarySeriesId]
        : null
    const lastSample = _.last(_.orderBy(primarySeries?.samples, 'ts'))
    return {
        id: sensor.id,
        name: sensor.name,
        description: sensor.description,
        location: sensor.location,
        primaryValue: primarySeries
            ? {
                label: primarySeries.type.label,
                unit: primarySeries.type.unit,
                description: primarySeries.type.description,
                min: primarySeries.type.defaultDomain.min,
                max: primarySeries.type.defaultDomain.max,
                ts: lastSample?.ts,
                value: lastSample?.value,
            }
            : null,
    }
}