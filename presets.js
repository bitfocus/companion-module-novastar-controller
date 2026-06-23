import { combineRgb } from '@companion-module/base'
import * as nova_config from './choices.js'

/**
 * Build dynamic preset definitions based on the selected processor model.
 * Only presets for actions available on the selected processor are generated.
 */
export function getPresets(instance) {
	const presets = {}
	const model = instance.model

	if (!model) return presets

	const WHITE = combineRgb(255, 255, 255)
	const BLACK = combineRgb(0, 0, 0)
	const RED = combineRgb(255, 0, 0)
	const BLUE = combineRgb(0, 0, 255)
	const ORANGE = combineRgb(255, 128, 0)
	const DARK_RED = combineRgb(128, 0, 0)
	const DARK_BLUE = combineRgb(0, 0, 128)
	const GREY = combineRgb(64, 64, 64)

	// ======================== DISPLAY MODES ========================

	if (model.displayModes) {
		model.displayModes.forEach((dm) => {
			const isBlack = dm.label.toLowerCase().includes('black') || dm.label.toLowerCase().includes('ftb')
			const isFreeze = dm.label.toLowerCase().includes('freeze')

			presets[`display_mode_${dm.id}`] = {
				type: 'button',
				category: 'Display Mode',
				name: dm.label,
				style: {
					text: dm.label,
					size: '18',
					color: WHITE,
					bgcolor: isBlack ? DARK_RED : isFreeze ? DARK_BLUE : BLACK,
				},
				steps: [
					{
						down: [{ actionId: 'change_display_mode', options: { display_mode: dm.id } }],
					},
				],
				feedbacks: [
					{
						feedbackId: 'display_mode_match',
						options: { display_mode: dm.id },
						style: { bgcolor: combineRgb(0, 255, 0), color: BLACK },
					},
				],
			}
		})

		// FTB toggle
		const normalMode = model.displayModes.find((dm) => dm.label.toLowerCase().includes('normal'))
		const freezeMode = model.displayModes.find((dm) => dm.label.toLowerCase().includes('freeze'))
		const blackMode = model.displayModes.find(
			(dm) => dm.label.toLowerCase().includes('black') || dm.label.toLowerCase().includes('ftb')
		)

		if (normalMode && blackMode) {
			presets['toggle_ftb'] = {
				type: 'button',
				category: 'Display Mode',
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
		}

		if (normalMode && freezeMode) {
			presets['toggle_freeze'] = {
				type: 'button',
				category: 'Display Mode',
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
		}
	}

	// ======================== BRIGHTNESS ========================

	if (model.brightness) {
		for (let pct = 0; pct <= 100; pct += 10) {
			const intensity = Math.round((pct / 100) * 200) + 55
			const bg = pct === 0 ? GREY : pct === 100 ? WHITE : combineRgb(intensity, intensity, 0)
			const fg = pct >= 75 ? BLACK : WHITE

			presets[`brightness_${pct}`] = {
				type: 'button',
				category: 'Brightness',
				name: `Brightness ${pct}%`,
				style: {
					text: `${pct}%`,
					size: '24',
					color: fg,
					bgcolor: bg,
				},
				steps: [
					{
						down: [
							{
								actionId: 'set_brightness',
								options: { mode: 'S', which: 'O', value: String(pct), adj: '0' },
							},
						],
					},
				],
				feedbacks: [
					{
						feedbackId: 'brightness_match',
						options: { brightness: pct },
						style: { bgcolor: combineRgb(255, 0, 0), color: WHITE },
					},
				],
			}
		}

		presets['brightness_up'] = {
			type: 'button',
			category: 'Brightness',
			name: 'Brightness +5%',
			style: { text: 'Bright\\n+5%', size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [
				{
					down: [{ actionId: 'set_brightness', options: { mode: 'A', which: 'O', value: '0', adj: '5' } }],
				},
			],
			feedbacks: [],
		}

		presets['brightness_down'] = {
			type: 'button',
			category: 'Brightness',
			name: 'Brightness -5%',
			style: { text: 'Bright\\n-5%', size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [
				{
					down: [{ actionId: 'set_brightness', options: { mode: 'A', which: 'O', value: '0', adj: '-5' } }],
				},
			],
			feedbacks: [],
		}
	}

	// ======================== INPUTS ========================

	if (model.inputs) {
		model.inputs.forEach((input) => {
			presets[`input_${input.id}`] = {
				type: 'button',
				category: 'Inputs',
				name: input.label,
				style: { text: input.label, size: 'auto', color: WHITE, bgcolor: BLACK },
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
		})
	}

	// ======================== PRESETS ========================

	if (model.presets) {
		model.presets.forEach((p, index) => {
			const presetNum = index + 1
			presets[`preset_${p.id}`] = {
				type: 'button',
				category: 'Presets',
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
		})
	}

	// ======================== WORKING MODES ========================

	if (model.workingModes) {
		model.workingModes.forEach((wm) => {
			presets[`working_mode_${wm.id}`] = {
				type: 'button',
				category: 'Working Mode',
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
		})
	}

	// ======================== PIP ON/OFF ========================

	if (model.pipOnOffs) {
		model.pipOnOffs.forEach((pip) => {
			presets[`pip_${pip.id}`] = {
				type: 'button',
				category: 'PIP',
				name: pip.label,
				style: { text: `PIP\\n${pip.label}`, size: '18', color: WHITE, bgcolor: BLACK },
				steps: [
					{ down: [{ actionId: 'pip_onoff', options: { value: pip.id } }] },
				],
				feedbacks: [],
			}
		})
	}

	// ======================== TEST PATTERNS ========================

	nova_config.CHOICES_TESTPATTERNS.forEach((tp) => {
		const isOff = tp.label.toLowerCase().includes('off')
		const label = tp.label.toLowerCase()
		const needsSmallFont = label.includes('horizontal') || label.includes('diagonal')

		presets[`test_pattern_${tp.id}`] = {
			type: 'button',
			category: 'Test Patterns',
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
	})

	// ======================== SCALING ========================

	if (model.scaling) {
		nova_config.CHOICES_SCALING.forEach((s) => {
			presets[`scaling_${s.id}`] = {
				type: 'button',
				category: 'Scaling',
				name: s.label,
				style: { text: s.label, size: '18', color: WHITE, bgcolor: BLACK },
				steps: [
					{ down: [{ actionId: 'change_scaling', options: { scale: s.id } }] },
				],
				feedbacks: [],
			}
		})
	}

	// ======================== VX6s SWITCHER ========================

	if (instance.config.modelID == 'vx6s') {
		presets['take'] = {
			type: 'button',
			category: 'Switcher',
			name: 'TAKE',
			style: { text: 'TAKE', size: '24', color: WHITE, bgcolor: RED },
			steps: [
				{ down: [{ actionId: 'take', options: {} }] },
			],
			feedbacks: [],
		}

		if (model.presets) {
			model.presets.forEach((p, index) => {
				const presetNum = index + 1
				presets[`preset_take_${p.id}`] = {
					type: 'button',
					category: 'Preset + Take',
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
			})
		}
	}

	return presets
}
