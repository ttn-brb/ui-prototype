import fs from 'fs'
import _ from 'lodash'
import { SensorDataMap, SensorMap } from './model'
import { randomSensors } from './demo'
import { emptySensorDataMap } from './data'

interface AppState {
    sensors: SensorMap,
    sensorData: SensorDataMap,
}

const sensorsFile = './sensors.json'

function initializeAppState() : AppState {
    let sensors;
    if (fs.existsSync(sensorsFile)) {
        sensors = JSON.parse(fs.readFileSync(sensorsFile, { encoding: 'utf-8' }))
    } else {
        sensors = randomSensors()
        fs.writeFileSync(sensorsFile, JSON.stringify(sensors, null, '  '), { encoding: 'utf-8'})
    }
    const sensorData = emptySensorDataMap(sensors)
    return {
        sensors,
        sensorData,
    }
}

let state: AppState = initializeAppState()

export function getState() {
    return state
}

export function updateSensorData(sensorData: SensorDataMap) {
    state = {...state,
        sensorData,
    }
    return state
}
