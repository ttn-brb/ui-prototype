import _ from 'lodash'
import { cliArgs } from './cli-args'
import { initializeLogging, log } from './logging'
import { setupApp } from './app'
import { startWritingDemoSamples } from './influxWriter'

const DEMO_SAMPLE_INTERVAL = Number.parseFloat(_.get(process.env, 'DEMO_SAMPLE_INTERVAL') || '3600')
const DEMO_SAMPLE_PROPABILITY = Math.max(0, Math.min(100,
    Number.parseFloat(_.get(process.env, 'SNAPSHOT_INTERVAL') || '90')))
    / 100.0

export function startServer() {

    const cliArgv = cliArgs()
    initializeLogging(cliArgv)

    startWritingDemoSamples(DEMO_SAMPLE_INTERVAL, DEMO_SAMPLE_PROPABILITY)

    const app = setupApp()
    app.listen(cliArgv.port, cliArgv.host, () => {
        log.info(`Server listening to http://${cliArgv.host}:${cliArgv.port}`)
    })

}