namespace WhitePad.Server.Models.Messages;

public class ShapeDrawn
{
    public string ShapeId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "line", "rectangle", "circle", "arrow", "axesL", "axesCross"
    public List<StrokePoint> Points { get; set; } = new();
    public string Color { get; set; } = "#000000";
    public double LineWidth { get; set; } = 2.0;
    public bool IsComplete { get; set; } = false;
}
