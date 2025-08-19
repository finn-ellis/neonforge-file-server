import socket
from zeroconf import ServiceInfo, Zeroconf
from time import sleep


# --- Service Discovery Class ---
class ServiceAnnouncer:
    """
    A class to handle the registration and unregistration of a network service
    using zeroconf (mDNS).
    """
    def __init__(self, service_type, service_name, port):
        self.zeroconf = None
        self.service_info = None
        self.service_type = service_type
        self.service_name = service_name
        self.port = port

    def _get_local_ip(self):
        """
        Attempts to find the primary local IP address of the machine.
        This is a reliable method that works on most systems.
        """
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # Doesn't have to be reachable
            s.connect(('10.255.255.255', 1))
            ip = s.getsockname()[0]
        except Exception:
            # Fallback if the above method fails
            ip = '127.0.0.1'
        finally:
            s.close()
        return ip

    def start(self):
        """
        Registers the service on the network. This should be run in a thread.
        """
        ip_address = self._get_local_ip()
        print(f"INFO: Announcing service '{self.service_name}' on IP {ip_address}:{self.port}")

        self.service_info = ServiceInfo(
            self.service_type,
            f"{self.service_name}.{self.service_type}",
            addresses=[socket.inet_aton(ip_address)],
            port=self.port,
            properties={'description': 'My awesome Flask file server.'},
        )

        self.zeroconf = Zeroconf()
        self.zeroconf.register_service(self.service_info)
        print("INFO: Service registered.")

        # Keep the thread alive until the main app exits
        try:
            while True:
                sleep(0.5)
        except KeyboardInterrupt:
            pass # This will be handled by the stop method

    def stop(self):
        """
        Unregisters the service from the network.
        """
        if self.zeroconf and self.service_info:
            print("INFO: Unregistering service...")
            self.zeroconf.unregister_service(self.service_info)
            self.zeroconf.close()
            print("INFO: Service unregistered.")