import _ from 'lodash'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { cliArgs } from './cli-args'
import { initializeLogging, log } from './logging'
import { setupApp } from './app'
import { startWritingDemoSamples } from './influxWriter'
import { startReadingSamples } from './influxReader'

dayjs.extend(duration)

const DEMO_SAMPLE_INTERVAL = dayjs.duration(_.get(process.env, 'DEMO_SAMPLE_INTERVAL') || 'PT1H').asSeconds()
const DEMO_SAMPLE_PROPABILITY = Math.max(0, Math.min(100,
    Number.parseFloat(_.get(process.env, 'SNAPSHOT_INTERVAL') || '90')))
    / 100.0

const SNAPSHOT_INTERVAL = dayjs.duration(_.get(process.env, 'SNAPSHOT_INTERVAL') || 'PT1M').asSeconds()
const DISPLAY_RANGE = dayjs.duration(_.get(process.env, 'DISPLAY_RANGE') || 'P7D').asSeconds()
const DISPLAY_WINDOW = dayjs.duration(_.get(process.env, 'DISPLAY_WINDOW') || 'PT1H').asSeconds()

export function startServer() {

    const cliArgv = cliArgs()
    initializeLogging(cliArgv)

    startWritingDemoSamples(DEMO_SAMPLE_INTERVAL, DEMO_SAMPLE_PROPABILITY)
    startReadingSamples(SNAPSHOT_INTERVAL, DISPLAY_RANGE, DISPLAY_WINDOW)

    const app = setupApp()
    app.listen(cliArgv.port, cliArgv.host, () => {
        log.info(`Server listening to http://${cliArgv.host}:${cliArgv.port}`)
    })

}