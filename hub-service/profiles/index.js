/**
 * EduSim Hub — Board Profile Registry
 *
 * To add a new board:
 * 1. Create a new profile file in this directory.
 * 2. Import it here and add it to PROFILES.
 * 3. Add a bankControlPin (the Master GPIO that enables this board's header bank).
 */
import { ArduinoNanoProfile } from './arduinoNano.js';
import { ESP32Profile }       from './esp32.js';

export const PROFILES = {
  arduinoNano: ArduinoNanoProfile,
  esp32:       ESP32Profile,
};

export function getProfile(boardId) {
  return PROFILES[boardId] || null;
}
