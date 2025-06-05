const nova_config = require('./choices')

// function to build the byte sequence given the configurable layer options for configuring layers on VX1000
function getLayerUpdateCommandVX1000(
	enabled,
	initialX,
	initialY,
	hWidth,
	vHeight,
	layerBuffer,
	cardSlotBuffer,
	layerPriorityBuffer,
	connectorCodeBuffer,
	opacity,
) {
	let bufferArray = []

	// the initial header of the command
	bufferArray.push(
		Buffer.from([
			0x55, 0xaa, 0x00, 0x00, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x40, 0x00, 0x02, 0x13, 0x30, 0x00,
		]),
	)

	// whether the layer is enabled or not
	bufferArray.push(enabled == '1' ? Buffer.from([0x01]) : Buffer.from([0x00]))

	// layer number
	bufferArray.push(layerBuffer)

	// CardNo
	bufferArray.push(cardSlotBuffer)

	// Priority
	bufferArray.push(layerPriorityBuffer)

	// Source (connector code)
	bufferArray.push(connectorCodeBuffer)

	// initial X position
	const initialXBuffer = Buffer.allocUnsafe(4)
	initialXBuffer.writeInt32LE(initialX)
	bufferArray.push(initialXBuffer)

	// initial Y position
	const initialYBuffer = Buffer.allocUnsafe(4)
	initialYBuffer.writeInt32LE(initialY)
	bufferArray.push(initialYBuffer)

	// initial width
	const initialWidthBuffer = Buffer.allocUnsafe(4)
	initialWidthBuffer.writeInt32LE(hWidth)
	bufferArray.push(initialWidthBuffer)

	// initial height
	const initialHeightBuffer = Buffer.allocUnsafe(4)
	initialHeightBuffer.writeInt32LE(vHeight)
	bufferArray.push(initialHeightBuffer)

	// padding with a bunch of 0 bytes
	bufferArray.push(
		Buffer.from([
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		]),
	)

	const initialOpacityBuffer = Buffer.allocUnsafe(1)
	initialOpacityBuffer.writeInt8(opacity)
	bufferArray.push(initialOpacityBuffer)

	// calculate checksum for the last two bytes
	bufferArray.push(instance.getCommandChecksum(Buffer.concat(bufferArray)))

	// combine all the buffers into a single buffer to send to the device
	let commandBuffer = Buffer.concat(bufferArray)

	// return the final byte stream to send to VX1000
	return commandBuffer
}

function makeBrightnessCommand(pct,instance) {
	let val = Math.round(255 * pct / 100)
	let buf = []

	buf.push(
		Buffer.from([0x55,0xaa,	0x00,	0x00,	0xfe,	0xff,	0x01,	0xff,	0xff,	0xff,	0x01,	0x00,	0x01,	0x00,	0x00,	0x02,	0x01,	0x00,	val,]),
	)
	//buf.push(val)
	buf.push(instance.getCommandChecksum(Buffer.concat(buf)))

	return Buffer.concat(buf)
}

