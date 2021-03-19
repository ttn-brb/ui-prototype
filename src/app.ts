import path from 'path'
import fs from 'fs'
import express from 'express'
import { log } from './logging'

function httpLogging(req: express.Request, res: express.Response, next: express.NextFunction) {
    log.http(req.originalUrl)
    next()
}

export function setupApp() {

    const app = express()
    const indexView = path.join(__dirname, '..', 'view', 'index.html')

    app.use(express.static(path.join(__dirname, '..', 'static')))

    app.use(httpLogging)

    app.get('/', (req, res) => {
        res.sendFile(indexView, err => {
            if (err) {
                log.error(`Failed to read view index.html: ${err}`)
            }
        })
    })

    return app
}