/**
 * Enumeration of available codegen target locations
 */
const Context = Object.freeze({
  INCLUDE: Symbol("INCLUDE"),
  DECLARATION: Symbol("DECLARATION"),
  INITIALIZATION: Symbol("INITIALIZATION"),
  PROCESSING: Symbol("PROCESSING")
});

/**
 * Generates an array of daisy::AnalogControl objects
 * 
 * See: https://github.com/electro-smith/libDaisy/blob/master/src/hid/ctrl.h
 * 
 * analog_controls and cv_inputs are merged into the same array, as they are both internally 
 * seen as AnalogControl objects.
 * 
 * @param {[AnalogControl]} analog_controls a list of AnalogControl configurations
 * @param {[CvInput]} cv_inputs a list of CvInput configurations
 * @param {Context} context The code context to generate for
 */
function generateAnalogControls(analog_controls, cv_inputs, context) {
  let all_controls = [].concat((analog_controls || [])).concat(cv_inputs || []);

  if (!all_controls.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    let code = [
      `// analog_controls declaration`,
      `AnalogControl controls[${all_controls.length}];`];
    // Alias the objects with their labels
    all_controls.forEach((analog_control, idx) => {
      if (analog_control.labels) {
        analog_control.labels.forEach(label => {
          code.push(`AnalogControl& ${label} = controls[${idx}];`);
        })
      }
    });
    return code.join("\n    ");

  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    let code = [
      `// BEGIN - analog_controls initialization`,
      `AdcChannelConfig cfg[${all_controls.length}];`];
    // ADC init...
    all_controls.forEach((analog_control, idx) => {
      code.push(`cfg[${idx}].InitSingle(seed.GetPin(${analog_control.pin}));`);
    });
    code.push(`seed.adc.Init(cfg, ${all_controls.length});`);
    // AnalogControl init...
    all_controls.forEach((analog_control, idx) => {
      code.push(`controls[${idx}].Init(seed.adc.GetPtr(${idx}), seed.AudioCallbackRate(), ${!!analog_control.flip}, ${!!analog_control.invert});`);
    });
    // Start the ADC now...
    code.push(`seed.adc.Start();`);
    code.push(`// END - analog_controls initialization`)
    return code.join("\n        ");

  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    let code = [`// process analog_controls`];
    all_controls.forEach((analog_control, idx) => {
      code.push(`controls[${idx}].Process();`);
    });
    return code.join("\n        ");

  }
  return "";
}

/**
 * Generates initialization code for the Daisy Seed DAC.  There are currently no useful abstractions to expose.
 * 
 * @param {[CvOutput]} cv_outputs the CvOutput configuration 
 * @param {Context} context the context for which to generate code
 */
function generateCvOutputs(cv_outputs, context) {
  if (!cv_outputs || !cv_outputs.length)
    return "";

  if (cv_outputs.length > 2) {
    // Only two DAC channels available...
    cv_outputs = cv_outputs.slice(0, 2);
  }

  if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    let code = [
      `// BEGIN - cv_outputs initialization`,
      `DacHandle::Config dac_cfg;`,
      `dac_cfg.bitdepth   = DacHandle::BitDepth::BITS_12;`,
      `dac_cfg.buff_state = DacHandle::BufferState::ENABLED;`,
      `dac_cfg.mode       = DacHandle::Mode::POLLING;`,
      `dac_cfg.chn        = DacHandle::Channel::BOTH;`,
      `seed.dac.Init(dac_cfg);`,
      `seed.dac.WriteValue(DacHandle::Channel::BOTH, 0);`,
      `// END - cv_outputs initialization`
    ];
    return code.join("\n        ");

  }

  return "";
}

/**
 * Generates an array of daisy::Encoder objects
 * 
 * See: https://github.com/electro-smith/libDaisy/blob/master/src/hid/encoder.h
 * 
 * @param {[Encoder]} encoders a list of encoder configuration objects 
 * @param {Context} context  the context to generate code for.
 */
