import yargs from 'yargs'

const packageInfo = require('../package.json')

export function cliArgs() {
    return yargs
        .scriptName(packageInfo.name)
        .usage('$0 [-h <IP>] [-p <port>]')
        .options({
            'host': {
                alias: 'h',
                description: 'the IP to bind the HTTP server to',
                type: 'string',
                default: '127.0.0.1',
            },
            'port': {
                alias: 'p',
                description: 'the port to bind the HTTP server to',
                type: 'number',
                default: 8080,
            },
            'verbose': {
                alias: 'v',
                description: 'log verbose',
                type: 'boolean',
                conflicts: 'quiet',
            },
            'quiet': {
                alias: 'q',
                description: 'log only warnings and errors',
                type: 'boolean',
            },
        })
        .help()
        .argv
}