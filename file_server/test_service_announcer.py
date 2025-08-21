import time
import socket
from zeroconf import ServiceBrowser, Zeroconf, ServiceListener

class MyListener(ServiceListener):
    def __init__(self):
        self.found_services = []

    def update_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        # This method is called when a service is updated.
        pass

    def remove_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        print(f"Service {name} removed")

    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name)
        if info:
            print(f"Service {name} added, service info: {info}")
            self.found_services.append(info)

def main():
    """
    Tests if the '_file-server._tcp.local.' service is being announced.
    """
    SERVICE_TYPE = "_file-server._tcp.local."
    SERVICE_NAME = "NF"

    zeroconf = Zeroconf()
    listener = MyListener()
    browser = ServiceBrowser(zeroconf, SERVICE_TYPE, listener)

    print(f"Browsing for {SERVICE_TYPE} services for 10 seconds...")
    time.sleep(10) # Wait for services to be discovered

    found_our_service = False
    for service in listener.found_services:
        # The service name is in the format 'SERVICE_NAME.SERVICE_TYPE'
        if service.name.startswith(f"{SERVICE_NAME}."):
            print(f"Found our service: {service.name}")
            # Use a list comprehension to safely handle multiple addresses
            addresses = [socket.inet_ntoa(addr) for addr in service.addresses]
            print(f"  Addresses: {addresses}")
            print(f"  Port: {service.port}")
            print(f"  Properties: {service.properties}")
            found_our_service = True
            break
    
    if not found_our_service:
        print(f"Could not find the '{SERVICE_NAME}' service.")

    browser.cancel()
    zeroconf.close()

if __name__ == "__main__":
    main()
