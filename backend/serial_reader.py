import serial
import serial.tools.list_ports
import json
import time
import threading
import sys
import os

# Global configuration
ARDUINO_CONFIG = {
    'port': None,  # Will be auto-detected
    'baudrate': 9600,
    'timeout': 1
}

class SerialReader:
    def __init__(self, port=None):
        print("\n=== Initializing SerialReader ===")
        self.serial_port = None
        self.is_running = False
        self.latest_data = {
            'temperature': 0.0,
            'humidity': 0.0,
            'lastUpdate': 'Never',
            'connected': False
        }
        self.read_thread = None
        self.port_name = port
        self._find_arduino_port()
        self.start()

    def _find_arduino_port(self):
        print("\n=== Searching for Arduino port ===")
        if sys.platform.startswith('win'):
            ports = list(serial.tools.list_ports.comports())
            print("\nAvailable ports:")
            for port in ports:
                print(f"- {port.device}: {port.description}")
            
            # First try to use specified port if provided
            if self.port_name:
                for port in ports:
                    if port.device == self.port_name:
                        print(f"\nUsing specified port {self.port_name}: {port.description}")
                        return
            
            # Then try to find any Arduino
            for port in ports:
                if 'Arduino' in port.description or 'CH340' in port.description:
                    self.port_name = port.device
                    print(f"\nFound Arduino port: {self.port_name}")
                    return
            
            # If no Arduino found, try any available port
            if ports:
                self.port_name = ports[0].device
                print(f"\nNo Arduino found, using first available port: {self.port_name}")
                return
        else:
            for port in ['/dev/ttyUSB0', '/dev/ttyACM0', '/dev/tty.usbserial']:
                if os.path.exists(port):
                    self.port_name = port
                    print(f"\nFound port: {self.port_name}")
                    return
        
        print("\nNo suitable port found!")
        self.port_name = None

    def _cleanup_port(self):
        """Safely close and cleanup the serial port"""
        try:
            if self.serial_port:
                if self.serial_port.is_open:
                    self.serial_port.close()
                self.serial_port = None
        except Exception as e:
            print(f"Error during port cleanup: {e}")
        finally:
            # On Windows, give the system time to release the port
            if sys.platform.startswith('win'):
                time.sleep(2)

    def start(self):
        if self.is_running or not self.port_name:
            return

        # Cleanup any existing connection
        self._cleanup_port()

        try:
            print(f"\nAttempting to open port: {self.port_name}")
            self.serial_port = serial.Serial(
                port=self.port_name,
                baudrate=ARDUINO_CONFIG['baudrate'],
                timeout=ARDUINO_CONFIG['timeout']
            )
            
            # Wait for Arduino to reset
            time.sleep(2)
            
            # Clear any pending data
            self.serial_port.reset_input_buffer()
            self.serial_port.reset_output_buffer()
            
            print(f"Successfully opened port: {self.port_name}")
            self.is_running = True
            self.latest_data['connected'] = True
            self.latest_data['lastUpdate'] = 'Connected'
            
            if not self.read_thread or not self.read_thread.is_alive():
                self.read_thread = threading.Thread(target=self._read_loop)
                self.read_thread.daemon = True
                self.read_thread.start()
                print("Serial reading thread started")
        except Exception as e:
            print(f"Error opening serial port: {str(e)}")
            self.latest_data['connected'] = False
            self.latest_data['lastUpdate'] = f'Error: {str(e)}'
            # Try to find a different port
            self._find_arduino_port()
            if self.port_name:
                print("Retrying with new port...")
                time.sleep(2)  # Increased delay for Windows
                self.start()

    def stop(self):
        """Cleanup method for Flask app context"""
        print("\n=== Stopping Serial Reader ===")
        self.is_running = False
        self._cleanup_port()

    def _read_loop(self):
        print("\n=== Starting Read Loop ===")
        while self.is_running:
            try:
                if self.serial_port and self.serial_port.is_open:
                    line = self.serial_port.readline().decode('utf-8').strip()
                    if line:
                        print(f"\nReceived raw data: {line}")
                        # Skip initialization messages
                        if line.startswith("Initial") or "starting" in line.lower():
                            continue
                            
                        try:
                            data = json.loads(line)
                            if 'temperature' in data and 'humidity' in data:
                                self.latest_data.update({
                                    'temperature': float(data['temperature']),
                                    'humidity': float(data['humidity']),
                                    'lastUpdate': time.strftime('%H:%M:%S'),
                                    'connected': True
                                })
                                print(f"Updated data: {self.latest_data}")
                        except json.JSONDecodeError as e:
                            print(f"Error parsing JSON: {str(e)}")
                            print(f"Raw data was: {line}")
                        except ValueError as e:
                            print(f"Error converting values: {str(e)}")
                else:
                    print("Serial port not open")
                    time.sleep(1)
            except Exception as e:
                if "ClearCommError" in str(e):
                    # Ignore ClearCommError on Windows as it's not critical
                    continue
                print(f"Error reading serial data: {str(e)}")
                time.sleep(1)

    def get_latest_data(self):
        print(f"\nGetting latest data: {self.latest_data}")
        return self.latest_data

    @staticmethod
    def set_port(new_port):
        print(f"\nChanging Arduino port to: {new_port}")
        ARDUINO_CONFIG['port'] = new_port 