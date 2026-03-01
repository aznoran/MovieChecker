using System.Text.Json.Serialization;

namespace MovieChecker.Domain.Models.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Emotion
{
    Joy,
    Sadness,
    Excitement,
    Cringe,
    Confused,
    Neutral
}