// the instance is passed in from index.js, so that we have access to the main instance for the TCP socket, etc.
exports.getActions = function (instance) {
	let actions = {}

	// Brightness
	// VX6s, VX4S, NovaProHD, MCTRL4k, NovaPro UHD, NovaPro UHD Jr , VX1000, VX 600, VX16S
	if (
		instance.config.modelID == 'vx4s' ||
		instance.config.modelID == 'vx6s' ||
		instance.config.modelID == 'mctrl4k' ||
		instance.config.modelID == 'novaProHD' ||
		instance.config.modelID == 'novaProUHD' ||
		instance.config.modelID == 'novaProUHDJr' ||
		instance.config.modelID == 'vx1000' ||
		instance.config.modelID == 'vx600' ||
		instance.config.modelID == 'vx16s'
	) {
		actions['change_brightness'] = {
			name: 'Change Brightness',
			options: [
				{
					type: 'dropdown',
					name: 'Brightness',
					id: 'brightness',
					default: '0',
					choices: instance.model.brightness,
				},
			],
			callback: async (event) => {
				let element = nova_config.CHOICES_BRIGHTNESS.find((element) => element.id === event.options.brightness)

				instance.socket.send(element.cmd)
			},
		}
		actions['set_brightness'] = {
			name: 'Set Brightness',
			options: [
				{
					type: 'dropdown',
					label: 'Set / Adjust',
					tooltip: 'WIP: Adjust needs feedbacks before\n it can be implemented',
					id: 'mode',
					default: 'S',
					choices: [
						// { id: 'A', label: 'Adjust +/- Value' },
						{ id: 'S', label: 'Set Direct Value' },
					],
				},
				{
					type: 'textinput',
					label: 'Value (%)',
					id: 'value',
					default: 0,
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				let val = parseFloat(await context.parseVariablesInString(event.options.value))
				/*
					Adjust value based on dynamic variable here
				*/
				let cmd = makeBrightnessCommand(val,instance)
				instance.log('debug',instance.toHexString(cmd));
				instance.socket.send(cmd)
			},
		}
	}

	// Change Input
	// VX6s, VX4S, NovaProHD, MCTRL4k, VX1000, VX600

	if (instance.model.inputs) {
		// 	instance.config.modelID == 'vx4s' ||
		// 	instance.config.modelID == 'vx6s' ||
		// 	instance.config.modelID == 'mctrl4k' ||
		// 	instance.config.modelID == 'vx1000' ||
		// 	instance.config.modelID == 'novaProHD' ||
		// 	instance.config.modelID == 'vx600'
		// )
		actions['change_input'] = {
			name: 'Change Input',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: '0',
					choices: instance.model.inputs,
				},
			],
			callback: async (event) => {
				let element = instance.model.inputs.find((element) => element.id === event.options.input)

				instance.socket.send(element.cmd)
			},
		}
	}

	// Change Test patterns
	// All models
	actions['change_test_pattern'] = {
		name: 'Change Test Patterns',
		options: [
			{
				type: 'dropdown',
				label: 'Test Patterns',
				id: 'pattern',
				default: '0',
				choices: nova_config.CHOICES_TESTPATTERNS,
			},
		],
		callback: async (event) => {
			let element = nova_config.CHOICES_TESTPATTERNS.find((element) => element.id === event.options.pattern)

			instance.socket.send(element.cmd)
		},
	}

	// Change Display mode
	// all models
	actions['change_display_mode'] = {
		name: 'Change Display Mode',
		options: [
			{
				type: 'dropdown',
				label: 'Display Mode',
				id: 'display_mode',
				default: '0',
				choices: instance.model.displayModes,
			},
		],
		callback: async (event) => {
			let element = instance.model.displayModes.find((element) => element.id === event.options.display_mode)

			instance.socket.send(element.cmd)
		},
	}

	// Working mode
	// VX6s & J6
	if (instance.model.workingModes) {
		// instance.config.modelID == 'vx6s' || instance.config.modelID == 'j6') {
		actions['change_working_mode'] = {
			name: 'Change Working Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Working Mode',
					id: 'working_mode',
					default: '0',
					choices: instance.model.workingModes,
				},
			],
			callback: async (event) => {
				let element = instance.model.workingModes.find((element) => element.id === event.options.working_mode)

				instance.socket.send(element.cmd)
			},
		}
	}

	// PIP
	// VX4S, NovaProHD
	if (instance.model.piponoffs) {
		// instance.config.modelID == 'vx4s' || instance.config.modelID == 'novaProHD') {
		actions['pip_onoff'] = {
			name: 'PIP On/Off',
			options: [
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'value',
					default: '0',
					choices: instance.model.piponoffs,
				},
			],
			callback: async (event) => {
				let element = instance.model.piponoffs.find((element) => element.id === event.options.value)

				instance.socket.send(element.cmd)
			},
		}
	}

	// Layer update / configuration (VX1000 only)
	if (instance.model.layers) {
		//instance.config.modelID == 'vx1000') {
		actions['update_layer_vx1000'] = {
			name: 'Update Layer VX1000',
			options: [
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'enabled',
					default: '0',
					choices: instance.model.pipOnOffs,
				},
				{
					type: 'dropdown',
					label: 'Layer Number',
					id: 'layerNumber',
					default: '0',
					choices: instance.model.layers,
				},
				{
					type: 'dropdown',
					label: 'Card Number',
					id: 'cardNumber',
					default: '0',
					choices: instance.model.cardNo,
				},
				{
					type: 'dropdown',
					label: 'Layer Priority',
					id: 'layerPriority',
					default: '0',
					choices: instance.model.layerPriority,
				},
				{
					type: 'dropdown',
					label: 'Video Connector',
					id: 'connectorCode',
					default: '0',
					choices: instance.model.connectorCode,
				},
				{
					type: 'number',
					label: 'Opacity (0 - 100)',
					id: 'opacity',
					default: '100',
				},
				{
					type: 'number',
					label: 'Initial X',
					id: 'initialX',
					default: '550',
				},
				{
					type: 'number',
					label: 'Initial Y',
					id: 'initialY',
					default: '0',
				},
				{
					type: 'number',
					label: 'H Width',
					id: 'hWidth',
					default: '1307',
				},
				{
					type: 'number',
					label: 'V Height',
					id: 'vHeight',
					default: '640',
				},
			],
			callback: async (event) => {
				let enabled = event.options.enabled
				let initialX = event.options.initialX
				let initialY = event.options.initialY
				let hWidth = event.options.hWidth
				let vHeight = event.options.vHeight
				let layer = instance.model.layers.find((element) => element.id === event.options.layerNumber)
				let cardNumber = instance.model.cardNo.find((element) => element.id === event.options.cardNumber)
				let layerPriority = instance.model.layerPriority.find((element) => element.id === event.options.layerPriority)
				let connectorCode = instance.model.connectorCode.find((element) => element.id === event.options.connectorCode)
				let opacity = event.options.opacity

				const MAX_INT32 = Math.pow(2, 32) - 1

				// truncate to int and clamp parameter ranges, clamp to 32 bit integer range
				initialX = Math.trunc(initialX)
				initialX = Math.max(0, Math.min(initialX, MAX_INT32))

				initialY = Math.trunc(initialY)
				initialY = Math.max(0, Math.min(initialY, MAX_INT32))

				hWidth = Math.trunc(hWidth)
				hWidth = Math.max(0, Math.min(hWidth, MAX_INT32))

				vHeight = Math.trunc(vHeight)
				vHeight = Math.max(0, Math.min(vHeight, MAX_INT32))

				// Opacity (range between 0x00 - 0x64, 0 - 100 in decimal)
				opacity = Math.trunc(opacity)
				opacity = Math.max(0, Math.min(opacity, 100))

				let cmd = getLayerUpdateCommandVX1000(
					enabled,
					initialX,
					initialY,
					hWidth,
					vHeight,
					layer.cmd,
					cardNumber.cmd,
					layerPriority.cmd,
					connectorCode.cmd,
					opacity,
				)

				instance.socket.send(cmd)
			},
		}
	}

	// Scaling
	// VX4S, NovaProHD
	if (instance.config.modelID == 'vx4s' || instance.config.modelID == 'novaProHD') {
		actions['change_scaling'] = {
			name: 'Change Scaling',
			options: [
				{
					type: 'dropdown',
					label: 'Scale',
					id: 'scale',
					default: '0',
					choices: nova_config.CHOICES_SCALING,
				},
			],
			callback: async (event) => {
				let element = nova_config.CHOICES_SCALING.find((element) => element.id === event.options.scale)

				instance.socket.send(element.cmd)
			},
		}
	}

	// LOAD PRESETS
	// VX4S, NovaPro UHD Jr,vx1000
	if (
		instance.config.modelID == 'vx4s' ||
		instance.config.modelID == 'novaProUHDJr' ||
		instance.config.modelID == 'vx1000' ||
		instance.config.modelID == 'vx600' ||
		instance.config.modelID == 'vx16s' ||
		instance.config.modelID == 'j6'
	) {
		actions['load_preset'] = {
			name: 'Recall Preset',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'preset',
					default: '0',
					choices: instance.model.presets,
				},
			],
			callback: async (event) => {
				let element = instance.model.presets.find((element) => element.id === event.options.preset)

				instance.socket.send(element.cmd)
			},
		}
	}

	// VX6s
	if (instance.config.modelID == 'vx6s') {
		actions['load_preset'] = {
			name: 'Load Preset to Preview',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'preset',
					default: '0',
					choices: instance.model.presets,
				},
			],
			callback: async (event) => {
				let element = instance.model.presets.find((element) => element.id === event.options.preset)

				instance.socket.send(element.cmd)
			},
		}

		actions['take'] = {
			name: 'Take Preview to Program',
			options: [],
			callback: async (event) => {
				let cmd = Buffer.from([
					0x55, 0xaa, 0x00, 0x00, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x2d, 0x00, 0x00, 0x13, 0x01, 0x00,
					0x00, 0x95, 0x56,
				])

				instance.socket.send(cmd)
			},
		}
	}

	return actions
}