function generateEncoders(encoders, context) {
  if (!encoders || !encoders.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    let code = [`//  encoders declaration`,
      `Encoder encoders[${encoders.length}];`,
      `Encoder& encoder = encoders[0];`
    ];
    // Alias the objects with their labels
    encoders.forEach((encoder, idx) => {
      if (encoder.labels) {
        encoder.labels.forEach(label => {
          code.push(`Encoder& ${label} = encoders[${idx}];`);
        })
      }
    });
    return code.join("\n    ");

  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    let code = [`// BEGIN - encoders initialization`];
    encoders.forEach((encoder, idx) => {
      code.push(`encoders[${idx}].Init(seed.GetPin(${encoder.pin_a}), seed.GetPin(${encoder.pin_b}), seed.GetPin(${encoder.pin_switch}), seed.AudioCallbackRate());`);
    });
    code.push(`// END - encoders initialization`)
    return code.join("\n        ");

  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    let code = [`// process encoders`];
    encoders.forEach((encoder, idx) => {
      code.push(`encoders[${idx}].Debounce();`);
    });
    return code.join("\n        ");

  }
  return "";
}

/**
 * Generates an array of daisy::Switch objects
 * 
 * See: https://github.com/electro-smith/libDaisy/blob/master/src/hid/switch.h
 * 
 * @param {[Switch]} switches a list of switch configuration objects
 * @param {Context} context the context to generate code for
 */
function generateSwitches(switches, context) {
  if (!switches || !switches.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    let code = [`//  switches declaration`,
      `Switch switches[${switches.length}];`];
    // Alias the objects with their labels
    switches.forEach((switch_, idx) => {
      if (switch_.labels) {
        switch_.labels.forEach(label => {
          code.push(`Switch& ${label} = switches[${idx}];`);
        })
      }
    });

    return code.join("\n    ");

  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    let code = [`// BEGIN - switches initialization`];
    switches.forEach((_switch, idx) => {
      code.push(`switches[${idx}].Init(seed.GetPin(${_switch.pin}), seed.AudioCallbackRate(), Switch::Type::${_switch.type}, Switch::Polarity::${_switch.polarity}, Switch::Pull::${_switch.pull});`);
    });
    code.push(`// END - switches initialization`)
    return code.join("\n        ");

  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    let code = [`// process switches`];
    switches.forEach((_switch, idx) => {
      code.push(`switches[${idx}].Debounce();`);
    });
    return code.join("\n        ");

  }
  return "";
}

/**
 * Generates an array of daisy::Led objects.
 * 
 * See: https://github.com/electro-smith/libDaisy/blob/master/src/hid/led.h
 * 
 * @param {[Led]} leds a list of Led configuration objects
 * @param {Context} context the context to generate code for
 */
function generateLeds(leds, context) {
  if (!leds || !leds.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    let code = [`//  leds declaration`,
      `Led leds[${leds.length}];`];

    // Alias the objects with their labels
    leds.forEach((led, idx) => {
      if (led.labels) {
        led.labels.forEach(label => {
          code.push(`Led& ${label} = leds[${idx}];`);
        })
      }
    });

    return code.join("\n    ");

  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    let code = [`// BEGIN - leds initialization`];
    leds.forEach((led, idx) => {
      code.push(`leds[${idx}].Init(seed.GetPin(${led.pin}), ${!!led.invert});`);
    });
    code.push(`// END - leds initialization`)
    return code.join("\n        ");

  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    let code = [`// process leds`];
    leds.forEach((led, idx) => {
      code.push(`leds[${idx}].Update();`);
    });
    return code.join("\n        ");

  }
  return "";
}

/**
 * Generates an array of daisy::RgbLed objects
 * 
 * See: https://github.com/electro-smith/libDaisy/blob/master/src/hid/rgb_led.h
 * 
 * @param {[RgbLed]} rgb_leds a list of RgbLed configuration objects
 * @param {Context} context the context to generate code for
 */
