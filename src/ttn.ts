import _ from 'lodash'
import dayjs from 'dayjs'

export function findTtnRxMetadata(ttnMessage: any) {
    const rxMds = _.get(ttnMessage, ['uplink_message', 'rx_metadata'])
    if (!_.isArray(rxMds)) return null
    let maxRssi = -200
    let index = -1
    for (let i = 0; i < rxMds.length; i++) {
        const txMd = rxMds[i]
        if (_.isNumber(txMd.rssi) && txMd.rssi > maxRssi) {
            index = i
            maxRssi = txMd.rssi
        }
    }
    return index >= 0 ? rxMds[index] : null
}

export function getTtnMessageTimestamp(ttnMessage: any, rxMetadata: any): dayjs.Dayjs | null {
    rxMetadata ||= findTtnRxMetadata(ttnMessage)
    const time = _.get(rxMetadata, 'time') ||_.get(ttnMessage, ['uplink_message', 'received_at'])
    return _.isString(time) && time ? dayjs(time) : null
}
