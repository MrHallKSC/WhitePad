namespace WhitePad.Server.Models;

public class Shape
{
    public string ShapeId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "line", "rectangle", "triangle", "circle"
    public List<StrokePoint> Points { get; set; } = new(); // Control points for the shape
    public string Color { get; set; } = "#000000";
    public double LineWidth { get; set; } = 2.0;
    public bool IsComplete { get; set; } = false;
}
