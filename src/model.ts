
export interface Location {
    lat: number,
    lon: number,
}

export interface SampleDomain {
    min: number,
    max: number,
}

export interface SampleType {
    label: string,
    description: string,
    device: string,
    unit: string | null,
    defaultDomain: SampleDomain,
}

export type SampleTypeMap = {
    [key: string]: SampleType,
}

export interface Sensor {
    id: string,
    name: string,
    token: string,
    description: string,
    series: SampleTypeMap,
    primarySeriesId: string | null,
    location: Location | null,
}

export type SensorMap = {
    [key: string]: Sensor,
}

export interface Sample {
    ts: string,
    value: number,
}

export interface Series {
    id: string,
    type: SampleType,
    samples: Sample[],
}

export type SeriesMap = {
    [key: string]: Series,
}

export interface TrackPoint {
    ts: string,
    location: Location,
}

export type Track = TrackPoint[]

export interface SensorData {
    track: Track | null,
    data: SeriesMap,
}

export type SensorDataMap = {
    [key: string]: SensorData,
}
