namespace WhitePad.Server.Models;

public class StrokeBatch
{
    public string StudentId { get; set; } = string.Empty; // Set by server
    public string StrokeId { get; set; } = string.Empty;
    public List<StrokePoint> Points { get; set; } = new();
    public string Color { get; set; } = "#000000";
    public double LineWidth { get; set; } = 2.0;
    public bool IsComplete { get; set; }
}
