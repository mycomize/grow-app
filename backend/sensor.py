import smbus2
import time

SHT30_MEASURE_HIGHREP = [0x2c, 0x06]

def celcius_to_fahrenheit(celsius):
    """Convert Celsius to Fahrenheit."""
    return (celsius * 9/5) + 32

def read_sht30(bus_number, device_address):
    """Read temperature and humidity from SHT30 sensor."""
    
    bus = None

    try:
        bus = smbus2.SMBus(bus_number)
        bus.write_i2c_block_data(device_address, SHT30_MEASURE_HIGHREP[0], [SHT30_MEASURE_HIGHREP[1]])
        
        time.sleep(0.5) # Wait for the measurement to complete

        data = bus.read_i2c_block_data(device_address, 0, 6)
        
        temp_msb = data[0]
        temp_lsb = data[1]
        humidity_msb = data[3]
        humidity_lsb = data[4]

        temp_raw = ((temp_msb << 8) | temp_lsb)
        temp_celsius = -45 + (175 * temp_raw / 65535.0)
        temp_fahrenheit = celcius_to_fahrenheit(temp_celsius)

        humidity_raw = ((humidity_msb << 8) | humidity_lsb)
        humidity = 100 * humidity_raw / 65535.0

        return temp_fahrenheit, humidity
    except Exception as e:
       print(f"Error reading SHT30 sensor: {e}")
       return None, None
    finally:
        if bus:
            try:
                bus.close() 
            except:
                pass

