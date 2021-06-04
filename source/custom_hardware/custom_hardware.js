/**
 * Enumeration of available code gen locations
 */
const Context = Object.freeze({
  DECLARATION: Symbol("DECLARATION"),
  INITIALIZATION: Symbol("INITIALIZATION"),
  PROCESSING: Symbol("PROCESSING")
});


function generateAnalogControls(analog_controls, cv_inputs, context) {
  let all_controls = [].concat((analog_controls || [])).concat(cv_inputs || []);

  if (!all_controls.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    return `
    //  analog_controls declaration
    AnalogControl controls[${all_controls.length}];`;
  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    return `
        // BEGIN - analog_controls initialization
        AdcChannelConfig cfg[${all_controls.length}];
        \n${all_controls.map((ctrl, idx) =>
      `        cfg[${idx}].InitSingle(seed.GetPin(${ctrl.pin}));`).join("\n")}
        seed.adc.Init(cfg, ${all_controls.length});
        \n${all_controls.map((ctrl, idx) =>
        `        controls[${idx}].Init(seed.adc.GetPtr(${idx}), seed.AudioCallbackRate(), ${!!ctrl.flip}, ${!!ctrl.invert});`)
        .join("\n")}
        seed.adc.Start();
        // END - analog_controls initialization`;

  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    return `
          // process analog_controls
          \n${all_controls.map((ctrl, idx) =>
      `        controls[${idx}].Process();`).join("\n")}`;
  }

}

function generateGateIn(gate_inputs, context) {
  if (!gate_inputs || !gate_inputs.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    return `
    //  gate_inputs declaration
    GateIn gate_inputs[${gate_inputs.length}];`;
  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    return `
        // BEGIN - gate_inputs initialization
        dsy_gpio_pin pin;
        \n${gate_inputs.map((gate_input, idx) =>
        `        pin = seed.GetPin(${gate_input.pin});
        gate_inputs[${idx}].Init(&pin);`).join("\n")}
        // END -  gate_inputs initialization`;

  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    return "";
  }

}


function generateEncoders(encoders, context) {
  if (!encoders || !encoders.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    return `
    //  encoders declaration
    Encoder encoders[${encoders.length}];
    Encoder& encoder = encoders[0];`;
  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    return `
        // BEGIN - encoders initialization
        \n${encoders.map((encoder, idx) =>
        `        encoders[${idx}].Init(seed.GetPin(${encoder.pin_a}), seed.GetPin(${encoder.pin_b}), seed.GetPin(${encoder.pin_switch}), seed.AudioCallbackRate());`).join("\n")}
        // END - encoders initialization`;

  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    return `
        // process encoders
        \n${encoders.map((encoder, idx) =>
        `        encoders[${idx}].Debounce();`).join("\n")}`;
  }

}


function generateOledDisplays(oled_displays, context) {
  if (!oled_displays || !oled_displays.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    return `
    //  encoders declaration
    Encoder encoders[${oled_displays.length}];
    Encoder& encoder = encoders[0];`;
  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    return `
        // BEGIN - encoders initialization
        \n${oled_displays.map((oled_display, idx) =>
        `        encoders[${idx}].Init(seed.GetPin(${encoder.pin_a}), seed.GetPin(${encoder.pin_b}), seed.GetPin(${encoder.pin_switch}), seed.AudioCallbackRate());`).join("\n")}
        // END - encoders initialization`;

  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    return "";
  }

}


exports.generateCustomHardwareImpl = function (hardware_description) {
  const hardware_implementation = `

#include "daisy_seed.h"

using namespace daisy;

typedef struct {
    DaisySeed seed;
  
    ${generateAnalogControls(hardware_description.analog_controls, hardware_description.cv_inputs, Context.DECLARATION)}

    ${generateGateIn(hardware_description.gate_inputs, Context.DECLARATION)}

    ${generateEncoders(hardware_description.encoders, Context.DECLARATION)}
  
    void Init(bool boost) 
    {
        seed.Configure();
        seed.Init(boost);

        ${generateAnalogControls(hardware_description.analog_controls, hardware_description.cv_inputs, Context.INITIALIZATION)}

        ${generateGateIn(hardware_description.gate_inputs, Context.INITIALIZATION)}

        ${generateEncoders(hardware_description.encoders, Context.INITIALIZATION)}
    }

    void ProcessAnalogControls()
    {
      ${generateAnalogControls(hardware_description.analog_controls, hardware_description.cv_inputs, Context.PROCESSING)}
    }

    void ProcessDigitalControls()
    {
      ${generateEncoders(hardware_description.encoders, Context.PROCESSING)}
    }

    inline void ProcessAllControls()
    {
        ProcessAnalogControls();
        ProcessDigitalControls();
    }

  } Daisy;
  `
  return hardware_implementation;

}