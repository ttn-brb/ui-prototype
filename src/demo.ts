import _ from 'lodash'
import dayjs, { Dayjs } from 'dayjs'
import uuid = require('uuid')
import { SampleType, SampleTypeMap, Sensor, SensorData, SensorDataMap, SensorMap } from './model'

const demoHours = 7 * 24
const sensorCount = 20

const tempType = {
    label: 'Temperatur',
    description: 'Temperatur in 2m Höhe im Schatten gemessen',
    device: 'TinkerForge CO2 Bricklet',
    unit: '°C',
    defaultDomain: {
        min: -10,
        max: 30,
    },
}

const humidityType = {
    label: 'Luftfeuchte',
    description: 'Relative Luftfeuchtigkeit in Prozent',
    device: 'TinkerForge CO2 Bricklet',
    unit: '%RH',
    defaultDomain: {
        min: 0,
        max: 100,
    },
}

const co2Type = {
    label: 'CO₂',
    description: 'CO₂ Konzentration in Teile pro Million',
    device: 'TinkerForge CO2 Bricklet',
    unit: 'ppm',
    defaultDomain: {
        min: 400,
        max: 2000,
    },
}

const pmType = {
    label: 'Feinstaub PM10',
    description: 'Feinstaubkonzentration in Größenklasse PM10',
    device: 'TinkerForge Particulate Matter Bricklet',
    unit: 'µg/m³',
    defaultDomain: {
        min: 0,
        max: 60,
    },
}

const spType = {
    label: 'Lärmpegel',
    description: 'Geräuschpegel in direkter Umgebung',
    device: 'TinkerForge Sound Pressure Level Bricklet',
    unit: 'dB(A)',
    defaultDomain: {
        min: 0,
        max: 150,
    },
}

const optionalTypes : SampleTypeMap = {
    'humidity': humidityType,
    'co2': co2Type,
    'particulateMatter': pmType,
    'soundPressure': spType,
}

function randTypes() {
    const types : SampleTypeMap = { 'temp': tempType }
    for (const id in optionalTypes) {
        if (_.random(1, false)) {
            types[id] = optionalTypes[id]
        }
    }
    return types
}

function randSampleValue(t: number, sampleType: SampleType) {
    const normValue = _.random(Math.cos(t * Math.PI) * 0.5 + 0.5, true)
    const range = sampleType.defaultDomain.max - sampleType.defaultDomain.min
    return sampleType.defaultDomain.min + normValue * range
}

function randSamples(now: Dayjs, sampleType: SampleType) {
    return _.chain(_.range(demoHours))
        .map(i => ({
            ts: now.subtract(demoHours, 'hours').add(i, 'hours').toISOString(),
            value: randSampleValue(i / 12, sampleType),
        }))
        .value()
}

export function randomSensors() : SensorMap {
    return _.keyBy(
        _.chain(_.range(sensorCount))
            .map(i => ({
                id: uuid.v4(),
                name: `Sensor ${i}`,
                token: uuid.v4({}),
                description: `Eine Beschreibung für den Sensor ${i} und seine Fähigkeiten.`,
                location: {
                    lat: _.random(52.3846, 52.4589),
                    lon: _.random(12.4535, 12.6293),
                },
                series: randTypes(),
            }))
            .value(),
        'id')
}

export function randomSampleValue(ts: Dayjs, sampleType: SampleType, offset: number) {
    return randSampleValue(ts.unix() / (12 * 60 * 60) + offset, sampleType)
}

export function randomSensorData(sensor: Sensor, now: Dayjs) : SensorData {
    return {
        track: null,
        data: _.mapValues(sensor.series, (type, id) => {
            const samples = randSamples(now, type)
            return {
                id,
                type,
                samples,
                lastSample: _.last(samples),
            }
        }),
    }
}

export function randomSensorDataMap(sensors: SensorMap) : SensorDataMap {
    var now = dayjs()
    return _.mapValues(sensors, sensor => randomSensorData(sensor, now));
}
