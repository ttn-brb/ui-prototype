
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

export type AliasMap = {
    [key: string]: string[],
}

export interface Sensor {
    id: string,
    contactName: string,
    contactEmail: string,
    ttnApplicationId: string | null,
    ttnDeviceId: string | null,
    name: string,
    token: string,
    description: string,
    series: SampleTypeMap,
    seriesAliases: AliasMap | null,
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
    lastSample: Sample | undefined,
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
