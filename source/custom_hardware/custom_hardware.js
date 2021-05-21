
const Context = Object.freeze({
  DECLARATION: Symbol("DECLARATION"),
  INITIALIZATION: Symbol("INITIALIZATION")
});


function generateAnalogControls(analog_controls, cv_inputs, context) {
  let all_controls = [].concat((analog_controls || [])).concat(cv_inputs || []);

  if (!all_controls.length)
    return "";

  if (context == Context.DECLARATION) {
    return `
    AnalogControl controls[${all_controls.length}];`;
  } else if (context == Context.INITIALIZATION) {
    return `
        AdcChannelConfig cfg[${all_controls.length}];
${all_controls.map((ctrl, idx) => 
`        cfg[${idx}].InitSingle(seed.GetPin(${ctrl.pin}));`).join("\n")}
        seed.adc.Init(cfg, ${all_controls.length});`;
  }

}


exports.generateCustomHardwareImpl = function(hardware_description) {
  const hardware_implementation = `

using namespace daisy;

typedef struct {
    DaisySeed seed;
  
    ${generateAnalogControls(hardware_description.analog_controls, hardware_description.cv_inputs, Context.DECLARATION)}
  
    #ifdef OOPSY_GATE_IN_COUNT
    daisy::GateIn gate_input[OOPSY_GATE_IN_COUNT];
    #endif
  
    #ifdef OOPSY_HAS_ENCODER
    daisy::Encoder encoder;
    #endif
  
    #ifdef OOPSY_TARGET_HAS_OLED
    daisy::OledDisplay display;
    #endif
  
    #if defined(OOPSY_TARGET_HAS_MIDI_INPUT) || defined(OOPSY_TARGET_HAS_MIDI_OUTPUT)
    daisy::MidiHandler midi;
    #endif
  
    void Init(bool boost) {
        seed.Configure();
        seed.Init(boost);
        ${generateAnalogControls(hardware_description.analog_controls, hardware_description.cv_inputs, Context.INITIALIZATION)}

    }
  } Daisy;
  `
  return hardware_implementation;

}