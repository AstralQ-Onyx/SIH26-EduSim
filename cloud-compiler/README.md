# EduSim Cloud Compiler Backend

This is the standalone Node.js Cloud Compilation backend for EduSim. It accepts C/C++ Arduino sketches via an HTTP REST API, compiles them securely in an isolated environment using `arduino-cli`, and returns the compiled binary (`.hex` or `.bin`) to the browser.

## Why this Architecture?

1. **Zero Client Setup**: Students don't need to install Python, `arduino-cli`, or an "EduSim Local Agent".
2. **Library Management**: Standard libraries (DHT, Servo, Adafruit, Wire, etc.) are pre-installed in the Docker container.
3. **Hardware Independence**: The browser handles flashing the board via Web Serial (`avrgirl-arduino` for AVR, `esptool-js` for ESP). This backend is strictly for computation.

## How to Deploy

The most efficient way to deploy this is using Docker, as it encapsulates `arduino-cli` and all the board cores. You can deploy this easily on **Render, Railway, DigitalOcean App Platform, or AWS**.

1. Create a new Web Service on your hosting provider.
2. Connect this repository and point it to the `cloud-compiler` folder.
3. Select **Docker** as the runtime environment.
4. The provider will automatically build the `Dockerfile` and start the Express API on port `3000`.

## API Documentation

### `POST /compile`
Compiles an Arduino sketch and returns the binary data.

**Request Body (JSON):**
```json
{
  "code": "void setup() { Serial.begin(9600); } void loop() {}",
  "fqbn": "arduino:avr:uno"
}
```

**Supported FQBNs:**
- `arduino:avr:uno`
- `arduino:avr:nano`
- `arduino:avr:mega`
- `esp32:esp32:esp32`
- `esp8266:esp8266:nodemcuv2`
- `rp2040:rp2040:rpipico`

**Success Response (200):**
```json
{
  "success": true,
  "fqbn": "arduino:avr:uno",
  "format": "hex",
  "data": ":100000000C945C000C946E000C946E000C946E003A...",
  "message": "Compiled successfully"
}
```

**Error Response (400):**
```json
{
  "error": "Compilation failed",
  "details": "error: expected ';' before '}' token"
}
```

## How to Integrate with the Browser (Phase 3)

Once this API is deployed, you will update your `dashboard.js`:

1. **Verify/Compile**: Send the code via `fetch('https://your-cloud-api.com/compile', ...)` and save the returned `data` string.
2. **Upload**: Use a browser-based flashing library.
   - For Arduino UNO/Nano/Mega: Import [avrgirl-arduino](https://github.com/noopkat/avrgirl-arduino). It takes a hex file string and flashes it via `navigator.serial`.
   - For ESP32: Import [esptool-js](https://github.com/espressif/esptool-js). It takes the base64 `.bin` payload and flashes it via `navigator.serial`.
