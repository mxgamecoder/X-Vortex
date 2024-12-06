export default function envlogger() {
	['error', 'warn', 'info', 'debug', 'trace'].forEach(method => {
		console[method] = () => {};
	});

	const loggingLibraries = ['winston', 'bunyan', 'log4js', 'pino'];

	loggingLibraries.forEach(lib => {
		try {
			const logger = require(lib);
			if (logger && logger.createLogger) {
				logger.createLogger = () => ({
					info: () => {},
					warn: () => {},
					error: () => {},
					debug: () => {},
				});
			}
		} catch (e) {}
	});

	if (typeof window !== 'undefined' && window.console) {
		Object.keys(window.console).forEach(method => {
			if (typeof window.console[method] === 'function' && method !== 'log') {
				window.console[method] = () => {};
			}
		});
	}
}
