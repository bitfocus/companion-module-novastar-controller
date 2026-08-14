import { combineRgb } from '@companion-module/base'
import * as nova_config from './choices.js'

/**
 * Build preset definitions and structure for API 2.0.
 * Returns { structure, presets } for two-arg setPresetDefinitions(structure, presets).
 *
 * NOTE on templates: Per battle-tested migration guide, style cannot vary per template
 * value. Brightness presets need different colors per level, so they use individual
 * presets, not templates. Processor presets (Preset 1-N) are good template candidates
 * since they share identical styling.
 */
export function getPresets(instance) {
	const presets = {}
	const structure = []
	const model = instance.model

	if (!model) return { structure, presets }

	const WHITE = combineRgb(255, 255, 255)
	const BLACK = combineRgb(0, 0, 0)
	const RED = combineRgb(255, 0, 0)
	const BLUE = combineRgb(0, 0, 255)
	const DARK_RED = combineRgb(128, 0, 0)
	const DARK_BLUE = combineRgb(0, 0, 128)
	const GREY = combineRgb(64, 64, 64)

	// ======================== DISPLAY MODES ========================

	if (model.displayModes) {
		const dmSection = { id: 'display_modes', name: 'Display Mode', definitions: [] }
		const dmPresetIds = []

		model.displayModes.forEach((dm) => {
			const isBlack = dm.label.toLowerCase().includes('black') || dm.label.toLowerCase().includes('ftb')
			const isFreeze = dm.label.toLowerCase().includes('freeze')
			const pid = `display_mode_${dm.id}`

			presets[pid] = {
				type: 'simple',
				name: dm.label,
				style: {
					text: dm.label,
					size: '18',
					color: WHITE,
					bgcolor: isBlack ? DARK_RED : isFreeze ? DARK_BLUE : BLACK,
				},
				steps: [
					{ down: [{ actionId: 'change_display_mode', options: { display_mode: dm.id } }] },
				],
				feedbacks: [
					{
						feedbackId: 'display_mode_match',
						options: { display_mode: dm.id },
						style: { bgcolor: combineRgb(0, 255, 0), color: BLACK },
					},
				],
			}
			dmPresetIds.push(pid)
		})

		// FTB toggle
		const normalMode = model.displayModes.find((dm) => dm.label.toLowerCase().includes('normal'))
		const freezeMode = model.displayModes.find((dm) => dm.label.toLowerCase().includes('freeze'))
		const blackMode = model.displayModes.find(
			(dm) => dm.label.toLowerCase().includes('black') || dm.label.toLowerCase().includes('ftb')
		)

		if (normalMode && blackMode) {
			presets['toggle_ftb'] = {
				type: 'simple',
				name: 'FTB Toggle',
				style: { text: 'FTB\\nToggle', size: '18', color: WHITE, bgcolor: DARK_RED },
				steps: [
					{ down: [{ actionId: 'change_display_mode', options: { display_mode: blackMode.id } }] },
					{ down: [{ actionId: 'change_display_mode', options: { display_mode: normalMode.id } }] },
				],
				feedbacks: [
					{
						feedbackId: 'display_mode_match',
						options: { display_mode: blackMode.id },
						style: { bgcolor: RED, color: WHITE },
					},
				],
			}
			dmPresetIds.push('toggle_ftb')
		}

		if (normalMode && freezeMode) {
			presets['toggle_freeze'] = {
				type: 'simple',
				name: 'Freeze Toggle',
				style: { text: 'Freeze\\nToggle', size: '18', color: WHITE, bgcolor: DARK_BLUE },
				steps: [
					{ down: [{ actionId: 'change_display_mode', options: { display_mode: freezeMode.id } }] },
					{ down: [{ actionId: 'change_display_mode', options: { display_mode: normalMode.id } }] },
				],
				feedbacks: [
					{
						feedbackId: 'display_mode_match',
						options: { display_mode: freezeMode.id },
						style: { bgcolor: BLUE, color: WHITE },
					},
				],
			}
			dmPresetIds.push('toggle_freeze')
		}

		dmSection.definitions.push({
			id: 'dm_group', type: 'simple', name: 'Display Modes',
			presets: dmPresetIds,
		})
		structure.push(dmSection)
	}

	// ======================== BRIGHTNESS ========================
	// Template: all buttons same style, feedback highlights the active level

	if (model.brightness) {
		const brightSection = { id: 'brightness', name: 'Brightness', definitions: [] }

		// Template definition — one preset, stamped for each level
		presets['tpl_brightness'] = {
			type: 'simple',
			name: 'Brightness Level',
			localVariables: [
				{ variableName: 'level', variableType: 'simple', startupValue: 100 },
			],
			style: {
				text: '$(local:level)%',
				size: '24',
				color: WHITE,
				bgcolor: BLACK,
			},
			steps: [
				{
					down: [{
						actionId: 'set_brightness',
						options: {
							mode: 'S',
							which: 'O',
							value: { value: '$(local:level)', isExpression: true },
							adj: '0',
						},
					}],
				},
			],
			feedbacks: [
				{
					feedbackId: 'brightness_match',
					options: {
						brightness: { value: '$(local:level)', isExpression: true },
					},
					style: { bgcolor: combineRgb(255, 0, 0), color: WHITE },
				},
			],
		}

		const brightValues = []
		for (let pct = 100; pct >= 0; pct -= 5) {
			brightValues.push({ name: `${pct}%`, value: pct })
		}

		brightSection.definitions.push({
			id: 'brightness_levels', type: 'template', name: 'Brightness Levels',
			presetId: 'tpl_brightness',
			templateVariableName: 'level',
			templateValues: brightValues,
		})

		// Brightness adjust buttons
		presets['brightness_up'] = {
			type: 'simple',
			name: 'Brightness +1%',
			style: { text: 'Bright\\n+1%', size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [
				{ down: [{ actionId: 'set_brightness', options: { mode: 'A', which: 'O', value: '0', adj: '1' } }] },
			],
			feedbacks: [],
		}

		presets['brightness_down'] = {
			type: 'simple',
			name: 'Brightness -1%',
			style: { text: 'Bright\\n-1%', size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [
				{ down: [{ actionId: 'set_brightness', options: { mode: 'A', which: 'O', value: '0', adj: '-1' } }] },
			],
			feedbacks: [],
		}

		brightSection.definitions.push({
			id: 'brightness_adjust', type: 'simple', name: 'Adjust',
			presets: ['brightness_up', 'brightness_down'],
		})

		structure.push(brightSection)
	}

	// ======================== INPUTS ========================

	if (model.inputs) {
		const inputSection = { id: 'inputs', name: 'Inputs', definitions: [] }
		const inputPresetIds = []

		model.inputs.forEach((input) => {
			const pid = `input_${input.id}`
			const label = input.label.toLowerCase()
			// HDMI presets render large (24pt); DisplayPort presets slightly smaller (18pt)
			// to keep the 'DP' / 'DisplayPort' label from clipping. Everything else: auto.
			let size = 'auto'
			if (label.includes('hdmi')) size = '24'
			else if (label.includes('dp') || label.includes('displayport') || label.includes('display port')) size = '18'
			presets[pid] = {
				type: 'simple',
				name: input.label,
				style: { text: input.label, size, color: WHITE, bgcolor: BLACK },
				steps: [
					{ down: [{ actionId: 'change_input', options: { input: input.id } }] },
				],
				feedbacks: [
					{
						feedbackId: 'input_match',
						options: { input: input.id },
						style: { bgcolor: combineRgb(0, 255, 0), color: BLACK },
					},
				],
			}
			inputPresetIds.push(pid)
		})

		inputSection.definitions.push({
			id: 'input_group', type: 'simple', name: 'Input Sources',
			presets: inputPresetIds,
		})
		structure.push(inputSection)
	}

	// ======================== PRESETS ========================

	if (model.presets) {
		const presetSection = { id: 'presets', name: 'Presets', definitions: [] }
		const presetIds = []

		model.presets.forEach((p, index) => {
			const presetNum = index + 1
			const pid = `preset_${p.id}`
			presets[pid] = {
				type: 'simple',
				name: p.label,
				style: {
					text: `Preset\\n${presetNum}`,
					size: '18',
					color: WHITE,
					bgcolor: BLUE,
				},
				steps: [
					{ down: [{ actionId: 'load_preset', options: { preset: p.id } }] },
				],
				feedbacks: [
					{
						feedbackId: 'preset_match',
						options: { preset: p.id },
						style: { bgcolor: combineRgb(0, 255, 0), color: BLACK },
					},
				],
			}
			presetIds.push(pid)
		})

		presetSection.definitions.push({
			id: 'preset_group', type: 'simple', name: 'Load Presets',
			presets: presetIds,
		})
		structure.push(presetSection)
	}

	// ======================== WORKING MODES ========================

	if (model.workingModes) {
		const wmSection = { id: 'working_modes', name: 'Working Mode', definitions: [] }
		const wmIds = []

		model.workingModes.forEach((wm) => {
			const pid = `working_mode_${wm.id}`
			presets[pid] = {
				type: 'simple',
				name: wm.label,
				style: { text: wm.label, size: '18', color: WHITE, bgcolor: combineRgb(64, 0, 128) },
				steps: [
					{ down: [{ actionId: 'change_working_mode', options: { working_mode: wm.id } }] },
				],
				feedbacks: [
					{
						feedbackId: 'working_mode_match',
						options: { working_mode: wm.id },
						style: { bgcolor: combineRgb(0, 255, 0), color: BLACK },
					},
				],
			}
			wmIds.push(pid)
		})

		wmSection.definitions.push({
			id: 'wm_group', type: 'simple', name: 'Working Modes',
			presets: wmIds,
		})
		structure.push(wmSection)
	}

	// ======================== PIP ON/OFF ========================

	if (model.pipOnOffs) {
		const pipSection = { id: 'pip', name: 'PIP', definitions: [] }
		const pipIds = []

		model.pipOnOffs.forEach((pip) => {
			const pid = `pip_${pip.id}`
			presets[pid] = {
				type: 'simple',
				name: pip.label,
				style: { text: `PIP\\n${pip.label}`, size: '18', color: WHITE, bgcolor: BLACK },
				steps: [
					{ down: [{ actionId: 'pip_onoff', options: { value: pip.id } }] },
				],
				feedbacks: [],
			}
			pipIds.push(pid)
		})

		pipSection.definitions.push({
			id: 'pip_group', type: 'simple', name: 'PIP Controls',
			presets: pipIds,
		})
		structure.push(pipSection)
	}

	// ======================== TEST PATTERNS ========================

	{
		const tpSection = { id: 'test_patterns', name: 'Test Patterns', definitions: [] }
		const tpIds = []

		nova_config.CHOICES_TESTPATTERNS.forEach((tp) => {
			const isOff = tp.label.toLowerCase().includes('off')
			const label = tp.label.toLowerCase()
			const needsSmallFont = label.includes('horizontal') || label.includes('diagonal')
			const pid = `test_pattern_${tp.id}`

			presets[pid] = {
				type: 'simple',
				name: tp.label,
				style: {
					text: `Test\\n${tp.label}`,
					size: needsSmallFont ? '14' : '18',
					color: WHITE,
					bgcolor: isOff ? DARK_RED : combineRgb(0, 64, 0),
				},
				steps: [
					{ down: [{ actionId: 'change_test_pattern', options: { pattern: tp.id } }] },
				],
				feedbacks: [],
			}
			tpIds.push(pid)
		})

		tpSection.definitions.push({
			id: 'tp_group', type: 'simple', name: 'Test Patterns',
			presets: tpIds,
		})
		structure.push(tpSection)
	}

	// ======================== SCALING ========================

	if (model.scaling) {
		const scaleSection = { id: 'scaling', name: 'Scaling', definitions: [] }
		const scaleIds = []

		nova_config.CHOICES_SCALING.forEach((s) => {
			const pid = `scaling_${s.id}`
			presets[pid] = {
				type: 'simple',
				name: s.label,
				style: { text: s.label, size: '18', color: WHITE, bgcolor: BLACK },
				steps: [
					{ down: [{ actionId: 'change_scaling', options: { scale: s.id } }] },
				],
				feedbacks: [],
			}
			scaleIds.push(pid)
		})

		scaleSection.definitions.push({
			id: 'scale_group', type: 'simple', name: 'Scaling',
			presets: scaleIds,
		})
		structure.push(scaleSection)
	}

	// ======================== VX6s SWITCHER ========================

	if (instance.config.modelID == 'vx6s') {
		const switcherSection = { id: 'switcher', name: 'Switcher', definitions: [] }
		const switcherIds = []

		presets['take'] = {
			type: 'simple',
			name: 'TAKE',
			style: { text: 'TAKE', size: '24', color: WHITE, bgcolor: RED },
			steps: [
				{ down: [{ actionId: 'take', options: {} }] },
			],
			feedbacks: [],
		}
		switcherIds.push('take')

		if (model.presets) {
			model.presets.forEach((p, index) => {
				const presetNum = index + 1
				const pid = `preset_take_${p.id}`
				presets[pid] = {
					type: 'simple',
					name: `Preset ${presetNum} + Take`,
					style: { text: `Preset\\n${presetNum}\\nTAKE`, size: '14', color: WHITE, bgcolor: combineRgb(128, 0, 0) },
					steps: [
						{
							down: [
								{ actionId: 'load_preset', options: { preset: p.id } },
								{ actionId: 'take', options: {} },
							],
						},
					],
					feedbacks: [
						{
							feedbackId: 'preset_match',
							options: { preset: p.id },
							style: { bgcolor: combineRgb(0, 255, 0), color: BLACK },
						},
					],
				}
				switcherIds.push(pid)
			})
		}

		switcherSection.definitions.push({
			id: 'switcher_group', type: 'simple', name: 'Switcher',
			presets: switcherIds,
		})
		structure.push(switcherSection)
	}

	return { structure, presets }
}
