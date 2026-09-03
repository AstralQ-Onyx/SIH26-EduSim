# Use the official Node.js 18 image as a base
FROM node:18-bullseye-slim

# Install necessary system dependencies (curl for downloading arduino-cli)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Arduino CLI
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
ENV PATH="/bin:${PATH}"

# Initialize Arduino CLI config
RUN arduino-cli config init

# Add ESP32 and ESP8266 URLs to the board manager
RUN arduino-cli config add board_manager.additional_urls https://dl.espressif.com/dl/package_esp32_index.json
RUN arduino-cli config add board_manager.additional_urls https://arduino.esp8266.com/stable/package_esp8266com_index.json
RUN arduino-cli config add board_manager.additional_urls https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json

# Update core index
RUN arduino-cli core update-index

# Install board cores
RUN arduino-cli core install arduino:avr
RUN arduino-cli core install esp32:esp32
RUN arduino-cli core install esp8266:esp8266
RUN arduino-cli core install rp2040:rp2040

# (Optional) Pre-install common libraries to make compilations fast
RUN arduino-cli lib install "Adafruit Unified Sensor" "DHT sensor library" "LiquidCrystal I2C" "Servo"

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose the API port
EXPOSE 3000

# Start the server
CMD [ "npm", "start" ]