function generateRgbLeds(rgb_leds, context) {
  if (!rgb_leds || !rgb_leds.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    let code = [`//  rgb_leds declaration`,
      `RgbLed rgb_leds[${rgb_leds.length}];`];
    // Alias the objects with their labels
    rgb_leds.forEach((rgb_led, idx) => {
      if (rgb_led.labels) {
        rgb_led.labels.forEach(label => {
          code.push(`RgbLed& ${label} = rgb_leds[${idx}];`);
        })
      }
    });

    return code.join("\n    ");

  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    let code = [`// BEGIN - rgb_leds initialization`];
    rgb_leds.forEach((rgb_led, idx) => {
      code.push(`rgb_leds[${idx}].Init(seed.GetPin(${rgb_led.pin_r}), seed.GetPin(${rgb_led.pin_g}), seed.GetPin(${rgb_led.pin_b}), ${!!rgb_led.invert});`);
    });
    code.push(`// END - rgb_leds initialization`)
    return code.join("\n        ");

  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    let code = [`// process rgb_leds`];
    rgb_leds.forEach((rgb_led, idx) => {
      code.push(`rgb_leds[${idx}].Update();`);
    });
    return code.join("\n        ");

  }
  return "";
}

/**
 * Generates an array of daisy::OledDisplay objects
 * 
 * See: https://github.com/electro-smith/libDaisy/blob/master/src/hid/oled_display.h
 * 
 * @param {[OledDisplay]} oled_displays a list of OledDisplay configurations
 * @param {Context} context the context to generate code for
 */
function generateOledDisplays(oled_displays, context) {
  if (!oled_displays || !oled_displays.length)
    return "";

  // Generate the driver names
  oled_displays.forEach((oled_display, idx) => {
    oled_display.driver_name = [oled_display.driver, oled_display.transport, oled_display.dimensions, "Driver"].join("");
  })

  if (context == Context.INCLUDE) {
    if (oled_displays.some(oled_display => oled_display.driver === "SSD130x")) {
      return "#include \"dev/oled_ssd130x.h\"\n"
    }
    return "";
  }

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    let code = [`// OLED display declaration`];
    oled_displays.forEach((oled_display, idx) => {
      code.push(`OledDisplay<${oled_display.driver_name}> display${(idx === 0) ? "" : idx};`);
    });
    return code.join("\n    ");

  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    let code = ["// BEGIN - OLED display initialization"];

    oled_displays.forEach((oled_display, idx) => {
      code.push(`// Display ${idx}`);
      code.push(`OledDisplay<${oled_display.driver_name}>::Config display_config${idx};`);
      if (oled_display.transport === "4WireSpi") {
        code.push(`display_config${idx}.driver_config.transport_config.pin_config.dc = seed.GetPin(${oled_display["4_wire_spi_config"].pin_dc});`);
        code.push(`display_config${idx}.driver_config.transport_config.pin_config.reset = seed.GetPin(${oled_display["4_wire_spi_config"].pin_reset});`);
      } else if (oled_display.transport === "I2c") {
        code.push(`display_config${idx}.driver_config.transport_config.i2c_address = ${oled_display.i2c_config.address};`);
        //code.push(`display_config${idx}.driver_config.transport_config.i2c_config.mode = I2CHandle::Config::Mode::${oled_display.i2c_config.mode};`);
        code.push(`display_config${idx}.driver_config.transport_config.i2c_config.periph = I2CHandle::Config::Peripheral::${oled_display.i2c_config.peripheral};`);
        code.push(`display_config${idx}.driver_config.transport_config.i2c_config.speed = I2CHandle::Config::Speed::${oled_display.i2c_config.speed};`);
        code.push(`display_config${idx}.driver_config.transport_config.i2c_config.pin_config.sda = seed.GetPin(${oled_display.i2c_config.pin_sda});`);
        code.push(`display_config${idx}.driver_config.transport_config.i2c_config.pin_config.scl = seed.GetPin(${oled_display.i2c_config.pin_scl});`);
      }
      code.push(`display${(idx == 0) ? "" : idx}.Init(display_config${idx});`);
    })
    code.push("// END - OLED display initialization")
    return code.join("\n        ");
  }

  return "";
}

