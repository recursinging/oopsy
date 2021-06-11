/**
 * Enumeration of available code gen locations
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
 * @param {*} analog_controls The "analog_controls" hardware defintion
 * @param {*} cv_inputs The "cv_inputs" hardware definition
 * @param {*} context The code context to generate for
 */
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

function generateCvOutputs(cv_outputs, context) {
  // TODO
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

function generateSwitches(switches, context) {
  // TODO
}

function generateLeds(leds, context) {
  // TODO
}

function generateRgbLeds(rgb_leds, context) {
  // TODO
}

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
    return `
    //  OLED display declaration
    ${oled_displays.map((oled_display, idx) =>
      `OledDisplay<${oled_display.driver_name}> display${(idx === 0) ? "" : idx};`).join("\n")}`;

  } else if (context == Context.INITIALIZATION) {
    // Handle initialization code gen
    let code_output = ["// BEGIN - OLED display initialization"];

    oled_displays.forEach((oled_display, idx) => {
      code_output.push(`// Display ${idx}`);
      code_output.push(`OledDisplay<${oled_display.driver_name}>::Config display_config${idx};`);
      if (oled_display.transport === "4WireSpi") {
        code_output.push(`display_config${idx}.driver_config.transport_config.pin_config.dc = seed.GetPin(${oled_display["4_wire_spi_config"].pin_dc});`);
        code_output.push(`display_config${idx}.driver_config.transport_config.pin_config.reset = seed.GetPin(${oled_display["4_wire_spi_config"].pin_reset});`);
      } else if (oled_display.transport === "I2c") {
        code_output.push(`display_config${idx}.driver_config.transport_config.i2c_address = ${oled_display.i2c_config.address};`);
        //code_output.push(`display_config${idx}.driver_config.transport_config.i2c_config.mode = I2CHandle::Config::Mode::${oled_display.i2c_config.mode};`);
        code_output.push(`display_config${idx}.driver_config.transport_config.i2c_config.periph = I2CHandle::Config::Peripheral::${oled_display.i2c_config.peripheral};`);
        code_output.push(`display_config${idx}.driver_config.transport_config.i2c_config.speed = I2CHandle::Config::Speed::${oled_display.i2c_config.speed};`);
        code_output.push(`display_config${idx}.driver_config.transport_config.i2c_config.pin_config.sda = seed.GetPin(${oled_display.i2c_config.pin_sda});`);
        code_output.push(`display_config${idx}.driver_config.transport_config.i2c_config.pin_config.scl = seed.GetPin(${oled_display.i2c_config.pin_scl});`);
      }
      code_output.push(`display${(idx == 0) ? "" : idx}.Init(display_config${idx});`);
    })
    code_output.push("// END - OLED display initialization")
    return code_output.join("\n        ");
  } else if (context == Context.PROCESSING) {
    // Handle processing codegen
    return "";
  }

}

function generateGateInputs(gate_inputs, context) {
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


function generateGateOutputs(gate_outputs, context) {
  // TODO
}


function generateMidiHandlers(gate_outputs, context) {
  // TODO
}

/**
 * This method takes a hardware description object, with the schema defined in hardware_description_schema.json,
 * and outputs a string of C++ source code which reflects this hardware.
 * 
 * @param {*} hardware_description The hardware description object.
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

    ${generateGateInputs(hardware_description.gate_inputs, Context.DECLARATION)}

    ${generateEncoders(hardware_description.encoders, Context.DECLARATION)}

    ${generateOledDisplays(hardware_description.oled_displays, Context.DECLARATION)}
  
    void Init(bool boost) 
    {
        seed.Configure();
        seed.Init(boost);

        ${generateAnalogControls(hardware_description.analog_controls, hardware_description.cv_inputs, Context.INITIALIZATION)}

        ${generateGateInputs(hardware_description.gate_inputs, Context.INITIALIZATION)}

        ${generateEncoders(hardware_description.encoders, Context.INITIALIZATION)}

        ${generateOledDisplays(hardware_description.oled_displays, Context.INITIALIZATION)}
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