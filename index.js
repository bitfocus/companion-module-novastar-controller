// NovaStar-Controller
const { InstanceBase, TCPHelper, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const actions = require('./actions')
const nova_config = require('./choices')
const { buffer } = require('stream/consumers')

class NovaStarInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// map the choices model to the internal config data object
		this.CHOICES_MODEL = Object.values(nova_config.CONFIG_MODEL)

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
	}

	toHexString(msg) {
		let resp = ''
		for (var i = 0; i < msg.length; i++) {
			resp += ('0' + msg[i].toString(16)).slice(-2) + ':'
		}
		return resp
	}

	updateActions() {
		this.setActionDefinitions(actions.getActions(this))
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
		this.config = config

		if (this.config.modelID !== undefined) {
			this.model = nova_config.CONFIG_MODEL[this.config.modelID]
		}
		// else {
		// 	this.config.modelID = 'vx4s'
		// 	this.model = nova_config.CONFIG_MODEL['vx4s']
		// }

		// this is not called by Companion directly, so we need to call this to load the actions into Companion
		this.updateActions()

		// start up the TCP socket and attmept to get connected to the NovaStar device
		this.initTCP()
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
		resultChecksumBuffer.writeInt16LE(sum)

		return resultChecksumBuffer
	}

	initTCP() {
		if (this.socket !== undefined) {
			// clean up the socket and keep Companion connection status up to date
			this.socket.destroy()
			delete this.socket
			this.updateStatus(InstanceStatus.Disconnected, 'disconnected')
		}

		if (this.config.port === undefined) {
			// use TCP port 5200 by default
			this.config.port = 5200
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

			this.socket.on('connect', () => {
				// extract the 'Brightness' from the 1st sending card
				// let cmd = []
				// for (const p of nova_config.CHOICES_DISPLAYMODE_MCTRL) {
				// 	cmd = p.cmd.subarray(0, p.cmd.length - 2)

				// 	// cmd.push(
				// 	// 	Buffer.from([
				// 	// 		0x55,
				// 	// 		0xaa, // header
				// 	// 		0x00, // ack (unused)
				// 	// 		0x10 + p, // serial counter
				// 	// 		0xfe, // source address
				// 	// 		0x00, // destination address
				// 	// 		0x01, // device type
				// 	// 		p, // port address
				// 	// 		0x00,
				// 	// 		0x00, // board address
				// 	// 		0x00, // code
				// 	// 		0x00, // reserved
				// 	// 		0x01,
				// 	// 		0x00,
				// 	// 		0x00,
				// 	// 		0x02, // register address
				// 	// 		0x05,
				// 	// 		0x00, // data length
				// 	// 	]),
				// 	// )
				// 	cmd = Buffer.concat([cmd, this.getCommandChecksum(cmd)])
				// 	this.log('debug', this.toHexString(cmd))
				// 	//this.socket.send(Buffer.concat(cmd))
				// }
				this.log('debug', 'Connected')
				this.updateStatus(InstanceStatus.Ok, 'Connected')
			})

			this.socket.on('data', (msg) => {
				this.log('debug', this.toHexString(msg) + '\n')
			})
		}
	}

	async configUpdated(config) {
		// handle if the connection needs to be reset (ex. if the user changes the IP address,
		// and we need to re-connect the socket to the new address)
		let resetConnection = false

		if (this.config.host != config.host) {
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