function generateGateInputs(gate_inputs, context) {
  if (!gate_inputs || !gate_inputs.length)
    return "";

  if (context == Context.DECLARATION) {
    // Handle declaration code gen
    let code = [
      `//gate_inputs declaration`,
      `GateIn gate_inputs[${gate_inputs.length}];`];
    // Alias the objects with their labels
    gate_inputs.forEach((gate_input, idx) => {
      if (gate_input.labels) {
        gate_input.labels.forEach(label => {
          code.push(`GateIn& ${label} = gate_inputs[${idx}];`);
        })
      }
    });
    return code.join("\n    ");

  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    let code = [
      `// BEGIN - gate_inputs initialization`,
      `dsy_gpio_pin gate_input_pin;`];
    gate_inputs.forEach((gate_input, idx) => {
      code.push(`gate_input_pin = seed.GetPin(${gate_input.pin});`)
      code.push(`gate_inputs[${idx}].Init(&gate_input_pin);`)
    });
    code.push(`// END -  gate_inputs initialization`);
    return code.join("\n        ");

  }
  return "";
}


function generateGateOutputs(gate_outputs, context) {
  // TODO - this is currently being CPPified in libDaisy...
  return "";
}


function generateMidiHandlers(gate_outputs, context) {
  return "";
}

/**
 * This method takes a hardware description object, with the schema defined in hardware_description_schema.json,
 * and outputs a string of C++ source code which reflects this hardware.
 * 
 * @param {HardwareDescription} hardware_description The hardware description object.
 */
exports.generateCustomHardwareImpl = function (hardware_description) {
  // This is the output C++ template.
  const hardware_implementation = `

#include "daisy_seed.h"
${generateOledDisplays(hardware_description.oled_displays, Context.INCLUDE)}

using namespace daisy;

typedef struct {
    DaisySeed seed;
  
    ${generateAnalogControls(hardware_description.analog_controls, hardware_description.cv_inputs, Context.DECLARATION)}

    ${generateCvOutputs(hardware_description.cv_outputs, Context.DECLARATION)}
    
    ${generateEncoders(hardware_description.encoders, Context.DECLARATION)}

    ${generateGateInputs(hardware_description.gate_inputs, Context.DECLARATION)}

    ${generateGateOutputs(hardware_description.gate_inputs, Context.DECLARATION)}

    ${generateLeds(hardware_description.leds, Context.DECLARATION)}

    ${generateMidiHandlers(hardware_description.midi_handlers, Context.DECLARATION)}

    ${generateOledDisplays(hardware_description.oled_displays, Context.DECLARATION)}
    
    ${generateRgbLeds(hardware_description.rgb_leds, Context.DECLARATION)}

    ${generateSwitches(hardware_description.switches, Context.DECLARATION)}

    void Init(bool boost) 
    {
        seed.Configure();
        seed.Init(boost);

        ${generateAnalogControls(hardware_description.analog_controls, hardware_description.cv_inputs, Context.INITIALIZATION)}
        
        ${generateCvOutputs(hardware_description.cv_outputs, Context.INITIALIZATION)}

        ${generateGateInputs(hardware_description.gate_inputs, Context.INITIALIZATION)}

        ${generateGateOutputs(hardware_description.gate_inputs, Context.INITIALIZATION)}

        ${generateEncoders(hardware_description.encoders, Context.INITIALIZATION)}

        ${generateLeds(hardware_description.leds, Context.INITIALIZATION)}

        ${generateMidiHandlers(hardware_description.midi_handlers, Context.INITIALIZATION)}

        ${generateOledDisplays(hardware_description.oled_displays, Context.INITIALIZATION)}

        ${generateRgbLeds(hardware_description.rgb_leds, Context.INITIALIZATION)}

        ${generateSwitches(hardware_description.switches, Context.INITIALIZATION)}
    }

    void ProcessAnalogControls()
    {
        ${generateAnalogControls(hardware_description.analog_controls, hardware_description.cv_inputs, Context.PROCESSING)}
    }

    void ProcessDigitalControls()
    {
        ${generateEncoders(hardware_description.encoders, Context.PROCESSING)}

        ${generateSwitches(hardware_description.switches, Context.PROCESSING)}
    }

    inline void ProcessAllControls()
    {
        ProcessAnalogControls();
        ProcessDigitalControls();
    }

    void UpdateLeds()
    {
      ${generateLeds(hardware_description.leds, Context.PROCESSING)}
      ${generateRgbLeds(hardware_description.rgb_leds, Context.PROCESSING)}
    }

  } Daisy;
  `
  return hardware_implementation;

}