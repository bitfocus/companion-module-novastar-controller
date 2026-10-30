// NovaStar-Controller
import { InstanceBase, TCPHelper, runEntrypoint, InstanceStatus } from '@companion-module/base'
import * as actions from './actions.js'
import * as nova_config from './choices.js'
import { compileVariableDefinitions } from './variables.js'

const REPLY_TIMEOUT = 2000
const HANDSHAKE_RETRY = 5000

class NovaStarInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// map the choices model to the internal config data object
		this.CHOICES_MODEL = Object.values(nova_config.CONFIG_MODEL)

		this.bAck = Buffer.from([0xaa, 0x55])
		this.bSop = Buffer.from([0x55, 0xaa])
		// Sort config model alphabetically
		this.CHOICES_MODEL.sort(function (a, b) {
			let x = a.label.toLowerCase()
			let y = b.label.toLowerCase()
			if (x < y) {
				return -1
			}
			if (x > y) {
				return 1
			}
			return 0
		})

		this.waiting = []
		this.msgCounter = 0
	}

	/**
	 * returns a hex string representation
	 *
	 * @param {buffer} msg - source message
	 * @param {string} [sep=''] - optional seperator
	 * @returns {string}
	 */
	toHexString(msg, sep = '') {
		let resp = ''
		for (var i = 0; i < msg.length; i++) {
			resp += ('0' + msg[i].toString(16)).slice(-2) + sep
		}
		return resp
	}

	/**
	 * return the hex digits of the message destination (address+device type+port address + board address LSB+MSB)
	 *
	 * @param {buffer} msg - source message
	 *
	 * @returns {string}
	 */
	msgDevice(msg) {
		return this.toHexString(msg.subarray(5, 9))
	}

	/**
	 * return the hex digits of the paramater address (including offset)
	 * @param {buffer} msg - source message
	 *
	 * @returns {string}
	 */
	msgLocation(msg) {
		return this.toHexString(msg.subarray(12, 16), ':').split(':').reverse().join('')
	}

	/**
	 * return the hex digits of the paramater address, offset, and data length
	 *
	 * @param {buffer} msg - source message
	 *
	 * @returns {string}
	 */
	msgData(msg) {
		const dataLen = msg.readInt16LE(16)

		return dataLen == 0 ? '' : this.toHexString(msg.subarray(18, 18 + dataLen))
	}

	updateActions() {
		this.setActionDefinitions(actions.getActions(this))
	}

	init_variables() {
		this.variableDefs = compileVariableDefinitions(this)
		this.setVariableDefinitions(this.variableDefs)
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value:
					'This module will connect to a NovaStar MCTRL4K, MCTRL R5, VX4S, VX6S, NovaProHD, or NovaPro UHD Jr, VX1000, VX600, VX16S & J6 LED Processor.',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'IP Address',
				width: 6,
				default: '192.168.1.11',
				regex: this.REGEX_IP,
			},
			{
				type: 'dropdown',
				id: 'modelID',
				label: 'Model',
				width: 6,
				choices: this.CHOICES_MODEL,
				default: 'j6',
			},
		]
	}

	// When module gets deleted
	async destroy() {
		clearTimeout(this.handshakeTimer)
		if (this.socket !== undefined) {
			this.socket.destroy()
		}

		this.log('destroying module: ', this.id)
	}

	setConfig(config) {
		if (config.modelID && nova_config.CONFIG_MODEL[config.modelID] == undefined) {
			config.modelID = undefined
		}
		this.config = config
		this.model = config.modelID ? nova_config.CONFIG_MODEL[config.modelID] : undefined
	}

	async init(config) {
		this.setConfig(config)

		if (this.model) {
			// this is not called by Companion directly, so we need to call this to load the actions into Companion
			this.init_variables()
			this.updateActions()

			// start up the TCP socket and attmept to get connected to the NovaStar device
			this.initTCP()
		}
	}

	// calculates the checksum for dynamic commands
	getCommandChecksum(pipCommandBuffer) {
		// we can't include the first two bytes in our checksum calculation, so we are taking a subarray excluding the first two bytes
		const summableBuffer = pipCommandBuffer.subarray(2)

		let sum = 0

		// sum up all of the bytes (except for the first two bytes)
		for (let i = 0; i < summableBuffer.length; i++) {
			sum += summableBuffer[i]
		}

		// add the magic number (from novastar) to the end of the sum to generate the checksum
		sum += 0x5555

		// split the sum into two bytes in little endian, this will be placed on the end of our command to serve as the checksum
		const resultChecksumBuffer = Buffer.allocUnsafe(2)
		resultChecksumBuffer.writeUInt16LE(sum)

		return resultChecksumBuffer
	}

	initTCP() {
		let receivebuffer = Buffer.from('')

		clearTimeout(this.handshakeTimer)
		this.handshakeOk = false
		if (this.socket !== undefined) {
			// clean up the socket and keep Companion connection status up to date
			this.socket.destroy()
			delete this.socket
			this.updateStatus(InstanceStatus.Disconnected, 'disconnected')
		}

		// use TCP port 5200 by default
		this.config.port = 5200

		if (this.config.modelID == 'vxPro') {
			this.config.port = 15200
		}

		if (this.config.host) {
			// create a TCPHelper instance to use as our TCP socket
			this.socket = new TCPHelper(this.config.host, this.config.port)

			this.updateStatus(InstanceStatus.Connecting, `Connecting to ${this.config.host}`)

			this.socket.on('status_change', (status, message) => {
				this.log('debug', message)
			})

			this.socket.on('error', (err) => {
				// make sure that we log and update Companion connection status for a network failure
				this.log('Network error', err)
				this.log('error', 'Network error: ' + err.message)
				this.updateStatus(InstanceStatus.ConnectionFailure, `Cannot connect to ${this.config.host}`)
			})

			this.socket.on('connect', () => this.handshake())

			this.socket.on('data', (chunk) => {
				// separate buffered stream into parsed messages
				let i = 0,
					msg = Buffer.from(''),
					offset = 0,
					dataLen = 0,
					calcChk = []
				receivebuffer = Buffer.concat([receivebuffer, chunk])
				while (receivebuffer.length > 19)
					if (receivebuffer[0] != this.bAck[0]) {
						receivebuffer = receivebuffer.subarray(1)
					} else if (receivebuffer.length > 19 && receivebuffer[1] == this.bAck[1]) {
						// check for any data
						dataLen = receivebuffer.readInt16LE(16)
						offset = 20 + dataLen
						if (receivebuffer.length >= offset) {
							// so far, length is OK
							// now verify the checksum
							msg = receivebuffer.subarray(0, offset - 2)
							calcChk = this.getCommandChecksum(msg)
							if (receivebuffer.readInt16LE(offset - 2) == calcChk.readInt16LE(0)) {
								const msgId = msg[3]
								// message is 'good'
								this.log('debug', `emit 'response${msgId}' ${this.toHexString(receivebuffer.subarray(0, offset), ':')}`)

								if (!this.socket?.emit(`response${msgId}`, msg)) {
									this.log(
										'debug',
										`       No listener: Loc ${this.msgLocation(msg)} Len ${msg.readInt16LE(16)}\n\t\tData ${this.msgData(msg)}\n`,
									)
								}
							}
							receivebuffer = receivebuffer.subarray(offset)
						}
					}
			})

			// this.socket.on('response', (msg) => {
			// 	this.log('debug', `<== ${this.toHexString(msg, ':')}\n`)
			// 	this.log('debug', `    # ${msg[3]} Loc ${this.msgLocation(msg)} Data ${this.msgData(msg)}\n`)
			// })
		}
	}

	// build a read request for `length` bytes at `address` on the first device of `deviceType` (0 = sending card, 1 = receiving card)
	readCommand(deviceType, address, length) {
		const cmd = Buffer.from([
			0x55,
			0xaa, // header
			0x00, // ack (unused)
			0x00, // serial counter
			0xfe, // source address
			0x00, // destination address
			deviceType, // device type
			0x00, // port address
			0x00,
			0x00, // board address
			0x00, // code (read)
			0x00, // reserved
			0x00,
			0x00,
			0x00,
			0x00, // register address
			0x00,
			0x00, // data length
		])
		cmd.writeUInt32LE(address, 12)
		cmd.writeUInt16LE(length, 16)
		return Buffer.concat([cmd, this.getCommandChecksum(cmd)])
	}

	async probe(label, cmd) {
		try {
			const data = await this.sendMessage(cmd, REPLY_TIMEOUT)
			this.log('debug', `${label} = ${data}`)
			return data
		} catch (err) {
			this.log('debug', `${label} probe failed: ${err.message}`)
			return undefined
		}
	}

	// The controller ID read is the handshake; it retries until the device answers. Later reads are optional.
	async handshake() {
		clearTimeout(this.handshakeTimer)
		this.handshakeOk = false
		const socket = this.socket

		const ctrlId = await this.probe('Controller ID', this.readCommand(0, 0x00000002, 2))
		if (socket !== this.socket || !socket.isConnected) return
		if (ctrlId === undefined) {
			this.updateStatus(
				InstanceStatus.UnknownError,
				'No M3 protocol response on TCP 5200. Confirm LAN control is enabled on the processor.',
			)
			this.handshakeTimer = setTimeout(() => this.handshake(), HANDSHAKE_RETRY)
			return
		}

		this.handshakeOk = true
		this.updateStatus(InstanceStatus.Ok, 'Connected')
		this.setVariableValues({ ctrl_id: ctrlId, ctrl_type: nova_config.MODEL_IDS[ctrlId]?.label || 'Unknown' })

		const [, , fw, brightness] = await Promise.all([
			this.probe('Receiver ID', this.readCommand(1, 0x00000002, 2)),
			this.probe('DVI Status', this.readCommand(0, 0x02000017, 1)),
			this.probe('Controller FW', this.readCommand(0, 0x04100004, 4)),
			this.probe('Brightness', this.readCommand(1, 0x02000001, 5)),
			this.probe('Display Mode', this.readCommand(1, 0x02000100, 3)),
		])

		if (fw && fw.length >= 8) {
			this.setVariableValues({
				ctrl_fw: `${parseInt(fw.slice(0, 2), 16)}.${parseInt(fw.slice(2, 4), 16)}.${parseInt(fw.slice(4, 6), 16)}.${parseInt(fw.slice(6, 8), 16)}`,
			})
		}
		if (brightness && brightness.length >= 2) {
			this.brite = Math.round(((parseInt(brightness.slice(0, 2), 16) * 100) / 255) * 2) / 2
			this.setVariableValues({ brite: this.brite })
		}
		this.log('debug', 'Connected')
	}

	// assemble command and send it. Rejects if it can't be sent or no reply arrives within timeoutMs.
	async sendMessage(cmd, timeoutMs) {
		return new Promise((resolve, reject) => {
			const socket = this.socket
			if (!socket) {
				reject(new Error('Not connected'))
				return
			}

			let msg = Buffer.from(cmd.subarray(0, cmd.length - 2))
			let isQuery = msg[10] == 0
			let msgId = this.msgCounter++ % 256
			const event = `response${msgId}`
			msg[3] = msgId
			msg = Buffer.concat([msg, this.getCommandChecksum(msg)])
			this.log('debug', `==> ${isQuery ? ' request ' : ''}${this.toHexString(msg, ':')}`)

			const onResponse = (response) => {
				clearTimeout(timer)
				const data = this.msgData(response)
				this.log('debug', `<== ${this.toHexString(response, ':')}\n`)
				this.log('debug', `    # ${response[3]} Loc ${this.msgLocation(response)} Data ${data}\n`)
				if (this.handshakeOk) this.updateStatus(InstanceStatus.Ok, '')
				resolve(isQuery ? data : undefined)
			}

			const fail = (err) => {
				clearTimeout(timer)
				socket.removeListener(event, onResponse)
				reject(err)
			}

			const timer = setTimeout(() => fail(new Error('Timed out waiting for a protocol response')), timeoutMs)

			socket.once(event, onResponse)
			// TCPHelper.send resolves false rather than rejecting when the socket isn't connected
			socket.send(msg).then((sent) => {
				if (!sent) fail(new Error('Not connected'))
			}, fail)
		})
	}

	// for actions, which don't wait on the reply
	sendCommand(cmd) {
		this.sendMessage(cmd, REPLY_TIMEOUT).catch((err) => this.log('debug', `Command not acknowledged: ${err.message}`))
	}

	async configUpdated(config) {
		// handle if the connection needs to be reset (ex. if the user changes the IP address,
		// and we need to re-connect the socket to the new address)
		let resetConnection = false

		if (this.config.host != config.host || this.config.modelID != config.modelID) {
			resetConnection = true
		}

		this.setConfig(config)
		if (!this.model) return

		// variables are only defined in init when a model was already set
		this.init_variables()
		// re-build actions for current model
		this.updateActions()

		if (resetConnection === true || this.socket === undefined) {
			this.initTCP()
		}
	}
}

runEntrypoint(NovaStarInstance, [])
