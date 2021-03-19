import { cliArgs } from './cli-args'
import { initializeLogging, log } from './logging'
import { setupApp } from './app'

export function startServer() {

    const cliArgv = cliArgs()
    initializeLogging(cliArgv)

    const app = setupApp()
    app.listen(cliArgv.port, cliArgv.host, () => {
        log.info(`Server listening to http://${cliArgv.host}:${cliArgv.port}`)
    })

}