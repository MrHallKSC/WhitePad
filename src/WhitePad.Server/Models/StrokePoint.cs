namespace WhitePad.Server.Models;

public class StrokePoint
{
    public double X { get; set; }       // 0-1 normalized
    public double Y { get; set; }       // 0-1 normalized
    public double Pressure { get; set; } = 0.5; // 0-1, default 0.5
    public int? Timestamp { get; set; }  // Optional ms since stroke start
}
