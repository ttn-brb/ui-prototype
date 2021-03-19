import _ from 'lodash'
import uuid = require('uuid')
import dayjs from 'dayjs'

interface Location {
    lat: number,
    lon: number,
}

interface TrackPoint {
    ts: string,
    location: Location,
}

type Track = TrackPoint[]

interface Sample {
    ts: string,
    value: number,
}

interface SampleDomain {
    min: number,
    max: number,
}

interface SampleType {
    label: string,
    description: string,
    unit: string | null,
    defaultDomain: SampleDomain,
}

interface Series {
    id: string,
    type: SampleType,
    samples: Sample[],
}

type SeriesMap = {
    [key: string]: Series,
}

export interface Sensor {
    id: string,
    name: string,
    description: string,
    data: SeriesMap,
    primarySeriesId: string | null,
    location: Location | null,
    track: Track | null,
}

type SensorMap = {
    [key: string]: Sensor,
}

export interface DataSet {
    sensors: SensorMap,
}

interface AppState {
    dataSet: DataSet,
}

function randomDemoData() {
    const now = dayjs()
    const demoHours = 7 * 24
    const tempType = {
        label: 'Temperatur',
        description: 'Temperatur in 2m Höhe im Schatten gemessen',
        unit: '°C',
        defaultDomain: {
            min: -10,
            max: 25,
        },
    }
    return {
        dataSet: {
            sensors: _.keyBy(
                _.chain(_.range(20))
                    .map(i => ({
                        id: uuid.v4(),
                        name: `Sensor ${i}`,
                        description: `Eine Beschreibung für den Sensor ${i} und seine Fähigkeiten.`,
                        location: {
                            lat: _.random(52.3846, 52.4589),
                            lon: _.random(12.4535, 12.6293),
                        },
                        track: null,
                        primarySeriesId: 'temp',
                        data: {
                            'temp': {
                                id: 'temp',
                                type: tempType,
                                samples: _.chain(_.range(demoHours))
                                    .map(i => ({
                                        ts: now.subtract(demoHours, 'hours').add(i, 'hours').toISOString(),
                                        value: Math.cos(i / 7.0 * Math.PI) * _.random(-2, 15),
                                    }))
                                    .value(),
                            },
                        },
                    }))
                    .value(),
                'id'),
        }
    }
}

let state: AppState = randomDemoData()

export function getState() {
    return state
}
