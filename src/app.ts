import express from 'express'

export function setupApp() {

    const app = express()

    app.get('/', (req, res) => {
        res.send('Hello TTN!')
    })

    return app
}