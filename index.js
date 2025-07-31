// NovaStar-Controller
import { InstanceBase, TCPHelper, runEntrypoint, InstanceStatus } from '@companion-module/base'
import * as actions from './actions.js'
import * as nova_config from './choices.js'
import { compileVariableDefinitions } from './variables.js'

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
					'This module will connect to a NovaStar MCTRL4K, VX4S, VX6S, NovaProHD, or NovaPro UHD Jr,VX1000, VX600, VX16S & J6 LED Processor.',
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
		if (this.socket !== undefined) {
			this.socket.destroy()
		}

		this.log('destroying module: ', this.id)
	}

	async init(config) {
		if (config.modelID && nova_config.CONFIG_MODEL[config.modelID] == undefined) {
			config.modelID = undefined
		}
		this.config = config

		if (this.config.modelID) {
			this.model = nova_config.CONFIG_MODEL[this.config.modelID]

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

			this.socket.on('connect', async () => {
				// Get the model of the sending card/processor
				let data

				let cmd = Buffer.from([
					0x55,
					0xaa, // header
					0x00, // ack (unused)
					0x00, // serial counter
					0xfe, // source address
					0x00, // destination address
					0x00, // device type
					0x00, // port address
					0x00,
					0x00, // board address
					0x00, // code
					0x00, // reserved
					0x02,
					0x00,
					0x00,
					0x00, // register address
					0x02,
					0x00, // data length
				])

				// get sending device model id
				let msg = Buffer.concat([cmd, this.getCommandChecksum(cmd)])

				this.log('debug', `==> ${this.toHexString(msg, ':')}`)
				data = await this.sendMessage(msg)
				this.log('debug', `Controller ID = ${data}`)
				this.setVariableValues({ ctrl_id: data })
				this.setVariableValues({ ctrl_type: nova_config.MODEL_IDS[data]?.label || 'Unknown' })

				// get first receiving card model id
				msg[6] = 1
				this.log('debug', `==> ${this.toHexString(msg, ':')}`)
				data = await this.sendMessage(msg)
				this.log('debug', `Receiver ID = ${data}`)

				// get DVI Status
				msg[6] = 0
				msg[12] = 0x17
				msg[15] = 2
				msg[16] = 1
				this.log('debug', `==> ${this.toHexString(msg, ':')}`)
				data = await this.sendMessage(msg)
				this.log('debug', `DVI Status = ${data}`)

				// sending card firmware version
				cmd[6] = 0
				cmd[12] = 4
				cmd[13] = 0
				cmd[14] = 0x10
				cmd[15] = 0x04
				cmd[16] = 0x04
				msg = Buffer.concat([cmd, this.getCommandChecksum(cmd)])
				this.log('debug', `==> ${this.toHexString(msg, ':')}`)
				data = await this.sendMessage(msg)
				this.log('debug', `Controller FW = ${data}`)
				this.setVariableValues({
					ctrl_fw: `${parseInt(data.slice(0, 2), 16)}.${parseInt(data.slice(2, 4), 16)}.${parseInt(data.slice(4, 6), 16)}.${parseInt(data.slice(6, 8), 16)}`,
				})

				// // get first receiving card FW version
				// msg[6] = 1
				// this.log('debug', `==> ${this.toHexString(msg, ':')}`)
				// data = await this.sendMessage(msg)
				// this.log('debug', `Receiver fw = ${data}`)
				// this.setVariableValues({ led_fw: `${parseInt(data.slice(0, 2), 16)}.${parseInt(data.slice(2, 4), 16)}.${parseInt(data.slice(4, 6), 16)}.${parseInt(data.slice(6, 8), 16)}`, })

				// brightness from 1st panel
				cmd[6] = 1
				cmd[12] = 1
				cmd[13] = 0
				cmd[14] = 0
				cmd[15] = 2
				cmd[16] = 5

				msg = Buffer.concat([cmd, this.getCommandChecksum(cmd)])
				this.log('debug', `==> ${this.toHexString(msg, ':')}`)
				data = await this.sendMessage(msg)
				this.log('debug', `Brightness = ${data}`)
				this.brite = Math.round(((parseInt(data.slice(0, 2), 16) * 100) / 255) * 2) / 2
				this.setVariableValues({ brite: this.brite })

				cmd = Buffer.from(nova_config.CHOICES_DISPLAYMODE_MCTRL[0].cmd.subarray(0, 20))
				for (let p = 7; p < 11; p++) {
					cmd[p] = 0
				}
				data = await this.sendMessage(cmd)
				this.log('debug', `Display Mode = ${data}`)

				this.log('debug', 'Connected')
				this.updateStatus(InstanceStatus.Ok, 'Connected')
			})

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

	// assemble command and send it
	async sendMessage(cmd) {
		return new Promise(async (resolve) => {
			let msg = Buffer.from(cmd.subarray(0, cmd.length - 2))
			let isQuery = msg[10] == 0
			let msgId = this.msgCounter++ % 256
			let data = ''
			msg[3] = msgId
			msg = Buffer.concat([msg, this.getCommandChecksum(msg)])
			this.log('debug', `==> ${isQuery ? ' request ' : ''}${this.toHexString(msg, ':')}`)
			await this.socket.send(msg)
			this.socket.once(`response${msgId}`, async (msg) => {
				data = this.msgData(msg)
				this.log('debug', `<== ${this.toHexString(msg, ':')}\n`)
				this.log('debug', `    # ${msg[3]} Loc ${this.msgLocation(msg)} Data ${data}\n`)
				this.updateStatus(InstanceStatus.Ok, '')
				if (isQuery) {
					resolve(data)
				}
			})
		})
	}

	async configUpdated(config) {
		// handle if the connection needs to be reset (ex. if the user changes the IP address,
		// and we need to re-connect the socket to the new address)
		let resetConnection = false

		if (this.config.host != config.host || this.config.modelID != config.modelID) {
			resetConnection = true
		}

		this.config = config

		// re-build actions for current model
		this.updateActions()

		if (resetConnection === true || this.socket === undefined) {
			this.initTCP()
		}
	}
}

runEntrypoint(NovaStarInstance, [])
