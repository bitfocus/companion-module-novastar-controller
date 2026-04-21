import * as nova_config from './choices.js'
import * as pro from './choices_pro.js'
import { Regex, InstanceStatus } from '@companion-module/base'

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
	instance
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

function makeBrightnessCommand(pct, instance, which) {
	let val = Math.round((255 * pct) / 100)
	let buf = []

	// pre-fill buffer
	buf.push(
		//             55:   aa:   00:   07:   fe:   ff:   01:   ff:   ff:   ff:   01:   00:
		Buffer.from([0x55, 0xaa, 0x00, 0x00, 0xfe, 0xff, 0x01, 0xff, 0xff, 0xff, 0x01, 0x00]),
		Buffer.from([parseInt('ORGBV'.indexOf(which)) + 1]), // 01:
		//             00:   00:   02:   01:   00:
		Buffer.from([0x00, 0x00, 0x02, 0x01, 0x00]),
		Buffer.from([val]),
	)
	buf.push(instance.getCommandChecksum(Buffer.concat(buf)))

	return Buffer.concat(buf)
}

// the instance is passed in from index.js, so that we have access to the main instance for the TCP socket, etc.
export const getActions = function (instance) {
	let actions = {}

	// Brightness
	// VX6s, VX4S, NovaProHD, MCTRL4k, NovaPro UHD, NovaPro UHD Jr , VX1000, VX 600, VX16S
	// if (
	// 	instance.config.modelID == 'vx4s' ||
	// 	instance.config.modelID == 'vx6s' ||
	// 	instance.config.modelID == 'mctrl4k' ||
	// 	instance.config.modelID == 'novaProHD' ||
	// 	instance.config.modelID == 'novaProUHD' ||
	// 	instance.config.modelID == 'novaProUHDJr' ||
	// 	instance.config.modelID == 'vx1000' ||
	// 	instance.config.modelID == 'vx600' ||
	// 	instance.config.modelID == 'vx16s'
	// ) {
	if (instance.model.brightness) {
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
				let element = instance.model.brightness.find((element) => element.id === event.options.brightness)

				instance.sendMessage(element.cmd)

				// Optimistic feedback update - parse percentage from label
				const pctMatch = element.label.match(/(\d+)/)
				if (pctMatch) {
					instance.updateState('brightness', parseInt(pctMatch[1]))
				}
			},
		}
	}

	actions['set_brightness'] = {
		name: 'Set Brightness',
		options: [
			{
				type: 'dropdown',
				label: 'Set / Adjust',
				id: 'mode',
				default: 'S',
				disableAutoExpression: true,
				choices: [
					{ id: 'A', label: 'Adjust +/- Value' },
					{ id: 'S', label: 'Set Direct Value' },
				],
			},
			{
				type: 'dropdown',
				label: 'Which Color?',
				id: 'which',
				default: 'O',
				choices: [
					{ id: 'O', label: 'Overall/Global' },
					{ id: 'R', label: 'Red' },
					{ id: 'G', label: 'Green' },
					{ id: 'B', label: 'Blue' },
					{ id: 'V', label: 'Virtual Red' },
				],
			},
			{
				type: 'textinput',
				label: 'Value (0-100)',
				id: 'value',
				isVisibleExpression: '$(options:mode) == "S"',
				default: 0,
				useVariables: true,
				regex: Regex.FLOAT,
			},

			{
				type: 'textinput',
				label: 'By (+/-) ',
				id: 'adj',
				default: 0,
				isVisibleExpression: '$(options:mode) == "A"',
				useVariables: true,
				regex: Regex.SIGNED_FLOAT,
			},
		],
		callback: async (event) => {
			const val = parseFloat(event.options.value)
			const aVal = parseFloat(event.options.adj) || 0
			const which = event.options.which || 'O'
			let wb = 'brite' + (which == 'O' ? '' : '_' + which.toLowerCase())

			let newVal = event.options.mode == 'A' ? instance[wb] + aVal : val
			newVal = Math.max(0, Math.min(100, newVal))
			instance[wb] = newVal
			instance.setVariableValues({ [wb]: newVal })
			let cmd = makeBrightnessCommand(newVal, instance, which)
			instance.log('debug', instance.toHexString(cmd))
			instance.sendMessage(cmd)

			// Optimistic feedback update for overall brightness
			if (which === 'O') {
				instance.updateState('brightness', Math.round(newVal))
			}
		},
		// }
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

				instance.sendMessage(element.cmd)
				instance.updateState('activeInput', event.options.input)
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
				allowCustom: true,
				choices: nova_config.CHOICES_TESTPATTERNS,
			},
		],
		callback: async (event) => {
			let element = nova_config.CHOICES_TESTPATTERNS.find((element) => element.id === event.options.pattern)

			instance.sendMessage(element.cmd)
		},
	}

	// Select test pattern
	//

	async function sendTestPatternCmd(event, ctx, list = '') {
		let which = event.options.pattern
		// see if it's a custom expression
		let pat_list = list == 'vx' ? nova_config.CHOICES.TESTPATTERN_VX : nova_config.CHOICES.TESTPATTERN

		let element = pat_list.find((element) => element.id == which)

		if (element == undefined) {
			which = parseInt(event.options.pattern)
			element = pat_list[which]
		}

		if (element == undefined) {
			instance.updateStatus(InstanceStatus.UnknownWarning, `Invalid Test Pattern #${which}`)
		} else {
			let msg = Buffer.concat([
				Buffer.from(instance.bSop), // Start output packet
				Buffer.from([0, 0, 0xfe]), // ACK, count, source (fe = computer)
				Buffer.from(element.dest, 'hex'), // message destination, device, address
				Buffer.from([1, 0]), // 1 (command), 0 (reserved)
				Buffer.from(element.loc, 'hex'),
				Buffer.from([0, 0]), // place for 'length' of data
			])
			if (element.len > 0) {
				msg.writeInt16LE(element.len, 16)
				msg = Buffer.concat([msg, Buffer.from(element.val, 'hex')])
			}
			msg = Buffer.concat([msg, instance.getCommandChecksum(msg)]) // add

			instance.sendMessage(msg)
		}
	}

	// Test patterns
	// VX with variables
	if (instance.config.modelID && instance.config.modelID.slice(0, 2) == 'vx') {
		actions['test_pattern_vx'] = {
			name: 'Select Test Pattern (VX Series)',
			options: [
				{
					type: 'dropdown',
					label: 'Which Pattern?',
					id: 'pattern',
					default: nova_config.CHOICES.TESTPATTERN_VX[0].id,
					allowCustom: true,
					choices: nova_config.CHOICES.TESTPATTERN_VX,
				},
			],
			callback: async (event, ctx) => {
				await sendTestPatternCmd(event, ctx, 'vx')
			},
		}
	}

	// Test Patterns
	// All models with variables
	actions['test_pattern'] = {
		name: 'Select Test Pattern',
		options: [
			{
				type: 'dropdown',
				label: 'Which Pattern?',
				id: 'pattern',
				default: nova_config.CHOICES.TESTPATTERN[0].id,
				allowCustom: true,
				choices: nova_config.CHOICES.TESTPATTERN,
			},
		],
		callback: async (event, ctx) => {
			await sendTestPatternCmd(event, ctx, '')
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

			instance.sendMessage(element.cmd)
			instance.updateState('displayMode', event.options.display_mode)
		},
	}

	// Working mode
	// VX6s & J6
	if (instance.model.workingModes) {
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

				instance.sendMessage(element.cmd)
				instance.updateState('workingMode', event.options.working_mode)
			},
		}
	}

	// PIP
	if (instance.model.pipOnOffs) {
		actions['pip_onoff'] = {
			name: 'PIP On/Off',
			options: [
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'value',
					default: '0',
					choices: instance.model.pipOnOffs,
				},
			],
			callback: async (event) => {
				let element = instance.model.pipOnOffs.find((element) => element.id === event.options.value)

				instance.sendMessage(element.cmd)
			},
		}
	}

	// Layer update / configuration
	if (instance.model.layers) {
		actions['update_layer_vx1000'] = {
			name: 'Update Layer VX',
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
					instance
				)

				instance.sendMessage(cmd)
			},
		}
	}

	// Scaling
	//	if (instance.config.modelID == 'vx4s' || instance.config.modelID == 'novaProHD') {
	if (instance.model.scaling) {
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

				instance.sendMessage(element.cmd)
			},
		}
	}

	// LOAD PRESETS
	// VX4S, NovaPro UHD Jr,vx1000
	// if (
	// 	instance.config.modelID == 'vx4s' ||
	// 	instance.config.modelID == 'novaProUHDJr' ||
	// 	instance.config.modelID == 'vx1000' ||
	// 	instance.config.modelID == 'vx600' ||
	// 	instance.config.modelID == 'vx16s' ||
	// 	instance.config.modelID == 'j6'
	// ) {
	if (instance.model.presets) {
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

				instance.sendMessage(element.cmd)
				instance.updateState('activePreset', event.options.preset)
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

				instance.sendMessage(element.cmd)
				instance.updateState('activePreset', event.options.preset)
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

				instance.sendMessage(cmd)
			},
		}
	}

	// ==================== VX Pro Series actions ====================
	// Gated on `model.series === 'pro'`. These expose the extended feature set
	// from the VX Pro Series V1.0.5 protocol spec — save/delete preset, layer
	// switch, USB playback, audio enable/mute/volume/source, HDCP, color
	// temperature, 3D, restart. The base brightness / preset / input / display-
	// mode actions above already work for Pro models since they come from the
	// same CONFIG_MODEL shape.
	if (instance.model.series === 'pro') {
		actions['pro_save_preset'] = {
			name: 'Pro: Save Preset',
			options: [{ type: 'dropdown', label: 'Preset', id: 'preset', default: '0', choices: pro.CHOICES_PRESETS_PRO_SAVE }],
			callback: async (event) => {
				const el = pro.CHOICES_PRESETS_PRO_SAVE.find((x) => x.id === event.options.preset)
				if (el) instance.sendMessage(el.cmd)
			},
		}
		actions['pro_delete_preset'] = {
			name: 'Pro: Delete Preset',
			options: [{ type: 'dropdown', label: 'Preset', id: 'preset', default: '0', choices: pro.CHOICES_PRESETS_PRO_DELETE }],
			callback: async (event) => {
				const el = pro.CHOICES_PRESETS_PRO_DELETE.find((x) => x.id === event.options.preset)
				if (el) instance.sendMessage(el.cmd)
			},
		}

		actions['pro_layer_switch'] = {
			name: 'Pro: Layer On/Off',
			options: [{ type: 'dropdown', label: 'Layer', id: 'layer', default: 'L1_on', choices: pro.CHOICES_LAYER_ONOFF_PRO }],
			callback: async (event) => {
				const el = pro.CHOICES_LAYER_ONOFF_PRO.find((x) => x.id === event.options.layer)
				if (el) instance.sendMessage(el.cmd)
			},
		}

		actions['pro_usb_playback'] = {
			name: 'Pro: USB Playback',
			options: [{ type: 'dropdown', label: 'Action', id: 'action', default: '1', choices: pro.CHOICES_USB_PLAYBACK_PRO }],
			callback: async (event) => {
				const el = pro.CHOICES_USB_PLAYBACK_PRO.find((x) => x.id === event.options.action)
				if (el) instance.sendMessage(el.cmd)
			},
		}

		actions['pro_audio_enable'] = {
			name: 'Pro: Audio Enable',
			options: [],
			callback: async () => instance.sendMessage(pro.CMD_AUDIO_ENABLE_PRO),
		}
		actions['pro_audio_mute'] = {
			name: 'Pro: Audio Mute',
			options: [],
			callback: async () => instance.sendMessage(pro.CMD_AUDIO_MUTE_PRO),
		}
		actions['pro_audio_volume'] = {
			name: 'Pro: Set Screen Volume',
			options: [{ type: 'number', label: 'Volume (0-100)', id: 'volume', default: 50, min: 0, max: 100 }],
			callback: async (event) => {
				instance.sendMessage(pro.buildVolumeCmd(parseInt(event.options.volume, 10)))
			},
		}
		actions['pro_audio_source'] = {
			name: 'Pro: Set Audio Source',
			options: [{ type: 'dropdown', label: 'Source', id: 'source', default: 'hdmi1', choices: pro.CHOICES_AUDIO_SRC_PRO }],
			callback: async (event) => {
				const el = pro.CHOICES_AUDIO_SRC_PRO.find((x) => x.id === event.options.source)
				if (el) instance.sendMessage(el.cmd)
			},
		}

		actions['pro_hdcp'] = {
			name: 'Pro: HDCP Enable/Disable',
			options: [
				{
					type: 'dropdown', label: 'HDCP', id: 'state', default: '1',
					choices: [{ id: '1', label: 'Enable' }, { id: '0', label: 'Disable' }],
				},
			],
			callback: async (event) => {
				instance.sendMessage(event.options.state === '1' ? pro.CMD_HDCP_ENABLE_PRO : pro.CMD_HDCP_DISABLE_PRO)
			},
		}

		actions['pro_color_temp'] = {
			name: 'Pro: Set Color Temperature',
			options: [{ type: 'number', label: 'Kelvin (e.g. 6500)', id: 'k', default: 6500, min: 2000, max: 10000 }],
			callback: async (event) => {
				instance.sendMessage(pro.buildColorTempCmd(parseInt(event.options.k, 10)))
			},
		}

		actions['pro_3d'] = {
			name: 'Pro: 3D Control',
			options: [{ type: 'dropdown', label: 'Command', id: 'cmd', default: 'enable', choices: pro.CHOICES_3D_PRO }],
			callback: async (event) => {
				const el = pro.CHOICES_3D_PRO.find((x) => x.id === event.options.cmd)
				if (el) instance.sendMessage(el.cmd)
			},
		}

		actions['pro_restart'] = {
			name: 'Pro: Restart Device',
			options: [],
			callback: async () => instance.sendMessage(pro.CMD_RESTART_PRO),
		}

		actions['pro_factory_reset'] = {
			name: 'Pro: Factory Reset',
			options: [
				{
					type: 'dropdown', label: 'Retain IP?', id: 'keep', default: '1',
					choices: [{ id: '1', label: 'Retain IP' }, { id: '0', label: 'Reset everything' }],
				},
			],
			callback: async (event) => {
				instance.sendMessage(event.options.keep === '1' ? pro.CMD_FACTORY_RESET_KEEP_IP : pro.CMD_FACTORY_RESET_DROP_IP)
			},
		}
	}

	return actions
}
