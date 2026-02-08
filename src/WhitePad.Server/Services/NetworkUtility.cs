using System.Net;
using System.Net.Sockets;

namespace WhitePad.Server.Services;

public static class NetworkUtility
{
    /// <summary>
    /// Gets the local IP address of the machine (IPv4 only).
    /// Prefers Wi-Fi and Ethernet addresses over others.
    /// </summary>
    /// <returns>Local IPv4 address as string, or "localhost" if not found</returns>
    public static string GetLocalIPAddress()
    {
        try
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());

            // Filter to IPv4 addresses only and exclude loopback
            var addresses = host.AddressList
                .Where(ip => ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip))
                .ToList();

            if (addresses.Count == 0)
            {
                return "localhost";
            }

            // Prefer addresses in common private network ranges (more likely to be the active network)
            // 192.168.x.x (home networks) or 10.x.x.x (corporate networks)
            var preferredAddress = addresses.FirstOrDefault(ip =>
            {
                var bytes = ip.GetAddressBytes();
                return (bytes[0] == 192 && bytes[1] == 168) || bytes[0] == 10;
            });

            return (preferredAddress ?? addresses.First()).ToString();
        }
        catch
        {
            return "localhost";
        }
    }
}
