import winston from 'winston'
import chalk from 'chalk'
import dayjs from 'dayjs'
const { combine, timestamp, splat, printf } = winston.format

export const log = winston.createLogger()

const CLR_GRAY = chalk.rgb(128, 128, 128)
const CLR_GRAY_2 = chalk.rgb(160, 160, 160)
const CLR_BLUE = chalk.rgb(21, 119, 189)
const CLR_BLUE_2 = chalk.rgb(177, 223, 255)
const CLR_GREEN = chalk.rgb(74, 189, 21)
const CLR_YELLOW = chalk.rgb(245, 171, 12)
const CLR_YELLOW_2 = chalk.rgb(255, 225, 165)
const CLR_RED = chalk.rgb(240, 68, 29)
const CLR_RED_2 = chalk.rgb(255, 181, 165)

const levelColor: Map<string, chalk.Chalk> = new Map([
	['verbose', CLR_GRAY],
	['http', CLR_BLUE],
	['info', CLR_GREEN], // logo green
	['warn', CLR_YELLOW],
	['error', CLR_RED], // logo orange
])
const messageColor: Map<string, chalk.Chalk> = new Map([
	['verbose', CLR_GRAY_2],
	['http', CLR_BLUE_2],
	['warn', CLR_YELLOW_2],
	['error', CLR_RED_2],
])

function formatTimestamp(ts: Date) {
	return dayjs(ts).format('MM-DD HH:mm:ss')
}

function formatLevel(level: string) {
	const color = levelColor.get(level)
	const formattedLevel = level.substr(0, 4).toUpperCase()
	return color ? color(formattedLevel) : formattedLevel
}

function formatMessage(level: string, message: string) {
	const color = messageColor.get(level)
	const indented = message.replace(/\r?\n/gm, '\n                      ')
	return color ? color(indented) : indented
}

function format(info: { timestamp: Date, level: string, message: string }) {

	return chalk`{rgb(128, 128, 128) ${formatTimestamp(info.timestamp)}} [${formatLevel(info.level)}] ${formatMessage(info.level, info.message)}`
}

interface LogConfiguration {
    verbose: boolean | undefined,
    quiet: boolean | undefined,
}

export function initializeLogging(cfg: LogConfiguration) {
	let level = 'info'
	if (cfg.verbose) level = 'verbose'
	else if (cfg.quiet) level = 'warn'
	log.configure({
		level,
		format: combine(
			splat(),
			timestamp(),
			printf(format)
		),
		transports: [
			new winston.transports.Console(),
		],
	});
    // Demo
	// log.verbose(`Verbose Message`)
	// log.http(`HTTP MESSAGE`)
	// log.info(`Info Message`)
	// log.warn(`Warning Message`)
	// log.error(`Error Message`)
}
