import assert from 'node:assert/strict'
import { after, afterEach, mock, test } from 'node:test'
import * as base from '@companion-module/base'
import * as choices from '../choices.js'

// Keep the real SDK, replacing only its process entrypoint and the host/device boundaries.
let Instance
mock.module('@companion-module/base', {
	exports: {
		default: { ...base },
		InstanceBase: base.InstanceBase,
		TCPHelper: base.TCPHelper,
		InstanceStatus: base.InstanceStatus,
		Regex: base.Regex,
		runEntrypoint: (value) => {
			Instance = value
		},
	},
})
await import('../index.js')
const originalSend = process.send
const messages = []
process.send = (message) => {
	messages.push(message)
	if (message.name === 'parseVariablesInString') {
		const request = JSON.parse(message.payload)
		queueMicrotask(() =>
			process.emit('message', {
				direction: 'response',
				callbackId: message.callbackId,
				success: true,
				payload: JSON.stringify({ text: request.text.replace('$(custom:level)', '25') }),
			}),
		)
	}
}
const previousListeners = process.listeners('message')
function removeTestListeners() {
	for (const listener of process.listeners('message')) {
		if (!previousListeners.includes(listener)) process.removeListener('message', listener)
	}
}
afterEach(removeTestListeners)
after(() => {
	process.send = originalSend
	for (const listener of process.listeners('message')) {
		if (!previousListeners.includes(listener)) process.removeListener('message', listener)
	}
	mock.restoreAll()
})

async function fixture(modelID = 'vx1000') {
	const instance = new Instance({ _isInstanceBaseProps: true, id: 'test', upgradeScripts: [] })
	await instance.init({ modelID, host: '' })
	const sent = []
	instance.sendMessage = (command) => {
		sent.push(Buffer.from(command))
	}
	const execute = async (actionId, options) => {
		const result = await instance._handleExecuteAction({ action: { id: 'a', controlId: 'b', actionId, options } })
		assert.equal(result.success, true, result.errorMessage)
		return sent.at(-1)
	}
	return { instance, sent, execute }
}

function checkChecksum(command) {
	const expected = command.subarray(2, -2).reduce((sum, byte) => sum + byte, 0x5555)
	assert.equal(command.readUInt16LE(command.length - 2), expected)
}

test('brightness accepts saved numeric values, variables, adjustment and clamping through the real SDK', async () => {
	const { instance, execute } = await fixture()
	for (const [options, level, byte] of [
		[{ mode: 'S', which: 'O', value: 50, adj: 0 }, 50, 128],
		[{ mode: 'S', which: 'O', value: '$(custom:level)', adj: 0 }, 25, 64],
		[{ mode: 'A', which: 'O', value: 0, adj: '10' }, 35, 89],
		[{ mode: 'A', which: 'O', value: 0, adj: '100' }, 100, 255],
		[{ mode: 'S', which: 'O', value: '-10', adj: 0 }, 0, 0],
	]) {
		const command = await execute('set_brightness', options)
		assert.equal(command[18], byte)
		assert.equal(instance.getVariableValue('brite'), level)
		checkChecksum(command)
	}
})

test('brightness fields serialize visibility expressions for the host', async () => {
	await fixture()
	const definitions = JSON.parse(messages.filter((m) => m.name === 'setActionDefinitions').at(-1).payload)
	const options = definitions.actions.find((a) => a.id === 'set_brightness').options
	for (const [id, mode] of [
		['value', 'S'],
		['adj', 'A'],
	]) {
		const option = options.find((o) => o.id === id)
		assert.equal(option.isVisibleFnType, 'expression')
		assert.equal(option.isVisibleFn, `$(options:mode) == '${mode}'`)
	}
})

test('model input, display and preset actions preserve published command bytes', async () => {
	for (const [modelID, model] of Object.entries(choices.CONFIG_MODEL)) {
		removeTestListeners()
		const { execute } = await fixture(modelID)
		for (const [action, option, items] of [
			['change_input', 'input', model.inputs],
			['change_display_mode', 'display_mode', model.displayModes],
			['load_preset', 'preset', model.presets],
		]) {
			if (!items?.length) continue
			assert.deepEqual(await execute(action, { [option]: items[0].id }), items[0].cmd, `${modelID} ${action}`)
		}
	}
})

test('VX1000 layer command preserves dimensions, opacity and checksum', async () => {
	const { instance, execute } = await fixture()
	const command = await execute('update_layer_vx1000', {
		enabled: '1',
		layerNumber: instance.model.layers[0].id,
		cardNumber: instance.model.cardNo[0].id,
		layerPriority: instance.model.layerPriority[0].id,
		connectorCode: instance.model.connectorCode[0].id,
		initialX: 550,
		initialY: 0,
		hWidth: 1307,
		vHeight: 640,
		opacity: 100,
	})
	assert.equal(command[18], 1)
	assert.equal(command.readInt32LE(23), 550)
	assert.equal(command.readInt32LE(31), 1307)
	assert.equal(command.readInt32LE(35), 640)
	assert.equal(command.at(-3), 100)
	checkChecksum(command)
})
