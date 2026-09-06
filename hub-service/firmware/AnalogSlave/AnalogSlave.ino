/*
 * EduSim Phase 2 - Analog Slave Firmware
 * 
 * This firmware runs on the "Left" ESP32. It acts as an I/O expander
 * for the Master ESP32, specifically handling Analog requests.
 * 
 * Protocol:
 * Master sends:  "READ:A0\n"
 * Slave replies: "A0:2048\n"
 * 
 * Default Wiring (Master <-> Slave):
 * Master TX (Pin 4) -> Slave RX (Pin 16)
 * Master RX (Pin 5) -> Slave TX (Pin 17)
 * GND -> GND
 */

#include <Arduino.h>

// Use Hardware Serial 2 for communication with Master
HardwareSerial MasterComm(2);

// Map "A0"-"A7" strings from the Master to physical ESP32 ADC pins.
// Note: These mappings depend on your physical EduSim Hub layout.
// Standard ESP32 ADC1 pins: 36(VP), 39(VN), 34, 35, 32, 33
const int analogPins[] = {
  36, // A0
  39, // A1
  34, // A2
  35, // A3
  32, // A4
  33  // A5
};
const int maxAnalogPins = sizeof(analogPins) / sizeof(analogPins[0]);

void setup() {
  // Debug serial (USB)
  Serial.begin(115200);
  
  // Master communication serial (UART2 on pins 16(RX) and 17(TX))
  MasterComm.begin(115200, SERIAL_8N1, 16, 17);
  
  Serial.println("EduSim Analog Slave Initialized");
  Serial.println("Listening for Master commands on UART2...");
}

void loop() {
  if (MasterComm.available()) {
    String cmd = MasterComm.readStringUntil('\n');
    cmd.trim(); // Remove any \r or whitespace
    
    if (cmd.startsWith("READ:A")) {
      // Extract the index, e.g. "READ:A0" -> 0
      String indexStr = cmd.substring(6);
      int index = indexStr.toInt();
      
      if (index >= 0 && index < maxAnalogPins) {
        int physicalPin = analogPins[index];
        int value = analogRead(physicalPin);
        
        // Reply back to Master: "A0:1234"
        MasterComm.print("A");
        MasterComm.print(index);
        MasterComm.print(":");
        MasterComm.println(value);
        
        Serial.printf("Handled request %s -> Pin %d = %d\n", cmd.c_str(), physicalPin, value);
      } else {
        // Invalid pin index
        MasterComm.print("A");
        MasterComm.print(index);
        MasterComm.println(":0"); // Return 0 on error
        Serial.printf("Error: Invalid analog index %d\n", index);
      }
    }
  }
}
