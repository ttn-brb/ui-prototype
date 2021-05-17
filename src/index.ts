import _ from 'lodash'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { cliArgs } from './cli-args'
import { initializeLogging, log } from './logging'
import { setupApp } from './app'
import { setupApi } from './api'
import { startReadingSamples } from './influxReader'

dayjs.extend(duration)

const SNAPSHOT_INTERVAL = dayjs.duration(_.get(process.env, 'SNAPSHOT_INTERVAL') || 'PT1M').asSeconds()
const DISPLAY_RANGE = dayjs.duration(_.get(process.env, 'DISPLAY_RANGE') || 'P7D').asSeconds()
const DISPLAY_WINDOW = dayjs.duration(_.get(process.env, 'DISPLAY_WINDOW') || 'PT1H').asSeconds()

export function startServer() {

    const cliArgv = cliArgs()
    initializeLogging(cliArgv)

    startReadingSamples(SNAPSHOT_INTERVAL, DISPLAY_RANGE, DISPLAY_WINDOW)

    const app = setupApp()

    const api = setupApi()
    app.use('/api/v0', api)

    app.listen(cliArgv.port, cliArgv.host, () => {
        log.info(`Server listening to http://${cliArgv.host}:${cliArgv.port}`)
    })

}